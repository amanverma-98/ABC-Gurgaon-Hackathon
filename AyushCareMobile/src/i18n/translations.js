import { useEffect, useState } from "react";
import useMobileStore from "../store/useMobileStore.js";
import { apiRequest } from "../services/apiClient.js";
import { subscribeTranslations, getCachedTranslation, ensureTranslation } from "../services/remoteTranslationService.js";

export const translations = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_visits: "Visits",
    nav_records: "Records",
    nav_more: "More",

    // Common
    app_name: "AYUSHCARE",
    patient_portal: "PATIENT PORTAL",
    companion: "COMPANION",
    connected: "Connected",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    back: "Back",
    delete: "Delete",
    submit: "Submit",
    loading: "Loading...",
    today: "Today",
    recent: "Recent",
    active: "Active",
    verified: "Verified",
    view_details: "View Details",

    // Auth Screen
    auth_step_badge: "Step 1 of 2 · Patient Authentication",
    auth_title: "Log in to AyushCare",
    auth_subtitle: "Connect your health records securely via ABHA, Aadhaar, or your registered mobile number.",
    auth_tab_abha: "ABHA Number",
    auth_tab_aadhaar: "Aadhaar Card",
    auth_tab_mobile: "Mobile Number",
    auth_use_sample: "Use Sample",
    auth_notice: "A 6-digit OTP will be sent to your registered mobile number. For prototype testing, entering any 6-digit number will authenticate you.",
    auth_fast_track_badge: "Fast Track",
    auth_at_hospital: "At Hospital Kiosk?",
    auth_scan_kiosk_qr: "Scan Kiosk QR to Auto-Connect",
    auth_skip_login_sub: "Skip login and link companion session directly",
    auth_btn_scan_qr: "Scan QR",
    auth_btn_get_otp: "Get 6-Digit OTP →",
    auth_otp_title: "Enter 6-Digit OTP",
    auth_otp_subtitle: "We sent a 6-digit one-time password to your registered mobile number:",
    auth_otp_autofill: "Autofill (123456)",
    auth_resend_otp: "Resend OTP",
    auth_didnt_receive: "Didn't receive OTP?",
    auth_btn_verify: "Verify & Proceed to AyushCare",
    auth_change_method: "Change",

    // Home Screen (M1)
    home_welcome_back: "Welcome back,",
    home_kiosk_connected: "Connected to Hospital Kiosk ✓",
    home_kiosk_expired: "Kiosk session expired",
    home_kiosk_not_connected: "Not connected to a kiosk",
    home_kiosk_sync_sub: "Scan kiosk QR to sync appointments and queue tokens",
    home_kiosk_expired_sub: "Your previous kiosk connection has timed out for security.",
    home_kiosk_active_badge: "Session Active",
    home_btn_view_session: "View Session",
    home_btn_connect_kiosk: "Connect to Kiosk",
    home_btn_connect_again: "Connect Again",
    home_expires_in: "Expires in",
    home_today_consultation: "Today's Consultation",
    home_in_queue: "In Queue",
    home_your_opd_token: "Your OPD Token",
    home_room_no: "Room No.",
    home_patients_ahead: "patients ahead of you",
    home_estimated_wait: "Est:",
    home_btn_view_apt_details: "View Appointment & Vitals Details",
    home_recent_visit: "Recent Visit",
    home_all_visits: "All Visits →",
    home_last_visit: "Last visit",
    home_quick_actions: "Quick Actions",
    home_upload_docs: "Upload Documents",
    home_upload_docs_sub: "Prescriptions, lab reports, discharge summaries",
    home_health_summary: "Health Summary",
    home_health_summary_sub: "Consolidated health profile & history",
    home_medical_timeline: "Medical Timeline",
    home_medical_timeline_sub: "Chronological consultations & records",

    // Kiosk Connect Screen
    kiosk_connect_title: "Connect to Hospital Kiosk",
    kiosk_scan_heading: "Scan QR on Hospital Kiosk",
    kiosk_scan_sub: "Point your mobile camera at the QR code displayed on the kiosk terminal screen.",
    kiosk_align_frame: "Align QR Code Inside Frame",
    kiosk_btn_use_demo: "Use Demo Kiosk Session",
    kiosk_btn_scan_camera: "Scan QR Code with Camera",
    kiosk_evaluator_tools: "Evaluator Testing Tools",
    kiosk_test_expired: "Test Expired Session",
    kiosk_test_invalid: "Test Invalid QR",
    kiosk_privacy_guarantee: "Privacy Protected: The kiosk QR contains only a short-lived session reference. Personal health records and Aadhaar credentials are never exposed inside QR codes.",
    kiosk_connecting: "Connecting to Hospital Kiosk...",
    kiosk_validating_sub: "Validating session token and establishing secure companion link",
    kiosk_connected_title: "Connected to Hospital Kiosk ✓",
    kiosk_connected_sub: "Your mobile app is now synchronized with the hospital kiosk terminal.",
    kiosk_redirecting: "Redirecting to Patient Home...",
    kiosk_failed_title: "Connection Failed",
    kiosk_btn_try_again: "Try Again",
    kiosk_btn_return_home: "Return to Home",
    kiosk_btn_return_login: "Return to Login",

    // Kiosk Session Details Screen
    kiosk_session_title: "Kiosk Session",
    kiosk_terminal_heading: "Hospital Terminal",
    kiosk_status_active: "● Session Active",
    kiosk_status_ended: "Disconnected / Ended",
    kiosk_details_heading: "Session Details",
    kiosk_hospital_name: "Hospital Name",
    kiosk_department: "Department",
    kiosk_connected_time: "Connected Time",
    kiosk_session_expires: "Session Expires",
    kiosk_location: "Location & Floor",
    kiosk_privacy_gov: "Information Sharing Governance",
    kiosk_manage: "Manage",
    kiosk_sharing_restricted: "Health history sharing: Restricted",
    kiosk_sharing_allowed: "Health history sharing: Allowed",
    kiosk_sharing_sub: "Controlled strictly by your Privacy & Data settings. The kiosk can only access records permitted under your active consents.",
    kiosk_btn_end_session: "End Kiosk Session",
    kiosk_btn_connect_again: "Connect to Kiosk Again",
    kiosk_btn_back_home: "Back to Patient Home",
    kiosk_end_confirm_title: "End this kiosk session?",
    kiosk_end_confirm_sub: "Ending the session will disconnect your mobile app from the hospital kiosk. Your saved health records, visits, and appointments will not be deleted.",

    // Visits Screen
    visits_title: "My Healthcare Visits",
    visits_tab_all: "All Visits",
    visits_tab_allopathy: "Allopathy",
    visits_tab_ayush: "AYUSH",
    visits_empty: "No clinical encounters found in this category.",
    visits_encounter_details: "Clinical Encounter Details",
    visits_vitals: "Vitals Recorded",
    visits_symptoms: "Chief Symptoms & Assessment",
    visits_doctor_notes: "Consulting Physician Notes",
    visits_prescriptions: "Prescribed Treatments & Medications",

    // Appointments Screen
    apt_title: "Consultations & Appointments",
    apt_tab_upcoming: "Upcoming",
    apt_tab_past: "Past Visits",
    apt_token_label: "Token Number",
    apt_queue_tracker: "Live OPD Queue Status",
    apt_instructions: "Patient Instructions",

    // Records Screen
    records_title: "Medical Records",
    records_search_placeholder: "Search documents, prescriptions, labs...",
    records_cat_all: "All Documents",
    records_cat_prescription: "Prescriptions",
    records_cat_lab_report: "Lab Reports",
    records_cat_discharge: "Discharge Summaries",
    records_btn_upload: "+ Upload New Document",
    records_verified_medicines: "Verified Medications & Dosage",
    records_diagnosis_label: "Clinical Diagnosis",

    // Document Capture (M3)
    capture_title: "Capture Health Documents",
    capture_retake_title: "Retake Page Mode",
    capture_clusters_heading: "Document Sets & Clusters",
    capture_btn_new_set: "+ New Report Set",
    capture_add_set: "Add Set",
    capture_upload_btn: "Upload",
    capture_review_btn: "Review",
    capture_snap_btn: "Snap",
    capture_create_set_title: "Create Document Set",
    capture_create_set_sub: "Group related pages together (e.g. 3-page Blood Report or 4-page CT Scan).",
    capture_quick_presets: "Quick Category Presets",
    capture_custom_set_title: "Custom Set Title",
    capture_btn_create_select: "Create & Select",
    capture_cancel_retake: "Cancel Retake",

    // Document Review (M4)
    review_title: "Review Documents",
    review_ai_enhancement: "AI Image Enhancement",
    review_ai_sub: "All images have been adjusted for contrast and sharpness. You can review, retake, or organize pages in each report set below.",
    review_sets_heading: "Document Sets & Clusters",
    review_btn_retake: "Retake",
    review_btn_add_page: "+ Add Page to",
    review_btn_add_more: "+ Snap More Pages",
    review_btn_submit: "Use All Pages ✓",
    review_modal_inspect: "Inspect Page",
    review_modal_looks_clear: "Looks Clear ✓",
    review_move_to_set: "Move Page to Set:",

    // Document Analysis (M5)
    analysis_reading: "Reading your document",
    analysis_reading_plural: "Reading your documents",
    analysis_sub: "AI is extracting medical information from the uploaded documents",
    analysis_step_0: "Image Captured",
    analysis_step_1: "Image Enhanced",
    analysis_step_2: "Reading Text",
    analysis_step_3: "Understanding Medical Information",
    analysis_step_4: "Extracting Important Details",

    // Extracted Information (M6)
    m6_title: "Extracted Information",
    m6_subtitle: "Please verify the information recognized by AI before saving.",
    m6_diagnoses_heading: "Recognized Diagnoses",
    m6_medicines_heading: "Recognized Medications",
    m6_btn_confirm: "Confirm & Continue →",

    // Timeline (M7)
    timeline_title: "Medical Timeline",
    timeline_subtitle: "Chronological history of all medical encounters and reports.",

    // Health Summary (M8)
    summary_title: "Health Summary",
    summary_subtitle: "Consolidated health profile synthesized from past visits.",
    summary_conditions: "Active Health Conditions",
    summary_allergies: "Known Allergies & Sensitivities",
    summary_current_meds: "Current Medications",
    summary_vitals_summary: "Recent Vital Signs",
    summary_btn_listen: "Listen to Summary",
    summary_btn_playing: "Playing Audio...",
    summary_btn_submit: "Submit",

    // Information Sent (M9)
    sent_title: "Session Completed",
    sent_heading: "Your Information Has Been Sent ✓",
    sent_sub: "Your medical history and documents are now available for your doctor to review.",
    sent_btn_return: "Return to Hospital Kiosk",

    // More Screen
    more_title: "More & Settings",
    more_profile_card_view: "View Profile →",
    more_kiosk_conn_title: "Hospital Kiosk Connection",
    more_menu_profile: "Patient Identity & Profile",
    more_menu_profile_sub: "Demographics, masked health identifiers, and contact details",
    more_menu_privacy: "Privacy & Data Control",
    more_menu_privacy_sub: "Manage how your health information is shared and accessed",
    more_menu_settings: "Settings & Accessibility",
    more_menu_settings_sub: "Language preferences, text scaling, high contrast",
    more_menu_sessions: "Active Kiosk Sessions",
    more_menu_summary: "My Health Summary",
    more_menu_summary_sub: "Consolidated clinical history with voice support",
    more_menu_timeline: "Medical Chronological Timeline",
    more_menu_timeline_sub: "Timeline of consultations, diagnoses, and documents",
    more_menu_about: "About AyushCare",
    more_menu_about_sub: "App version, prototype mission, and system details",
    more_btn_logout: "Switch Patient / Log Out",

    // Profile Screen
    profile_title: "Patient Profile",
    profile_personal_info: "Personal Information",
    profile_btn_edit: "Edit Profile",
    profile_name: "Full Name",
    profile_dob: "Date of Birth",
    profile_gender: "Gender",
    profile_mobile: "Mobile Number",
    profile_blood_group: "Blood Group",
    profile_prakriti: "Prakriti (Ayush Profile)",
    profile_address: "Permanent Residential Address",
    profile_abha_linked: "ABHA-linked profile",
    profile_abha_number: "ABHA Number (Health ID)",
    profile_edit_title: "Edit Patient Profile",
    profile_edit_display_name: "Display Name",
    profile_save_changes: "Save Changes",
    profile_updated_toast: "Profile updated",

    // Settings Screen
    settings_title: "Settings & Preferences",
    settings_lang_heading: "Language",
    settings_lang_sub: "Choose your preferred language for consultations and application guidance.",
    settings_access_heading: "Accessibility",
    settings_text_size: "Text Size",
    settings_text_default: "Default",
    settings_text_large: "Large",
    settings_text_xlarge: "Extra Large",
    settings_high_contrast: "High Contrast",
    settings_high_contrast_sub: "Increases visual clarity and sharpens borders with high contrast colors",
    settings_audio_assist: "Audio Assistance",
    settings_audio_assist_sub: "Enables speech reading of health summaries",
    settings_reduce_motion: "Reduce Motion",
    settings_reduce_motion_sub: "Minimizes screen transitions and animations",
    settings_about_heading: "About MediKiosk",
    settings_about_sub: "Patient Health Companion prototype for SIH 2026 · Version 1.0.0",
    settings_btn_logout: "Log Out of MediKiosk",
    settings_logout_confirm_title: "Log out of MediKiosk?",
    settings_logout_confirm_sub: "Your local mobile session will be signed out. Your saved health records, visits, appointments, and privacy settings will not be deleted.",
    settings_btn_confirm_logout: "Log Out",

    // Privacy & Data Control Screen
    privacy_title: "Privacy & Data Control",
    privacy_notice: "Patient-controlled privacy feature designed to give patients greater visibility and control over health-information sharing.",
    privacy_history_sharing_heading: "Health History Sharing",
    privacy_history_sharing_sub: "Control whether your saved health information can be shared with connected healthcare sessions.",
    privacy_status_available: "Available",
    privacy_status_restricted: "Restricted",
    privacy_action_lock: "Lock Sharing",
    privacy_action_allow: "Allow Sharing",
    privacy_tab_sharing: "History Sharing",
    privacy_tab_active_consents: "Active Consents",
    privacy_tab_consent_history: "Consent History",
    privacy_tab_access_history: "Access History",
    privacy_tab_sessions: "Active Sessions",
    privacy_active_consents_heading: "Active Consents",
    privacy_active_consents_sub: "Permissions granted to healthcare providers to access your information.",
    privacy_consent_history_heading: "Consent History",
    privacy_consent_history_sub: "Audit trail of previously granted, expired, or withdrawn sharing consents.",
    privacy_access_history_heading: "Sample Access Activity",
    privacy_access_history_sub: "Sample access activity shown for this prototype.",
    privacy_access_history_disclaimer: "Prototype Notice: Sample access activity for demonstration.",
    privacy_active_sessions_heading: "Active Sessions",
    privacy_active_sessions_sub: "Connected kiosk or doctor consultation terminals with active data links.",
    privacy_btn_withdraw: "Withdraw Access",
    privacy_btn_reallow: "Re-Allow Access",
    privacy_btn_view_details: "View Details",
    privacy_btn_end_session: "End Session",
    privacy_non_destructive_notice: "Locking sharing or withdrawing consent does not delete or hide any records, visits, appointments, documents, or timeline from your personal account.",
  },

  hi: {
    // Navigation
    nav_home: "होम",
    nav_visits: "मुलाकातें",
    nav_records: "रिकॉर्ड्स",
    nav_more: "अधिक",

    // Common
    app_name: "आयुषकेयर",
    patient_portal: "मरीज़ पोर्टल",
    companion: "साथी",
    connected: "संबद्ध",
    save: "सहेजें",
    cancel: "रद्द करें",
    confirm: "पुष्टि करें",
    back: "पीछे",
    delete: "हटाएं",
    submit: "जमा करें",
    loading: "लोड हो रहा है...",
    today: "आज",
    recent: "हालिया",
    active: "सक्रिय",
    verified: "सत्यापित",
    view_details: "विवरण देखें",

    // Auth Screen
    auth_step_badge: "चरण 1 का 2 · मरीज़ प्रमाणीकरण",
    auth_title: "आयुषकेयर में लॉग इन करें",
    auth_subtitle: "आभा संख्या, आधार कार्ड या अपने पंजीकृत मोबाइल नंबर द्वारा अपने स्वास्थ्य रिकॉर्ड से सुरक्षित रूप से जुड़ें।",
    auth_tab_abha: "आभा संख्या",
    auth_tab_aadhaar: "आधार कार्ड",
    auth_tab_mobile: "मोबाइल नंबर",
    auth_use_sample: "नमूना भरें",
    auth_notice: "आपके पंजीकृत मोबाइल नंबर पर 6-अंकों का ओटीपी भेजा जाएगा। प्रोटोटाइप परीक्षण के लिए, कोई भी 6-अंकीय संख्या दर्ज करने पर प्रमाणीकरण हो जाएगा।",
    auth_fast_track_badge: "सीधा संपर्क",
    auth_at_hospital: "अस्पताल कियोस्क पर हैं?",
    auth_scan_kiosk_qr: "कियोस्क क्यूआर स्कैन कर सीधे जुड़ें",
    auth_skip_login_sub: "लॉगिन छोड़े और अपने मोबाइल साथी को सीधे कियोस्क से जोड़ें",
    auth_btn_scan_qr: "क्यूआर स्कैन करें",
    auth_btn_get_otp: "6-अंकों का ओटीपी प्राप्त करें →",
    auth_otp_title: "6-अंकों का ओटीपी दर्ज करें",
    auth_otp_subtitle: "हमने आपके पंजीकृत मोबाइल नंबर पर 6-अंकों का ओटीपी भेजा है:",
    auth_otp_autofill: "स्वतः भरें (123456)",
    auth_resend_otp: "ओटीपी पुनः भेजें",
    auth_didnt_receive: "ओटीपी नहीं मिला?",
    auth_btn_verify: "सत्यापित करें और आगे बढ़ें",
    auth_change_method: "बदलें",

    // Home Screen (M1)
    home_welcome_back: "वापसी पर स्वागत है,",
    home_kiosk_connected: "अस्पताल कियोस्क से संबद्ध ✓",
    home_kiosk_expired: "कियोस्क सत्र समाप्त हो गया",
    home_kiosk_not_connected: "कियोस्क से संबद्ध नहीं है",
    home_kiosk_sync_sub: "कियोस्क क्यूआर स्कैन कर परामर्श व टोकन सिंक करें",
    home_kiosk_expired_sub: "सुरक्षा कारणों से आपका पिछला कियोस्क संपर्क समाप्त हो गया है।",
    home_kiosk_active_badge: "सत्र सक्रिय",
    home_btn_view_session: "सत्र देखें",
    home_btn_connect_kiosk: "कियोस्क से जुड़ें",
    home_btn_connect_again: "पुनः जुड़ें",
    home_expires_in: "शेष समय",
    home_today_consultation: "आज का परामर्श",
    home_in_queue: "पंक्ति में",
    home_your_opd_token: "आपका ओपीडी टोकन",
    home_room_no: "कमरा नं.",
    home_patients_ahead: "मरीज़ आपसे आगे हैं",
    home_estimated_wait: "अनुमानित:",
    home_btn_view_apt_details: "अपॉइंटमेंट व वाइटल्स विवरण देखें",
    home_recent_visit: "हालिया मुलाकात",
    home_all_visits: "सभी मुलाकातें →",
    home_last_visit: "पिछली मुलाकात",
    home_quick_actions: "त्वरित क्रियाएं",
    home_upload_docs: "दस्तावेज़ अपलोड करें",
    home_upload_docs_sub: "पर्चे, लैब रिपोर्ट, डिस्चार्ज सारांश",
    home_health_summary: "स्वास्थ्य सारांश",
    home_health_summary_sub: "एकीकृत स्वास्थ्य प्रोफ़ाइल व इतिहास",
    home_medical_timeline: "चिकित्सा समयरेखा",
    home_medical_timeline_sub: "क्रमबद्ध परामर्श व दस्तावेज़",

    // Kiosk Connect Screen
    kiosk_connect_title: "अस्पताल कियोस्क से जुड़ें",
    kiosk_scan_heading: "अस्पताल कियोस्क पर क्यूआर स्कैन करें",
    kiosk_scan_sub: "कियोस्क स्क्रीन पर प्रदर्शित क्यूआर कोड पर अपना मोबाइल कैमरा केंद्रित करें।",
    kiosk_align_frame: "क्यूआर कोड को फ्रेम के अंदर रखें",
    kiosk_btn_use_demo: "डेमो कियोस्क सत्र से जुड़ें",
    kiosk_btn_scan_camera: "कैमरे से क्यूआर स्कैन करें",
    kiosk_evaluator_tools: "परीक्षण उपकरण",
    kiosk_test_expired: "समाप्त सत्र का परीक्षण करें",
    kiosk_test_invalid: "अमान्य क्यूआर का परीक्षण करें",
    kiosk_privacy_guarantee: "गोपनीयता सुरक्षित: कियोस्क क्यूआर में केवल अल्पकालिक सत्र टोकन होता है। आपका स्वास्थ्य इतिहास या आधार विवरण क्यूआर में कभी शामिल नहीं होता।",
    kiosk_connecting: "अस्पताल कियोस्क से संपर्क हो रहा है...",
    kiosk_validating_sub: "सत्र टोकन सत्यापित कर सुरक्षित संपर्क स्थापित किया जा रहा है",
    kiosk_connected_title: "अस्पताल कियोस्क से संबद्ध ✓",
    kiosk_connected_sub: "आपका मोबाइल ऐप अब अस्पताल कियोस्क टर्मिनल से सिंक हो चुका है।",
    kiosk_redirecting: "मरीज़ होम पर ले जाया जा रहा है...",
    kiosk_failed_title: "संपर्क असफल",
    kiosk_btn_try_again: "पुनः प्रयास करें",
    kiosk_btn_return_home: "होम पर लौटें",
    kiosk_btn_return_login: "लॉगिन पर लौटें",

    // Kiosk Session Details Screen
    kiosk_session_title: "कियोस्क सत्र",
    kiosk_terminal_heading: "अस्पताल टर्मिनल",
    kiosk_status_active: "● सत्र सक्रिय",
    kiosk_status_ended: "सत्र समाप्त",
    kiosk_details_heading: "सत्र विवरण",
    kiosk_hospital_name: "अस्पताल का नाम",
    kiosk_department: "विभाग",
    kiosk_connected_time: "संबद्ध होने का समय",
    kiosk_session_expires: "सत्र समाप्त होने का समय",
    kiosk_location: "स्थान व मंजिल",
    kiosk_privacy_gov: "डेटा साझाकरण नियंत्रण",
    kiosk_manage: "प्रबंधन करें",
    kiosk_sharing_restricted: "स्वास्थ्य इतिहास साझाकरण: प्रतिबंधित",
    kiosk_sharing_allowed: "स्वास्थ्य इतिहास साझाकरण: अनुमत",
    kiosk_sharing_sub: "आपकी गोपनीयता सेटिंग्स द्वारा नियंत्रित। कियोस्क केवल आपकी सक्रिय सहमति के अनुसार ही रिकॉर्ड प्राप्त कर सकता है।",
    kiosk_btn_end_session: "कियोस्क सत्र समाप्त करें",
    kiosk_btn_connect_again: "कियोस्क से पुनः जुड़ें",
    kiosk_btn_back_home: "मरीज़ होम पर वापस जाएं",
    kiosk_end_confirm_title: "क्या यह कियोस्क सत्र समाप्त करें?",
    kiosk_end_confirm_sub: "सत्र समाप्त करने से आपका मोबाइल ऐप अस्पताल कियोस्क से अलग हो जाएगा। आपके सहेजे गए स्वास्थ्य रिकॉर्ड और अपॉइंटमेंट नहीं हटाए जाएंगे।",

    // Visits Screen
    visits_title: "मेरी स्वास्थ्य मुलाकातें",
    visits_tab_all: "सभी मुलाकातें",
    visits_tab_allopathy: "एलोपैथी",
    visits_tab_ayush: "आयुष",
    visits_empty: "इस श्रेणी में कोई मुलाकात नहीं मिली।",
    visits_encounter_details: "चिकित्सकीय परामर्श विवरण",
    visits_vitals: "दर्ज किए गए वाइटल्स",
    visits_symptoms: "प्रमुख लक्षण व मूल्यांकन",
    visits_doctor_notes: "चिकित्सक के परामर्श नोट्स",
    visits_prescriptions: "निर्धारित उपचार व दवाएं",

    // Appointments Screen
    apt_title: "परामर्श व अपॉइंटमेंट",
    apt_tab_upcoming: "आगामी",
    apt_tab_past: "पिछली मुलाकातें",
    apt_token_label: "टोकन संख्या",
    apt_queue_tracker: "लाइव ओपीडी पंक्ति स्थिति",
    apt_instructions: "मरीज़ के लिए निर्देश",

    // Records Screen
    records_title: "चिकित्सा रिकॉर्ड",
    records_search_placeholder: "दस्तावेज़, पर्चे, लैब खोजें...",
    records_cat_all: "सभी दस्तावेज़",
    records_cat_prescription: "पर्चे",
    records_cat_lab_report: "लैब रिपोर्ट",
    records_cat_discharge: "डिस्चार्ज सारांश",
    records_btn_upload: "+ नया दस्तावेज़ अपलोड करें",
    records_verified_medicines: "सत्यापित दवाएं व खुराक",
    records_diagnosis_label: "चिकित्सकीय निदान",

    // Document Capture (M3)
    capture_title: "स्वास्थ्य दस्तावेज़ कैप्चर करें",
    capture_retake_title: "पृष्ठ पुनः फोटो मोड",
    capture_clusters_heading: "दस्तावेज़ सेट व समूह",
    capture_btn_new_set: "+ नया रिपोर्ट सेट",
    capture_add_set: "सेट जोड़ें",
    capture_upload_btn: "अपलोड",
    capture_review_btn: "समीक्षा",
    capture_snap_btn: "खींचें",
    capture_create_set_title: "दस्तावेज़ सेट बनाएं",
    capture_create_set_sub: "संबंधित पृष्ठों को एक समूह में रखें (जैसे 3-पृष्ठों की ब्लड रिपोर्ट या 4-पृष्ठों का सीटी स्कैन)।",
    capture_quick_presets: "त्वरित श्रेणी विकल्प",
    capture_custom_set_title: "कस्टम सेट का नाम",
    capture_btn_create_select: "बनाएं और चुनें",
    capture_cancel_retake: "रद्द करें",

    // Document Review (M4)
    review_title: "दस्तावेज़ों की समीक्षा करें",
    review_ai_enhancement: "एआई छवि संवर्धन",
    review_ai_sub: "स्पष्टता और कंट्रास्ट के लिए सभी छवियों को समायोजित किया गया है। आप नीचे प्रत्येक सेट में पृष्ठों की समीक्षा, पुनः फोटो या व्यवस्था कर सकते हैं।",
    review_sets_heading: "दस्तावेज़ सेट व समूह",
    review_btn_retake: "पुनः फोटो",
    review_btn_add_page: "+ पृष्ठ जोड़ें",
    review_btn_add_more: "+ और पृष्ठ खींचें",
    review_btn_submit: "सभी पृष्ठ उपयोग करें ✓",
    review_modal_inspect: "पृष्ठ निरीक्षण",
    review_modal_looks_clear: "स्पष्ट दिख रहा है ✓",
    review_move_to_set: "पृष्ठ को इस सेट में ले जाएं:",

    // Document Analysis (M5)
    analysis_reading: "दस्तावेज़ पढ़ा जा रहा है",
    analysis_reading_plural: "दस्तावेज़ पढ़े जा रहे हैं",
    analysis_sub: "अपलोड किए गए दस्तावेज़ों से चिकित्सीय जानकारी निकाली जा रही है",
    analysis_step_0: "छवि कैप्चर हुई",
    analysis_step_1: "छवि संवर्धित हुई",
    analysis_step_2: "पाठ पढ़ा जा रहा है",
    analysis_step_3: "चिकित्सा जानकारी समझी जा रही है",
    analysis_step_4: "आवश्यक विवरण निकाले जा रहे हैं",

    // Extracted Information (M6)
    m6_title: "निकाली गई जानकारी",
    m6_subtitle: "सहेजने से पहले कृपया एआई द्वारा पहचानी गई जानकारी सत्यापित करें।",
    m6_diagnoses_heading: "पहचाने गए निदान",
    m6_medicines_heading: "पहचानी गई दवाएं",
    m6_btn_confirm: "पुष्टि करें और आगे बढ़ें →",

    // Timeline (M7)
    timeline_title: "चिकित्सा समयरेखा",
    timeline_subtitle: "सभी मुलाकातों, रिपोर्टों और निदानों का क्रमबद्ध इतिहास।",

    // Health Summary (M8)
    summary_title: "स्वास्थ्य सारांश",
    summary_subtitle: "पिछली मुलाकातों व जांचों से तैयार समग्र स्वास्थ्य प्रोफ़ाइल।",
    summary_conditions: "सक्रिय स्वास्थ्य स्थितियां",
    summary_allergies: "ज्ञात एलर्जी व संवेदनशीलता",
    summary_current_meds: "वर्तमान दवाएं",
    summary_vitals_summary: "हालिया वाइटल संकेत",
    summary_btn_listen: "सारांश सुनें",
    summary_btn_playing: "ऑडियो बज रहा है...",
    summary_btn_submit: "जमा करें",

    // Information Sent (M9)
    sent_title: "सत्र संपन्न",
    sent_heading: "आपकी जानकारी भेज दी गई है ✓",
    sent_sub: "आपका स्वास्थ्य इतिहास और दस्तावेज़ अब डॉक्टर के समीक्षा हेतु उपलब्ध हैं।",
    sent_btn_return: "अस्पताल कियोस्क पर वापस जाएं",

    // More Screen
    more_title: "अधिक व सेटिंग्स",
    more_profile_card_view: "प्रोफ़ाइल देखें →",
    more_kiosk_conn_title: "अस्पताल कियोस्क संपर्क",
    more_menu_profile: "मरीज़ पहचान व प्रोफ़ाइल",
    more_menu_profile_sub: "जनसांख्यिकी, मास्क किए गए पहचानकर्ता और संपर्क विवरण",
    more_menu_privacy: "गोपनीयता व डेटा नियंत्रण",
    more_menu_privacy_sub: "स्वास्थ्य जानकारी के साझाकरण व पहुंच का प्रबंधन करें",
    more_menu_settings: "सेटिंग्स व सुगमता",
    more_menu_settings_sub: "भाषा प्राथमिकताएं, टेक्स्ट आकार, उच्च कंट्रास्ट",
    more_menu_sessions: "सक्रिय कियोस्क सत्र",
    more_menu_summary: "मेरा स्वास्थ्य सारांश",
    more_menu_summary_sub: "आवाज़ सहायता युक्त संपूर्ण नैदानिक इतिहास",
    more_menu_timeline: "चिकित्सा समयरेखा",
    more_menu_timeline_sub: "परामर्श, निदान और पर्चों की क्रमबद्ध सूची",
    more_menu_about: "आयुषकेयर के बारे में",
    more_menu_about_sub: "ऐप संस्करण, प्रोटोटाइप विवरण एवं सिस्टम जानकारी",
    more_btn_logout: "मरीज़ बदलें / लॉग आउट",

    // Profile Screen
    profile_title: "मरीज़ प्रोफ़ाइल",
    profile_personal_info: "व्यक्तिगत जानकारी",
    profile_btn_edit: "प्रोफ़ाइल संपादित करें",
    profile_name: "पूरा नाम",
    profile_dob: "जन्म तिथि",
    profile_gender: "लिंग",
    profile_mobile: "मोबाइल नंबर",
    profile_blood_group: "रक्त समूह",
    profile_prakriti: "प्रकृति (आयुष प्रोफ़ाइल)",
    profile_address: "स्थाई निवास पता",
    profile_abha_linked: "आभा-संबद्ध प्रोफ़ाइल",
    profile_abha_number: "आभा संख्या (हेल्थ आईडी)",
    profile_edit_title: "मरीज़ प्रोफ़ाइल संपादित करें",
    profile_edit_display_name: "प्रदर्शित नाम",
    profile_save_changes: "परिवर्तन सहेजें",
    profile_updated_toast: "प्रोफ़ाइल अद्यतन हो गई",

    // Settings Screen
    settings_title: "सेटिंग्स व प्राथमिकताएं",
    settings_lang_heading: "भाषा",
    settings_lang_sub: "परामर्श व एप्लिकेशन मार्गदर्शन के लिए अपनी पसंदीदा भाषा चुनें।",
    settings_access_heading: "सुगमता",
    settings_text_size: "टेक्स्ट का आकार",
    settings_text_default: "सामान्य",
    settings_text_large: "बड़ा",
    settings_text_xlarge: "अति विशाल",
    settings_high_contrast: "उच्च कंट्रास्ट",
    settings_high_contrast_sub: "दृश्य स्पष्टता बढ़ाता है और गहरे रंगों से सीमाओं को स्पष्ट करता है",
    settings_audio_assist: "ऑडियो सहायता",
    settings_audio_assist_sub: "स्वास्थ्य सारांश का वाचन सक्षम करता है",
    settings_reduce_motion: "गति कम करें",
    settings_reduce_motion_sub: "स्क्रीन बदलाव और एनिमेशन को न्यूनतम करता है",
    settings_about_heading: "मेडिकियोस्क के बारे में",
    settings_about_sub: "एसआईएच 2026 हेतु मरीज़ साथी प्रोटोटाइप · संस्करण 1.0.0",
    settings_btn_logout: "मेडिकियोस्क से लॉग आउट करें",
    settings_logout_confirm_title: "क्या आयुषकेयर से लॉग आउट करें?",
    settings_logout_confirm_sub: "आपका स्थानीय मोबाइल सत्र साइन आउट हो जाएगा। आपके सहेजे गए स्वास्थ्य रिकॉर्ड, मुलाकातें और सेटिंग्स नष्ट नहीं होंगी।",
    settings_btn_confirm_logout: "लॉग आउट",

    // Privacy & Data Control Screen
    privacy_title: "गोपनीयता व डेटा नियंत्रण",
    privacy_notice: "मरीजों को स्वास्थ्य जानकारी साझाकरण पर अधिक पारदर्शिता और नियंत्रण प्रदान करने हेतु निर्मित।",
    privacy_history_sharing_heading: "स्वास्थ्य इतिहास साझाकरण",
    privacy_history_sharing_sub: "नियंत्रित करें कि क्या आपकी सहेजी गई स्वास्थ्य जानकारी जुड़े हुए स्वास्थ्य सत्रों के साथ साझा की जा सकती है।",
    privacy_status_available: "उपलब्ध (Available)",
    privacy_status_restricted: "प्रतिबंधित (Restricted)",
    privacy_action_lock: "साझाकरण लॉक करें",
    privacy_action_allow: "साझाकरण की अनुमति दें",
    privacy_tab_sharing: "इतिहास साझाकरण",
    privacy_tab_active_consents: "सक्रिय सहमतियां",
    privacy_tab_consent_history: "सहमति इतिहास",
    privacy_tab_access_history: "पहुंच इतिहास",
    privacy_tab_sessions: "सक्रिय सत्र",
    privacy_active_consents_heading: "सक्रिय सहमतियां",
    privacy_active_consents_sub: "स्वास्थ्य सेवा प्रदाताओं को दी गई विशिष्ट डेटा पहुंच अनुमतियां।",
    privacy_consent_history_heading: "सहमति इतिहास",
    privacy_consent_history_sub: "पिछली साझाकरण अनुमतियों और स्थिति परिवर्तनों का रिकॉर्ड।",
    privacy_access_history_heading: "नमूना पहुंच गतिविधि (Sample Access Activity)",
    privacy_access_history_sub: "इस प्रोटोटाइप हेतु नमूना पहुंच गतिविधि प्रदर्शित है।",
    privacy_access_history_disclaimer: "प्रोटोटाइप सूचना: प्रदर्शन हेतु नमूना पहुंच गतिविधि।",
    privacy_active_sessions_heading: "सक्रिय सत्र",
    privacy_active_sessions_sub: "वर्तमान में जुड़े हुए कियोस्क व डॉक्टर परामर्श टर्मिनल।",
    privacy_btn_withdraw: "पहुंच वापस लें",
    privacy_btn_reallow: "पुनः अनुमति दें",
    privacy_btn_view_details: "विवरण देखें",
    privacy_btn_end_session: "सत्र समाप्त करें",
    privacy_non_destructive_notice: "साझाकरण लॉक करने या सहमति वापस लेने से आपके व्यक्तिगत मेडिकल रिकॉर्ड, मुलाकातें, अपॉइंटमेंट या दस्तावेज़ नष्ट नहीं होते हैं।",
  },
};

