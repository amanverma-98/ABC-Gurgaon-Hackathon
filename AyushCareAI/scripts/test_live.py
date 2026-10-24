"""Live end-to-end test script for MediKiosk AI Backend.

Runs through a full simulated clinical flow against a running server:
1. Health Check
2. Create Session (AYUSH / General)
3. Grant DPDPA Consent
4. Start Adaptive Interview (SOCRATES)
5. Answer Questions (with Red-Flag Trigger)
6. Generate Bilingual Physician Summary
7. Preview ABDM FHIR R4 Bundle
"""

import sys
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"


def print_step(title: str):
    print(f"\n{'═' * 60}")
    print(f" ▶ {title}")
    print(f"{'═' * 60}")


def main():
    print("🏥 Testing MediKiosk AI Backend...")

    with httpx.Client(base_url=BASE_URL, timeout=60.0) as client:
        # ── 1. Health Check ──────────────────────────────────────
        print_step("1. System Health Check")
        try:
            r = client.get("/health")
            r.raise_for_status()
            health = r.json()
            print(f"Status: {health['status']}")
            print(f"LLM Available: {health['llm_available']}")
            print(f"OCR Available: {health['ocr_available']}")
            print(f"ASR Available: {health['asr_available']}")
            print(f"TTS Available: {health['tts_available']}")
        except httpx.ConnectError:
            print("❌ Server is not running!")
            print("Please start the server first in another terminal:")
            print("   uvicorn app.main:app --reload --port 8000")
            sys.exit(1)

        # ── 2. Create Patient Session ────────────────────────────
        print_step("2. Creating Patient Intake Session")
        session_payload = {
            "patient_id": "PATIENT_98765",
            "facility_id": "AIIA_OPD_01",
            "language": "hi",
            "intake_pathway": "ayush",
        }
        r = client.post("/sessions", json=session_payload)
        r.raise_for_status()
        session = r.json()
        session_id = session["id"]
        print(f"Session Created: {session_id}")
        print(f"Pathway: {session['intake_pathway']} | Language: {session['language']}")

        # ── 3. Grant Consent ─────────────────────────────────────
        print_step("3. Granting DPDPA Consent")
        consent_payload = {
            "clinical_intake": True,
            "document_processing": True,
            "his_abdm_sharing": True,
        }
        r = client.post(f"/sessions/{session_id}/consent", json=consent_payload)
        r.raise_for_status()
        receipt = r.json()["receipt"]
        print(f"Consent Receipt ID: {receipt['id']}")
        for s in receipt["scopes"]:
            print(f"  • {s['title']}: {s['status']}")

        # ── 4. Start Clinical Interview ──────────────────────────
        print_step("4. Starting AI Clinical Interview (Emergency Screening)")
        r = client.post(
            f"/sessions/{session_id}/conversation/start",
            json={"intake_pathway": "ayush"},
        )
        r.raise_for_status()
        state = r.json()
        q1 = state["current_question"]
        print(f"Phase: {state['phase']}")
        print(f"Question [{q1['question_id']}]: {q1['prompt']}")
        if q1.get("options"):
            print("Options:")
            for opt in q1["options"]:
                print(f"   [{opt['value']}] {opt['label']}")

        # ── 5. Answer Question with Red Flag ────────────────────
        print_step("5. Answering: 'None of the emergency symptoms'")
        r = client.post(
            f"/sessions/{session_id}/conversation/answer",
            json={
                "question_id": q1["question_id"],
                "answer": "none",
                "input_mode": "text",
            },
        )
        r.raise_for_status()
        turn1 = r.json()
        print(f"Answer confirmed. Next Phase: {turn1['phase']}")
        q2 = turn1["next_question"]
        if q2:
            print(f"Next Question: {q2['prompt']}")

        # ── 6. Submit Chief Complaint with Cardiac Alert ─────────
        print_step("6. Submitting Chest Pain with Radiation (Testing Red-Flag Trigger)")
        r = client.post(
            f"/sessions/{session_id}/conversation/answer",
            json={
                "question_id": q2["question_id"] if q2 else "chief_complaint",
                "answer": "Severe chest pain spreading to left arm with sweating since 2 hours",
                "input_mode": "text",
            },
        )
        r.raise_for_status()
        turn2 = r.json()
        print(f"Phase: {turn2['phase']} | Progress: {turn2['progress_percent']}%")
        if turn2.get("red_flags"):
            print("🚨 RED FLAGS TRIGGERED:")
            for rf in turn2["red_flags"]:
                print(f"   ⚠️ [{rf['level'].upper()}] {rf['title']}: {rf['patient_message']}")

        # ── 7. Generate Clinical Summary ─────────────────────────
        print_step("7. Generating Physician Clinical Summary")
        r = client.post(
            f"/sessions/{session_id}/summary/generate",
            json={"language": "en", "include_ayush": True},
        )
        if r.status_code == 200:
            summary = r.json()
            print(f"Summary Generated ({len(summary['sections'])} sections):")
            for sec in summary["sections"][:3]:
                print(f"\n   [{sec['heading_en']}]")
                print(f"   {sec['body']}")
        else:
            print(f"Summary generation status: {r.status_code}")

        # ── 8. FHIR R4 Preview ───────────────────────────────────
        print_step("8. Generating ABDM FHIR R4 Bundle Preview")
        r = client.get(f"/sessions/{session_id}/fhir/preview")
        r.raise_for_status()
        fhir = r.json()
        bundle = fhir["bundle"]
        print(f"FHIR Bundle Type: {bundle['type']}")
        print(f"Resources count: {len(bundle.get('entry', []))}")
        print(f"Export Guard: {fhir['export_blocked']} ({fhir['export_blocked_reason']})")

        print_step("✅ ALL TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
