/**
 * Centralized Canonical Mock Data for AyushCare Mobile Companion
 *
 * This file maintains a single, unified canonical clinical story for demo patient
 * Rajesh Kumar Sharma (PATIENT-001) at Civil Hospital OPD, New Delhi (HOSP-001).
 *
 * All screens and services reference these canonical entities and stable IDs
 * rather than inventing disparate patient details or conflicting hospitals.
 */

/* ========================================================================== */
/* 1. CANONICAL ENTITIES (Patient, Hospital, Doctors)                         */
/* ========================================================================== */

export const canonicalHospital = {
  id: "HOSP-001",
  name: "Civil Hospital OPD",
  fullName: "Civil Hospital OPD, New Delhi",
  hindiName: "सिविल अस्पताल ओपीडी, नई दिल्ली",
  city: "New Delhi",
  location: "Central Delhi, New Delhi - 110002",
  departments: [
    {
      id: "DEP-MED",
      name: "General Medicine OPD",
      hindiName: "सामान्य चिकित्सा ओपीडी",
      room: "Room 104 · OPD Block B",
    },
    {
      id: "DEP-END",
      name: "Endocrinology & Diabetes Clinic",
      hindiName: "मधुमेह एवं एंडोक्राइन क्लिनिक",
      room: "Room 208 · Special Clinic",
    },
    {
      id: "DEP-AYU",
      name: "Ayush & Panchakarma Department",
      hindiName: "आयुष एवं पंचकर्म विभाग",
      room: "Room 12 · Ayush Wing",
    },
    {
      id: "DEP-LAB",
      name: "Clinical Laboratory",
      hindiName: "केंद्रीय जांच प्रयोगशाला",
      room: "Lab Sample Counter 2 · Central Diagnostic Wing",
    },
  ],
};

export const canonicalDoctors = {
  verma: {
    id: "DOCTOR-001",
    name: "Dr. A. K. Verma",
    hindiName: "डॉ. ए. के. वर्मा",
    qualification: "MD (General Medicine & Ayush)",
    department: "General Medicine OPD",
    hindiDepartment: "सामान्य चिकित्सा ओपीडी",
    hospital: "Civil Hospital OPD",
    hindiHospital: "सिविल अस्पताल ओपीडी",
    room: "Room 104 · OPD Block B",
    hindiRoom: "कक्ष 104 · ब्लॉक बी",
  },
  roy: {
    id: "DOCTOR-002",
    name: "Dr. Sneha Roy",
    hindiName: "डॉ. स्नेहा रॉय",
    qualification: "MD (Endocrinology)",
    department: "Endocrinology & Diabetes Clinic",
    hindiDepartment: "मधुमेह एवं एंडोक्राइन क्लिनिक",
    hospital: "Civil Hospital OPD",
    hindiHospital: "सिविल अस्पताल ओपीडी",
    room: "Room 208 · Special Clinic",
    hindiRoom: "कक्ष 208 · विशेष क्लिनिक",
  },
  chander: {
    id: "DOCTOR-003",
    name: "Dr. Ramesh Chander",
    hindiName: "डॉ. रमेश चंदर",
    qualification: "BAMS (Ayurveda Chikitsa)",
    department: "Ayush & Panchakarma Department",
    hindiDepartment: "आयुष एवं पंचकर्म विभाग",
    hospital: "Civil Hospital OPD",
    hindiHospital: "सिविल अस्पताल ओपीडी",
    room: "Room 12 · Ayush Wing",
    hindiRoom: "कक्ष 12 · आयुष विंग",
  },
  lab: {
    id: "DOCTOR-004",
    name: "Clinical Biochemistry Lab",
    hindiName: "क्लिनिकल बायोकेमिस्ट्री लैब",
    qualification: "Pathology Diagnostics",
    department: "Clinical Laboratory",
    hindiDepartment: "केंद्रीय जांच प्रयोगशाला",
    hospital: "Civil Hospital OPD",
    hindiHospital: "सिविल अस्पताल ओपीडी",
    room: "Lab Sample Counter 2 · Central Diagnostic Wing",
    hindiRoom: "सैंपल काउंटर 2 · डायग्नोस्टिक विंग",
  },
};

export const canonicalPatient = {
  id: "pat_88129012",
  canonicalId: "PATIENT-001",
  name: "Rajesh Kumar Sharma",
  hindiName: "राजेश कुमार शर्मा",
  gender: "Male",
  genderHi: "पुरुष",
  age: 42,
  dob: "1984-06-15",
  mobile: "+91 98765 43210",
  abhaNumber: "91-4432-8812-9012",
  abhaAddress: "rajesh.sharma@abdm",
  aadhaarNumber: "XXXX-XXXX-0144",
  bloodGroup: "B+",
  prakriti: "Vata-Pitta (Predominant)",
  prakritiHi: "वात-पित्त (प्रमुख)",
  address: "H.No. 42, Sector 4, Rohini, New Delhi",
  hindiAddress: "मकान संख्या 42, सेक्टर 4, रोहिणी, नई दिल्ली",
  district: "Central Delhi",
  hindiDistrict: "मध्य दिल्ली",
  state: "Delhi",
  hindiState: "दिल्ली",
  pincode: "110085",
  emergencyContact: {
    name: "Sunita Sharma",
    relation: "Spouse",
    relationHi: "पत्नी",
    mobile: "+91 98765 43211",
  },
};

/* ========================================================================== */
/* 2. ACTIVE KIOSK & COMPANION SESSION                                        */
/* ========================================================================== */

export const mockSession = {
  sessionId: "MKS-2026-9481",
  kioskId: "KIOSK-DELHI-OPD-03",
  terminalName: "Central Delhi OPD Terminal 03",
  status: "ACTIVE",
  expiresIn: "05:00",
  initialCountdownSeconds: 300,
  connectedAt: "Today, 10:24 AM",
  hospitalName: canonicalHospital.name,
  hindiHospitalName: canonicalHospital.hindiName,
  department: canonicalDoctors.verma.department,
  hindiDepartment: canonicalDoctors.verma.hindiDepartment,
  patient: {
    ...canonicalPatient,
  },
};

/* ========================================================================== */
/* 3. APPOINTMENTS (Today, Upcoming, Past)                                     */
/* ========================================================================== */

