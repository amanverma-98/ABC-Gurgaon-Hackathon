import { create } from 'zustand';

const freshSession = () => ({
  registrationType: null,
  authType: 'Mobile',
  identifier: '',
  isVerified: false,
  patientProfile: null,
  abhaNumber: null,
  consultationId: null,
  aiSessionId: null,
  pairingSession: null,
  pathway: null,
  selectedDepartment: null,
  requestedDoctor: null,
  consent: {},
  consentScopes: null,
  consentReceipt: null,
  interviewLanguage: null,
  currentQuestion: null,
  questionHistory: [],
  progress: 0,
  isComplete: false,
  redFlags: [],
  vitals: null,
  documents: [],
  summary: null,
  token: null,
});

export const useKioskStore = create((set) => ({
  currentScreen: 1,
  language: 'en',
  highContrast: false,
  audioEnabled: true,
  emergencyModalOpen: false,
  sessionData: freshSession(),

  setScreen: (screen) => set({ currentScreen: Math.max(1, Math.min(11, screen)) }),
  nextScreen: () => set((s) => ({ currentScreen: Math.min(10, s.currentScreen + 1) })),
  prevScreen: () => set((s) => ({ currentScreen: s.currentScreen === 6 ? 5 : Math.max(1, s.currentScreen - 1) })),
  setLanguage: (language) => set({ language }),
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
  updateSession: (payload) => set((s) => ({ sessionData: { ...s.sessionData, ...payload } })),
  updateSessionData: (payload) => set((s) => ({ sessionData: { ...s.sessionData, ...payload } })),
  resetSession: () => set({ currentScreen: 1, emergencyModalOpen: false, sessionData: freshSession() }),
}));

export default useKioskStore;
