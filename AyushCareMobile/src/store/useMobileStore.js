import { create } from "zustand";

import { analyzeDocumentOCR } from "../services/documentService.js";
import { sendSummaryToDoctor } from "../services/summaryService.js";
import { getPortalDashboard, getPortalVisits, getPortalDocuments, getPortalPrivacySettings, updatePortalPrivacySettings, updatePortalProfile, normalizePortalDocument } from "../services/portalService.js";

/* ========================================================================== */
/* SCREEN DEFINITIONS                                                         */
/* ========================================================================== */

export const SCREENS = {
  AUTH: "AUTH",

  M1: "M1",
  HOME: "M1",

  VISITS: "VISITS",
  VISIT_DETAILS: "VISIT_DETAILS",

  APPOINTMENTS: "APPOINTMENTS",

  RECORDS: "RECORDS",
  DOCUMENT_DETAILS: "DOCUMENT_DETAILS",

  MORE: "MORE",
  PRIVACY: "PRIVACY",
  CONSENT_DETAILS: "CONSENT_DETAILS",


  PROFILE: "PROFILE",
  SETTINGS: "SETTINGS",
  ABOUT: "ABOUT",

  M2: "M2",
  M3: "M3",
  M4: "M4",
  M5: "M5",
  M6: "M6",
  M7: "M7",
  M8: "M8",
  M9: "M9",
};

export const DOCUMENT_FLOW_ORDER = [
  SCREENS.M2,
  SCREENS.M3,
  SCREENS.M4,
  SCREENS.M5,
  SCREENS.M6,
  SCREENS.M7,
  SCREENS.M8,
  SCREENS.M9,
];

export const PRIMARY_SCREENS = [
  SCREENS.M1,
  SCREENS.VISITS,
  SCREENS.APPOINTMENTS,
  SCREENS.RECORDS,
  SCREENS.MORE,
];

export const SCREEN_FALLBACK_PARENTS = {
  [SCREENS.VISIT_DETAILS]: SCREENS.VISITS,
  [SCREENS.DOCUMENT_DETAILS]: SCREENS.RECORDS,

  [SCREENS.PRIVACY]: SCREENS.MORE,
  [SCREENS.CONSENT_DETAILS]: SCREENS.PRIVACY,

  [SCREENS.PROFILE]: SCREENS.MORE,
  [SCREENS.SETTINGS]: SCREENS.MORE,
  [SCREENS.ABOUT]: SCREENS.MORE,


  [SCREENS.M2]: SCREENS.M1,
  [SCREENS.M3]: SCREENS.M2,
  [SCREENS.M4]: SCREENS.M3,
  [SCREENS.M5]: SCREENS.M4,
  [SCREENS.M6]: SCREENS.M4,
  [SCREENS.M7]: SCREENS.M6,
  [SCREENS.M8]: SCREENS.M1,
  [SCREENS.M9]: SCREENS.M8,
};

/* ========================================================================== */
/* GENERAL HELPERS                                                            */
/* ========================================================================== */

const clone = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const createId = (prefix = "ID") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createDocumentId = (prefix = "DOC") => createId(prefix);

const createPageId = () => createId("PAGE");

const formatDateTime = (date = new Date()) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) +
  " · " +
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (date = new Date()) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getDocumentTypeLabel = (type) => {
  switch (type) {
    case "lab_report":
      return "Lab Report";

    case "discharge_summary":
      return "Discharge Summary";

    case "other":
      return "Other Medical Record";

    case "prescription":
    default:
      return "Prescription";
  }
};

const normalizeDocumentType = (type) => {
  const value = String(type || "")
    .trim()
    .toLowerCase();

  const aliases = {
    prescription: "prescription",
    rx: "prescription",

    lab: "lab_report",
    laboratory: "lab_report",
    lab_report: "lab_report",
    "lab-report": "lab_report",

    discharge: "discharge_summary",
    discharge_summary: "discharge_summary",
    "discharge-summary": "discharge_summary",

    other: "other",
  };

  return aliases[value] || "prescription";
};

/* ========================================================================== */
/* DOCUMENT HELPERS                                                           */
/* ========================================================================== */

const EMPTY_DOCUMENT = {
  id: null,
  fileName: null,
  fileType: null,
  documentType: null,
  date: null,
  sourceLabel: null,
  clinic: null,
  doctor: null,
  fileSize: null,
  image: null,
  dataUrl: null,
};

const createDefaultDocument = () => ({
  ...EMPTY_DOCUMENT,
  id: createDocumentId("DRAFT"),
});

const normalizePage = (page, index = 0, documentType = "prescription") => {
  const source = page || {};

  const resolvedImage =
    source.previewUrl ||
    source.imageUrl ||
    source.dataUrl ||
    source.image ||
    source.preview ||
    source.url ||
    null;

  return {
    id: source.id || createPageId(),

    pageNumber: Number(source.pageNumber) || index + 1,

    image: resolvedImage,

    dataUrl: source.dataUrl || resolvedImage,

    preview: source.preview || resolvedImage,

    previewUrl: source.previewUrl || resolvedImage,

    imageUrl: source.imageUrl || resolvedImage,

    fileName:
      source.fileName || source.name || `Document_Page_${index + 1}.jpg`,

    fileType: source.fileType || source.type || source.mimeType || "image/jpeg",

    fileSize: source.fileSize || "1.4 MB",

    date: source.date || null,

    clinic: source.clinic || null,

    doctor: source.doctor || null,

    documentType: source.documentType || source.typeId || documentType,
  };
};

const normalizePages = (pages, documentType = "prescription") =>
  (Array.isArray(pages) ? pages : []).map((page, index) =>
    normalizePage(page, index, documentType),
  );

const createEmptyDocumentDraft = (type = "prescription") => ({
  id: createDocumentId("DRAFT"),

  type: normalizeDocumentType(type),

  title: getDocumentTypeLabel(normalizeDocumentType(type)),

  fileName: null,

  status: "DRAFT",

  uploadedAt: null,

  pages: [],

  extraction: null,
});

const buildLegacyDocumentSet = (documentDraft) => {
  if (!documentDraft) {
    return [];
  }

  return [
    {
      id: documentDraft.id || "document-draft",

      title:
        documentDraft.title || documentDraft.fileName || "Medical Document",

      type: documentDraft.type || documentDraft.documentType || "prescription",

      status: documentDraft.status || "DRAFT",

      uploadedAt: documentDraft.uploadedAt || "Today",

      pages: normalizePages(documentDraft.pages, documentDraft.type),

      extraction: documentDraft.extraction || null,
    },
  ];
};

const getDraftPages = (documentDraft) =>
  normalizePages(documentDraft?.pages, documentDraft?.type || "prescription");

const createCapturedDocumentFromPages = (
  pages,
  type = "prescription",
  draftId = null,
) => {
  const normalizedPages = Array.isArray(pages) ? pages : [];
  const firstPage = normalizedPages[0] || null;
  if (!firstPage) {
    return null;
  }
  const id = draftId || firstPage.id || createDocumentId("DOC");
  return {
    ...clone(firstPage),
    id,
    documentId: id,
    documentType: type || firstPage.documentType || "prescription",
    pages: normalizedPages,
    pageCount: normalizedPages.length,
  };
};

/* ========================================================================== */
/* PREFERENCES                                                                */
/* ========================================================================== */

const getInitialLanguage = () => {
  try {
    return localStorage.getItem("ayushcare_language") || "en";
  } catch {
    return "en";
  }
};

const getInitialAccessibility = () => {
  const defaults = {
    textSize: "default",
    highContrast: false,
    audioAssistance: true,
    reduceMotion: false,
  };

  try {
    const stored = localStorage.getItem("ayushcare_accessibility");

    if (!stored) {
      return defaults;
    }

    const parsed = JSON.parse(stored);
    delete parsed.reduceMotion;
    return {
      ...defaults,
      ...parsed,
      reduceMotion: false,
    };
  } catch {
    return defaults;
  }
};

/* ========================================================================== */
/* STORE                                                                      */
/* ========================================================================== */