export const mockAppointments = {
  today: {
    id: "APPT-001",
    tokenNumber: "AY-OPD-108",
    doctorId: canonicalDoctors.verma.id,
    doctorName: canonicalDoctors.verma.name,
    hindiDoctorName: canonicalDoctors.verma.hindiName,
    specialty: canonicalDoctors.verma.qualification,
    department: canonicalDoctors.verma.department,
    hindiDepartment: canonicalDoctors.verma.hindiDepartment,
    room: canonicalDoctors.verma.room,
    hospitalName: canonicalHospital.name,
    hindiHospitalName: canonicalHospital.hindiName,
    date: "Today, 05 Sep 2026",
    timeSlot: "10:30 AM - 11:00 AM",
    status: "IN_QUEUE", // "IN_QUEUE" | "CALLED" | "COMPLETED"
    queuePosition: 3,
    estimatedWaitTime: "12 mins",
    checkInTime: "10:14 AM",
    kioskTerminal: "Terminal 03 (Central Delhi)",
    symptomsSummary: "Fever and joint pain (3 days duration, moderate severity)",
    vitalsRecorded: {
      bp: "120/80 mmHg",
      pulse: "76 bpm",
      temp: "98.4 °F",
      spo2: "98%",
    },
    instructions: "Please be seated near Room 104 waiting lobby. Your token will be announced on the digital display.",
  },
  upcoming: [
    {
      id: "APPT-001",
      tokenNumber: "AY-OPD-108",
      doctorId: canonicalDoctors.verma.id,
      doctorName: canonicalDoctors.verma.name,
      hindiDoctorName: canonicalDoctors.verma.hindiName,
      specialty: canonicalDoctors.verma.qualification,
      department: canonicalDoctors.verma.department,
      hindiDepartment: canonicalDoctors.verma.hindiDepartment,
      room: canonicalDoctors.verma.room,
      hospitalName: canonicalHospital.name,
      hindiHospitalName: canonicalHospital.hindiName,
      date: "Today, 05 Sep 2026",
      timeSlot: "10:30 AM - 11:00 AM",
      status: "IN_QUEUE",
      isToday: true,
      queuePosition: 3,
      estimatedWaitTime: "12 mins",
      checkInTime: "10:14 AM",
      symptomsSummary: "Fever and joint pain (3 days)",
      vitalsRecorded: {
        bp: "120/80 mmHg",
        pulse: "76 bpm",
        temp: "98.4 °F",
        spo2: "98%",
      },
    },
    {
      id: "APPT-002",
      tokenNumber: "AY-END-214",
      doctorId: canonicalDoctors.roy.id,
      doctorName: canonicalDoctors.roy.name,
      hindiDoctorName: canonicalDoctors.roy.hindiName,
      specialty: canonicalDoctors.roy.qualification,
      department: canonicalDoctors.roy.department,
      hindiDepartment: canonicalDoctors.roy.hindiDepartment,
      room: canonicalDoctors.roy.room,
      hospitalName: canonicalHospital.name,
      hindiHospitalName: canonicalHospital.hindiName,
      date: "18 Sep 2026",
      timeSlot: "11:15 AM - 11:45 AM",
      status: "SCHEDULED",
      isToday: false,
      symptomsSummary: "Routine HbA1c review and diabetic dietary follow-up",
    },
  ],
  past: [
    {
      id: "APPT-PAST-001",
      tokenNumber: "OPD-MAY-4491",
      doctorId: canonicalDoctors.verma.id,
      doctorName: canonicalDoctors.verma.name,
      hindiDoctorName: canonicalDoctors.verma.hindiName,
      specialty: canonicalDoctors.verma.qualification,
      department: canonicalDoctors.verma.department,
      hindiDepartment: canonicalDoctors.verma.hindiDepartment,
      room: canonicalDoctors.verma.room,
      hospitalName: canonicalHospital.name,
      hindiHospitalName: canonicalHospital.hindiName,
      date: "12 May 2026",
      diagnosis: "Viral Upper Respiratory Infection",
      prescriptionDocument: "Prescription_May2026.pdf",
      documentId: "DOC-001",
      visitId: "VISIT-001",
      status: "COMPLETED",
      summary: "Prescribed Paracetamol 650mg BD, continued Metformin 500mg (1-0-1) and Amlodipine 5mg (bedtime). Advised hydration and rest.",
    },
    {
      id: "APPT-PAST-002",
      tokenNumber: "LAB-MAY-8812",
      doctorId: canonicalDoctors.lab.id,
      doctorName: canonicalDoctors.lab.name,
      hindiDoctorName: canonicalDoctors.lab.hindiName,
      specialty: canonicalDoctors.lab.qualification,
      department: canonicalDoctors.lab.department,
      hindiDepartment: canonicalDoctors.lab.hindiDepartment,
      room: canonicalDoctors.lab.room,
      hospitalName: canonicalHospital.name,
      hindiHospitalName: canonicalHospital.hindiName,
      date: "10 May 2026",
      diagnosis: "Elevated Fasting Glucose (186 mg/dL) & HbA1c (8.4%)",
      prescriptionDocument: "LabReport_May2026.pdf",
      documentId: "DOC-002",
      visitId: "VISIT-002",
      status: "COMPLETED",
      summary: "Routine diabetic panel completed. Fasting Blood Glucose 186 mg/dL, HbA1c 8.4%. Endocrine consultation recommended.",
    },
    {
      id: "APPT-PAST-003",
      tokenNumber: "AY-OPD-092",
      doctorId: canonicalDoctors.chander.id,
      doctorName: canonicalDoctors.chander.name,
      hindiDoctorName: canonicalDoctors.chander.hindiName,
      specialty: canonicalDoctors.chander.qualification,
      department: canonicalDoctors.chander.department,
      hindiDepartment: canonicalDoctors.chander.hindiDepartment,
      room: canonicalDoctors.chander.room,
      hospitalName: canonicalHospital.name,
      hindiHospitalName: canonicalHospital.hindiName,
      date: "14 Nov 2025",
      diagnosis: "Stage-1 Essential Hypertension with Dyspepsia",
      prescriptionDocument: "DischargeSummary_Nov2025.pdf",
      documentId: "DOC-003",
      visitId: "VISIT-003",
      status: "COMPLETED",
      summary: "Amlodipine 5mg initiated at bedtime with dietary and Ayurvedic guidance (Avipattikar Churna, Triphala Kwath).",
    },
  ],
};

/* ========================================================================== */
/* 4. HEALTHCARE VISITS HISTORY (Actual Encounters)                           */
/* ========================================================================== */

