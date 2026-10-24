"""Language registry and multilingual support.

Covers 10 Indian languages with validation status and voice-capture eligibility.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class LocaleDefinition:
    code: str
    name_en: str
    name_native: str
    bcp47: str
    status: str  # "validated", "pilot", "planned"
    voice_capture: bool
    tts_available: bool
    bhashini_code: Optional[str] = None


LOCALE_REGISTRY: list[LocaleDefinition] = [
    LocaleDefinition("en", "English", "English", "en-IN", "validated", True, True, "en"),
    LocaleDefinition("hi", "Hindi", "हिन्दी", "hi-IN", "validated", True, True, "hi"),
    LocaleDefinition("bn", "Bengali", "বাংলা", "bn-IN", "validated", True, True, "bn"),
    LocaleDefinition("ta", "Tamil", "தமிழ்", "ta-IN", "validated", True, True, "ta"),
    LocaleDefinition("te", "Telugu", "తెలుగు", "te-IN", "validated", True, True, "te"),
    LocaleDefinition("mr", "Marathi", "मराठी", "mr-IN", "pilot", True, True, "mr"),
    LocaleDefinition("gu", "Gujarati", "ગુજરાતી", "gu-IN", "pilot", True, True, "gu"),
    LocaleDefinition("kn", "Kannada", "ಕನ್ನಡ", "kn-IN", "pilot", True, True, "kn"),
    LocaleDefinition("ml", "Malayalam", "മലയാളം", "ml-IN", "pilot", True, True, "ml"),
    LocaleDefinition("pa", "Punjabi", "ਪੰਜਾਬੀ", "pa-IN", "pilot", True, True, "pa"),
    LocaleDefinition("as", "Assamese", "অসমীয়া", "as-IN", "planned", False, False, "as"),
    LocaleDefinition("brx", "Bodo", "बड़ो", "brx-IN", "planned", False, False, "brx"),
    LocaleDefinition("doi", "Dogri", "डोगरी", "doi-IN", "planned", False, False, "doi"),
    LocaleDefinition("ks", "Kashmiri", "कॉशुर", "ks-IN", "planned", False, False, "ks"),
    LocaleDefinition("kok", "Konkani", "कोंकणी", "kok-IN", "planned", False, False, "kok"),
    LocaleDefinition("mai", "Maithili", "मैथिली", "mai-IN", "planned", False, False, "mai"),
    LocaleDefinition("mni", "Manipuri", "মৈতৈলোন্", "mni-IN", "planned", False, False, "mni"),
    LocaleDefinition("ne", "Nepali", "नेपाली", "ne-IN", "planned", False, False, "ne"),
    LocaleDefinition("or", "Odia", "ଓଡ଼ିଆ", "or-IN", "planned", False, False, "or"),
    LocaleDefinition("sa", "Sanskrit", "संस्कृतम्", "sa-IN", "planned", False, False, "sa"),
    LocaleDefinition("sat", "Santali", "ᱥᱟᱱᱛᱟᱲᱤ", "sat-IN", "planned", False, False, "sat"),
    LocaleDefinition("sd", "Sindhi", "سنڌي", "sd-IN", "planned", False, False, "sd"),
    LocaleDefinition("ur", "Urdu", "اردو", "ur-IN", "planned", False, False, "ur"),
]

_LOCALE_MAP: dict[str, LocaleDefinition] = {loc.code: loc for loc in LOCALE_REGISTRY}


def get_locale(code: str) -> Optional[LocaleDefinition]:
    """Look up a locale by its 2-letter code."""
    return _LOCALE_MAP.get(code)


def voice_capture_is_allowed(code: str) -> bool:
    """Check whether voice capture is allowed for a language."""
    loc = _LOCALE_MAP.get(code)
    return loc.voice_capture if loc else False


def get_bcp47(code: str) -> str:
    """Get BCP-47 tag for a language code, defaulting to en-IN."""
    loc = _LOCALE_MAP.get(code)
    return loc.bcp47 if loc else "en-IN"


def get_bhashini_code(code: str) -> str:
    """Get Bhashini language code for ASR/TTS."""
    loc = _LOCALE_MAP.get(code)
    return loc.bhashini_code if loc else "en"


def list_supported_languages() -> list[dict]:
    """Return all supported languages with their metadata."""
    return [
        {
            "code": loc.code,
            "name_en": loc.name_en,
            "name_native": loc.name_native,
            "status": loc.status,
            "voice_capture": loc.voice_capture,
            "tts_available": loc.tts_available,
        }
        for loc in LOCALE_REGISTRY
    ]