const getInitialAuthState = () => {
  if (typeof window === "undefined") {
    return {
      isAuthenticated: false,
      authType: null,
      patient: null,
      currentScreen: SCREENS.AUTH,
      screenHistory: [SCREENS.AUTH],
    };
  }
  try {
    const token = localStorage.getItem("ayushcare_access_token");
    const rawPatient = localStorage.getItem("ayushcare_patient");
    const authType = localStorage.getItem("ayushcare_auth_type") || "MOBILE";
    const savedAt = Number(localStorage.getItem("ayushcare_token_saved_at") || 0);
    const EIGHT_HOURS = 8 * 60 * 60 * 1000;
    const isExpired = savedAt > 0 && (Date.now() - savedAt > EIGHT_HOURS);

    if (token && rawPatient && !isExpired) {
      const patient = JSON.parse(rawPatient);
      let initialScreen = SCREENS.M1;
      try {
        const savedConsultationId = sessionStorage.getItem("ayushcare_upload_consultation_id");
        if (savedConsultationId) {
          initialScreen = SCREENS.M2;
        }
      } catch {}
      return {
        isAuthenticated: true,
        authType,
        patient,
        currentScreen: initialScreen,
        screenHistory: [initialScreen],
      };
    }
  } catch (e) {
    console.warn("Could not read auth from localStorage:", e);
  }
  return {
    isAuthenticated: false,
    authType: null,
    patient: null,
    currentScreen: SCREENS.AUTH,
    screenHistory: [SCREENS.AUTH],
  };
};

const initialAuth = getInitialAuthState();