export const mockVisits = [
  {
    id: "VISIT-001",
    date: "12 May 2026",
    rawDate: "2026-05-12",
    year: "2026",
    month: "May",
    type: "ALLOPATHY",
    typeLabel: "Allopathy",
    doctorId: canonicalDoctors.verma.id,
    doctor: canonicalDoctors.verma.name,
    hindiDoctor: canonicalDoctors.verma.hindiName,
    department: canonicalDoctors.verma.department,
    hindiDepartment: canonicalDoctors.verma.hindiDepartment,
    hospital: canonicalHospital.name,
    hindiHospital: canonicalHospital.hindiName,
    room: canonicalDoctors.verma.room,
    status: "Visit completed",
    statusCode: "COMPLETED",

    symptoms: ["Fever", "Cough", "Body ache"],
    duration: "4 days",
    severity: "Moderate",

    clinicalHistory: {
      complaint: "Viral upper respiratory symptoms and fever",
      duration: "4 days",
      additionalInfo: "Patient presented with moderate fever and dry cough. Lungs clear on auscultation. Advised antipyretic therapy and hydration.",
    },

    medications: [
      {
        name: "Paracetamol 650 mg",
        instructions: "1-0-1 · Twice daily (After meals, SOS for fever)",
      },
      {
        name: "Metformin 500 mg",
        instructions: "1-0-1 · Twice daily (After food)",
      },
      {
        name: "Amlodipine 5 mg",
        instructions: "0-0-1 · Once daily (At bedtime)",
      },
    ],

    vitals: {
      bp: "128/82 mmHg",
      pulse: "78 bpm",
      spo2: "98%",
      temperature: "99.1°F",
    },

    documentIds: ["DOC-001"],
    documents: [
      {
        id: "doc_v1_1",
        recordId: "DOC-001",
        type: "Prescription",
        date: "12 May 2026",
        fileName: "Prescription_May2026.pdf",
      },
    ],

    summary:
      "This visit included evaluation of viral upper respiratory infection, supportive antipyretic management, and ongoing review of hypertension and diabetes.",
  },
  {
    id: "VISIT-002",
    date: "10 May 2026",
    rawDate: "2026-05-10",
    year: "2026",
    month: "May",
    type: "ALLOPATHY",
    typeLabel: "Allopathy",
    doctorId: canonicalDoctors.lab.id,
    doctor: canonicalDoctors.lab.name,
    hindiDoctor: canonicalDoctors.lab.hindiName,
    department: canonicalDoctors.lab.department,
    hindiDepartment: canonicalDoctors.lab.hindiDepartment,
    hospital: canonicalHospital.name,
    hindiHospital: canonicalHospital.hindiName,
    room: canonicalDoctors.lab.room,
    status: "Visit completed",
    statusCode: "COMPLETED",

    symptoms: ["Routine Diabetic Panel"],
    duration: "1 day",
    severity: "Mild",

    clinicalHistory: {
      complaint: "Routine 6-month glycemic monitoring",
      duration: "1 day",
      additionalInfo: "Venous blood draw performed after 10-hour overnight fasting. Fasting glucose and glycated hemoglobin assessed.",
    },

    medications: [
      {
        name: "Metformin 500 mg",
        instructions: "1-0-1 · Twice daily (After food)",
      },
      {
        name: "Amlodipine 5 mg",
        instructions: "0-0-1 · Once daily (At bedtime)",
      },
    ],

    vitals: {
      bp: "126/80 mmHg",
      pulse: "74 bpm",
      spo2: "99%",
      temperature: "98.4°F",
    },

    documentIds: ["DOC-002"],
    documents: [
      {
        id: "doc_v2_1",
        recordId: "DOC-002",
        type: "Lab Report",
        date: "10 May 2026",
        fileName: "LabReport_May2026.pdf",
      },
    ],

    summary:
      "Diagnostic evaluation showing Fasting Blood Glucose 186 mg/dL and HbA1c 8.4%. Advised endocrine consultation.",
  },
  {
    id: "VISIT-003",
    date: "14 Nov 2025",
    rawDate: "2025-11-14",
    year: "2025",
    month: "November",
    type: "AYUSH",
    typeLabel: "AYUSH",
    doctorId: canonicalDoctors.chander.id,
    doctor: canonicalDoctors.chander.name,
    hindiDoctor: canonicalDoctors.chander.hindiName,
    department: canonicalDoctors.chander.department,
    hindiDepartment: canonicalDoctors.chander.hindiDepartment,
    hospital: canonicalHospital.name,
    hindiHospital: canonicalHospital.hindiName,
    room: canonicalDoctors.chander.room,
    status: "AYUSH Consultation",
    statusCode: "COMPLETED",

    isAyush: true,
    ayushDetails: {
      prakriti: {
        term: "Prakriti",
        meaning: "Constitutional Body Type",
        value: "Vata-Pitta",
        description: "Constitutional body constitution",
      },
      agni: {
        term: "Agni",
        meaning: "Digestive Strength",
        value: "Normal",
        description: "Balanced digestive capacity",
      },
      kostha: {
        term: "Kostha",
        meaning: "Bowel Habit",
        value: "Regular",
        description: "Regular bowel movements",
      },
      dhatus: "Balanced Rasa & Rakta",
    },

    symptoms: ["Indigestion", "Mild acidity", "Disturbed sleep"],
    duration: "2 weeks",
    severity: "Moderate",

    clinicalHistory: {
      complaint: "Episodic acidity, post-meal heaviness, and elevated blood pressure",
      duration: "2 weeks",
      additionalInfo: "Patient diagnosed with Kaphaja Grahani (Chronic Dyspepsia) and stage-1 essential hypertension. Advised lifestyle modifications and Ayurvedic formulation.",
    },

    medications: [
      {
        name: "Amlodipine 5 mg",
        instructions: "0-0-1 · Once daily (At bedtime)",
      },
      {
        name: "Avipattikar Churna 3g",
        instructions: "3g twice daily before meals with lukewarm water",
      },
      {
        name: "Triphala Kwath 15ml",
        instructions: "15ml at bedtime with warm water",
      },
    ],

    vitals: {
      bp: "134/86 mmHg",
      pulse: "72 bpm",
      spo2: "98%",
      temperature: "98.4°F",
    },

    documentIds: ["DOC-003"],
    documents: [
      {
        id: "doc_v3_1",
        recordId: "DOC-003",
        type: "Discharge Summary",
        date: "14 Nov 2025",
        fileName: "DischargeSummary_Nov2025.pdf",
      },
    ],

    summary:
      "This visit included assessment of constitutional factors (Prakriti, Agni), dietary counseling (Pathya-Apathya), initiation of Amlodipine 5mg at bedtime, and traditional herbal formulations.",
  },
  {
    id: "VISIT-004",
    date: "22 Mar 2024",
    rawDate: "2024-03-22",
    year: "2024",
    month: "March",
    type: "ALLOPATHY",
    typeLabel: "Allopathy",
    doctorId: "DOCTOR-005",
    doctor: "Public Health & Immunization Officer",
    hindiDoctor: "प्रभारी चिकित्सा अधिकारी",
    department: "Public Health & Immunization",
    hindiDepartment: "सार्वजनिक स्वास्थ्य एवं टीकाकरण",
    hospital: canonicalHospital.name,
    hindiHospital: canonicalHospital.hindiName,
    room: "Immunization Desk · Ground Floor",
    status: "Visit completed",
    statusCode: "COMPLETED",

    symptoms: ["Routine Adult Immunization"],
    duration: "1 day",
    severity: "Mild",

    clinicalHistory: {
      complaint: "Adult booster vaccination and preventive wellness",
      duration: "1 day",
      additionalInfo: "Administered adult Hepatitis B & Tetanus Toxoid booster dose. No adverse events following immunization (AEFI) observed.",
    },

    medications: [],
    vitals: {
      bp: "120/78 mmHg",
      pulse: "72 bpm",
      spo2: "99%",
      temperature: "98.6°F",
    },

    documentIds: ["DOC-004"],
    documents: [
      {
        id: "doc_v4_1",
        recordId: "DOC-004",
        type: "Other Medical Record",
        date: "22 Mar 2024",
        fileName: "Vaccination_Certificate_2024.pdf",
      },
    ],

    summary:
      "Preventive healthcare encounter for adult booster immunization. Verified immunity records under National Health Mission guidelines.",
  },
];

/* ========================================================================== */
/* 5. MEDICAL RECORDS & DOCUMENT REPOSITORY (DOC-001 through DOC-004)         */
/* ========================================================================== */

