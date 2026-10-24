import React from 'react';
import { ArrowRight, UserPlus, UserRoundSearch } from 'lucide-react';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen2_PatientType() {
  const { updateSession, setScreen } = useKioskStore();
  const { t } = useTranslation();
  const choose = (registrationType) => { updateSession({ registrationType }); setScreen(3); };
  return (
    <section className="screen-card patient-type-screen">
      <div className="section-head"><div><p className="eyebrow">01 • {t('identity')}</p><h2>{t('patientTypeTitle','Are you a new or existing patient?')}</h2></div></div>
      <div className="patient-type-grid">
        <button className="patient-type-card" onClick={() => choose('new')}><span className="patient-type-icon"><UserPlus size={34}/></span><strong>{t('newPatient','New Patient')}</strong><span>{t('newPatientHelp','Register your basic details for a new visit.')}</span><ArrowRight size={22}/></button>
        <button className="patient-type-card" onClick={() => choose('old')}><span className="patient-type-icon"><UserRoundSearch size={34}/></span><strong>{t('existingPatient','Existing Patient')}</strong><span>{t('existingPatientHelp','Find your record using your ABHA number or registered mobile number.')}</span><ArrowRight size={22}/></button>
      </div>
    </section>
  );
}
