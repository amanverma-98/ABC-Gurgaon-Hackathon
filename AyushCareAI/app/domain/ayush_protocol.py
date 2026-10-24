"""AYUSH Dashavidha Pariksha protocol for Ayurvedic extended history.

These parameters are captured as patient-reported history only.
MediKiosk never infers Prakriti/Vikriti, diagnoses, or recommends treatment.
An AYUSH clinician must review and interpret the completed record.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DashavidhaParameter:
    """One of the ten Dashavidha Pariksha assessment parameters."""
    id: str
    name_en: str
    name_hi: str
    name_sanskrit: str
    description_en: str
    description_hi: str
    prompt_en: str
    prompt_hi: str
    helper_en: str
    helper_hi: str


DASHAVIDHA_PARAMETERS: list[DashavidhaParameter] = [
    DashavidhaParameter(
        id="prakriti",
        name_en="Constitution",
        name_hi="प्रकृति",
        name_sanskrit="Prakriti",
        description_en="The innate constitution of the individual (Vata, Pitta, Kapha dominance)",
        description_hi="व्यक्ति की जन्मजात प्रकृति (वात, पित्त, कफ प्रधानता)",
        prompt_en="Has an AYUSH practitioner previously told you about your Prakriti (constitutional nature)?",
        prompt_hi="क्या किसी आयुष चिकित्सक ने आपको पहले आपकी प्रकृति (संवैधानिक स्वभाव) के बारे में बताया है?",
        helper_en="If you do not know, say or type 'not known'.",
        helper_hi="यदि आप नहीं जानते, तो 'पता नहीं' कहें या टाइप करें।",
    ),
    DashavidhaParameter(
        id="vikriti",
        name_en="Current Imbalance",
        name_hi="विकृति",
        name_sanskrit="Vikriti",
        description_en="Current state of dosha imbalance",
        description_hi="दोष असंतुलन की वर्तमान स्थिति",
        prompt_en="What changes or imbalances are you experiencing currently, according to your own understanding?",
        prompt_hi="आपकी अपनी समझ के अनुसार, आप वर्तमान में कौन से परिवर्तन या असंतुलन अनुभव कर रहे हैं?",
        helper_en="Describe any changes in digestion, energy, sleep, mood, or body temperature.",
        helper_hi="पाचन, ऊर्जा, नींद, मनोदशा या शरीर के तापमान में किसी भी बदलाव का वर्णन करें।",
    ),
    DashavidhaParameter(
        id="sara",
        name_en="Tissue Excellence",
        name_hi="सार",
        name_sanskrit="Sara",
        description_en="Quality and predominance of dhatus (body tissues)",
        description_hi="धातुओं (शरीर के ऊतकों) की गुणवत्ता और प्रधानता",
        prompt_en="How would you describe your general strength, body tissues, skin, hair, and overall vitality?",
        prompt_hi="आप अपनी सामान्य शक्ति, शरीर के ऊतक, त्वचा, बाल और समग्र जीवन शक्ति का कैसे वर्णन करेंगे?",
        helper_en="Mention skin quality, hair health, bone strength, and energy levels.",
        helper_hi="त्वचा की गुणवत्ता, बालों का स्वास्थ्य, हड्डियों की मजबूती और ऊर्जा स्तर का उल्लेख करें।",
    ),
    DashavidhaParameter(
        id="samhanana",
        name_en="Body Build",
        name_hi="संहनन",
        name_sanskrit="Samhanana",
        description_en="Compactness of body, structural integrity",
        description_hi="शरीर की संरचना, संरचनात्मक अखंडता",
        prompt_en="How would you describe your body build and physical endurance?",
        prompt_hi="आप अपने शरीर की बनावट और शारीरिक सहनशक्ति का कैसे वर्णन करेंगे?",
        helper_en="Examples: lean, medium, heavy, muscular, flexible.",
        helper_hi="उदाहरण: दुबला, मध्यम, भारी, मांसल, लचीला।",
    ),
    DashavidhaParameter(
        id="pramana",
        name_en="Body Proportions",
        name_hi="प्रमाण",
        name_sanskrit="Pramana",
        description_en="Body measurements and proportionality",
        description_hi="शरीर का माप और आनुपातिकता",
        prompt_en="Are there any body measurements, weight changes, or physical proportions you want the practitioner to know about?",
        prompt_hi="क्या कोई शरीर माप, वजन परिवर्तन या शारीरिक अनुपात है जो आप चिकित्सक को बताना चाहते हैं?",
        helper_en="Recent weight gain/loss, height, BMI if known.",
        helper_hi="हाल ही में वजन बढ़ना/घटना, ऊंचाई, बीएमआई यदि पता हो।",
    ),
    DashavidhaParameter(
        id="satmya",
        name_en="Adaptability / Tolerance",
        name_hi="सात्म्य",
        name_sanskrit="Satmya",
        description_en="Wholesome habits and substances the body is accustomed to",
        description_hi="पूर्ण आदतें और पदार्थ जिनकी शरीर को आदत है",
        prompt_en="Which foods, climates, routines, or habits suit you well or do not suit you?",
        prompt_hi="कौन से खाद्य पदार्थ, जलवायु, दिनचर्या या आदतें आपको अनुकूल या प्रतिकूल हैं?",
        helper_en="Mention food preferences, seasonal tolerance, and any substances you avoid.",
        helper_hi="खाद्य वरीयताओं, मौसमी सहनशीलता और किसी भी पदार्थ का उल्लेख करें जिससे आप बचते हैं।",
    ),
    DashavidhaParameter(
        id="sattva",
        name_en="Mental Strength",
        name_hi="सत्त्व",
        name_sanskrit="Sattva",
        description_en="Psychological constitution and mental resilience",
        description_hi="मनोवैज्ञानिक गठन और मानसिक लचीलापन",
        prompt_en="How have stress, mood, sleep, and emotional wellbeing been recently?",
        prompt_hi="हाल ही में तनाव, मनोदशा, नींद और भावनात्मक स्वास्थ्य कैसा रहा है?",
        helper_en="Describe stress levels, emotional patterns, and coping ability.",
        helper_hi="तनाव स्तर, भावनात्मक पैटर्न और मुकाबला करने की क्षमता का वर्णन करें।",
    ),
    DashavidhaParameter(
        id="ahara_shakti",
        name_en="Digestive Capacity",
        name_hi="आहार शक्ति",
        name_sanskrit="Ahara Shakti",
        description_en="Appetite strength, digestive capacity, and Agni status",
        description_hi="भूख की शक्ति, पाचन क्षमता और अग्नि की स्थिति",
        prompt_en="How is your appetite and digestion?",
        prompt_hi="आपकी भूख और पाचन कैसा है?",
        helper_en="You may mention hunger, digestion, bloating, acidity, bowel pattern, or food tolerance.",
        helper_hi="आप भूख, पाचन, सूजन, अम्लता, मल त्याग पैटर्न या भोजन सहनशीलता का उल्लेख कर सकते हैं।",
    ),
    DashavidhaParameter(
        id="vyayama_shakti",
        name_en="Exercise Capacity",
        name_hi="व्यायाम शक्ति",
        name_sanskrit="Vyayama Shakti",
        description_en="Physical exercise tolerance and stamina",
        description_hi="शारीरिक व्यायाम सहनशीलता और सहनशक्ति",
        prompt_en="How much physical activity or exercise can you comfortably do?",
        prompt_hi="आप आराम से कितनी शारीरिक गतिविधि या व्यायाम कर सकते हैं?",
        helper_en="Describe daily activity, exercise habits, and fatigue patterns.",
        helper_hi="दैनिक गतिविधि, व्यायाम की आदतें और थकान के पैटर्न का वर्णन करें।",
    ),
    DashavidhaParameter(
        id="vaya",
        name_en="Age / Life Stage",
        name_hi="वय",
        name_sanskrit="Vaya",
        description_en="Age and current life stage (Bala, Madhya, Vriddha)",
        description_hi="आयु और वर्तमान जीवन अवस्था (बाल, मध्य, वृद्ध)",
        prompt_en="What is your age and life stage, and have there been any recent life-stage changes relevant to your health?",
        prompt_hi="आपकी आयु और जीवन अवस्था क्या है, और क्या आपके स्वास्थ्य से संबंधित हाल ही में कोई जीवन-अवस्था परिवर्तन हुआ है?",
        helper_en="Mention puberty, pregnancy, menopause, or aging-related changes.",
        helper_hi="यौवन, गर्भावस्था, रजोनिवृत्ति, या उम्र बढ़ने से संबंधित परिवर्तनों का उल्लेख करें।",
    ),
]


# Ahara-Vihara is captured separately as a comprehensive daily routine assessment
AHARA_VIHARA_PROMPT = {
    "en": "Please describe your daily Ahara-Vihara: meals, meal timing, sleep schedule, work/rest routine, activity, and lifestyle habits.",
    "hi": "कृपया अपनी दैनिक आहार-विहार का वर्णन करें: भोजन, भोजन का समय, नींद का समय, काम/आराम की दिनचर्या, गतिविधि और जीवनशैली की आदतें।",
}

AHARA_VIHARA_HELPER = {
    "en": "Include breakfast, lunch, dinner timings, sleep and wake times, physical activity, and any regular habits like smoking or alcohol.",
    "hi": "नाश्ता, दोपहर का भोजन, रात के भोजन का समय, सोने और जागने का समय, शारीरिक गतिविधि, और धूम्रपान या शराब जैसी कोई नियमित आदतें शामिल करें।",
}


def get_ayush_parameters(language: str = "en") -> list[dict]:
    """Return Dashavidha parameters formatted for the given language."""
    lang_key = language if language in ("en", "hi") else "en"
    result = []
    for param in DASHAVIDHA_PARAMETERS:
        result.append({
            "id": param.id,
            "name": getattr(param, f"name_{lang_key}"),
            "description": getattr(param, f"description_{lang_key}"),
            "prompt": getattr(param, f"prompt_{lang_key}"),
            "helper": getattr(param, f"helper_{lang_key}"),
        })
    # Add Ahara-Vihara
    result.append({
        "id": "ahara_vihara",
        "name": "Ahara-Vihara" if lang_key == "en" else "आहार-विहार",
        "description": "Daily dietary and lifestyle routine",
        "prompt": AHARA_VIHARA_PROMPT[lang_key],
        "helper": AHARA_VIHARA_HELPER[lang_key],
    })
    return result
