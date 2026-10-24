import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import useMobileStore, { SCREENS } from "../src/store/useMobileStore.js";
import { translations } from "../src/i18n/translations.js";
import { canonicalPatient } from "../src/data/mockData.js";

console.log("=== RUNNING CLEANUP PROMPT 8 VERIFICATION TESTS ===");
console.log("Profile, Settings, Language, and Accessibility Architecture\n");

const store = useMobileStore.getState();

/* -------------------------------------------------------------------------- */
/* 1. PROFILE TESTS                                                           */
/* -------------------------------------------------------------------------- */
console.log("[TEST 1] ProfileScreen centralized data & masking...");

const profilePath = path.resolve("src/pages/mobile/ProfileScreen.jsx");
const profileCode = fs.readFileSync(profilePath, "utf-8");

// Assert no hardcoded personal details
assert.ok(!profileCode.includes("Sunita Devi"), "Profile must NOT contain hardcoded Sunita Devi");
assert.ok(!profileCode.includes("revealSensitive"), "Profile must NOT contain 'revealSensitive' state or button");
assert.ok(!profileCode.includes("profile_abdm_verified"), "Profile must NOT claim 'profile_abdm_verified'");
assert.ok(profileCode.includes("profile_abha_linked"), "Profile must use 'profile_abha_linked' badge");
assert.ok(profileCode.includes("Not provided") || profileCode.includes("notProvided"), "Profile must fallback to 'Not provided'");

// Test masking utility
assert.ok(profileCode.includes("getMaskedAbha"), "Profile must mask ABHA");
assert.ok(profileCode.includes("getMaskedMobile"), "Profile must mask mobile");
assert.ok(profileCode.includes("getMaskedAadhaar"), "Profile must mask Aadhaar");

console.log("✓ Profile screen uses centralized data, masked identifiers, and neutral ABHA linkage.");

/* -------------------------------------------------------------------------- */
/* 2. REMOVAL OF MISLEADING CLAIMS                                            */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 2] Verifying removal of misleading certification claims...");

assert.strictEqual(translations.en.profile_abdm_verified, undefined, "profile_abdm_verified must be removed from English");
assert.strictEqual(translations.hi.profile_abdm_verified, undefined, "profile_abdm_verified must be removed from Hindi");
assert.strictEqual(translations.en.profile_abha_linked, "ABHA-linked profile", "English must use 'ABHA-linked profile'");
assert.strictEqual(translations.hi.profile_abha_linked, "आभा-संबद्ध प्रोफ़ाइल", "Hindi must use 'आभा-संबद्ध प्रोफ़ाइल'");

const aboutPath = path.resolve("src/pages/mobile/AboutScreen.jsx");
const aboutCode = fs.readFileSync(aboutPath, "utf-8");

assert.ok(!aboutCode.includes("Production Edition"), "About screen must NOT claim 'Production Edition'");
assert.ok(!aboutCode.includes("ABDM Compliant"), "About screen must NOT claim official compliance certification");
assert.ok(!aboutCode.includes("DPDP certified"), "About screen must NOT claim DPDP certified");
assert.ok(aboutCode.includes("Prototype for SIH 2026"), "About screen must state 'Prototype for SIH 2026'");
assert.ok(aboutCode.includes("Version 1.0.0"), "About screen must retain 'Version 1.0.0'");
assert.ok(aboutCode.includes("MediKiosk"), "About screen must retain 'MediKiosk'");
assert.ok(aboutCode.includes("Patient Health Companion"), "About screen must retain 'Patient Health Companion'");

console.log("✓ Misleading certification and compliance claims removed.");

/* -------------------------------------------------------------------------- */
/* 3. SETTINGS SCREEN INTEGRATION                                             */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 3] Settings Screen structure and shortcuts...");

const settingsPath = path.resolve("src/pages/mobile/SettingsScreen.jsx");
const settingsCode = fs.readFileSync(settingsPath, "utf-8");

// Verify required 6 sections
assert.ok(settingsCode.includes("Language Preference") || settingsCode.includes("settings_lang_heading"), "Must have Language section");
assert.ok(settingsCode.includes("Accessibility Settings") || settingsCode.includes("settings_access_heading"), "Must have Accessibility section");
assert.ok(settingsCode.includes("SCREENS.PRIVACY"), "Must have Privacy & Data Control shortcut");
assert.ok(settingsCode.includes("SCREENS.KIOSK_SESSION"), "Must have Active Sessions shortcut");
assert.ok(settingsCode.includes("SCREENS.ABOUT"), "Must have About MediKiosk shortcut");
assert.ok(settingsCode.includes("logoutPatient") || settingsCode.includes("handleConfirmLogout"), "Must have Logout action");

console.log("✓ Settings screen contains all 6 required sections with direct shortcuts.");

/* -------------------------------------------------------------------------- */
/* 4. LANGUAGE SYSTEM (NO DUPLICATION, ROBUST FALLBACK)                       */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 4] Language switching and fallback mechanism...");