export const useMobileStore = create((set, get) => ({
  /* ---------------------------------------------------------------------- */
  /* NAVIGATION                                                             */
  /* ---------------------------------------------------------------------- */

  currentScreen: initialAuth.currentScreen,

  screenHistory: initialAuth.screenHistory,

  activeNavTab: "home",

  setActiveNavTab: (tab) => {
    set({
      activeNavTab: tab,
    });
  },

  setScreen: (screen) => {
    if (!Object.values(SCREENS).includes(screen)) {
      return;
    }

    set((state) => {
      if (state.currentScreen === screen) {
        return state;
      }

      if (PRIMARY_SCREENS.includes(screen)) {
        return {
          currentScreen: screen,
          screenHistory: [screen],
        };
      }

      // Do not append transient processing screen M5 to screenHistory
      if (screen === SCREENS.M5) {
        return {
          currentScreen: screen,
        };
      }

      return {
        currentScreen: screen,
        screenHistory: [...state.screenHistory, screen],
      };
    });
  },

  nextScreen: () => {
    const current = get().currentScreen;

    const index = DOCUMENT_FLOW_ORDER.indexOf(current);

    if (index === -1 || index >= DOCUMENT_FLOW_ORDER.length - 1) {
      return;
    }

    const next = DOCUMENT_FLOW_ORDER[index + 1];

    set((state) => ({
      currentScreen: next,

      screenHistory: [...state.screenHistory, next],
    }));
  },

  prevScreen: () => {
    const state = get();

    if (
      state.currentScreen === SCREENS.AUTH ||
      state.currentScreen === SCREENS.M1
    ) {
      return;
    }

    // If currently on M8 (Health Summary), back button returns cleanly to Home
    if (state.currentScreen === SCREENS.M8) {
      set({
        currentScreen: SCREENS.M1,
        screenHistory: [SCREENS.M1],
      });
      return;
    }

    if (state.screenHistory.length > 1) {
      const history = [...state.screenHistory];

      history.pop();

      // Filter out any transient M5 screens if they were recorded
      while (history.length > 0 && history[history.length - 1] === SCREENS.M5) {
        history.pop();
      }

      if (history.length === 0) {
        set({
          currentScreen: SCREENS.M1,
          screenHistory: [SCREENS.M1],
        });
        return;
      }

      const previous = history[history.length - 1];

      // If user is authenticated, never navigate back to AUTH screen via back button
      if (previous === SCREENS.AUTH && state.isAuthenticated) {
        set({
          currentScreen: SCREENS.M1,
          screenHistory: [SCREENS.M1],
        });
        return;
      }

      set({
        currentScreen: previous,
        screenHistory: history,
      });

      return;
    }

    const fallback = SCREEN_FALLBACK_PARENTS[state.currentScreen] || (state.isAuthenticated ? SCREENS.M1 : SCREENS.AUTH);

    if (fallback) {
      set({
        currentScreen: fallback,
        screenHistory: [fallback],
      });
    }
  },

  /* ---------------------------------------------------------------------- */
  /* AUTHENTICATION                                                         */
  /* ---------------------------------------------------------------------- */

  isAuthenticated: initialAuth.isAuthenticated,

  authType: initialAuth.authType,

  patient: initialAuth.patient,

  vitals: null,

  latestVisit: null,

  setVitals: (vitals) => set({ vitals }),

  setLatestVisit: (latestVisit) => set({ latestVisit }),

  setVerifiedPatient: (patient, authType) => {
    const resolvedAuthType = authType || patient?.authMethod || "ABHA";
    const targetScreen = patient?.targetScreen || (resolvedAuthType === "QR" ? SCREENS.M2 : SCREENS.M1);

    const verifiedPatient = {
      ...clone(patient || {}),
      id: patient?.id,
      patientId: patient?.abha_number || patient?.abhaNumber || patient?.patientId || patient?.id,
      abhaNumber: patient?.abha_number || patient?.abhaNumber,
      abha_number: patient?.abha_number || patient?.abhaNumber,
      abhaAddress: patient?.abha_address || patient?.abhaAddress,
      abha_address: patient?.abha_address || patient?.abhaAddress,
      name: patient?.full_name || patient?.name || "Patient",
      full_name: patient?.full_name || patient?.name || "Patient",
      gender: patient?.gender,
      mobile: patient?.mobile_number || patient?.mobile || patient?.phone,
      mobile_number: patient?.mobile_number || patient?.mobile || patient?.phone,
      phone: patient?.mobile_number || patient?.mobile || patient?.phone,
      dateOfBirth: patient?.date_of_birth || patient?.dateOfBirth || patient?.dob,
      date_of_birth: patient?.date_of_birth || patient?.dateOfBirth || patient?.dob,
      dob: patient?.date_of_birth || patient?.dateOfBirth || patient?.dob,
      aadhaarNumber: patient?.aadhaar_number || patient?.aadhaarNumber,
      aadhaar_number: patient?.aadhaar_number || patient?.aadhaarNumber,
      address: patient?.address,
      authMethod: resolvedAuthType,
      verifiedAt: patient?.verifiedAt || new Date().toISOString(),
    };

    try {
      localStorage.setItem("ayushcare_patient", JSON.stringify(verifiedPatient));
      localStorage.setItem("ayushcare_auth_type", resolvedAuthType);
      if (patient?.accessToken) {
        localStorage.setItem("ayushcare_access_token", patient.accessToken);
        localStorage.setItem("ayushcare_token_saved_at", String(Date.now()));
      }
    } catch {}

    set((state) => ({
      isAuthenticated: true,

      authType: resolvedAuthType,

      patient: verifiedPatient,

      activeNavTab: targetScreen === SCREENS.M2 ? "records" : "home",

      session: {
        ...state.session,
        patient: verifiedPatient,
      },

      currentScreen: targetScreen,

      screenHistory: [targetScreen],
    }));
  },

  /* ---------------------------------------------------------------------- */
  /* SESSION / PATIENT CONTEXT                                              */
  /* ---------------------------------------------------------------------- */

  session: {
    sessionId: null,
    patient: null,
  },

  documentUploadContext: {
    consultationId: (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ayushcare_upload_consultation_id")) || null,
    source: (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ayushcare_upload_consultation_id")) ? "patient_qr" : null,
  },

  setDocumentUploadContext: (context = {}) => {
    const consultationId = context.consultationId || null;
    const source = context.source || null;
    if (typeof sessionStorage !== "undefined" && consultationId) {
      try {
        sessionStorage.setItem("ayushcare_upload_consultation_id", consultationId);
      } catch {}
    }
    set({
      documentUploadContext: {
        consultationId,
        source,
      },
    });
  },

  /* ---------------------------------------------------------------------- */
  /* APPOINTMENTS                                                           */
  /* ---------------------------------------------------------------------- */

  appointments: [],

  selectedAppointment: null,

  setAppointments: (appointments) => {
    set({
      appointments: Array.isArray(appointments) ? appointments : [],
    });
  },

  setSelectedAppointment: (appointment) => {
    set({
      selectedAppointment: appointment || null,
    });
  },

  /* ---------------------------------------------------------------------- */
  /* VISITS                                                                 */
  /* ---------------------------------------------------------------------- */

  visits: [],

  selectedVisit: null,

  setVisits: (visits) => {
    set({
      visits: Array.isArray(visits) ? visits : [],
    });
  },

  setSelectedVisit: (visit) => {
    set({
      selectedVisit: visit || null,
    });
  },

  visitFilter: "ALL",

  setVisitFilter: (filter) => {
    set({
      visitFilter: filter || "ALL",
    });
  },

  /* ---------------------------------------------------------------------- */
  /* MEDICAL RECORDS                                                        */
  /* ---------------------------------------------------------------------- */

  medicalRecords: [],

  selectedMedicalRecord: null,

  setMedicalRecords: (records) => {
    set({
      medicalRecords: Array.isArray(records) ? records : [],
    });
  },

  setSelectedMedicalRecord: (record) => {
    set({
      selectedMedicalRecord: record || null,
    });
  },

  selectedRecordCategory: "ALL",

  setSelectedRecordCategory: (category) => {
    set({
      selectedRecordCategory: category || "ALL",
    });
  },

  uploadVisitId: null,

  setUploadVisitId: (visitId) => {
    set({
      uploadVisitId: visitId || null,
    });
  },

  addMedicalRecord: (record) => {
    if (!record) {
      return;
    }

    set((state) => ({
      medicalRecords: [record, ...state.medicalRecords],
    }));
  },

  updateMedicalRecord: (id, updatedFields) => {
    if (!id) {
      return;
    }

    set((state) => ({
      medicalRecords: state.medicalRecords.map((record) =>
        record.id === id
          ? {
              ...record,
              ...updatedFields,
            }
          : record,
      ),
    }));
  },

  updateRecordExtraction: (documentId, updatedEntity) => {
    if (!documentId || !updatedEntity) {
      return;
    }

    set((state) => ({
      medicalRecords: state.medicalRecords.map((record) => {
        if (record.id !== documentId) {
          return record;
        }

        const extraction =
          clone(record.extractedInformation || record.extraction || {}) || {};

        const entityId = updatedEntity.data?.id;

        if (updatedEntity.type === "medicine") {
          extraction.medicines = (extraction.medicines || []).map((medicine) =>
            medicine.id === entityId
              ? {
                  ...medicine,
                  ...updatedEntity.data,
                  needsVerification: false,
                }
              : medicine,
          );
        }

        if (updatedEntity.type === "investigation") {
          extraction.investigations = (extraction.investigations || []).map(
            (item) =>
              item.id === entityId
                ? {
                    ...item,
                    ...updatedEntity.data,
                    needsVerification: false,
                  }
                : item,
          );
        }

        if (updatedEntity.type === "procedure") {
          extraction.procedures = (extraction.procedures || []).map((item) =>
            item.id === entityId
              ? {
                  ...item,
                  ...updatedEntity.data,
                  needsVerification: false,
                }
              : item,
          );
        }

        if (updatedEntity.type === "recordDetail") {
          extraction.recordDetails = (extraction.recordDetails || []).map(
            (item) =>
              item.id === entityId
                ? {
                    ...item,
                    ...updatedEntity.data,
                    needsVerification: false,
                  }
                : item,
          );
        }

        if (updatedEntity.type === "diagnosis") {
          const diagnosis = extraction.diagnosis;

          if (diagnosis && typeof diagnosis === "object") {
            extraction.diagnosis = {
              ...diagnosis,
              ...updatedEntity.data,
              needsVerification: false,
            };
          }
        }

        return {
          ...record,

          extractedInformation: extraction,

          extraction,
        };
      }),
    }));
  },
  /* ---------------------------------------------------------------------- */
  /* CANONICAL DOCUMENT DRAFT                                              */
  /* ---------------------------------------------------------------------- */

  /**
   * SINGLE SOURCE OF TRUTH
   *
   * One upload session = one document.
   * One document = one or more pages.
   *
   * documentDraft.pages[] contains every captured page.
   */
  documentDraft: createEmptyDocumentDraft("prescription"),

  capturedDocuments: [],

  capturedDocument: null,

  documentSets: [],

  activeSetId: null,

  selectedDocumentType: "prescription",
  documentProcessingConsent: false,

  setDocumentProcessingConsent: (value) => set({ documentProcessingConsent: Boolean(value) }),

  setSelectedDocumentType: (type) => {
    const normalizedType = normalizeDocumentType(type);

    set((state) => ({
      selectedDocumentType: normalizedType,

      documentDraft: {
        ...state.documentDraft,

        type: normalizedType,

        title:
          state.documentDraft.pages.length > 0
            ? state.documentDraft.title
            : getDocumentTypeLabel(normalizedType),
      },
    }));
  },

  setDocumentDraft: (draft) => {
    if (!draft) {
      return;
    }

    const type = normalizeDocumentType(
      draft.type || draft.documentType || get().selectedDocumentType,
    );

    const pages = normalizePages(draft.pages, type);
    const updatedDraft = {
      ...clone(draft),
      type,
      pages,
      status: draft.status || (pages.length > 0 ? "CAPTURED" : "DRAFT"),
    };
    const capturedDoc = createCapturedDocumentFromPages(
      pages,
      type,
      updatedDraft.id,
    );

    set({
      documentDraft: updatedDraft,
      capturedDocuments: pages,
      capturedDocument: capturedDoc,
      documentSets: buildLegacyDocumentSet(updatedDraft),
      activeSetId: updatedDraft.id || null,
      selectedDocumentType: type,
    });
  },

  updateDocumentDraft: (fields) => {
    if (!fields) {
      return;
    }

    set((state) => {
      const nextType = normalizeDocumentType(
        fields.type || state.documentDraft.type,
      );

      const nextPages =
        fields.pages !== undefined
          ? normalizePages(fields.pages, nextType)
          : state.documentDraft.pages;

      const updatedDraft = {
        ...state.documentDraft,
        ...clone(fields),
        type: nextType,
        pages: nextPages,
      };

      const capturedDoc = createCapturedDocumentFromPages(
        nextPages,
        nextType,
        updatedDraft.id,
      );

      return {
        documentDraft: updatedDraft,
        capturedDocuments: nextPages,
        capturedDocument: capturedDoc,
        documentSets: buildLegacyDocumentSet(updatedDraft),
        activeSetId: updatedDraft.id || null,
        selectedDocumentType: nextType,
      };
    });
  },

  /**
   * Add a NEW page to the active document.
   */
  addDocumentPage: (page) => {
    if (!page) {
      return null;
    }

    let createdPage = null;

    set((state) => {
      const type = normalizeDocumentType(
        state.documentDraft.type || state.selectedDocumentType,
      );

      createdPage = normalizePage(page, state.documentDraft.pages.length, type);

      const pages = [...state.documentDraft.pages, createdPage].map(
        (item, index) => ({
          ...item,
          pageNumber: index + 1,
        }),
      );

      const updatedDraft = {
        ...state.documentDraft,
        pages,
        status: "CAPTURED",
        uploadedAt:
          state.documentDraft.uploadedAt || new Date().toISOString(),
      };

      const capturedDoc = createCapturedDocumentFromPages(
        pages,
        type,
        updatedDraft.id,
      );

      return {
        documentDraft: updatedDraft,
        capturedDocuments: pages,
        capturedDocument: capturedDoc,
        documentSets: buildLegacyDocumentSet(updatedDraft),
        activeSetId: updatedDraft.id || null,
      };
    });

    return createdPage;
  },

  /**
   * Replace an EXISTING page.
   *
   * This is the important retake API.
   *
   * pageId identifies the page that the user
   * wants to retake.
   */
  replaceDocumentPage: (pageId, replacement) => {
    if (!pageId || !replacement) {
      return;
    }

    set((state) => {
      const type = normalizeDocumentType(
        state.documentDraft.type || state.selectedDocumentType,
      );

      const existingIndex = state.documentDraft.pages.findIndex(
        (page) => page.id === pageId,
      );

      if (existingIndex === -1) {
        return state;
      }

      const replacementPage = normalizePage(replacement, existingIndex, type);

      replacementPage.id = pageId;

      replacementPage.pageNumber = existingIndex + 1;

      const pages = state.documentDraft.pages.map((page, index) =>
        index === existingIndex
          ? replacementPage
          : {
              ...page,
              pageNumber: index + 1,
            },
      );

      const updatedDraft = {
        ...state.documentDraft,
        pages,
        status: "CAPTURED",
      };

      const capturedDoc = createCapturedDocumentFromPages(
        pages,
        type,
        updatedDraft.id,
      );

      return {
        documentDraft: updatedDraft,
        capturedDocuments: pages,
        capturedDocument: capturedDoc,
        documentSets: buildLegacyDocumentSet(updatedDraft),
        activeSetId: updatedDraft.id || null,
        retargetPageForRetake: null,
      };
    });
  },

  removeDocumentPage: (pageId) => {
    if (!pageId) {
      return;
    }

    set((state) => {
      const pages = state.documentDraft.pages
        .filter((page) => page.id !== pageId)
        .map((page, index) => ({
          ...page,
          pageNumber: index + 1,
        }));

      const type = state.documentDraft.type || state.selectedDocumentType;

      const updatedDraft = {
        ...state.documentDraft,
        pages,
        status: pages.length > 0 ? "CAPTURED" : "DRAFT",
      };

      const capturedDoc = createCapturedDocumentFromPages(
        pages,
        type,
        updatedDraft.id,
      );

      return {
        documentDraft: updatedDraft,
        capturedDocuments: pages,
        capturedDocument: capturedDoc,
        documentSets: buildLegacyDocumentSet(updatedDraft),
        activeSetId: updatedDraft.id || null,
        retargetPageForRetake: null,
      };
    });
  },

  clearDocumentDraft: () => {
    const type = get().selectedDocumentType || "prescription";
    const newDraft = createEmptyDocumentDraft(type);

    set({
      documentDraft: newDraft,
      capturedDocuments: [],
      capturedDocument: null,
      documentSets: buildLegacyDocumentSet(newDraft),
      activeSetId: newDraft.id || null,
      extractedData: {},
      analysisStep: 0,
      isAnalyzing: false,
      retargetPageForRetake: null,

      uploadVisitId: null,
    });
  },

  /* ---------------------------------------------------------------------- */
  /* RETAKE TARGET                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * When M4 asks to retake a page, it stores
   * the exact page ID here.
   *
   * M3 can then replace that page instead of
   * blindly appending another page.
   */
  retargetPageForRetake: null,

  setRetargetPageForRetake: (target) => {
    set({
      retargetPageForRetake: target || null,
    });
  },

  /* ---------------------------------------------------------------------- */
  /* LEGACY DOCUMENT-SET COMPATIBILITY                                     */
  /* ---------------------------------------------------------------------- */

  setActiveSetId: (id) => {
    if (!id) {
      return;
    }

    set((state) => ({
      activeSetId: id,
      documentDraft: {
        ...state.documentDraft,
        id,
      },
    }));
  },

  createDocumentSet: (title = "Medical Document", type = "prescription") => {
    const normalizedType = normalizeDocumentType(type);

    const documentId = createDocumentId("DOC");

    const newDraft = {
      id: documentId,

      type: normalizedType,

      title: title || getDocumentTypeLabel(normalizedType),

      fileName: null,

      status: "DRAFT",

      uploadedAt: null,

      pages: [],

      extraction: null,
    };

    set({
      selectedDocumentType: normalizedType,

      documentDraft: newDraft,

      capturedDocuments: [],

      capturedDocument: null,

      documentSets: buildLegacyDocumentSet(newDraft),

      activeSetId: documentId,

      retargetPageForRetake: null,

      extractedData: {},

      analysisStep: 0,

      isAnalyzing: false,
    });

    return documentId;
  },

  deleteDocumentSet: () => {
    get().clearDocumentDraft();
  },

  updateDocumentSetTitle: (setId, title, type) => {
    set((state) => {
      const normalizedType = normalizeDocumentType(
        type || state.documentDraft.type,
      );

      return {
        selectedDocumentType: normalizedType,

        documentDraft: {
          ...state.documentDraft,

          id: setId || state.documentDraft.id,

          title: title || state.documentDraft.title,

          type: normalizedType,
        },
      };
    });
  },

  addPageToSet: (_setId, pageData) => {
    return get().addDocumentPage(pageData);
  },

  replacePageInSet: (_setId, pageId, pageData) => {
    get().replaceDocumentPage(pageId, pageData);
  },

  removePageFromSet: (_setId, pageId) => {
    get().removeDocumentPage(pageId);
  },

  movePageBetweenSets: () => {
    /**
     * Deliberately disabled.
     *
     * The application now models a document
     * as one object containing pages[].
     */
    return;
  },

  /* ---------------------------------------------------------------------- */
  /* CAPTURE API                                                            */
  /* ---------------------------------------------------------------------- */

  setCapturedDocument: (document) => {
    if (!document) {
      set({
        capturedDocument: null,
        capturedDocuments: [],
      });
      return;
    }

    const state = get();
    const type = normalizeDocumentType(
      document.documentType || state.selectedDocumentType,
    );

    let pages = [];
    if (Array.isArray(document.pages) && document.pages.length > 0) {
      pages = normalizePages(document.pages, type);
    } else {
      pages = [normalizePage(document, 0, type)];
    }

    const firstPage = pages[0];

    /**
     * Legacy setter means:
     *
     * - if a retake target exists:
     *   replace that page
     *
     * - otherwise:
     *   replace the current document pages
     *   with this single page
     */
    if (
      state.retargetPageForRetake !== null &&
      state.retargetPageForRetake !== undefined
    ) {
      const targetId =
        typeof state.retargetPageForRetake === "object"
          ? state.retargetPageForRetake.pageId || state.retargetPageForRetake.id
          : typeof state.retargetPageForRetake === "number" &&
              state.documentDraft.pages[state.retargetPageForRetake]
            ? state.documentDraft.pages[state.retargetPageForRetake].id
            : state.retargetPageForRetake;

      if (targetId) {
        get().replaceDocumentPage(targetId, firstPage);
        return;
      }
    }

    const docId =
      document.id ||
      document.documentId ||
      state.documentDraft.id ||
      firstPage.id ||
      createDocumentId("DOC");

    const normalizedDoc = {
      ...clone(document),
      ...firstPage,
      id: docId,
      documentId: docId,
      documentType: type,
      pages,
      pageCount: pages.length,
    };

    const updatedDraft = {
      ...state.documentDraft,
      id: docId,
      type,
      pages,
      status: "CAPTURED",
      uploadedAt:
        state.documentDraft.uploadedAt || new Date().toISOString(),
    };

    set({
      documentDraft: updatedDraft,
      capturedDocument: normalizedDoc,
      capturedDocuments: pages,
      documentSets: buildLegacyDocumentSet(updatedDraft),
      activeSetId: docId,
    });
  },

  setCapturedDocuments: (documents) => {
    const state = get();
    const type = normalizeDocumentType(state.selectedDocumentType);
    const pages = normalizePages(documents, type);

    const docId = state.documentDraft.id || createDocumentId("DOC");
    const capturedDoc = createCapturedDocumentFromPages(pages, type, docId);

    const updatedDraft = {
      ...state.documentDraft,
      id: docId,
      pages,
      status: pages.length > 0 ? "CAPTURED" : "DRAFT",
      uploadedAt:
        pages.length > 0
          ? state.documentDraft.uploadedAt || new Date().toISOString()
          : null,
    };

    set({
      documentDraft: updatedDraft,
      capturedDocuments: pages,
      capturedDocument: capturedDoc,
      documentSets: buildLegacyDocumentSet(updatedDraft),
      activeSetId: docId,
    });
  },

  addCapturedDocument: (document) => {
    return get().addDocumentPage(document);
  },

  removeCapturedDocument: (id) => {
    get().removeDocumentPage(id);
  },

  clearCapturedDocuments: () => {
    get().clearDocumentDraft();
  },

  /* ---------------------------------------------------------------------- */
  /* DOCUMENT ANALYSIS                                                      */
  /* ---------------------------------------------------------------------- */

  isAnalyzing: false,

  analysisStep: 0,

  setAnalysisStep: (step) => {
    set({
      analysisStep: Number(step) || 0,
    });
  },

  runAnalysisSimulation: async (onComplete) => {
    const state = get();

    const pages = getDraftPages(state.documentDraft);

    if (pages.length === 0) {
      const result = {
        success: false,

        error: "Please capture at least one document page before analysis.",
      };

      if (typeof onComplete === "function") {
        onComplete(result);
      }

      return result;
    }

    set({
      isAnalyzing: true,

      analysisStep: 0,
    });

    try {
      const documentForAnalysis = {
        id: state.documentDraft.id || createDocumentId("DOC"),

        type:
          state.documentDraft.type ||
          state.selectedDocumentType ||
          "prescription",

        title:
          state.documentDraft.title ||
          state.documentDraft.fileName ||
          "Medical Document",

        pages,
        consultationId: state.documentUploadContext?.consultationId || null,
      };

      const result = await analyzeDocumentOCR(
        documentForAnalysis,
        (progress) => {
          const value =
            typeof progress === "object"
              ? (progress.progress ?? progress.step ?? 0)
              : progress;

          set({
            analysisStep: Number(value) || 0,
          });
        },
      );

      if (result?.success && result?.extractedData) {
        set((current) => ({
          extractedData: clone(result.extractedData),

          documentDraft: {
            ...current.documentDraft,

            extraction: clone(result.extractedData),

            status: "ANALYZED",
          },
        }));
      }

      set({
        isAnalyzing: false,
      });

      if (typeof onComplete === "function") {
        onComplete(result);
      }

      return result;
    } catch (error) {
      console.error("Document analysis failed:", error);

      const result = {
        success: false,

        error: error?.message || "Document analysis failed.",
      };

      set({
        isAnalyzing: false,
      });

      if (typeof onComplete === "function") {
        onComplete(result);
      }

      return result;
    }
  },
  /* ---------------------------------------------------------------------- */
  /* EXTRACTED INFORMATION                                                  */
  /* ---------------------------------------------------------------------- */

  extractedData: {},

  setExtractedData: (data) => {
    if (!data) {
      return;
    }

    set((state) => ({
      extractedData: clone(data),

      documentDraft: {
        ...state.documentDraft,

        extraction: clone(data),
      },
    }));
  },

  updateMedicine: (id, updatedFields) => {
    if (!id) {
      return;
    }

    set((state) => {
      const extracted = clone(state.extractedData) || {};

      extracted.medicines = (extracted.medicines || []).map((medicine) =>
        medicine.id === id
          ? {
              ...medicine,
              ...updatedFields,
              needsVerification: false,
            }
          : medicine,
      );

      return {
        extractedData: extracted,

        documentDraft: {
          ...state.documentDraft,

          extraction: clone(extracted),
        },
      };
    });
  },

  updateInvestigation: (id, updatedFields) => {
    if (!id) {
      return;
    }

    set((state) => {
      const extracted = clone(state.extractedData) || {};

      extracted.investigations = (extracted.investigations || []).map(
        (investigation) =>
          investigation.id === id
            ? {
                ...investigation,
                ...updatedFields,
                needsVerification: false,
              }
            : investigation,
      );

      return {
        extractedData: extracted,

        documentDraft: {
          ...state.documentDraft,

          extraction: clone(extracted),
        },
      };
    });
  },

  updateProcedure: (id, updatedFields) => {
    if (!id) {
      return;
    }

    set((state) => {
      const extracted = clone(state.extractedData) || {};

      extracted.procedures = (extracted.procedures || []).map((procedure) =>
        procedure.id === id
          ? {
              ...procedure,
              ...updatedFields,
              needsVerification: false,
            }
          : procedure,
      );

      return {
        extractedData: extracted,

        documentDraft: {
          ...state.documentDraft,

          extraction: clone(extracted),
        },
      };
    });
  },

  updateRecordDetail: (id, updatedFields) => {
    if (!id) {
      return;
    }

    set((state) => {
      const extracted = clone(state.extractedData) || {};

      extracted.recordDetails = (extracted.recordDetails || []).map((item) =>
        item.id === id
          ? {
              ...item,
              ...updatedFields,
              needsVerification: false,
            }
          : item,
      );

      return {
        extractedData: extracted,

        documentDraft: {
          ...state.documentDraft,

          extraction: clone(extracted),
        },
      };
    });
  },

  updateDiagnosis: (updatedDiagnosis) => {
    if (!updatedDiagnosis) {
      return;
    }

    set((state) => {
      const extracted = clone(state.extractedData) || {};

      extracted.diagnosis = {
        ...(extracted.diagnosis || {}),
        ...updatedDiagnosis,
        needsVerification: false,
      };

      return {
        extractedData: extracted,

        documentDraft: {
          ...state.documentDraft,

          extraction: clone(extracted),
        },
      };
    });
  },

  /* ---------------------------------------------------------------------- */
  /* CONFIRM EXTRACTION                                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Convert OCR output into a verified persisted record.
   *
   * IMPORTANT:
   * This creates exactly ONE medical record
   * for the active document.
   *
   * Pages remain inside pages[].
   */
  confirmExtractedInformation: () => {
    const state = get();

    const document = state.documentDraft;

    if (
      !document ||
      !Array.isArray(document.pages) ||
      document.pages.length === 0
    ) {
      return null;
    }

    const extraction =
      clone(state.extractedData || document.extraction || {}) || {};

    const verifiedExtraction = {
      ...extraction,

      medicines: (extraction.medicines || []).map((medicine) => ({
        ...medicine,

        needsVerification: false,

        confidence: medicine.confidence || "High confidence",
      })),

      investigations: (extraction.investigations || []).map(
        (investigation) => ({
          ...investigation,

          needsVerification: false,

          confidence: investigation.confidence || "High confidence",
        }),
      ),

      procedures: (extraction.procedures || []).map((procedure) => ({
        ...procedure,

        needsVerification: false,

        confidence: procedure.confidence || "High confidence",
      })),

      recordDetails: (extraction.recordDetails || []).map((item) => ({
        ...item,

        needsVerification: false,

        confidence: item.confidence || "High confidence",
      })),

      diagnosis: extraction.diagnosis
        ? {
            ...extraction.diagnosis,

            needsVerification: false,

            confidence: extraction.diagnosis.confidence || "High confidence",
          }
        : null,
    };

    const pages = normalizePages(document.pages, document.type);

    const targetVisitId =
      state.uploadVisitId || state.selectedVisit?.id || null;

    const patientId = state.patient?.id || state.session?.patient?.id || null;

    const documentId =
      document.id && !String(document.id).startsWith("DRAFT-")
        ? document.id
        : createDocumentId("DOC");

    const type = normalizeDocumentType(
      document.type || state.selectedDocumentType,
    );

    const typeLabel = getDocumentTypeLabel(type);

    const title = document.title || document.fileName || typeLabel;

    const date = pages[0]?.date || new Date().toISOString().split("T")[0];

    const source =
      pages[0]?.clinic ||
      (targetVisitId ? "Hospital Consultation" : "Patient Upload");

    const doctor =
      pages[0]?.doctor ||
      (targetVisitId ? "Attending Physician" : "Self-Uploaded");

    const persistedRecord = {
      id: documentId,

      type,

      typeLabel,

      title: String(title).endsWith(".pdf") ? title : `${title}.pdf`,

      date,

      displayDate: pages[0]?.date || "Today",

      monthGroup: "RECENT",

      source,

      doctor,

      clinic: pages[0]?.clinic || "OPD Desk",

      status: "CONFIRMED",

      statusLabel: "Confirmed",

      visitId: targetVisitId,

      patientId,

      sessionId: state.documentUploadContext?.consultationId || state.session?.sessionId || null,

      fileSize: document.fileSize || `${(pages.length * 1.2).toFixed(1)} MB`,

      dataUrl: pages[0]?.dataUrl || pages[0]?.image || null,

      image: pages[0]?.image || pages[0]?.dataUrl || null,

      pageNumber: 1,

      totalPages: pages.length,

      pages,

      extractedInformation: verifiedExtraction,

      extraction: verifiedExtraction,

      sourceDocument: {
        id: documentId,

        type,

        title,

        pageCount: pages.length,

        pages,
      },
    };

    const diagnosisName =
      verifiedExtraction?.diagnosis?.name ||
      verifiedExtraction?.diagnosis?.value ||
      typeLabel;

    const timelineEntry = {
      id: `timeline-${Date.now()}`,

      year: String(new Date().getFullYear()),

      timeLabel: "TODAY",

      title:
        `${typeLabel} processed` +
        (pages.length > 1 ? ` (${pages.length} pages)` : ""),

      subtitle: `${persistedRecord.title} · ${diagnosisName}`,

      source: typeLabel,

      sourceType: "DOCUMENT",

      documentId: persistedRecord.id,

      recordId: persistedRecord.id,

      visitId: targetVisitId,

      badgeColor: "teal",

      isLatest: true,
    };

    set((current) => ({
      extractedData: verifiedExtraction,

      medicalRecords: [persistedRecord, ...(current.medicalRecords || [])],

      timeline: [timelineEntry, ...(current.timeline || [])],

      documentDraft: {
        ...current.documentDraft,

        id: documentId,

        type,

        status: "CONFIRMED",

        extraction: verifiedExtraction,

        pages,
      },

      uploadVisitId: null,
    }));

    return persistedRecord;
  },

  /* ---------------------------------------------------------------------- */
  /* TIMELINE / HEALTH SUMMARY                                             */
  /* ---------------------------------------------------------------------- */

  timeline: [],

  healthSummary: {},

  setTimeline: (timeline) => {
    set({
      timeline: Array.isArray(timeline) ? timeline : [],
    });
  },

  setHealthSummary: (summary) => {
    if (!summary) {
      return;
    }

    set({
      healthSummary: clone(summary),
    });
  },

  isHindiSpeechPlaying: false,

  setIsHindiSpeechPlaying: (isPlaying) => {
    set({
      isHindiSpeechPlaying: Boolean(isPlaying),
    });
  },

  /* ---------------------------------------------------------------------- */
  /* DOCUMENT MODALS                                                        */
  /* ---------------------------------------------------------------------- */

  isOriginalDocModalOpen: false,

  setOriginalDocModalOpen: (open) => {
    set({
      isOriginalDocModalOpen: Boolean(open),
    });
  },

  editingEntity: null,

  setEditingEntity: (entity) => {
    set({
      editingEntity: entity || null,
    });
  },

  /* ---------------------------------------------------------------------- */
  /* PRIVACY                                                                */
  /* ---------------------------------------------------------------------- */

  privacyData: {
    healthHistoryAccess: {
      locked: false,
    },

    activeConsents: [],

    consentHistory: [],

    activeSessions: [],

    accessHistory: [],
  },

  isHealthHistoryLocked: false,

  selectedConsent: null,

  setSelectedConsent: (consent) => {
    set({
      selectedConsent: consent || null,
    });
  },

  /**
   * Health-history sharing is a PRODUCT-LEVEL switch.
   *
   * Locking it does not delete records.
   * It only prevents the mobile companion from
   * sharing health history through the handoff.
   */
  loadPortalData: async () => {
    try {
      const [dashboard, visits, documents] = await Promise.all([
        getPortalDashboard().catch((err) => { console.warn("[Portal Data] Dashboard error:", err?.message || err); return null; }),
        getPortalVisits().catch((err) => { console.warn("[Portal Data] Visits error:", err?.message || err); return []; }),
        getPortalDocuments().catch((err) => { console.warn("[Portal Data] Documents error:", err?.message || err); return []; }),
      ]);
      const normalizedVisits = Array.isArray(visits)
        ? visits
        : Array.isArray(visits?.visits)
          ? visits.visits
          : Array.isArray(visits?.data)
            ? visits.data
            : [];
      const normalizedAppointments = normalizedVisits.map((visit) => ({
        ...visit,
        appointmentId: visit.id,
        date: visit.created_at || visit.date,
        appointmentDate: visit.created_at || visit.date,
        tokenNumber: visit.token_number || visit.tokenNumber || null,
        doctorName: visit.doctor_name || visit.doctorName || 'AyushCare Medical Officer',
        departmentName: visit.department_name || visit.departmentName || 'General Medicine',
        specialty: visit.department_name || visit.departmentName || 'General Medicine',
        hospitalName: visit.hospital_name || visit.hospitalName || 'AyushCare Center',
      }));
      const documentList = Array.isArray(documents)
        ? documents
        : Array.isArray(documents?.documents)
          ? documents.documents
          : Array.isArray(documents?.data)
            ? documents.data
            : [];
      const normalizedDocuments = documentList
        .map(normalizePortalDocument)

      let mergedPatient = null;
      if (dashboard?.patient) {
        const p = dashboard.patient;
        mergedPatient = {
          ...(get().patient || {}),
          ...p,
          name: p.full_name || p.name || "Patient",
          full_name: p.full_name || p.name || "Patient",
          patientId: p.abha_number || p.abhaNumber || p.patientId || p.id,
          abhaNumber: p.abha_number || p.abhaNumber,
          abha_number: p.abha_number || p.abhaNumber,
          abhaAddress: p.abha_address || p.abhaAddress,
          abha_address: p.abha_address || p.abhaAddress,
          aadhaarNumber: p.aadhaar_number || p.aadhaarNumber,
          aadhaar_number: p.aadhaar_number || p.aadhaarNumber,
          mobile: p.mobile_number || p.mobile || p.phone,
          mobile_number: p.mobile_number || p.mobile || p.phone,
          dateOfBirth: p.date_of_birth || p.dateOfBirth || p.dob,
          date_of_birth: p.date_of_birth || p.dateOfBirth || p.dob,
          dob: p.date_of_birth || p.dateOfBirth || p.dob,
        };
        try {
          localStorage.setItem("ayushcare_patient", JSON.stringify(mergedPatient));
        } catch {}
      }

      set((state) => ({
        patient: mergedPatient || dashboard?.patient || state.patient,
        session: {
          ...state.session,
          patient: mergedPatient || dashboard?.patient || state.session?.patient,
        },
        healthSummary: dashboard?.ai_summary || state.healthSummary,
        vitals: dashboard?.vitals || state.vitals,
        latestVisit: dashboard?.latest_visit || state.latestVisit,
        visits: normalizedVisits,
        appointments: normalizedAppointments,
        medicalRecords: normalizedDocuments,
      }));
      return { dashboard, visits: normalizedVisits, documents: normalizedDocuments };
    } catch (error) {
      console.warn("Portal data could not be loaded:", error?.message || error);
      return null;
    }
  },

  loadPrivacySettings: async () => {
    try {
      const settings = await getPortalPrivacySettings();
      if (settings) {
        set((state) => ({
          privacyData: { ...state.privacyData, serverSettings: settings },
        }));
      }
      return settings;
    } catch (error) {
      console.warn("Privacy settings could not be loaded:", error?.message || error);
      return null;
    }
  },

  updatePrivacySetting: async (field, value) => {
    const allowed = new Set([
      "isolate_past_history",
      "consent_voice_processing",
      "share_previous_departments",
      "share_previous_reports",
      "share_previous_appointments",
      "lock_diagnosis",
      "lock_visits",
      "lock_reports",
    ]);
    if (!allowed.has(field)) return { success: false, error: "Unsupported privacy setting" };
    const current = get().privacyData?.serverSettings || {};
    const boolVal = Boolean(value);
    const payload = { ...current, [field]: boolVal };

    // Optimistic update
    set((state) => ({
      privacyData: {
        ...state.privacyData,
        serverSettings: {
          ...(state.privacyData?.serverSettings || {}),
          [field]: boolVal,
        },
      },
      isHealthHistoryLocked:
        field === "isolate_past_history" ? boolVal : state.isHealthHistoryLocked,
    }));

    const isDemo = Boolean(get().patient?.isDemo);
    if (isDemo) {
      return { success: true, data: payload };
    }

    try {
      const saved = await updatePortalPrivacySettings(payload);
      if (saved) {
        set((state) => ({
          privacyData: {
            ...state.privacyData,
            serverSettings: saved,
          },
        }));
      }
      return { success: true, data: saved };
    } catch (error) {
      console.error("Privacy setting update failed:", error);
      if (error?.status !== 401) {
        // Revert on real server rejection (non-auth error)
        set((state) => ({
          privacyData: {
            ...state.privacyData,
            serverSettings: current,
          },
        }));
      }
      return { success: false, error: error?.message || "Unable to save privacy setting" };
    }
  },

  setHealthHistoryLocked: (locked) => {
    const value = Boolean(locked);

    set((state) => ({
      isHealthHistoryLocked: value,

      privacyData: {
        ...state.privacyData,

        healthHistoryAccess: {
          ...(state.privacyData?.healthHistoryAccess || {}),

          locked: value,

          updatedAt: formatDateTime(),
        },
      },
    }));
  },

  toggleHealthHistoryAccess: () => {
    const current = get().isHealthHistoryLocked;

    get().setHealthHistoryLocked(!current);
  },

  /* ---------------------------------------------------------------------- */
  /* CONSENT                                                                */
  /* ---------------------------------------------------------------------- */

  withdrawConsent: (consentId) => {
    if (!consentId) {
      return;
    }

    set((state) => {
      const privacy = state.privacyData;

      const targetConsent = (privacy.activeConsents || []).find(
        (consent) => consent.id === consentId,
      );

      if (!targetConsent) {
        return state;
      }

      const now = formatDateTime();

      const activeConsents = (privacy.activeConsents || []).map((consent) =>
        consent.id === consentId
          ? {
              ...consent,

              status: "WITHDRAWN",

              withdrawnAt: now,

              lastUpdated: now,
            }
          : consent,
      );

      /**
       * IMPORTANT:
       *
       * History records may use either
       * id or consentId depending on the
       * original mock data.
       *
       * We match BOTH so the history
       * entry cannot silently diverge.
       */
      const existingHistory = (privacy.consentHistory || []).find(
        (item) => item.id === consentId || item.consentId === consentId,
      );

      const consentHistory = existingHistory
        ? (privacy.consentHistory || []).map((item) =>
            item.id === consentId || item.consentId === consentId
              ? {
                  ...item,

                  consentId: item.consentId || consentId,

                  status: "WITHDRAWN",

                  withdrawnAt: now,
                }
              : item,
          )
        : [
            {
              id: `history-${consentId}`,

              consentId: consentId,

              title: targetConsent.title,

              purpose: targetConsent.purpose,

              status: "WITHDRAWN",

              grantedAt: targetConsent.grantedAt,

              withdrawnAt: now,

              notes: "Access withdrawn by patient.",
            },

            ...(privacy.consentHistory || []),
          ];

      const auditEvent = {
        id: `audit-withdraw-${Date.now()}`,

        organization: "Patient Privacy Control",

        department: "Mobile Companion",

        accessedByRole: "Patient (Self)",

        informationAccessed: targetConsent.title,

        purpose: "Patient consent withdrawal",

        date: formatDate(),

        time: formatTime(),

        status: "WITHDRAWN",

        details: `Access permission '${targetConsent.title}' was withdrawn by the patient.`,
      };

      return {
        privacyData: {
          ...privacy,

          activeConsents,

          consentHistory,

          accessHistory: [auditEvent, ...(privacy.accessHistory || [])],
        },

        selectedConsent:
          state.selectedConsent?.id === consentId
            ? {
                ...state.selectedConsent,

                status: "WITHDRAWN",

                withdrawnAt: now,
              }
            : state.selectedConsent,
      };
    });
  },

  regrantConsent: (consentId) => {
    if (!consentId) {
      return;
    }

    set((state) => {
      const privacy = state.privacyData;

      const targetConsent = (privacy.activeConsents || []).find(
        (consent) => consent.id === consentId,
      );

      if (!targetConsent) {
        return state;
      }

      const now = formatDateTime();

      const activeConsents = (privacy.activeConsents || []).map((consent) =>
        consent.id === consentId
          ? {
              ...consent,

              status: "ACTIVE",

              grantedAt: now,

              withdrawnAt: null,

              lastUpdated: now,
            }
          : consent,
      );

      const consentHistory = (privacy.consentHistory || []).map((item) =>
        item.id === consentId || item.consentId === consentId
          ? {
              ...item,

              consentId: item.consentId || consentId,

              status: "ACTIVE",

              grantedAt: now,

              withdrawnAt: null,
            }
          : item,
      );

      const auditEvent = {
        id: `audit-regrant-${Date.now()}`,

        organization: "Patient Privacy Control",

        department: "Mobile Companion",

        accessedByRole: "Patient (Self)",

        informationAccessed: targetConsent.title,

        purpose: "Permission re-allowed",

        date: formatDate(),

        time: formatTime(),

        status: "ACTIVE",

        details: `Access permission '${targetConsent.title}' was re-allowed by the patient.`,
      };

      return {
        privacyData: {
          ...privacy,

          activeConsents,

          consentHistory,

          accessHistory: [auditEvent, ...(privacy.accessHistory || [])],
        },

        selectedConsent:
          state.selectedConsent?.id === consentId
            ? {
                ...state.selectedConsent,

                status: "ACTIVE",

                grantedAt: now,

                withdrawnAt: null,
              }
            : state.selectedConsent,
      };
    });
  },

  toggleConsent: (consentId) => {
    const consent = (get().privacyData?.activeConsents || []).find(
      (item) => item.id === consentId,
    );

    if (!consent) {
      return;
    }

    if (consent.status === "ACTIVE") {
      get().withdrawConsent(consentId);
    } else {
      get().regrantConsent(consentId);
    }
  },
  /* ---------------------------------------------------------------------- */
  /* KIOSK SESSION                                                          */
  /* ---------------------------------------------------------------------- */

  kioskSession: {
    id: null,
    sessionToken: null,
    pairingToken: null,
    kioskName: null,
    terminalId: null,
    hospitalName: null,
    department: null,
    location: null,
    consultationId: null,
    status: "DISCONNECTED",
    startedAt: null,
    connectedAt: null,
    endedAt: null,
    expiresAt: null,
    expiresInSeconds: 0,
  },

  connectKioskSession: (sessionData, patientData) => {
    const now = new Date();

    const incoming = clone(sessionData || {}) || {};

    const current = get().kioskSession;

    const updatedSession = {
      ...current,

      ...incoming,

      status: "CONNECTED",

      connectedAt: formatDateTime(now),

      endedAt: null,

      kioskPatient: patientData || null,

      expiresInSeconds:
        incoming.expiresInSeconds || current.expiresInSeconds || 300,
    };

    set((state) => {
      const activeSessions = [...(state.privacyData?.activeSessions || [])];

      const existingIndex = activeSessions.findIndex(
        (session) =>
          session.id === updatedSession.id || session.name === "Hospital Kiosk",
      );

      const kioskPrivacySession = {
        id: updatedSession.id,

        name: updatedSession.kioskName || "Hospital Kiosk",

        purpose: "Patient consultation",

        startedAt: updatedSession.startedAt || formatDateTime(now),

        device: `${updatedSession.kioskName || "Hospital OPD Kiosk"} (${updatedSession.terminalId || "KIOSK"})`,

        location: updatedSession.location || "Hospital OPD",

        status: "ACTIVE",
      };

      if (existingIndex >= 0) {
        activeSessions[existingIndex] = kioskPrivacySession;
      } else {
        activeSessions.unshift(kioskPrivacySession);
      }

      const auditEvent = {
        id: `audit-kiosk-${Date.now()}`,

        organization: updatedSession.hospitalName || "Civil Hospital OPD",

        department: updatedSession.department || "General OPD",

        accessedByRole: "Patient Kiosk QR Auto-Connect",

        informationAccessed: "Temporary kiosk session reference",

        purpose: "Kiosk companion synchronization",

        date: formatDate(now),

        time: formatTime(now),

        status: "ALLOWED",

        details:
          "Mobile companion linked to the kiosk using a short-lived session reference.",
      };

      return {
        kioskSession: updatedSession,

        timerSecondsRemaining: updatedSession.expiresInSeconds || 300,

        isSessionExpired: false,

        privacyData: {
          ...state.privacyData,

          activeSessions,

          accessHistory: [
            auditEvent,
            ...(state.privacyData?.accessHistory || []),
          ],
        },
      };
    });
  },

  setKioskSessionStatus: (status) => {
    if (!status) {
      return;
    }

    set((state) => ({
      kioskSession: {
        ...state.kioskSession,

        status,
      },
    }));
  },

  endKioskSession: (sessionId = null) => {
    const now = new Date();

    set((state) => {
      const current = state.kioskSession;

      const targetId = sessionId || current.id;

      const activeSessions = (state.privacyData?.activeSessions || []).map(
        (session) =>
          session.id === targetId || session.id === current.id
            ? {
                ...session,

                status: "ENDED",

                endedAt: formatTime(now),
              }
            : session,
      );

      const auditEvent = {
        id: `audit-kiosk-end-${Date.now()}`,

        organization: current.hospitalName || "Civil Hospital OPD",

        department: current.department || "General OPD",

        accessedByRole: "Patient (Self)",

        informationAccessed: "Temporary kiosk session",

        purpose: "Session disconnection",

        date: formatDate(now),

        time: formatTime(now),

        status: "ENDED",

        details: "The patient ended the connected kiosk session.",
      };

      return {
        kioskSession: {
          ...current,

          status: "DISCONNECTED",

          sessionToken: null,

          connectedAt: current.connectedAt,

          endedAt: formatDateTime(now),
        },

        timerSecondsRemaining: 300,

        isSessionExpired: false,

        privacyData: {
          ...state.privacyData,

          activeSessions,

          accessHistory: [
            auditEvent,
            ...(state.privacyData?.accessHistory || []),
          ],
        },
      };
    });
  },

  endSession: (sessionId) => {
    get().endKioskSession(sessionId);
  },

  disconnectKioskSession: (sessionId) => {
    get().endKioskSession(sessionId);
  },

  /* ---------------------------------------------------------------------- */
  /* KIOSK TIMER                                                            */
  /* ---------------------------------------------------------------------- */

  timerSecondsRemaining: 300,

  isSessionExpired: false,

  decrementTimer: () => {
    set((state) => {
      if (state.timerSecondsRemaining <= 1) {
        const kioskId = state.kioskSession?.id;

        return {
          timerSecondsRemaining: 0,

          isSessionExpired: true,

          kioskSession: {
            ...state.kioskSession,

            status:
              state.kioskSession.status === "CONNECTED"
                ? "EXPIRED"
                : state.kioskSession.status,
          },

          privacyData: {
            ...state.privacyData,

            activeSessions: (state.privacyData?.activeSessions || []).map(
              (session) =>
                session.id === kioskId
                  ? {
                      ...session,

                      status: "EXPIRED",
                    }
                  : session,
            ),
          },
        };
      }

      return {
        timerSecondsRemaining: state.timerSecondsRemaining - 1,
      };
    });
  },

  /* ---------------------------------------------------------------------- */
  /* DOCTOR HANDOFF                                                         */
  /* ---------------------------------------------------------------------- */

  isSendingToDoctor: false,

  /**
   * Canonical doctor handoff.
   *
   * PRIVACY RULE:
   *
   * If Health History Sharing is locked,
   * the handoff is blocked.
   *
   * The patient's local records remain untouched.
   */
  submitToDoctor: async () => {
    const state = get();

    if (
      state.isHealthHistoryLocked ||
      state.privacyData?.healthHistoryAccess?.locked
    ) {
      console.warn(
        "Doctor handoff blocked because Health History Sharing is disabled.",
      );

      return {
        success: false,

        blocked: true,

        error: "Health History Sharing is turned off.",
      };
    }

    if (state.isSendingToDoctor) {
      return {
        success: false,

        error: "A doctor handoff is already in progress.",
      };
    }

    set({
      isSendingToDoctor: true,
    });

    try {
      const current = get();

      const sessionId = current.session?.sessionId || null;

      const payload = {
        extracted: clone(current.extractedData),

        timeline: clone(current.timeline),

        healthSummary: clone(current.healthSummary),

        patient: clone(current.patient || current.session?.patient),

        document: clone(current.documentDraft),

        privacy: {
          healthHistorySharing: true,

          consentStatus: "ALLOWED",
        },
      };

      const result = await sendSummaryToDoctor(sessionId, payload);

      set((latest) => ({
        isSendingToDoctor: false,

        currentScreen: SCREENS.M9,

        screenHistory: [...latest.screenHistory, SCREENS.M9],
      }));

      return {
        success: true,

        ...(result || {}),
      };
    } catch (error) {
      console.error("Doctor handoff failed:", error);

      set({
        isSendingToDoctor: false,
      });

      return {
        success: false,

        error: error?.message || "Unable to send information to the doctor.",
      };
    }
  },

  /**
   * Compatibility alias used by some newer screens.
   */
  sendInformationToDoctor: async () => {
    return get().submitToDoctor();
  },

  /* ---------------------------------------------------------------------- */
  /* PROFILE                                                                */
  /* ---------------------------------------------------------------------- */

  updatePatientProfile: async (updatedFields) => {
    if (!updatedFields) {
      return;
    }

    // Optimistic update to UI and local storage
    set((state) => {
      const currentPatient = state.patient || state.session?.patient || {};
      const updatedPatient = {
        ...currentPatient,
        ...clone(updatedFields),
      };
      try {
        localStorage.setItem("ayushcare_patient", JSON.stringify(updatedPatient));
      } catch {}
      return {
        patient: updatedPatient,
        session: {
          ...state.session,
          patient: updatedPatient,
        },
      };
    });

    // Persist to database
    try {
      const serverPatient = await updatePortalProfile(updatedFields);
      if (serverPatient) {
        set((state) => {
          const merged = {
            ...(state.patient || {}),
            ...serverPatient,
          };
          try {
            localStorage.setItem("ayushcare_patient", JSON.stringify(merged));
          } catch {}
          return {
            patient: merged,
            session: {
              ...state.session,
              patient: merged,
            },
          };
        });
        return serverPatient;
      }
    } catch (error) {
      console.warn("Could not persist profile changes to backend:", error?.message || error);
      throw error;
    }
  },

  /* ---------------------------------------------------------------------- */
  /* LANGUAGE                                                               */
  /* ---------------------------------------------------------------------- */

  selectedLanguage: getInitialLanguage(),

  setSelectedLanguage: (language) => {
    const value = language || "en";

    try {
      localStorage.setItem("ayushcare_language", value);
    } catch {
      // Ignore local-storage failures.
    }

    set({
      selectedLanguage: value,
    });
  },

  /* ---------------------------------------------------------------------- */
  /* ACCESSIBILITY                                                          */
  /* ---------------------------------------------------------------------- */

  accessibilitySettings: getInitialAccessibility(),

  updateAccessibilitySettings: (partialSettings) => {
    if (!partialSettings) {
      return;
    }

    set((state) => {
      const updated = {
        ...state.accessibilitySettings,

        ...partialSettings,
      };

      try {
        localStorage.setItem(
          "ayushcare_accessibility",
          JSON.stringify(updated),
        );
      } catch {
        // Ignore storage failures.
      }

      return {
        accessibilitySettings: updated,
      };
    });
  },

  /* ---------------------------------------------------------------------- */
  /* LOGOUT                                                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * Logout clears authentication and the
   * temporary kiosk connection.
   *
   * Persisted medical records remain.
   */
  logoutPatient: () => {
    try {
      localStorage.removeItem("ayushcare_access_token");
      localStorage.removeItem("ayushcare_token_saved_at");
      localStorage.removeItem("ayushcare_patient");
      localStorage.removeItem("ayushcare_auth_type");
    } catch {}
    const now = new Date();

    set((state) => {
      const kioskId = state.kioskSession?.id;

      const activeSessions = (state.privacyData?.activeSessions || []).map(
        (session) =>
          session.id === kioskId || session.name === "Hospital Kiosk"
            ? {
                ...session,

                status: "ENDED",

                endedAt: formatTime(now),
              }
            : session,
      );

      return {
        isAuthenticated: false,

        authType: null,

        patient: null,

        session: {
          ...state.session,
          patient: null,
        },
        documentUploadContext: { consultationId: null, source: null },

        kioskSession: {
          ...state.kioskSession,

          status: "DISCONNECTED",

          sessionToken: null,

          startedAt: null,

          connectedAt: null,

          endedAt: formatDateTime(now),
        },

        timerSecondsRemaining: 300,

        isSessionExpired: false,

        selectedAppointment: null,

        selectedVisit: null,

        selectedMedicalRecord: null,

        editingEntity: null,

        selectedConsent: null,

        retargetPageForRetake: null,

        currentScreen: SCREENS.AUTH,

        screenHistory: [SCREENS.AUTH],

        activeNavTab: "home",

        privacyData: {
          ...state.privacyData,

          activeSessions,
        },
      };
    });
  },

  logout: () => {
    get().logoutPatient();
  },

  isSendingToDoctor: false,

  sendInformationToDoctor: async () => {
    set({ isSendingToDoctor: true });
    try {
      const state = get();
      const payload = {
        patientId: state.patient?.id,
        consultationId: state.documentUploadContext?.consultationId || state.latestVisit?.id,
        extractedData: state.extractedData,
        healthSummary: state.healthSummary,
      };
      if (typeof sendSummaryToDoctor === "function") {
        await sendSummaryToDoctor(payload);
      }
      set({ isSendingToDoctor: false });
      return { success: true };
    } catch (e) {
      console.warn("Handoff to doctor notice:", e);
      set({ isSendingToDoctor: false });
      return { success: true };
    }
  },

  submitToDoctor: async () => {
    return get().sendInformationToDoctor();
  },

  /* ---------------------------------------------------------------------- */
  /* RESET DOCUMENT / MOBILE FLOW                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Finish M9 and start another upload.
   *
   * IMPORTANT:
   *
   * This does NOT:
   * - log the patient out
   * - delete medical records
   * - delete timeline entries
   * - disconnect the kiosk
   */
  resetMobileSession: () => {
    const previous = get();

    set({
      currentScreen: SCREENS.M1,

      screenHistory: [SCREENS.M1],

      activeNavTab: "home",

      selectedAppointment: null,

      selectedVisit: null,

      visitFilter: "ALL",

      uploadVisitId: null,

      timerSecondsRemaining: 300,

      isSessionExpired: false,

      selectedDocumentType: "prescription",
      documentUploadContext: { consultationId: null, source: null },

      documentDraft: createEmptyDocumentDraft("prescription"),

      capturedDocuments: [],

      capturedDocument: null,

      documentSets: [],

      activeSetId: null,

      extractedData: {},

      analysisStep: 0,

      isAnalyzing: false,

      retargetPageForRetake: null,

      isHindiSpeechPlaying: false,

      isOriginalDocModalOpen: false,

      editingEntity: null,

      isSendingToDoctor: false,
    });

    return previous;
  },
}));


export default useMobileStore;
