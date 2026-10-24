import { Volume2, VolumeX, Siren } from "lucide-react";
import { useKioskStore } from "../../store/useKioskStore";
import LanguageToggle from "./LanguageToggle";
import { audioService } from '../../services/audioService';
import { useTranslation } from '../../hooks/useTranslation';

export default function Navbar() {
  const { audioEnabled, toggleAudio, currentScreen, sessionData, setScreen, resetSession } = useKioskStore();
  const { t } = useTranslation();

  const handleHome = () => {
    audioService.stop();
    resetSession();
  };

  const handleSos = () => {
    const hasActiveConsultation = currentScreen > 1 && currentScreen < 10 && sessionData?.consultationId;
    if (hasActiveConsultation && !window.confirm('Leave the current consultation and open SOS assistance?')) return;
    audioService.stop();
    setScreen(11);
  };

  return (
    <header className="kiosk-nav">
      {/* Top Left: AyushCare Brand Logo + Title + Tagline */}
      <div className="brand">
        <button type="button" className="brand-home-button" onClick={handleHome} aria-label="Return to P2Care home" title="Return to home">
          <span className="brand-logo-wrap" aria-hidden="true">
            <img
               src="/ayushCareLogo.png"
              alt="P2Care Logo"
              className="brand-logo-img"
            />
          </span>
          <span className="brand-copy">
            <strong className="brand-title">
              <span className="brand-title-ayush">P2</span>
              <span className="brand-title-care">Care</span>
            </strong>
            <small className="brand-subtitle">{t('kioskTitle', 'Patient to Care · Digital Kiosk')}</small>
          </span>
        </button>
        <div className="brand-divider" aria-hidden="true" />
        <div className="brand-tagline">
          <span>{t('traditionalWisdom', 'Patient to Care')}</span>
          <span>{t('modernCare', 'Without Delay')}</span>
        </div>
      </div>

{/* Top Right: Language Toggle, Audio Toggle, and Ayushman Bharat Brand */}
      <div className="nav-actions">
        <button
          type="button"
          className="sos-button"
          onClick={handleSos}
          aria-label="SOS emergency assistance"
          title="SOS emergency assistance"
        >
          <Siren size={17} />
          <span>SOS</span>
        </button>
        <LanguageToggle />
        <button
        type="button"
          className="icon-button nav-sound"
          onClick={() => { if (audioEnabled) audioService.stop(); toggleAudio(); }}
          aria-label={audioEnabled ? t('muteAudio', 'Mute audio') : t('enableAudio', 'Enable audio')}
          title={audioEnabled ? t('muteAudio', 'Mute audio') : t('enableAudio', 'Enable audio')}
        >
           {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
         <div className="nav-ayushman-brand">
          <img
            src="/ayushman-bharat-logo.png"
            alt="Ayushman Bharat"
            className="nav-ayushman-logo"
          />
        </div>
      </div>
    </header>
  );
}
