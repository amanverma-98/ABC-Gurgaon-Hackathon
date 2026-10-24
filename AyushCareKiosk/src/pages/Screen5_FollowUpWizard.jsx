import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  Leaf,
  Mic,
  MicOff,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';
import AudioButton from '../components/common/AudioButton';
import { SkeletonFollowUpWizard } from '../components/common/KioskSkeleton';

const QUESTION_BANK = {
  headache: [
    {
      id: 'headache_onset',
      title: 'When did the headache begin?',
      hi: 'सिरदर्द कब शुरू हुआ?',
      options: [
        ['sudden', 'Suddenly', 'अचानक'],
        ['gradual', 'Gradually', 'धीरे-धीरे'],
        ['not_sure', 'Not sure', 'पता नहीं'],
      ],
    },
    {
      id: 'headache_character',
      title: 'How does the headache feel?',
      hi: 'सिरदर्द कैसा महसूस होता है?',
      options: [
        ['sharp', 'Sharp', 'तेज़ / चुभने वाला'],
        ['dull', 'Dull / Heavy', 'भारी / सुस्त'],
        ['throbbing', 'Throbbing', 'धड़कने जैसा'],
        ['pressure', 'Pressure', 'दबाव जैसा'],
      ],
    },
    {
      id: 'headache_severity',
      title: 'How severe is the pain?',
      hi: 'दर्द कितना तेज़ है?',
      options: [
        ['mild', 'Mild', 'हल्का'],
        ['moderate', 'Moderate', 'मध्यम'],
        ['severe', 'Severe', 'बहुत तेज़'],
      ],
    },
  ],

  chest_pain: [
    {
      id: 'chest_onset',
      title: 'When did the chest pain start?',
      hi: 'सीने में दर्द कब शुरू हुआ?',
      options: [
        ['today', 'Today', 'आज'],
        ['few_days', 'A few days ago', 'कुछ दिन पहले'],
        ['weeks', 'Several weeks ago', 'कई सप्ताह पहले'],
      ],
    },
    {
      id: 'chest_character',
      title: 'What does the pain feel like?',
      hi: 'दर्द कैसा महसूस होता है?',
      options: [
        ['pressure', 'Pressure / Tightness', 'दबाव / जकड़न'],
        ['sharp', 'Sharp', 'तेज़ / चुभने वाला'],
        ['burning', 'Burning', 'जलन'],
        ['other', 'Something else', 'कुछ और'],
      ],
    },
    {
      id: 'chest_radiation',
      title: 'Does the pain move anywhere else?',
      hi: 'क्या दर्द कहीं और फैलता है?',
      options: [
        ['none', 'No', 'नहीं'],
        ['left_arm', 'Left arm', 'बायां हाथ'],
        ['back', 'Back', 'पीठ'],
        ['jaw', 'Jaw / Neck', 'जबड़ा / गर्दन'],
      ],
    },
    {
      id: 'chest_breathlessness',
      title: 'Are you having difficulty breathing?',
      hi: 'क्या सांस लेने में तकलीफ हो रही है?',
      options: [
        ['yes', 'Yes', 'हां'],
        ['no', 'No', 'नहीं'],
      ],
      redFlag: true,
    },
  ],

  abdominal_pain: [
    {
      id: 'abdomen_location',
      title: 'Where exactly is the stomach pain?',
      hi: 'पेट में दर्द कहां है?',
      options: [
        ['upper', 'Upper abdomen', 'ऊपरी पेट'],
        ['lower', 'Lower abdomen', 'निचला पेट'],
        ['right', 'Right side', 'दाईं ओर'],
        ['left', 'Left side', 'बाईं ओर'],
        ['all_over', 'All over', 'पूरे पेट में'],
      ],
    },
    {
      id: 'abdomen_relation_food',
      title: 'Does it change after eating?',
      hi: 'क्या खाना खाने के बाद दर्द बदलता है?',
      options: [
        ['worse', 'Gets worse', 'बढ़ जाता है'],
        ['better', 'Gets better', 'कम हो जाता है'],
        ['same', 'No change', 'कोई बदलाव नहीं'],
        ['not_sure', 'Not sure', 'पता नहीं'],
      ],
    },
  ],

  joint_pain: [
    {
      id: 'joint_location',
      title: 'Which joints are affected?',
      hi: 'किन जोड़ों में परेशानी है?',
      options: [
        ['knee', 'Knee', 'घुटना'],
        ['shoulder', 'Shoulder', 'कंधा'],
        ['hip', 'Hip', 'कूल्हा'],
        ['multiple', 'Multiple joints', 'कई जोड़'],
      ],
    },
    {
      id: 'joint_stiffness',
      title: 'Do you feel stiffness?',
      hi: 'क्या जोड़ों में जकड़न महसूस होती है?',
      options: [
        ['morning', 'Mostly in the morning', 'मुख्यतः सुबह'],
        ['all_day', 'Throughout the day', 'पूरे दिन'],
        ['sometimes', 'Sometimes', 'कभी-कभी'],
        ['no', 'No stiffness', 'जकड़न नहीं'],
      ],
    },
  ],
};