/**
 * Standalone translation helper usable outside of React component render trees.
 */
export const tr = (english, hindi = english) => {
  try {
    const lang = useMobileStore.getState()?.selectedLanguage || "en";
    if (lang === "hi") return hindi;
    if (lang === "en") return english;
    const source = String(english || "");
    const cached = getCachedTranslation(source, lang);
    if (cached) return cached;
    void ensureTranslation(source, lang, apiRequest);
    return source;
  } catch {
    return english;
  }
};

/**
 * Custom React hook to get translated strings and language switch helper.
 */
export const useLanguage = () => {
  const { selectedLanguage, setSelectedLanguage } = useMobileStore();
  const lang = selectedLanguage || "en";
  const [, refresh] = useState(0);
  useEffect(() => subscribeTranslations(() => refresh((v) => v + 1)), []);
  const dict = translations[lang] || translations.en;

  const t = (key, fallback = "") => {
    const source = dict[key] || translations.en[key] || fallback || key;
    if (lang === "en") return source;
    const cached = getCachedTranslation(source, lang);
    if (cached) return cached;
    void ensureTranslation(source, lang, apiRequest);
    return source;
  };

  const trHook = (english, hindi = english) => {
    if (lang === "hi") return hindi;
    if (lang === "en") return english;
    const source = String(english || "");
    const cached = getCachedTranslation(source, lang);
    if (cached) return cached;
    void ensureTranslation(source, lang, apiRequest);
    return source;
  };

  const toggleLanguage = () => setSelectedLanguage(lang === "en" ? "hi" : "en");

  return { lang, isHindi: lang === "hi", t, tr: trHook, toggleLanguage, setLanguage: setSelectedLanguage };
};

export default useLanguage;

