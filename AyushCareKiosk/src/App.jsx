import React, { Suspense, lazy } from 'react';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import { useKioskStore } from './store/useKioskStore';
import './App.css';
import { useEffect } from 'react';
import audioService from './services/audioService';
import useAutoNarration from './hooks/useAutoNarration';
import useDomTranslation from './hooks/useDomTranslation';

const Screen1_Welcome = lazy(() => import('./pages/Screen1_Welcome'));
const Screen2_PatientType = lazy(() => import('./pages/Screen2_PatientType'));
const Screen2_Auth = lazy(() => import('./pages/Screen2_Auth'));
const Screen3_DepartmentSelector = lazy(() => import('./pages/Screen3_DepartmentSelector'));
const Screen3b_LanguageSelect = lazy(() => import('./pages/Screen3b_LanguageSelect'));
const Screen3c_ModeSelect = lazy(() => import('./pages/Screen3c_ModeSelect'));
const Screen4_Consent = lazy(() => import('./pages/Screen4_Consent'));
const Screen4_SymptomIntake = lazy(() => import('./pages/Screen4_SymptomIntake'));
const Screen4_SpeakMode = lazy(() => import('./pages/Screen4_SpeakMode'));
const Screen6_HealthHistory = lazy(() => import('./pages/Screen6_HealthHistory'));
const Screen8_QRUpload = lazy(() => import('./pages/Screen8_QRUpload'));
const Screen9_ReviewSubmission = lazy(() => import('./pages/Screen9_ReviewSubmission'));
const Screen10_TokenSuccess = lazy(() => import('./pages/Screen10_TokenSuccess'));
const Screen11_Sos = lazy(() => import('./pages/Screen11_Sos'));

function ScreenLoader() {
  return <div className="screen-loading" role="status"><div className="loading-spinner" /><span>Loading</span></div>;
}

export default function App() {
  const { currentScreen, highContrast, audioEnabled, sessionData, updateSession } = useKioskStore();
  useAutoNarration();
  useDomTranslation();
  useEffect(() => { if (!audioEnabled) audioService.stop(); }, [audioEnabled]);

  const renderIntakeScreen = () => {
    if (sessionData.intakeMode === 'speak') {
      return (
        <Screen4_SpeakMode
          onSwitchToInterview={() => {
            audioService.stop();
            updateSession({ intakeMode: 'interview' });
          }}
        />
      );
    }
    if (sessionData.intakeMode === 'interview') {
      return (
        <Screen4_SymptomIntake
          onSwitchToSpeak={() => {
            audioService.stop();
            updateSession({ intakeMode: 'speak' });
          }}
        />
      );
    }
    return (
      <Screen3c_ModeSelect
        onSelectMode={(mode) => {
          audioService.stop();
          updateSession({ intakeMode: mode });
        }}
      />
    );
  };

  const screen = {
    1: <Screen1_Welcome />,
    2: <Screen2_PatientType />,
    3: <Screen2_Auth />,
    4: <Screen3_DepartmentSelector />,
    5: <Screen3b_LanguageSelect />,
    6: renderIntakeScreen(),
    7: <Screen6_HealthHistory />,
    8: <Screen8_QRUpload />,
    9: <Screen9_ReviewSubmission />,
    10: <Screen10_TokenSuccess />,
    11: <Screen11_Sos />,
  }[currentScreen] || <Screen1_Welcome />;

  return (
    <div className={`kiosk-app ${highContrast ? 'high-contrast' : ''} ${currentScreen === 1 ? 'kiosk-app-welcome' : ''}`}>
      <Navbar />
      <main className={`kiosk-main ${currentScreen === 1 ? 'kiosk-main-welcome' : ''}`} aria-label="P2Care patient kiosk">
        <div className={`kiosk-main-scroll ${currentScreen === 1 ? 'kiosk-scroll-welcome' : ''}`}>
          <Suspense fallback={<ScreenLoader />}>{screen}</Suspense>
        </div>
      </main>
      {currentScreen > 1 && currentScreen < 10 && <Footer />}
    </div>
  );
}
