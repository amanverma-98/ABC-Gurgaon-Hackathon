import React, { useEffect, useState } from 'react';
import { Leaf, Loader2, ShieldCheck, Stethoscope, CheckCircle2 } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';

export default function Screen3_DepartmentSelector() {
  const { sessionData, language, updateSession, setScreen } = useKioskStore();
  const { t } = useTranslation();

  const [pathway, setPathway] = useState(sessionData.pathway || 'allopathy');
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [dept, setDept] = useState(sessionData.selectedDepartment?.id || '');
  const [doctor, setDoctor] = useState(sessionData.requestedDoctor?.id || '');
  const [clinicalIntake, setClinicalIntake] = useState(Boolean(sessionData.consent?.clinical_intake));
  const [documentProcessing, setDocumentProcessing] = useState(sessionData.consent?.document_processing !== false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePathwayChange = (newPathway) => {
    if (newPathway === pathway) return;
    setPathway(newPathway);
    updateSession({ pathway: newPathway });
    setDept('');
    setDoctor('');
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    kioskApi.departments(pathway)
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setDepartments(list);
        setDept(list[0]?.id || '');
      })
      .catch((e) => alive && setError(getErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [pathway]);

  useEffect(() => {
    if (!dept) { setDoctors([]); return; }
    kioskApi.doctors(dept)
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]));
  }, [dept]);

  const startSession = async () => {
    if (!dept || !clinicalIntake || !sessionData.patientProfile) {
      setError(!clinicalIntake ? 'Explicit clinical intake consent is required.' : 'Please complete the patient details first.');
      return;
    }

    const selected = departments.find((d) => d.id === dept) || null;
    const selectedDoctor = doctors.find((d) => d.id === doctor) || null;
    const profile = sessionData.patientProfile || {};

    setSaving(true);
    setError('');

    try {
      const d = await kioskApi.verifyPatient({
        registrationType: sessionData.registrationType || 'new',
        patientId: profile.id || profile.patient_uuid || profile.patientId || undefined,
        mobileNumber: String(profile.mobileNumber || '').replace(/\D/g, ''),
        aadhaarNumber: String(profile.aadhaar || '').replace(/\D/g, ''),
        abhaNumber: String(profile.abha || profile.abhaNumber || '').replace(/\D/g, '') || undefined,
        fullName: profile.full_name || profile.name || '',
        age: Number(profile.age) || undefined,
        address: profile.address || '',
        gender: profile.gender || '',
        consent: true,
        language,
        intakePathway: pathway,
        departmentId: selected?.id,
        department: selected?.name,
        doctorId: selectedDoctor?.id,
        doctor: selectedDoctor?.name,
        kioskId: import.meta.env.VITE_KIOSK_ID || 'KIOSK-MAIN-01',
      });

      const consultationId = d?.session_id || d?.consultation_id || d?.id;
      if (!consultationId) throw new Error('The backend did not return a consultation session ID.');

      const patient = { ...profile, ...(d?.patient || {}) };
      const abhaNumber = patient.abha_number || patient.abhaNumber || patient.patientId || sessionData.abhaNumber || '';
      patient.abhaNumber = abhaNumber;
      const consent = {
        clinical_intake: true,
        document_processing: documentProcessing,
        his_abdm_sharing: false,
      };

      let receipt = null;
      try {
        receipt = await kioskApi.grantConsent(consultationId, consent);
      } catch (consentError) {
        throw consentError;
      }

      updateSession({
        patientProfile: patient,
        abhaNumber,
        consultationId,
        aiSessionId: d?.ai_session_id,
        pairingSession: d?.pairing_session,
        selectedDepartment: selected,
        requestedDoctor: selectedDoctor,
        consent,
        consentReceipt: receipt,
        pathway,
        isVerified: true,
      });

      setScreen(5);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen-card">
      <p className="eyebrow">03 • {t('pathway', 'Care Pathway & Department')}</p>
      <h2>{t('pathway', 'Choose your care pathway')}</h2>

      {/* Interactive Pathway Selector: Allopathy vs Ayurveda */}
      <div className="pathway-grid" role="radiogroup" aria-label="Care Pathway Selection">
        <button
          type="button"
          className={`path-card ${pathway === 'allopathy' ? 'active' : ''}`}
          onClick={() => handlePathwayChange('allopathy')}
          aria-pressed={pathway === 'allopathy'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Stethoscope size={28} />
              <strong style={{ fontSize: '18px' }}>{t('allopathy', 'Allopathy')}</strong>
            </div>
            {pathway === 'allopathy' && <CheckCircle2 size={22} className="text-teal" />}
          </div>
          <span>{t('allopathyDesc', 'Modern clinical assessment and care (General Medicine, Cardiology, etc.)')}</span>
        </button>

        <button
          type="button"
          className={`path-card ${pathway === 'ayurveda' ? 'active' : ''}`}
          onClick={() => handlePathwayChange('ayurveda')}
          aria-pressed={pathway === 'ayurveda'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Leaf size={28} />
              <strong style={{ fontSize: '18px' }}>{t('ayurveda', 'Ayurveda')}</strong>
            </div>
            {pathway === 'ayurveda' && <CheckCircle2 size={22} className="text-teal" />}
          </div>
          <span>{t('ayurvedaDesc', 'Traditional AYUSH holistic assessment and care (Kayachikitsa, Panchakarma, etc.)')}</span>
        </button>
      </div>

      <div className="form-grid compact">
        <label>
          <span>{t('department')} ({pathway === 'ayurveda' ? 'AYUSH' : 'Allopathy'})</span>
          <select value={dept} onChange={(e) => setDept(e.target.value)} disabled={loading}>
            <option value="">{loading ? t('loading') : t('selectDepartment','Select department')}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label>
          <span>{t('doctor')}</span>
          <select value={doctor} onChange={(e) => setDoctor(e.target.value)}>
            <option value="">{t('anyDoctor')}</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
      </div>

      <div className="consent-card department-consent-card">
        <div className="consent-card-heading">
          <ShieldCheck size={26} />
          <div>
            <h3>{t('privacyConsent','Privacy & Clinical Consent')}</h3>
          </div>
        </div>

        <label className="consent-line">
          <input type="checkbox" checked={clinicalIntake} onChange={(e) => { setClinicalIntake(e.target.checked); if (e.target.checked) setError(''); }} />
          <span>{t('clinicalConsent','I consent to clinical intake and processing of the information I provide for my healthcare consultation.')} <strong>{t('required','Required')}</strong></span>
        </label>

        <label className="consent-line">
          <input type="checkbox" checked={documentProcessing} onChange={(e) => setDocumentProcessing(e.target.checked)} />
          <span>{t('documentConsent','I consent to processing of medical documents that I choose to upload during this session.')}</span>
        </label>
      </div>

      {error && <div className="error-box">{error}</div>}
      <button className="primary-btn wide" disabled={!dept || !clinicalIntake || loading || saving} onClick={startSession}>
        {saving ? <><Loader2 className="spin" /> {t('startingSecureSession','Starting secure session…')}</> : t('continue')}
      </button>
    </section>
  );
}