const COMMON_QUESTIONS = [
  {
    id: 'symptom_progression',
    title: 'Overall, is the problem getting better or worse?',
    hi: 'कुल मिलाकर आपकी समस्या बेहतर हो रही है या बढ़ रही है?',
    options: [
      ['better', 'Getting better', 'बेहतर हो रही है'],
      ['same', 'About the same', 'लगभग वैसी ही'],
      ['worse', 'Getting worse', 'बढ़ रही है'],
    ],
  },
  {
    id: 'impact',
    title: 'How much is this problem affecting your daily activities?',
    hi: 'यह समस्या आपके रोज़मर्रा के काम को कितना प्रभावित कर रही है?',
    options: [
      ['none', 'Not at all', 'बिल्कुल नहीं'],
      ['some', 'A little', 'थोड़ा'],
      ['moderate', 'Moderately', 'मध्यम'],
      ['major', 'A lot', 'बहुत अधिक'],
    ],
  },
];

const AYUSH_QUESTIONS = [
  {
    id: 'prakriti',
    title: 'What is your natural body constitution?',
    traditional: 'Prakriti (प्रकृति)',
    explanation:
      'Your natural body and mind constitution — how your body has generally been since childhood.',
    hi:
      'आपका प्राकृतिक शरीर और मन का स्वभाव — बचपन से आपका शरीर सामान्यतः कैसा रहा है।',
    options: [
      ['vata', 'Light / active / variable', 'हल्का / सक्रिय / परिवर्तनशील'],
      ['pitta', 'Warm / intense / sharp', 'गर्म / तीव्र / स्पष्ट'],
      ['kapha', 'Steady / strong / calm', 'स्थिर / मजबूत / शांत'],
      ['mixed', 'A combination', 'मिश्रित'],
      ['unknown', 'I am not sure', 'पता नहीं'],
    ],
  },
  {
    id: 'agni',
    title: 'How would you describe your digestion?',
    traditional: 'Agni (पाचन अग्नि)',
    explanation:
      'Digestive strength — whether food generally feels easy or difficult to digest.',
    hi:
      'आपकी पाचन शक्ति — खाना सामान्यतः आसानी से पचता है या परेशानी होती है।',
    options: [
      ['strong', 'Usually digests well', 'आमतौर पर आसानी से पचता है'],
      ['variable', 'Sometimes good, sometimes poor', 'कभी अच्छा, कभी खराब'],
      ['weak', 'Often feels heavy', 'अक्सर भारीपन महसूस होता है'],
      ['irregular', 'Very irregular', 'बहुत अनियमित'],
    ],
  },
  {
    id: 'kostha',
    title: 'How regular are your bowel movements?',
    traditional: 'Koshtha (कोष्ठ)',
    explanation:
      'Bowel habit — how regularly and comfortably you pass stool.',
    hi:
      'पेट साफ होने की आदत — मल त्याग कितनी नियमित और आरामदायक है।',
    options: [
      ['regular', 'Regular and comfortable', 'नियमित और आरामदायक'],
      ['constipation', 'Often constipated', 'अक्सर कब्ज'],
      ['loose', 'Often loose', 'अक्सर दस्त'],
      ['variable', 'Changes frequently', 'अक्सर बदलता रहता है'],
    ],
  },
];

const getQuestionsForSymptoms = (symptoms, isAyush) => {
  const questions = [];

  symptoms.forEach((symptomId) => {
    if (QUESTION_BANK[symptomId]) {
      questions.push(...QUESTION_BANK[symptomId]);
    }
  });

  questions.push(...COMMON_QUESTIONS);

  if (isAyush) {
    questions.push(...AYUSH_QUESTIONS);
  }

  const seen = new Set();

  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
};