export const mockMedicalRecords = [
  {
    id: "DOC-001",
    type: "prescription",
    typeLabel: "Prescription",
    title: "Prescription_May2026.pdf",
    date: "2026-05-12",
    displayDate: "12 May 2026",
    monthGroup: "MAY 2026",
    source: canonicalHospital.name,
    hindiSource: canonicalHospital.hindiName,
    doctor: "Dr. A. K. Verma, MD (Gen Med)",
    clinic: "Civil Hospital OPD - Room 104",
    status: "NEEDS_REVIEW",
    statusLabel: "Needs Review",
    visitId: "VISIT-001",
    patientId: canonicalPatient.id,
    sessionId: "MKS-2026-9481",
    fileSize: "1.4 MB",
    dataUrl: null,
    totalPages: 1,
    pages: [
      {
        id: "page_doc1_1",
        pageNumber: 1,
        image: null,
        dataUrl: null,
        fileName: "Prescription_May2026.pdf",
        fileSize: "1.4 MB",
      },
    ],
    extractedInformation: {
      medicines: [
        {
          id: "med_doc1_1",
          name: "Paracetamol 650 mg",
          dosage: "650 mg",
          schedule: "BD · Twice daily",
          instruction: "After meals (खाने के बाद)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc1_2",
          name: "Metformin 500 mg",
          dosage: "500 mg",
          schedule: "1-0-1 · After food",
          instruction: "Morning & Night with water (भोजन के बाद)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc1_3",
          name: "Amlodipine 5 mg",
          dosage: "5 mg",
          schedule: "0-0-1 · At night",
          instruction: "Bedtime (सोते समय)",
          confidence: "VERIFY",
          isHighConfidence: false,
          needsVerification: true,
          verificationReason: "Faint handwritten margin note",
        },
      ],
      diagnosis: [
        {
          id: "diag_doc1_1",
          value: "Viral Upper Respiratory Infection",
          confidence: "VERIFY",
          needsVerification: true,
          verificationReason: "Handwriting partially cursive near diagnosis line",
        },
      ],
      prescriptionDate: "12 May 2026",
    },
    extraction: {
      medicines: [
        {
          id: "med_doc1_1",
          name: "Paracetamol 650 mg",
          dosage: "650 mg",
          schedule: "BD · Twice daily",
          instruction: "After meals (खाने के बाद)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc1_2",
          name: "Metformin 500 mg",
          dosage: "500 mg",
          schedule: "1-0-1 · After food",
          instruction: "Morning & Night with water (भोजन के बाद)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc1_3",
          name: "Amlodipine 5 mg",
          dosage: "5 mg",
          schedule: "0-0-1 · At night",
          instruction: "Bedtime (सोते समय)",
          confidence: "VERIFY",
          isHighConfidence: false,
          needsVerification: true,
          verificationReason: "Faint handwritten margin note",
        },
      ],
      diagnosis: [
        {
          id: "diag_doc1_1",
          value: "Viral Upper Respiratory Infection",
          confidence: "VERIFY",
          needsVerification: true,
          verificationReason: "Handwriting partially cursive near diagnosis line",
        },
      ],
      prescriptionDate: "12 May 2026",
    },
  },
  {
    id: "DOC-002",
    type: "lab_report",
    typeLabel: "Lab Report",
    title: "LabReport_May2026.pdf",
    date: "2026-05-10",
    displayDate: "10 May 2026",
    monthGroup: "MAY 2026",
    source: canonicalHospital.name,
    hindiSource: canonicalHospital.hindiName,
    doctor: "Clinical Biochemistry Lab",
    clinic: "Central Diagnostic Wing - Counter 2",
    status: "PROCESSED",
    statusLabel: "Processed",
    visitId: "VISIT-002",
    patientId: canonicalPatient.id,
    sessionId: "SESSION-002",
    fileSize: "2.1 MB",
    dataUrl: null,
    totalPages: 1,
    pages: [
      {
        id: "page_doc2_1",
        pageNumber: 1,
        image: null,
        dataUrl: null,
        fileName: "LabReport_May2026.pdf",
        fileSize: "2.1 MB",
      },
    ],
    extractedInformation: {
      medicines: [],
      investigations: [
        {
          id: "inv_doc2_1",
          testName: "Fasting Blood Glucose",
          value: "186",
          unit: "mg/dL",
          referenceRange: "70 - 100 mg/dL",
          isAbnormal: true,
          abnormality: "High (उच्च)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "inv_doc2_2",
          testName: "HbA1c (Glycated Hemoglobin)",
          value: "8.4",
          unit: "%",
          referenceRange: "< 5.7 %",
          isAbnormal: true,
          abnormality: "High (उच्च)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "inv_doc2_3",
          testName: "Serum Creatinine",
          value: "1.1",
          unit: "mg/dL",
          referenceRange: "0.7 - 1.3 mg/dL",
          isAbnormal: false,
          abnormality: "Normal (सामान्य)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
      ],
      diagnosis: [
        {
          id: "diag_doc2_1",
          value: "Elevated Fasting Glucose (186 mg/dL) & HbA1c (8.4%)",
          confidence: "HIGH",
          needsVerification: false,
        },
      ],
      prescriptionDate: "10 May 2026",
    },
    extraction: {
      medicines: [],
      investigations: [
        {
          id: "inv_doc2_1",
          testName: "Fasting Blood Glucose",
          value: "186",
          unit: "mg/dL",
          referenceRange: "70 - 100 mg/dL",
          isAbnormal: true,
          abnormality: "High (उच्च)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "inv_doc2_2",
          testName: "HbA1c (Glycated Hemoglobin)",
          value: "8.4",
          unit: "%",
          referenceRange: "< 5.7 %",
          isAbnormal: true,
          abnormality: "High (उच्च)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "inv_doc2_3",
          testName: "Serum Creatinine",
          value: "1.1",
          unit: "mg/dL",
          referenceRange: "0.7 - 1.3 mg/dL",
          isAbnormal: false,
          abnormality: "Normal (सामान्य)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
      ],
      diagnosis: [
        {
          id: "diag_doc2_1",
          value: "Elevated Fasting Glucose (186 mg/dL) & HbA1c (8.4%)",
          confidence: "HIGH",
          needsVerification: false,
        },
      ],
      prescriptionDate: "10 May 2026",
    },
  },
  {
    id: "DOC-003",
    type: "discharge_summary",
    typeLabel: "Discharge Summary",
    title: "DischargeSummary_Nov2025.pdf",
    date: "2025-11-14",
    displayDate: "14 Nov 2025",
    monthGroup: "NOVEMBER 2025",
    source: canonicalHospital.name,
    hindiSource: canonicalHospital.hindiName,
    doctor: "Dr. Ramesh Chander",
    clinic: "Ayush Inpatient Wing - Room 12",
    status: "CONFIRMED",
    statusLabel: "Confirmed",
    visitId: "VISIT-003",
    patientId: canonicalPatient.id,
    sessionId: "SESSION-003",
    fileSize: "3.4 MB",
    dataUrl: null,
    totalPages: 2,
    pages: [
      {
        id: "page_doc3_1",
        pageNumber: 1,
        image: null,
        dataUrl: null,
        fileName: "DischargeSummary_Nov2025_p1.pdf",
        fileSize: "1.7 MB",
      },
      {
        id: "page_doc3_2",
        pageNumber: 2,
        image: null,
        dataUrl: null,
        fileName: "DischargeSummary_Nov2025_p2.pdf",
        fileSize: "1.7 MB",
      },
    ],
    extractedInformation: {
      medicines: [
        {
          id: "med_doc3_1",
          name: "Amlodipine 5 mg",
          dosage: "5 mg",
          schedule: "0-0-1",
          instruction: "At bedtime with warm water (सोते समय)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc3_2",
          name: "Avipattikar Churna 3g",
          dosage: "3g twice daily",
          schedule: "BD · Before meals",
          instruction: "With lukewarm water before meals",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc3_3",
          name: "Triphala Kwath 15ml",
          dosage: "15ml at bedtime",
          schedule: "0-0-1 · Bedtime",
          instruction: "At bedtime with warm water",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
      ],
      diagnosis: [
        {
          id: "diag_doc3_1",
          value: "Stage-1 Essential Hypertension with Dyspepsia (Kaphaja Grahani)",
          confidence: "HIGH",
          needsVerification: false,
        },
      ],
      prescriptionDate: "14 Nov 2025",
    },
    extraction: {
      medicines: [
        {
          id: "med_doc3_1",
          name: "Amlodipine 5 mg",
          dosage: "5 mg",
          schedule: "0-0-1",
          instruction: "At bedtime with warm water (सोते समय)",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc3_2",
          name: "Avipattikar Churna 3g",
          dosage: "3g twice daily",
          schedule: "BD · Before meals",
          instruction: "With lukewarm water before meals",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "med_doc3_3",
          name: "Triphala Kwath 15ml",
          dosage: "15ml at bedtime",
          schedule: "0-0-1 · Bedtime",
          instruction: "At bedtime with warm water",
          confidence: "HIGH",
          isHighConfidence: true,
          needsVerification: false,
        },
      ],
      diagnosis: [
        {
          id: "diag_doc3_1",
          value: "Stage-1 Essential Hypertension with Dyspepsia (Kaphaja Grahani)",
          confidence: "HIGH",
          needsVerification: false,
        },
      ],
      prescriptionDate: "14 Nov 2025",
    },
  },
  {
    id: "DOC-004",
    type: "other",
    typeLabel: "Other Medical Record",
    title: "Vaccination_Certificate_2024.pdf",
    date: "2024-03-22",
    displayDate: "22 Mar 2024",
    monthGroup: "MARCH 2024",
    source: canonicalHospital.name,
    hindiSource: canonicalHospital.hindiName,
    doctor: "Public Health & Immunization Officer",
    clinic: "Immunization Desk - Ground Floor",
    status: "PROCESSED",
    statusLabel: "Processed",
    visitId: "VISIT-004",
    patientId: canonicalPatient.id,
    sessionId: "SESSION-004",
    fileSize: "850 KB",
    dataUrl: null,
    totalPages: 1,
    pages: [
      {
        id: "page_doc4_1",
        pageNumber: 1,
        image: null,
        dataUrl: null,
        fileName: "Vaccination_Certificate_2024.pdf",
        fileSize: "850 KB",
      },
    ],
    extractedInformation: {
      medicines: [],
      diagnosis: [
        {
          id: "diag_doc4_1",
          value: "Preventive Adult Immunization Booster Record",
          confidence: "HIGH",
          needsVerification: false,
        },
      ],
      recordDetails: [
        {
          id: "rec_doc4_1",
          label: "Record Category",
          value: "Immunization / Preventive Healthcare Certificate",
          confidence: "High confidence",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "rec_doc4_2",
          label: "Primary Subject",
          value: "Adult Hepatitis B & Tetanus Toxoid Booster",
          confidence: "High confidence",
          isHighConfidence: true,
          needsVerification: false,
        },
      ],
      prescriptionDate: "22 Mar 2024",
    },
    extraction: {
      medicines: [],
      diagnosis: [
        {
          id: "diag_doc4_1",
          value: "Preventive Adult Immunization Booster Record",
          confidence: "HIGH",
          needsVerification: false,
        },
      ],
      recordDetails: [
        {
          id: "rec_doc4_1",
          label: "Record Category",
          value: "Immunization / Preventive Healthcare Certificate",
          confidence: "High confidence",
          isHighConfidence: true,
          needsVerification: false,
        },
        {
          id: "rec_doc4_2",
          label: "Primary Subject",
          value: "Adult Hepatitis B & Tetanus Toxoid Booster",
          confidence: "High confidence",
          isHighConfidence: true,
          needsVerification: false,
        },
      ],
      prescriptionDate: "22 Mar 2024",
    },
  },
];

/* ========================================================================== */
/* 6. DOCUMENT CATEGORIES & MOCK UPLOAD DEFAULT                               */
/* ========================================================================== */

export const mockDocumentTypes = [
  {
    id: "prescription",
    title: "Prescription",
    hi: "डॉक्टर की पर्ची",
    subtitle: "Upload a prescription or OPD slip",
    iconName: "FileText",
    examples: "OPD slip, written Rx, consultation memo",
  },
  {
    id: "lab_report",
    title: "Lab Report",
    hi: "जांच रिपोर्ट",
    subtitle: "Upload blood, urine, or diagnostic tests",
    iconName: "FileSpreadsheet",
    examples: "CBC, Blood sugar, Lipid profile, Urine test",
  },
  {
    id: "discharge_summary",
    title: "Discharge Summary",
    hi: "डिस्चार्ज सारांश",
    subtitle: "Upload hospital admission or discharge summary",
    iconName: "Building2",
    examples: "Inpatient summary, OT notes, hospital discharge card",
  },
  {
    id: "other",
    title: "Other Medical Record",
    hi: "अन्य मेडिकल दस्तावेज़",
    subtitle: "Upload vaccination or other health documents",
    iconName: "FolderHeart",
    examples: "Immunization record, disability cert, imaging scan",
  },
];

export const mockDefaultDocument = {
  id: "doc_rx_2026_05_12",
  fileName: "Prescription_May2026.pdf",
  fileType: "application/pdf",
  documentType: "prescription",
  date: "12 May 2026",
  sourceLabel: "Civil Hospital OPD · 12 May 2026",
  clinic: "Civil Hospital OPD - Room 104",
  doctor: "Dr. A. K. Verma, MD (Gen Med)",
  fileSize: "1.4 MB",
};

export const mockExtractedData = {
  documentType: "prescription",
  documentName: "Prescription_May2026.pdf",
  sourceInfo: "Civil Hospital OPD · 12 May 2026",
  prescriptionDate: "12 May 2026",
  doctorName: "Dr. A. K. Verma, MD (Gen Med)",
  clinic: "Civil Hospital OPD - Room 104",
  confidenceScore: 92,
  pageCount: 1,
  medicines: [
    {
      id: "med_1",
      name: "Paracetamol 650 mg",
      dosage: "650 mg",
      schedule: "BD · Twice daily",
      instruction: "After meals (खाने के बाद)",
      confidence: "High confidence",
      isHighConfidence: true,
      needsVerification: false,
    },
    {
      id: "med_2",
      name: "Metformin 500 mg",
      dosage: "500 mg",
      schedule: "1-0-1 · After food",
      instruction: "Morning & Night with water (भोजन के बाद)",
      confidence: "High confidence",
      isHighConfidence: true,
      needsVerification: false,
    },
    {
      id: "med_3",
      name: "Amlodipine 5 mg",
      dosage: "5 mg",
      schedule: "0-0-1 · At night",
      instruction: "Bedtime (सोते समय)",
      confidence: "Verify",
      isHighConfidence: false,
      needsVerification: true,
      verificationReason: "Dosage frequency handwritten faintly in margin",
    },
  ],
  diagnosis: {
    name: "Viral Upper Respiratory Infection",
    confidence: "Verify",
    isHighConfidence: false,
    needsVerification: true,
    verificationReason: "Handwriting partially cursive near diagnosis line",
  },
  clinicalDisclaimer: {
    title: "Please verify highlighted information.",
    message:
      "We are only correcting document reading. This is not a clinical decision.",
    subtext:
      "The highlighted items with 'Verify' badges should be checked against your original paper slip.",
  },
};

/* ========================================================================== */
/* 7. TYPE-SPECIFIC MOCK EXTRACTION DATABASE                                  */
/* ========================================================================== */

export const mockExtractionByType = {
  prescription: {
    documentType: "prescription",
    documentName: "Prescription_May2026.pdf",
    sourceInfo: "Civil Hospital OPD - Room 104 · 12 May 2026",
    prescriptionDate: "12 May 2026",
    doctorName: "Dr. A. K. Verma, MD (Gen Med)",
    clinic: "Civil Hospital OPD - Room 104",
    confidenceScore: 92,
    medicines: [
      {
        id: "med_1",
        name: "Paracetamol 650 mg",
        dosage: "650 mg",
        schedule: "BD · Twice daily",
        instruction: "After meals (खाने के बाद)",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "med_2",
        name: "Metformin 500 mg",
        dosage: "500 mg",
        schedule: "1-0-1 · After food",
        instruction: "Morning & Night with water (भोजन के बाद)",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "med_3",
        name: "Amlodipine 5 mg",
        dosage: "5 mg",
        schedule: "0-0-1 · At night",
        instruction: "Bedtime (सोते समय)",
        confidence: "Verify",
        isHighConfidence: false,
        needsVerification: true,
        verificationReason: "Dosage frequency handwritten faintly in margin",
      },
    ],
    diagnosis: {
      name: "Viral Upper Respiratory Infection",
      confidence: "Verify",
      isHighConfidence: false,
      needsVerification: true,
      verificationReason: "Handwriting partially cursive near diagnosis line",
    },
  },

  lab_report: {
    documentType: "lab_report",
    documentName: "LabReport_May2026.pdf",
    sourceInfo: "Civil Hospital OPD · Central Diagnostic Wing · 10 May 2026",
    prescriptionDate: "10 May 2026",
    doctorName: "Clinical Biochemistry Lab",
    clinic: "Central Diagnostic Wing - Counter 2",
    confidenceScore: 95,
    investigations: [
      {
        id: "inv_1",
        testName: "Fasting Blood Glucose",
        value: "186",
        unit: "mg/dL",
        referenceRange: "70 - 100 mg/dL",
        isAbnormal: true,
        abnormality: "High (उच्च)",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "inv_2",
        testName: "HbA1c (Glycated Hemoglobin)",
        value: "8.4",
        unit: "%",
        referenceRange: "< 5.7 %",
        isAbnormal: true,
        abnormality: "High (उच्च)",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "inv_3",
        testName: "Serum Creatinine",
        value: "1.1",
        unit: "mg/dL",
        referenceRange: "0.7 - 1.3 mg/dL",
        isAbnormal: false,
        abnormality: "Normal (सामान्य)",
        confidence: "Verify",
        isHighConfidence: false,
        needsVerification: true,
        verificationReason: "Faint print on reference interval column",
      },
    ],
    diagnosis: {
      name: "Elevated Fasting Glucose (186 mg/dL) & HbA1c (8.4%)",
      confidence: "High confidence",
      isHighConfidence: true,
      needsVerification: false,
    },
    medicines: [],
  },

  discharge_summary: {
    documentType: "discharge_summary",
    documentName: "DischargeSummary_Nov2025.pdf",
    sourceInfo: "Civil Hospital OPD · Ayush Inpatient Wing · 14 Nov 2025",
    prescriptionDate: "14 Nov 2025",
    doctorName: "Dr. Ramesh Chander",
    clinic: "Ayush Inpatient Wing - Room 12",
    confidenceScore: 94,
    diagnosis: {
      name: "Stage-1 Essential Hypertension with Dyspepsia (Kaphaja Grahani)",
      confidence: "High confidence",
      isHighConfidence: true,
      needsVerification: false,
    },
    procedures: [
      {
        id: "proc_1",
        name: "Deepana-Pachana Therapy",
        date: "10 Nov 2025 - 13 Nov 2025",
        notes: "Metabolic correction with Trikatu & Bilva formulation",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "proc_2",
        name: "Takradhara Procedure",
        date: "12 Nov 2025",
        notes: "Medicated buttermilk stream therapy for psychosomatic relaxation",
        confidence: "Verify",
        isHighConfidence: false,
        needsVerification: true,
        verificationReason: "Course duration handwritten in progress notes",
      },
    ],
    dischargeInformation: {
      admissionDate: "09 Nov 2025",
      dischargeDate: "14 Nov 2025",
      conditionAtDischarge: "Stable, symptomatically improved (स्थिर, सुधार)",
      dietaryAdvice: "Pathya diet: Warm light food, avoid heavy greasy meals (लघु सुपाच्य आहार)",
      followUpDate: "28 Nov 2025",
      confidence: "High confidence",
      needsVerification: false,
    },
    medications: [
      {
        id: "ds_med_1",
        name: "Amlodipine 5 mg",
        dosage: "5 mg",
        schedule: "0-0-1",
        instruction: "At bedtime with warm water (सोते समय)",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "ds_med_2",
        name: "Avipattikar Churna 3g",
        dosage: "3g twice daily",
        schedule: "BD · Before meals",
        instruction: "With lukewarm water before meals",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "ds_med_3",
        name: "Triphala Kwath 15ml",
        dosage: "15ml at bedtime",
        schedule: "0-0-1 · Bedtime",
        instruction: "At bedtime with warm water",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
    ],
    medicines: [
      {
        id: "ds_med_1",
        name: "Amlodipine 5 mg",
        dosage: "5 mg",
        schedule: "0-0-1",
        instruction: "At bedtime with warm water (सोते समय)",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "ds_med_2",
        name: "Avipattikar Churna 3g",
        dosage: "3g twice daily",
        schedule: "BD · Before meals",
        instruction: "With lukewarm water before meals",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "ds_med_3",
        name: "Triphala Kwath 15ml",
        dosage: "15ml at bedtime",
        schedule: "0-0-1 · Bedtime",
        instruction: "At bedtime with warm water",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
    ],
  },

  other: {
    documentType: "other",
    documentName: "Vaccination_Certificate_2024.pdf",
    sourceInfo: "Civil Hospital OPD · Immunization Desk · 22 Mar 2024",
    prescriptionDate: "22 Mar 2024",
    doctorName: "Public Health & Immunization Officer",
    clinic: "Immunization Desk - Ground Floor",
    confidenceScore: 96,
    recordDetails: [
      {
        id: "rec_1",
        label: "Record Category",
        value: "Immunization / Preventive Healthcare Certificate",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "rec_2",
        label: "Primary Subject",
        value: "Adult Hepatitis B & Tetanus Toxoid Booster",
        confidence: "High confidence",
        isHighConfidence: true,
        needsVerification: false,
      },
      {
        id: "rec_3",
        label: "Administering Facility",
        value: "Civil Hospital Preventive Healthcare Unit",
        confidence: "Verify",
        isHighConfidence: false,
        needsVerification: true,
        verificationReason: "Official hospital seal partially overlapping ID code",
      },
    ],
    diagnosis: {
      name: "Preventive Adult Immunization Booster Record",
      confidence: "High confidence",
      isHighConfidence: true,
      needsVerification: false,
    },
    medicines: [],
  },
};

/**
 * Returns a cloned mock extraction payload matching the document type and multi-page count.
 */
export function getMockExtractionForDocument(docType = "prescription", documentTitle = "Medical_Document.pdf", pageCount = 1) {
  const base = mockExtractionByType[docType] || mockExtractionByType.prescription;
  const clone = JSON.parse(JSON.stringify(base));
  if (documentTitle) {
    clone.documentName = documentTitle.endsWith(".pdf") ? documentTitle : `${documentTitle}.pdf`;
  }
  clone.pageCount = pageCount || 1;
  clone.clinicalDisclaimer = {
    title: "Please verify highlighted information.",
    message: "We are only correcting document reading. This is not a clinical decision.",
    subtext: "The highlighted items with 'Verify' badges should be checked against your original paper slip.",
  };
  return clone;
}

/* ========================================================================== */
/* 8. MEDICAL TIMELINE (Coherent Chronological History)                       */
/* ========================================================================== */

export const mockTimeline = [
  {
    id: "tl_1",
    year: "2024",
    timeLabel: "2024",
    title: "Diabetes diagnosed",
    subtitle: "Type-2 Diabetes Mellitus confirmed during routine health checkup. Initiated on Metformin 500 mg (1-0-1).",
    source: "Medical document",
    sourceType: "DOCUMENT",
    badgeColor: "teal",
  },
  {
    id: "tl_2",
    year: "2025",
    timeLabel: "NOV 2025",
    title: "Hypertension & Dyspepsia treatment started",
    subtitle: "Amlodipine 5mg at bedtime prescribed for stage-1 hypertension; Ayush digestive formulations initiated",
    source: "Discharge Summary",
    sourceType: "DISCHARGE_SUMMARY",
    documentId: "DOC-003",
    badgeColor: "blue",
  },
  {
    id: "tl_3",
    year: "2026",
    timeLabel: "MAY 2026",
    title: "Lab report uploaded",
    subtitle: "HbA1c 8.4% · Fasting Blood Sugar 186 mg/dL · Serum Creatinine 1.1 mg/dL",
    source: "Lab report",
    sourceType: "LAB_REPORT",
    documentId: "DOC-002",
    badgeColor: "amber",
  },
  {
    id: "tl_4",
    year: "2026",
    timeLabel: "MAY 2026",
    title: "Viral URI Consultation & Rx",
    subtitle: "Prescribed Paracetamol 650mg BD for seasonal symptoms. Metformin and Amlodipine continued.",
    source: "Prescription",
    sourceType: "PRESCRIPTION",
    documentId: "DOC-001",
    badgeColor: "blue",
  },
  {
    id: "tl_5",
    year: "2026",
    timeLabel: "TODAY",
    title: "Fever and joint pain",
    subtitle: "Duration: 3 days · Severity: Moderate · Kiosk intake vitals recorded",
    source: "Patient Reported",
    sourceType: "PATIENT",
    badgeColor: "emerald",
    isLatest: true,
  },
];

/* ========================================================================== */
/* 9. HEALTH SUMMARY                                                          */
/* ========================================================================== */

export const mockHealthSummary = {
  disclaimer: {
    heading: "Not a diagnosis",
    headingHi: "यह कोई अंतिम निदान नहीं है",
    body: "This is a plain-language summary of the information you provided and the documents you uploaded.",
    bodyHi: "यह आपके द्वारा दी गई जानकारी और अपलोड किए गए दस्तावेज़ों का एक सरल भाषा सारांश है।",
    safetyNote:
      "Your treating doctor will make all clinical decisions based on a full physical assessment.",
    safetyNoteHi:
      "आपके डॉक्टर पूर्ण शारीरिक परीक्षण के आधार पर सभी चिकित्सीय निर्णय लेंगे।",
  },
  sections: {
    patientReported: {
      title: "What you told us",
      titleHi: "आपने जो हमें बताया",
      iconName: "MessageSquare",
      items: [
        { label: "Chief Complaint", labelHi: "मुख्य शिकायत", value: "Fever and joint pain", valueHi: "बुखार और जोड़ों में दर्द" },
        { label: "Duration", labelHi: "अवधि", value: "Duration: about 3 days", valueHi: "लगभग 3 दिन" },
        { label: "Severity", labelHi: "तीव्रता", value: "Moderate (rated 5/10 on check-in)", valueHi: "मध्यम (चेक-इन पर 5/10)" },
      ],
    },
    documentsShow: {
      title: "What your documents show",
      titleHi: "आपके दस्तावेज़ क्या दर्शाते हैं",
      iconName: "FileCheck",
      items: [
        { label: "Prescription 1", labelHi: "दवा 1", value: "Paracetamol 650 mg (Twice daily after meals, SOS)", valueHi: "पैरासिटामोल 650 मिलीग्राम (दिन में दो बार भोजन के बाद)" },
        { label: "Prescription 2", labelHi: "दवा 2", value: "Metformin 500 mg (Twice daily after food)", valueHi: "मेटफ़ॉर्मिन 500 मिलीग्राम (भोजन के बाद दिन में दो बार)" },
        { label: "Prescription 3", labelHi: "दवा 3", value: "Amlodipine 5 mg (Once daily at bedtime)", valueHi: "एम्लोडिपिन 5 मिलीग्राम (रात को सोते समय)" },
      ],
    },
    medicalHistory: {
      title: "Your medical history",
      titleHi: "आपका चिकित्सा इतिहास",
      iconName: "History",
      items: [
        { label: "Endocrine", labelHi: "एंडोक्राइन", value: "Type-2 Diabetes since 2024", valueHi: "2024 से टाइप-2 मधुमेह" },
        { label: "Cardiovascular", labelHi: "हृदय व रक्तचाप", value: "Stage-1 Hypertension since Nov 2025", valueHi: "नवंबर 2025 से उच्च रक्तचाप" },
      ],
    },
    recentResults: {
      title: "Recent results",
      titleHi: "हालिया जांच परिणाम",
      iconName: "Activity",
      dateBadge: "May 2026",
      dateBadgeHi: "मई 2026",
      items: [
        { test: "HbA1c", result: "8.4%", status: "Elevated", statusHi: "उच्च (डॉक्टर से परामर्श लें)" },
        { test: "Fasting Glucose", result: "186 mg/dL", status: "Elevated", statusHi: "उच्च" },
        { test: "Serum Creatinine", result: "1.1 mg/dL", status: "Normal", statusHi: "सामान्य" },
      ],
    },
  },
  sources: [
    {
      category: "Patient Reported",
      categoryHi: "मरीज़ द्वारा सूचित",
      count: 2,
      unit: "items",
      description: "Symptoms & duration reported during kiosk check-in",
    },
    {
      category: "Medical Documents",
      categoryHi: "चिकित्सा दस्तावेज़",
      count: 3,
      unit: "documents",
      description: "Prescription May 2026, Lab report May 2026, Discharge summary Nov 2025",
    },
  ],
  hindiAudioText:
    "नमस्ते राजेश जी। यह आपका स्वास्थ्य सारांश है। आपने पिछले तीन दिनों से बुखार और जोड़ों के दर्द की शिकायत बताई है। आपके दस्तावेज़ों के अनुसार आप पैरासिटामोल 650 मिलीग्राम, मेटफ़ॉर्मिन 500 मिलीग्राम और रात को एम्लोडिपिन 5 मिलीग्राम ले रहे हैं। आपका 2024 से मधुमेह और नवंबर 2025 से उच्च रक्तचाप का इतिहास है। मई 2026 में आपकी एचबीए1सी 8.4 प्रतिशत और ब्लड शुगर 186 मिलीग्राम थी। यह कोई अंतिम निदान नहीं है, केवल आपके डॉक्टर की सहायता के लिए तैयार सारांश है।",
};

/* ========================================================================== */
/* 10. PRIVACY & DATA CONTROL MOCK DATA                                       */
/* ========================================================================== */

export const mockPrivacyData = {
  healthHistoryAccess: {
    locked: false,
    updatedAt: "05 Sep 2026, 10:24 AM",
    description:
      "Control whether your saved health history and medical documents can be shared with connected healthcare sessions.",
  },

  activeConsents: [
    {
      id: "consent-001",
      title: "Hospital Consultation Access",
      purpose: "Share your health history and documents with the care team for your consultation.",
      whyNeeded:
        "Allows the consulting physician to review previous diagnoses, current medications, and past lab investigations during your clinical consultation.",
      informationShared: [
        "Patient-reported symptoms and intake vitals",
        "Recorded healthcare visits and clinical history",
        "Relevant medical documents and test reports",
        "Active prescription history and clinical summary",
      ],
      accessedBy: `Connected hospital care team · ${canonicalHospital.name}`,
      status: "ACTIVE",
      grantedAt: "05 Sep 2026 · 10:24 AM",
      expiresAt: "Today, end of consultation",
      lastUpdated: "05 Sep 2026 · 10:24 AM",
      scope: "Current consultation encounter (#AY-OPD-108)",
    },
    {
      id: "consent-002",
      title: "Medical Document Processing",
      purpose: "Allow uploaded medical documents to be processed for extracting information.",
      whyNeeded:
        "Enables optical character recognition (OCR) to read medicines, dosages, and diagnostic observations from paper slips to fast-track your consultation.",
      informationShared: [
        "Uploaded prescription and report images",
        "Extracted medication names and dosage schedules",
        "Extracted clinical diagnosis terms",
      ],
      accessedBy: "AyushCare Automated Document Engine",
      status: "ACTIVE",
      grantedAt: "05 Sep 2026 · 10:25 AM",
      expiresAt: "Valid for active session",
      lastUpdated: "05 Sep 2026 · 10:25 AM",
      scope: "Patient-uploaded documents in current session",
    },
  ],

  consentHistory: [
    {
      id: "ch-001",
      title: "Hospital Consultation Access",
      purpose: "Consultation sharing with attending doctor",
      status: "ACTIVE",
      grantedAt: "05 Sep 2026 · 10:24 AM",
      withdrawnAt: null,
      notes: "Granted at Kiosk check-in terminal 03",
    },
    {
      id: "ch-002",
      title: "Medical Document Processing",
      purpose: "Extraction of medications from paper prescription",
      status: "ACTIVE",
      grantedAt: "05 Sep 2026 · 10:25 AM",
      withdrawnAt: null,
      notes: "Granted on mobile companion",
    },
    {
      id: "ch-003",
      title: "Previous OPD Consultation Access",
      purpose: "Clinical evaluation for General Medicine follow-up",
      status: "WITHDRAWN",
      grantedAt: "12 May 2026 · 09:15 AM",
      withdrawnAt: "13 May 2026 · 11:30 AM",
      notes: "Access withdrawn after visit completion",
    },
    {
      id: "ch-004",
      title: "Diagnostic Lab Sharing",
      purpose: "Biochemistry blood panel report access",
      status: "EXPIRED",
      grantedAt: "10 May 2026 · 08:30 AM",
      withdrawnAt: null,
      notes: "Single-day access expired automatically",
    },
  ],

  accessHistory: [
    {
      id: "acc-001",
      organization: canonicalHospital.name,
      department: `${canonicalDoctors.verma.department} (${canonicalDoctors.verma.room})`,
      accessedByRole: `Attending Doctor (${canonicalDoctors.verma.name})`,
      informationAccessed: "Clinical history and relevant documents",
      purpose: "Consultation",
      date: "05 Sep 2026",
      time: "10:42 AM",
      status: "ALLOWED",
      details: "Reviewed intake vitals and previous prescription (Prescription_May2026.pdf)",
    },
    {
      id: "acc-002",
      organization: "AyushCare Document Processing",
      department: "Automated OCR Engine",
      accessedByRole: "System Processor",
      informationAccessed: "Uploaded prescription",
      purpose: "Document processing",
      date: "05 Sep 2026",
      time: "10:35 AM",
      status: "ALLOWED",
      details: "Recognized Paracetamol 650mg, Metformin 500mg, Amlodipine 5mg",
    },
    {
      id: "acc-003",
      organization: "Central Delhi Kiosk Terminal 03",
      department: "Patient Triage & Registration",
      accessedByRole: "Self-service kiosk check-in",
      informationAccessed: "ABHA demographic profile & upcoming appointment",
      purpose: "Queue check-in & token generation",
      date: "05 Sep 2026",
      time: "10:24 AM",
      status: "ALLOWED",
      details: "Issued appointment token #AY-OPD-108",
    },
    {
      id: "acc-004",
      organization: canonicalHospital.name,
      department: `${canonicalDoctors.roy.department} (${canonicalDoctors.roy.room})`,
      accessedByRole: `Consulting Physician (${canonicalDoctors.roy.name})`,
      informationAccessed: "Laboratory blood panel report (LabReport_May2026.pdf)",
      purpose: "Glycemic panel review",
      date: "10 May 2026",
      time: "11:30 AM",
      status: "ALLOWED",
      details: "Evaluated HbA1c (8.4%) and Fasting Glucose (186 mg/dL)",
    },
  ],

  activeSessions: [
    {
      id: "sess-001",
      name: "Hospital Kiosk",
      purpose: "Patient consultation",
      startedAt: "05 Sep 2026 · 10:30 AM",
      device: "Hospital OPD Kiosk (KIOSK-DELHI-OPD-03)",
      location: "Civil Hospital Waiting Lobby, Ground Floor",
      status: "ACTIVE",
    },
    {
      id: "sess-002",
      name: "Doctor Consultation Station",
      purpose: "Doctor review & consultation notes",
      startedAt: "05 Sep 2026 · 10:38 AM",
      device: "Doctor Desktop Console (DESK-ROOM-104)",
      location: "OPD Block B, Room 104",
      status: "ACTIVE",
    },
  ],
};
