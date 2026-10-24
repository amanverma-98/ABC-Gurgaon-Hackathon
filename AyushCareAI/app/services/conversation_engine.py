"""Conversation Engine — Module A core service.

Orchestrates the adaptive, LLM-driven clinical interview:
1. Manages conversation state (current phase, topics covered).
2. Generates contextually appropriate next questions via the LLM.
3. Processes patient answers (text, touch, or speech).
4. Runs real-time red-flag detection after every answer.
5. Tracks progress through clinical sections.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Optional

import structlog

from app.ai.asr_service import ASRService
from app.ai.llm_service import LLMService
from app.ai.tts_service import TTSService
from app.ai.prompts.history_taking import (
    build_system_prompt,
    build_next_question_prompt,
    build_emergency_screen_prompt,
)
from app.domain.clinical_protocol import (
    CORE_INTAKE_SECTIONS,
    ClinicalSection,
    STANDARD_SECTIONS,
    AYUSH_EXTENSION_SECTIONS,
    SECTION_PROTOCOLS,
)
from app.domain.red_flags import evaluate_all_rules
from app.models.conversation import (
    AIQuestion,
    Choice,
    ConversationPhase,
    ConversationState,
    ConversationTurnResponse,
    QuestionType,
    RedFlagAlert,
)

logger = structlog.get_logger(__name__)


class ConversationError(Exception):
    """Raised when the conversation engine encounters an error."""


class ConversationEngine:
    """Adaptive LLM-driven clinical interview engine."""

    MAX_QUESTIONS = 8

    def __init__(
        self,
        llm: LLMService,
        asr: ASRService,
        tts: TTSService,
    ) -> None:
        self._llm = llm
        self._asr = asr
        self._tts = tts

    async def start_conversation(
        self,
        session_id: str,
        language: str = "en",
        intake_pathway: str = "general",
    ) -> ConversationState:
        """Initialize a new clinical interview and return the first question.

        Returns:
            Initial ConversationState with the emergency screening question.
        """
        logger.info(
            "conversation_starting",
            session_id=session_id,
            language=language,
            pathway=intake_pathway,
        )

        # Generate the initial emergency screening question via LLM
        system_prompt = build_system_prompt(language, intake_pathway)
        user_prompt = build_emergency_screen_prompt(language)

        try:
            response = await self._llm.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
            )
            first_question = self._parse_question_response(response)
            if (
                self._has_invalid_options(response)
                or self._is_irrelevant_question(first_question)
            ):
                first_question = self._fallback_choice_question(
                    ConversationPhase.EMERGENCY_SCREEN,
                )
        except Exception as e:
            logger.error("conversation_start_failed", error=str(e))
            first_question = self._fallback_choice_question(
                ConversationPhase.EMERGENCY_SCREEN,
            )

        return ConversationState(
            session_id=session_id,
            phase=ConversationPhase.EMERGENCY_SCREEN,
            current_question=first_question,
            answered_questions=[],
            red_flags=[],
            progress_percent=0.0,
            is_complete=False,
        )

    async def process_answer(
        self,
        state: ConversationState,
        answer: str,
        question_id: str,
        language: str = "en",
        intake_pathway: str = "general",
        input_mode: str = "text",
        asr_confidence: Optional[float] = None,
    ) -> ConversationTurnResponse:
        """Process a patient's answer and generate the next question.

        Args:
            state: Current conversation state.
            answer: Patient's answer text.
            question_id: ID of the question being answered.
            language: Patient's language.
            intake_pathway: 'general' or 'ayush'.
            input_mode: 'text', 'touch', or 'speech'.
            asr_confidence: Speech recognition confidence (if speech input).

        Returns:
            ConversationTurnResponse with the next question and any red flags.
        """
        logger.info(
            "processing_answer",
            session_id=state.session_id,
            question_id=question_id,
            phase=state.phase.value,
            input_mode=input_mode,
        )

        if state.current_question and state.current_question.question_id == question_id:
            if state.current_question.question_type == QuestionType.MULTI_SELECT:
                import json
                try:
                    parsed = json.loads(answer)
                except (TypeError, json.JSONDecodeError):
                    parsed = None
                if not isinstance(parsed, list) or not parsed:
                    raise ConversationError("A multi-select question requires at least one selected option.")
                allowed = {option.value for option in (state.current_question.options or [])}
                if allowed and any(str(value) not in allowed for value in parsed):
                    raise ConversationError("One or more selected options are invalid for this question.")

        # Record the answer
        answered_entry = {
            "question_id": question_id,
            "question": state.current_question.prompt if state.current_question else "",
            "answer": answer,
            "input_mode": input_mode,
            "asr_confidence": asr_confidence,
            "timestamp": datetime.utcnow().isoformat(),
        }
        state.answered_questions.append(answered_entry)

        # Run deterministic red-flag check
        answer_map = self._build_answer_map(state.answered_questions)
        new_rules = evaluate_all_rules(answer_map)
        new_flags = []
        existing_ids = {f.id for f in state.red_flags}
        for rule in new_rules:
            if rule.id not in existing_ids:
                flag = RedFlagAlert(
                    id=rule.id,
                    level=rule.severity.value,
                    title=rule.title,
                    patient_message=rule.patient_message,
                    patient_message_local=rule.patient_message_hi,
                    evidence=[answer],
                )
                new_flags.append(flag)
                state.red_flags.append(flag)

        # Emergency screening is a hard safety boundary. Record and evaluate the
        # answer first, then stop routine questioning on a positive response.
        if state.phase == ConversationPhase.EMERGENCY_SCREEN:
            # Speech recognition rarely returns the exact option label. Treat
            # common English/Hindi negative answers as a safe response and
            # only terminate when an actual emergency signal is present.
            if self._is_emergency_positive(answer):
                state.phase = ConversationPhase.COMPLETED
                state.is_complete = True
                return ConversationTurnResponse(
                    answer_confirmed=answer,
                    next_question=None,
                    red_flags=new_flags,
                    phase=ConversationPhase.COMPLETED,
                    progress_percent=100.0,
                    is_complete=True,
                )

        if len(state.answered_questions) >= self.MAX_QUESTIONS:
            state.phase = ConversationPhase.COMPLETED
            state.is_complete = True
            return ConversationTurnResponse(
                answer_confirmed=answer,
                next_question=None,
                red_flags=new_flags,
                phase=ConversationPhase.COMPLETED,
                progress_percent=100.0,
                is_complete=True,
            )

        # Determine next phase
        next_phase = self._determine_next_phase(state, intake_pathway)

        # Check if interview is complete
        if next_phase == ConversationPhase.COMPLETED:
            state.phase = ConversationPhase.COMPLETED
            state.is_complete = True
            return ConversationTurnResponse(
                answer_confirmed=answer,
                next_question=None,
                red_flags=new_flags,
                phase=ConversationPhase.COMPLETED,
                progress_percent=100.0,
                is_complete=True,
            )

        # Update phase if it changed
        if next_phase != state.phase:
            state.phase = next_phase

        # Generate next question via LLM
        topics_covered = self._extract_topics(state.answered_questions, state.phase)
        system_prompt = build_system_prompt(language, intake_pathway)
        user_prompt = build_next_question_prompt(
            phase=state.phase.value,
            conversation_history=state.answered_questions,
            language=language,
            topics_covered=topics_covered,
            presenting_complaint=self._get_presenting_complaint(state.answered_questions),
            max_questions=self.MAX_QUESTIONS,
        )

        try:
            response = await self._llm.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
            )
            # The model may explicitly say that the current clinical section is
            # sufficiently covered. Respect that signal instead of returning an
            # empty/irrelevant question to the kiosk.
            if response.get("section_complete") is True and len(state.answered_questions) >= 2:
                state.phase = ConversationPhase.COMPLETED
                state.is_complete = True
                return ConversationTurnResponse(
                    answer_confirmed=answer,
                    next_question=None,
                    red_flags=new_flags,
                    phase=ConversationPhase.COMPLETED,
                    progress_percent=100.0,
                    is_complete=True,
                )
            next_question = self._parse_question_response(response)

            needs_correction = (
                self._is_duplicate_question(next_question, state.answered_questions)
                or self._is_irrelevant_question(next_question)
                or self._has_invalid_options(response)
            )
            if needs_correction:
                response = await self._llm.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=(
                        f"{user_prompt}\nThe proposed question was invalid because it was "
                        "repeated, unrelated, or missing required options. "
                        "Generate a different relevant question or set "
                        '"section_complete": true.'
                    ),
                    temperature=0.3,
                )
                next_question = self._parse_question_response(response)

            if (
                self._is_duplicate_question(next_question, state.answered_questions)
                or self._is_irrelevant_question(next_question)
                or self._has_invalid_options(response)
            ):
                next_question = self._fallback_choice_question(
                    state.phase,
                    self._get_presenting_complaint(state.answered_questions),
                )

            # Check if LLM indicates section is complete
            if response.get("section_complete"):
                next_phase = self._advance_phase(state.phase, intake_pathway)
                if next_phase == ConversationPhase.COMPLETED:
                    state.phase = ConversationPhase.COMPLETED
                    state.is_complete = True
                    return ConversationTurnResponse(
                        answer_confirmed=answer,
                        next_question=None,
                        red_flags=new_flags,
                        phase=ConversationPhase.COMPLETED,
                        progress_percent=100.0,
                        is_complete=True,
                    )
                state.phase = next_phase
                next_question.phase = next_phase

            # Check for LLM-detected red flags
            llm_flags = response.get("red_flags_detected", [])
            for rf in llm_flags:
                if rf.get("id") and rf["id"] not in existing_ids:
                    flag = RedFlagAlert(
                        id=rf["id"],
                        level=rf.get("level", "urgent"),
                        title=rf.get("title", ""),
                        patient_message=rf.get("patient_message", ""),
                        evidence=rf.get("evidence", []),
                    )
                    new_flags.append(flag)
                    state.red_flags.append(flag)

        except Exception as e:
            logger.error("next_question_generation_failed", error=str(e))
            next_question = self._fallback_choice_question(state.phase, self._get_presenting_complaint(state.answered_questions))

        state.current_question = next_question

        # Calculate progress
        progress = self._calculate_progress(state, intake_pathway)

        return ConversationTurnResponse(
            answer_confirmed=answer,
            next_question=next_question,
            red_flags=new_flags,
            phase=state.phase,
            progress_percent=progress,
            is_complete=False,
        )

    async def transcribe_speech(
        self,
        audio_bytes: bytes,
        language: str = "en",
        *,
        filename: str = "audio.wav",
    ) -> dict:
        """Transcribe speech input and return text + confidence.

        Returns:
            dict with 'text', 'confidence', 'quality'.
        """
        quality = await self._asr.assess_audio_quality(audio_bytes)
        if quality["status"] == "poor":
            return {
                "text": "",
                "confidence": 0.0,
                "quality": quality,
            }

        result = await self._asr.transcribe(audio_bytes, language, filename=filename)
        return {
            "text": result["text"],
            "confidence": result["confidence"],
            "quality": quality,
        }

    async def synthesize_question(
        self,
        text: str,
        language: str = "en",
    ) -> dict:
        """Convert a question to speech for the patient.

        Returns:
            dict with 'audio_base64', 'encoding'.
        """
        from app.ai.tts_service import TTSError
        try:
            return await self._tts.synthesize(text, language)
        except TTSError:
            return {"audio_base64": "", "encoding": "MP3", "error": "TTS unavailable"}

    # ── Internal Helpers ─────────────────────────────────────────────────

    def _parse_question_response(self, response: dict) -> AIQuestion:
        """Parse LLM JSON response into an AIQuestion model."""
        options = None
        if response.get("options"):
            options = [
                Choice(
                    value=opt.get("value", ""),
                    label=opt.get("label", ""),
                    label_local=opt.get("label_local"),
                )
                for opt in response["options"]
            ]

        # Map phase string to enum
        phase_str = response.get("phase", "chief_complaint")
        try:
            phase = ConversationPhase(phase_str)
        except ValueError:
            phase = ConversationPhase.CHIEF_COMPLAINT

        question_type_value = response.get("question_type", "text")
        selection_mode = str(response.get("selection_mode", "")).lower()
        if selection_mode in {"multiple", "multi", "multi_select"} or response.get("multiple") is True:
            question_type_value = "multi_select"
        try:
            question_type = QuestionType(question_type_value)
        except ValueError:
            question_type = QuestionType.TEXT

        if question_type == QuestionType.TEXT and options and len(options) >= 2:
            question_type = QuestionType.CHOICE

        if question_type in (QuestionType.CHOICE, QuestionType.MULTI_SELECT):
            if not options or len(options) < 2:
                question_type = QuestionType.TEXT
                options = None

        return AIQuestion(
            question_id=response.get("question_id", f"q_{uuid.uuid4().hex[:8]}"),
            phase=phase,
            prompt=response.get("prompt", ""),
            prompt_local=response.get("prompt_local"),
            helper=response.get("helper"),
            question_type=question_type,
            options=options,
            selection_mode=response.get("selection_mode") or (
                "multiple" if question_type == QuestionType.MULTI_SELECT else "single"
            ),
            is_follow_up=response.get("is_follow_up", False),
            clinical_context=response.get("clinical_context"),
        )

    def _is_duplicate_question(
        self, question: AIQuestion, answered: list[dict]
    ) -> bool:
        """Detect repeated question IDs or wording before returning a question."""
        prompt = " ".join(question.prompt.lower().split())
        for entry in answered:
            previous_prompt = " ".join(entry.get("question", "").lower().split())
            if question.question_id == entry.get("question_id"):
                return True
            if prompt and (
                prompt == previous_prompt
                or SequenceMatcher(None, prompt, previous_prompt).ratio() >= 0.88
            ):
                return True
        return False

    def _is_irrelevant_question(self, question: AIQuestion) -> bool:
        """Reject non-clinical social questions from the patient-facing flow."""
        text = question.prompt.lower()
        blocked_topics = (
            "monthly income", "annual income", "salary", "marital status",
            "education", "highest level", "address", "where do you live",
            "housing", "own house", "rented house", "employment",
        )
        return any(topic in text for topic in blocked_topics)

    def _fallback_choice_question(self, phase: ConversationPhase, complaint: str = "") -> AIQuestion:
        """Return a relevant option question when the provider response is invalid."""
        complaint_key = complaint.lower()
        complaint_questions = {
            "fever_cough": (
                "How long have you had the fever, cough, or breathing problem?",
                [
                    Choice(value="less_1_day", label="Less than 1 day"),
                    Choice(value="1_3_days", label="1–3 days"),
                    Choice(value="4_7_days", label="4–7 days"),
                    Choice(value="more_1_week", label="More than 1 week"),
                ],
            ),
            "abdominal_pain": (
                "Where is the stomach pain mainly located?",
                [
                    Choice(value="upper", label="Upper abdomen"),
                    Choice(value="lower", label="Lower abdomen"),
                    Choice(value="right", label="Right side"),
                    Choice(value="left", label="Left side"),
                    Choice(value="all_over", label="All over"),
                ],
            ),
            "headache": (
                "How is the headache affecting you?",
                [
                    Choice(value="mild", label="Mild"),
                    Choice(value="moderate", label="Moderate"),
                    Choice(value="severe", label="Severe"),
                    Choice(value="with_dizziness", label="With dizziness"),
                ],
            ),
            "joint_pain": (
                "Which best describes the joint or muscle problem?",
                [
                    Choice(value="pain", label="Pain"),
                    Choice(value="swelling", label="Swelling"),
                    Choice(value="stiffness", label="Stiffness"),
                    Choice(value="reduced_movement", label="Reduced movement"),
                ],
            ),
            "skin_issue": (
                "What is the main skin problem?",
                [
                    Choice(value="rash", label="Rash"),
                    Choice(value="itching", label="Itching"),
                    Choice(value="wound", label="Wound"),
                    Choice(value="swelling", label="Swelling"),
                ],
            ),
            "urinary": (
                "Which urinary symptom is most noticeable?",
                [
                    Choice(value="burning", label="Burning while urinating"),
                    Choice(value="frequency", label="Passing urine often"),
                    Choice(value="pain", label="Pain"),
                    Choice(value="blood", label="Blood in urine"),
                ],
            ),
            "eye_ear": (
                "Which problem is most noticeable?",
                [
                    Choice(value="pain", label="Pain"),
                    Choice(value="discharge", label="Discharge"),
                    Choice(value="hearing", label="Hearing difficulty"),
                    Choice(value="vision", label="Vision difficulty"),
                ],
            ),
        }
        fallback_questions = {
            ConversationPhase.EMERGENCY_SCREEN: (
                "Are you experiencing any emergency symptoms right now?",
                [
                    Choice(value="none", label="None of these"),
                    Choice(value="chest_pain", label="Severe chest pain"),
                    Choice(value="breathing", label="Difficulty breathing"),
                    Choice(value="bleeding", label="Heavy bleeding"),
                    Choice(value="weakness", label="Sudden weakness"),
                    Choice(value="seizure", label="Seizure"),
                ],
            ),
            ConversationPhase.CHIEF_COMPLAINT: (
                "Which problem is bothering you most?",
                [
                    Choice(value="pain", label="Pain"),
                    Choice(value="fever", label="Fever"),
                    Choice(value="breathing", label="Breathing problem"),
                    Choice(value="weakness", label="Weakness or tiredness"),
                    Choice(value="other", label="Other"),
                ],
            ),
            ConversationPhase.HPI: (
                "How would you describe the symptom?",
                [
                    Choice(value="new", label="Started recently"),
                    Choice(value="ongoing", label="Ongoing for some time"),
                    Choice(value="worse", label="Getting worse"),
                    Choice(value="comes_goes", label="Comes and goes"),
                    Choice(value="not_sure", label="Not sure"),
                ],
            ),
            ConversationPhase.PAST_MEDICAL: (
                "Do you have any of these health conditions?",
                [
                    Choice(value="none", label="None"),
                    Choice(value="diabetes", label="Diabetes"),
                    Choice(value="blood_pressure", label="High blood pressure"),
                    Choice(value="other", label="Another condition"),
                ],
            ),
            ConversationPhase.DRUG_ALLERGY: (
                "Which option best describes your medicines or allergies?",
                [
                    Choice(value="none", label="No regular medicines or allergies"),
                    Choice(value="medicines", label="I take regular medicines"),
                    Choice(value="allergy", label="I have a medicine allergy"),
                    Choice(value="not_sure", label="Not sure"),
                ],
            ),
            ConversationPhase.REVIEW_OF_SYSTEMS: (
                "Are you experiencing any other symptoms?",
                [
                    Choice(value="none", label="No other symptoms"),
                    Choice(value="yes", label="Yes, I have other symptoms"),
                    Choice(value="not_sure", label="Not sure"),
                ],
            ),
        }
        if phase == ConversationPhase.HPI and complaint_key in complaint_questions:
            prompt, options = complaint_questions[complaint_key]
        else:
            prompt, options = fallback_questions.get(
            phase,
            (
                "Which option best describes your current health concern?",
                [
                    Choice(value="better", label="Getting better"),
                    Choice(value="same", label="About the same"),
                    Choice(value="worse", label="Getting worse"),
                    Choice(value="not_sure", label="Not sure"),
                ],
            ),
        )
        return AIQuestion(
            question_id=f"{phase.value}_fallback",
            phase=phase,
            prompt=prompt,
            question_type=QuestionType.CHOICE,
            options=options,
            clinical_context="Option fallback used when the AI response was invalid.",
        )

    def _has_invalid_options(self, response: dict) -> bool:
        """Require every patient-facing question to be an option control."""
        question_type = response.get("question_type")
        options = response.get("options")
        return question_type not in ("choice", "multi_select") or (
            not isinstance(options, list) or len(options) < 2
        )

    def _build_answer_map(self, answered: list[dict]) -> dict:
        """Build a flat answer map for red-flag rule evaluation."""
        result: dict[str, Any] = {}
        for entry in answered:
            qid = entry.get("question_id", "")
            # Extract the field name from question_id (e.g., "hpi_3" -> use as key)
            result[qid] = entry.get("answer", "")

            # Also map known semantic fields
            question_text = entry.get("question", "").lower()
            answer_text = entry.get("answer", "")

            if "emergency" in question_text:
                result["emergency_symptoms"] = answer_text
            elif "chief complaint" in question_text or "main problem" in question_text:
                result["chief_complaint"] = answer_text
            elif "severity" in question_text or "scale" in question_text:
                try:
                    result["pain_severity"] = int(answer_text)
                except (ValueError, TypeError):
                    pass
            elif "radiation" in question_text or "spread" in question_text:
                result["radiation"] = answer_text
            elif "associated" in question_text or "other symptoms" in question_text:
                result["associated_symptoms"] = answer_text
            elif "breathless" in question_text or "breathing" in question_text:
                result["breathlessness_severity"] = answer_text
            elif "mental" in question_text or "mood" in question_text:
                result["mental_health"] = answer_text
            elif "temperature" in question_text or "fever" in question_text:
                try:
                    result["fever_temperature"] = float(answer_text)
                except (ValueError, TypeError):
                    pass

        return result

    @staticmethod
    def _is_emergency_positive(answer: str) -> bool:
        """Detect explicit emergency symptoms without false-ending normal speech."""
        import json
        raw = str(answer or "").strip()
        values = [raw]
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    values.extend(str(v) for v in parsed)
            except Exception:
                pass
        text = " ".join(values).lower()
        text = " ".join(text.split())
        if not text:
            return False
        if text in {"yes", "yes.", "yeah", "haan", "ha", "हाँ", "जी हाँ", "हां"}:
            return True
        emergency_values = {"chest_pain", "breathing", "bleeding", "weakness", "seizure", "unconscious", "stroke", "vomiting_blood", "black_stool"}
        if any(v in emergency_values for v in values[1:]):
            return True
        negative_patterns = (
            "no ", "no,", "none", "nothing", "not ", "i don't", "i do not",
            "i have no", "i am not", "don't have", "do not have", "no emergency",
            "नहीं", "कोई नहीं", "नहीं है", "मुझे नहीं", "ऐसा कुछ नहीं",
        )
        if any(text.startswith(prefix) or f" {prefix.strip()}" in text for prefix in negative_patterns):
            positive_construction = ("i have " in text or "i am having " in text or "having " in text or ("मुझे " in text and "नहीं" not in text))
            if not positive_construction:
                return False
        emergency_terms = (
            "severe chest pain", "chest pain", "difficulty breathing", "breathing difficulty",
            "can't breathe", "cannot breathe", "heavy bleeding", "severe bleeding",
            "unconscious", "fainted", "seizure", "convulsion", "sudden weakness",
            "sudden paralysis", "stroke", "blue lips", "vomiting blood", "blood in vomit",
            "black stool", "very severe pain", "बेहोश", "दौरा", "सांस लेने में दिक्कत",
            "सांस नहीं", "सीने में तेज दर्द", "बहुत ज्यादा खून", "अचानक कमजोरी",
        )
        return any(term in text for term in emergency_terms)

    def _determine_next_phase(
        self, state: ConversationState, intake_pathway: str
    ) -> ConversationPhase:
        """Determine if we should stay in the current phase or advance."""
        # The LLM drives phase advancement through its section_complete flag.
        # This method handles edge cases like emergency escalation.
        current = state.phase

        # If emergency was confirmed, stop the interview
        if current == ConversationPhase.EMERGENCY_SCREEN:
            # A non-emergency answer moves to the chief-complaint question.
            # Explicit emergency answers are already completed above.
            return ConversationPhase.CHIEF_COMPLAINT

        return current

    def _advance_phase(
        self, current: ConversationPhase, intake_pathway: str
    ) -> ConversationPhase:
        """Get the next phase after the current one is complete."""
        all_sections = list(CORE_INTAKE_SECTIONS)
        if intake_pathway == "ayush":
            all_sections.extend(AYUSH_EXTENSION_SECTIONS)

        # Map ConversationPhase to ClinicalSection
        phase_to_section = {
            ConversationPhase.EMERGENCY_SCREEN: ClinicalSection.EMERGENCY_SCREEN,
            ConversationPhase.CHIEF_COMPLAINT: ClinicalSection.CHIEF_COMPLAINT,
            ConversationPhase.HPI: ClinicalSection.HPI,
            ConversationPhase.PAST_MEDICAL: ClinicalSection.PAST_MEDICAL,
            ConversationPhase.PAST_SURGICAL: ClinicalSection.PAST_SURGICAL,
            ConversationPhase.DRUG_ALLERGY: ClinicalSection.DRUG_ALLERGY,
            ConversationPhase.FAMILY_HISTORY: ClinicalSection.FAMILY_HISTORY,
            ConversationPhase.PERSONAL_HISTORY: ClinicalSection.PERSONAL_HISTORY,
            ConversationPhase.REVIEW_OF_SYSTEMS: ClinicalSection.REVIEW_OF_SYSTEMS,
            ConversationPhase.AYUSH_DASHAVIDHA: ClinicalSection.AYUSH_DASHAVIDHA,
            ConversationPhase.AYUSH_AHARA_VIHARA: ClinicalSection.AYUSH_AHARA_VIHARA,
        }

        current_section = phase_to_section.get(current)
        if current_section and current_section in all_sections:
            idx = all_sections.index(current_section)
            if idx + 1 < len(all_sections):
                next_section = all_sections[idx + 1]
                # Map back to ConversationPhase
                section_to_phase = {v: k for k, v in phase_to_section.items()}
                return section_to_phase.get(next_section, ConversationPhase.COMPLETED)

        return ConversationPhase.COMPLETED

    def _get_presenting_complaint(self, answered: list[dict]) -> str:
        """Return the earliest explicit primary complaint answer."""
        for entry in answered:
            question = str(entry.get("question", "")).lower()
            answer = str(entry.get("answer", "")).strip()
            if not answer:
                continue
            if (
                entry.get("question_id") == "chief_complaint"
                or "chief complaint" in question
                or "main problem" in question
                or "problem is bothering you most" in question
            ):
                return answer
        return ""

    def _extract_topics(
        self, answered: list[dict], phase: ConversationPhase
    ) -> list[str]:
        """Extract covered topics for the current phase."""
        topics = []
        for entry in answered:
            qid = entry.get("question_id", "")
            if phase.value in qid:
                # Use the clinical_context or question text as topic
                topics.append(qid)
        return topics

    def _calculate_progress(
        self, state: ConversationState, intake_pathway: str
    ) -> float:
        """Calculate interview progress percentage."""
        all_phases = [
            ConversationPhase.EMERGENCY_SCREEN,
            ConversationPhase.CHIEF_COMPLAINT,
            ConversationPhase.HPI,
            ConversationPhase.PAST_MEDICAL,
            ConversationPhase.DRUG_ALLERGY,
            ConversationPhase.REVIEW_OF_SYSTEMS,
        ]
        if intake_pathway == "ayush":
            all_phases.extend([
                ConversationPhase.AYUSH_DASHAVIDHA,
                ConversationPhase.AYUSH_AHARA_VIHARA,
            ])

        total = len(all_phases)
        if state.phase in all_phases:
            current_idx = all_phases.index(state.phase)
            return round((current_idx / total) * 100, 1)
        return 0.0