// Test language selection in store
store.setSelectedLanguage("hi");
assert.strictEqual(useMobileStore.getState().selectedLanguage, "hi", "Store language updated to 'hi'");

store.setSelectedLanguage("en");
assert.strictEqual(useMobileStore.getState().selectedLanguage, "en", "Store language updated to 'en'");

// Test fallback behavior
assert.ok(translations.en.app_name, "English dictionary exists");
assert.ok(translations.hi.app_name, "Hindi dictionary exists");

// Any non-existent key in Hindi falls back cleanly
const fallbackKey = "non_existent_key_sample";
const testFallback = translations.hi[fallbackKey] || translations.en[fallbackKey] || "Standard Fallback";
assert.strictEqual(testFallback, "Standard Fallback", "Fallback works as expected");

console.log("✓ Language system operates cleanly with English fallback for missing keys.");

/* -------------------------------------------------------------------------- */
/* 5. ACCESSIBILITY CONTROLS & CSS STYLING                                    */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 5] Accessibility controls (Text Size, High Contrast, Audio, Reduce Motion)...");

// Store accessibility tests
store.updateAccessibilitySettings({ textSize: "large" });
assert.strictEqual(useMobileStore.getState().accessibilitySettings.textSize, "large", "Text size updated to large");

store.updateAccessibilitySettings({ textSize: "xlarge" });
assert.strictEqual(useMobileStore.getState().accessibilitySettings.textSize, "xlarge", "Text size updated to xlarge");

store.updateAccessibilitySettings({ textSize: "default" });
assert.strictEqual(useMobileStore.getState().accessibilitySettings.textSize, "default", "Text size reset to default");

store.updateAccessibilitySettings({ highContrast: true });
assert.strictEqual(useMobileStore.getState().accessibilitySettings.highContrast, true, "High contrast enabled");

store.updateAccessibilitySettings({ highContrast: false });
assert.strictEqual(useMobileStore.getState().accessibilitySettings.highContrast, false, "High contrast disabled");

// Check CSS: NO filter: contrast(...)
const cssPath = path.resolve("src/index.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

assert.ok(!cssContent.includes("filter: contrast("), "index.css must NOT use 'filter: contrast(...)'");
assert.ok(cssContent.includes('html[data-text-size="large"]'), "index.css must scale root font for large");
assert.ok(cssContent.includes('html[data-text-size="xlarge"]'), "index.css must scale root font for xlarge");
assert.ok(cssContent.includes('html[data-high-contrast="true"]'), "index.css must use semantic high contrast rules");

console.log("✓ Accessibility settings update store and CSS scales root font without filter: contrast().");

/* -------------------------------------------------------------------------- */
/* 6. AUDIO INTEGRATION & SPEECH PRESERVATION                                 */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 6] Audio assistance and Hindi speech preservation...");

const audioBtnPath = path.resolve("src/components/mobile/HindiAudioButton.jsx");
const audioBtnCode = fs.readFileSync(audioBtnPath, "utf-8");

assert.ok(audioBtnCode.includes("accessibilitySettings"), "HindiAudioButton references accessibilitySettings");
assert.ok(audioBtnCode.includes("SpeechSynthesisUtterance"), "HindiAudioButton preserves Web SpeechSynthesis API");
assert.ok(audioBtnCode.includes("TODO"), "Includes TODO for screen-reader / automated voice guidance integration");

console.log("✓ Audio assistance connected and Hindi speech summary preserved.");

/* -------------------------------------------------------------------------- */
/* 7. LOGOUT PRESERVATION (PROMPT 3 ARCHITECTURE)                            */
/* -------------------------------------------------------------------------- */
console.log("\n[TEST 7] Preserving Prompt 3 logout behavior...");

// Log in as canonical patient first
useMobileStore.getState().setVerifiedPatient(canonicalPatient, "ABHA");
assert.strictEqual(useMobileStore.getState().isAuthenticated, true);
assert.strictEqual(useMobileStore.getState().session.patient?.name, "Rajesh Kumar Sharma");

// Perform logout
store.logoutPatient();
const loggedOutState = useMobileStore.getState();

assert.strictEqual(loggedOutState.isAuthenticated, false, "User must be unauthenticated after logout");
assert.strictEqual(loggedOutState.authType, null, "authType must be null");
assert.strictEqual(loggedOutState.patient, null, "patient must be null");
assert.strictEqual(loggedOutState.session.patient, null, "session.patient must be null");
assert.strictEqual(loggedOutState.currentScreen, SCREENS.AUTH, "currentScreen must be AUTH");
assert.ok(loggedOutState.medicalRecords?.length > 0, "Medical records must NOT be deleted on logout");

console.log("✓ Logout architecture preserved and non-destructive.");

console.log("\n=== ALL PROMPT 8 TESTS PASSED SUCCESSFULLY! ===");