export const Screen5_FollowUpWizard = () => {
  const {
    sessionData,
    updateSessionData,
    nextScreen,
    prevScreen,
    language,
  } = useKioskStore();

  const { t, isHindi } = useTranslation();
  const isAyush = sessionData.track === 'AYUSH';

  const questions = useMemo(
    () =>
      getQuestionsForSymptoms(
        sessionData.symptoms || [],
        isAyush
      ),
    [sessionData.symptoms, isAyush]
  );

  const existingAnswers = sessionData.followUpAnswers || {};

  const [answers, setAnswers] = useState(existingAnswers);
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(
      sessionData.followUpQuestionIndex || 0,
      Math.max(questions.length - 1, 0)
    )
  );

  const [isListening, setIsListening] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const recognitionRef = useRef(null);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = isHindi ? 'hi-IN' : 'en-IN';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim() || '';

      if (!transcript || !currentQuestion) return;

      const matchedOption = currentQuestion.options.find(
        ([, english, hindi]) =>
          transcript.toLowerCase().includes(english.toLowerCase()) ||
          transcript.includes(hindi)
      );

      if (matchedOption) {
        selectAnswer(matchedOption[0]);
      }
    };

    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [isHindi, currentQuestion]);

  const selectAnswer = (value) => {
    if (!currentQuestion) return;

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: value,
    };

    setAnswers(updatedAnswers);

    updateSessionData({
      followUpAnswers: updatedAnswers,
      followUpQuestionIndex: currentIndex,
    });

    if (currentQuestion.redFlag && value === 'yes') {
      updateSessionData({
        redFlagDetected: true,
        redFlagReason: currentQuestion.title,
      });
    }
  };

  const startVoiceAnswer = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch {
      // Ignore browser duplicate-start error.
    }
  };

  const goNext = () => {
    if (!currentQuestion) {
      nextScreen();
      return;
    }

    if (!answers[currentQuestion.id]) return;

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;

      setCurrentIndex(nextIndex);

      updateSessionData({
        followUpAnswers: answers,
        followUpQuestionIndex: nextIndex,
      });
    } else {
      updateSessionData({
        followUpAnswers: answers,
        followUpQuestionIndex: questions.length,
        followUpCompleted: true,
      });

      nextScreen();
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
      return;
    }

    prevScreen();
  };

  if (!currentQuestion) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center">
          <ShieldCheck className="w-14 h-14 mx-auto text-teal-700" />

          <h1 className="text-2xl font-black text-slate-900 mt-4">
            {t('screen5.intakeComplete', 'Follow-Up Questions Complete')}
          </h1>

          <p className="text-slate-600 mt-2">
            {t('screen5.intakeCompleteSub', 'We have enough information to prepare your health summary.')}
          </p>

          <button
            type="button"
            onClick={nextScreen}
            className="mt-6 min-h-[56px] px-8 rounded-2xl bg-teal-800 text-white font-black cursor-pointer"
          >
            {t('nav.continue', 'Continue')}
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingQuestions) {
    return <SkeletonFollowUpWizard />;
  }

  const selectedAnswer = answers[currentQuestion.id];

  const progress =
    ((currentIndex + 1) / questions.length) * 100;

  const questionAudioText = isHindi
    ? currentQuestion.hi
    : currentQuestion.title;

  return (
    <div className="h-full w-full max-w-3xl mx-auto px-4 py-2 select-none flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="wizard-inline-back h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('nav.back', 'Back')}</span>
            </button>
            <span className="text-xs font-black text-slate-700">
              {t('screen5.questionCount', 'Question')} {currentIndex + 1} {t('screen5.of', 'of')} {questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AudioButton textToRead={questionAudioText} label={t('nav.listen', isHindi ? 'सुनें' : 'Listen')} className="min-h-[32px] py-1 text-xs" />
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-teal-700 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question & Options Center */}
      <div className="my-auto py-2 flex flex-col gap-2.5">
        {currentQuestion.traditional && (
          <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black">
            <Leaf className="w-3.5 h-3.5" />
            <span>{currentQuestion.traditional}</span>
          </div>
        )}

        <div>
          <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
            {isHindi ? currentQuestion.hi : currentQuestion.title}
          </h1>
          {currentQuestion.explanation && (
            <p className="mt-1 text-xs text-slate-500">
              {currentQuestion.explanation}
            </p>
          )}
        </div>

        {/* Voice Option Compact Bar */}
        <button
          type="button"
          onClick={startVoiceAnswer}
          className={`h-9 rounded-xl border px-3 flex items-center gap-2 text-left cursor-pointer transition ${
            isListening
              ? 'border-amber-400 bg-amber-50 text-amber-950 font-bold animate-pulse'
              : 'border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-900'
          }`}
        >
          <div className="w-5 h-5 rounded-md flex items-center justify-center">
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-teal-700" />}
          </div>
          <span className="text-xs font-bold">
            {isListening ? t('screen5.voiceListening', 'Listening… speak your answer') : t('screen5.voiceAnswer', 'Or tap to answer by voice')}
          </span>
        </button>

        {/* Answer Cards 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {currentQuestion.options.map(([value, english, hindi]) => {
            const selected = selectedAnswer === value;
            const primaryLabel = isHindi ? (hindi || english) : english;
            const secondaryLabel = isHindi ? english : (hindi || '');

            return (
              <button
                type="button"
                key={value}
                onClick={() => selectAnswer(value)}
                className={`relative h-[62px] rounded-xl border-2 px-3 py-2 text-left transition flex flex-col justify-center cursor-pointer ${
                  selected
                    ? 'border-teal-700 bg-teal-50 text-teal-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-teal-300 text-slate-800'
                }`}
              >
                {selected && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="font-black text-xs sm:text-sm pr-6 leading-tight">
                  {primaryLabel}
                </div>
                {secondaryLabel && (
                  <div className="text-[10px] text-slate-400 mt-0.5 pr-6 truncate">
                    {secondaryLabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Red flag */}
        {currentQuestion.redFlag && selectedAnswer === 'yes' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-2 flex items-center gap-2 text-xs text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-bold">{t('screen5.triageAlert', 'Please alert triage staff')}</span>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <Clock3 className="w-3.5 h-3.5" />
          <span>{t('screen5.takeYourTime', 'Take your time')}</span>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!selectedAnswer}
          className="ml-auto h-10 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-xs"
        >
          <span>
            {currentIndex === questions.length - 1
              ? t('screen5.finishQuestions', 'Finish Questions')
              : t('screen5.nextQuestion', 'Next Question')}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Screen5_FollowUpWizard;