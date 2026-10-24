import { useEffect } from 'react';
import { useKioskStore } from '../store/useKioskStore';
import audioService from '../services/audioService';

export default function useAutoNarration() {
  const { currentScreen } = useKioskStore();

  useEffect(() => {
    // Whenever switching screens or leaving the interview, immediately stop any active audio.
    // Audio dictation is exclusively restricted to the AI interview screen (handled by Screen4_SymptomIntake).
    // It is completely removed from all other pages (department selection, vitals taking, QR scanning, etc.).
    audioService.stop();
  }, [currentScreen]);
}
