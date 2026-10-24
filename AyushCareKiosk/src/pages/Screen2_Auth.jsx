import React, { useState } from 'react';
import { ArrowRight, Loader2, Search, UserRoundSearch, UserPlus } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';
import KioskInput from '../components/common/KioskInput';

const cleanDigits = (v) => String(v || '').replace(/\D/g, '');
const normalizePatient = (p = {}) => ({
  ...p,
  id: p.id || p.patient_uuid || null,
  abhaNumber: p.abha_number || p.abhaNumber || p.patientId || p.patient_id || '',
  full_name: p.full_name || p.fullName || p.name || '',
  age: p.age ?? '',
  mobileNumber: p.mobileNumber || p.mobile_number || p.mobile || '',
  address: p.address || p.address_line || '',
  gender: p.gender || '',
  aadhaar: p.aadhaar || p.aadhaar_number || '',
  abha: p.abha || p.abha_number || p.abhaNumber || '',
  pathway: p.pathway || p.intake_pathway || 'allopathy',
});

export default function Screen2_Auth() {
  const { sessionData, updateSession, setScreen } = useKioskStore();
  const { t } = useTranslation();
  const isOld = sessionData.registrationType === 'old';
  const [lookupAbha, setLookupAbha] = useState('');
  const [oldMobile, setOldMobile] = useState('');
  const [name, setName] = useState(sessionData.patientProfile?.full_name || '');
  const [age, setAge] = useState(sessionData.patientProfile?.age ? String(sessionData.patientProfile.age) : '');
  const [mobile, setMobile] = useState(sessionData.patientProfile?.mobileNumber || '');
  const [aadhaar, setAadhaar] = useState(sessionData.patientProfile?.aadhaar || '');
  const [abha, setAbha] = useState(sessionData.patientProfile?.abha || '');
  const [address, setAddress] = useState(sessionData.patientProfile?.address || '');
  const [gender, setGender] = useState(sessionData.patientProfile?.gender || '');
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const newValid = Boolean(name.trim() && age && Number(age) > 0 && Number(age) <= 120 && cleanDigits(mobile).length === 10 && gender && address.trim() && cleanDigits(abha).length === 14 && (!aadhaar || cleanDigits(aadhaar).length === 12));
  const oldValid = cleanDigits(lookupAbha).length === 14 || cleanDigits(oldMobile).length === 10;

  const selectOldPatient = (raw) => {
    const patient = normalizePatient(raw);
    setSelected(patient);
    setName(patient.full_name);
    setAge(String(patient.age || ''));
    setMobile(cleanDigits(patient.mobileNumber));
    setAddress(patient.address);
    setGender(patient.gender);
    setAadhaar(cleanDigits(patient.aadhaar));
    setAbha(cleanDigits(patient.abha));
    updateSession({ patientProfile: patient, abhaNumber: patient.abha, pathway: patient.pathway || sessionData.pathway || 'allopathy', identifier: cleanDigits(patient.mobileNumber), isVerified: true });
  };

  const lookup = async () => {
    if (!oldValid) return;
    setLoading(true); setError(''); setMatches([]); setSelected(null);
    try {
      const data = await kioskApi.lookupPatients({ abhaNumber: cleanDigits(lookupAbha), mobileNumber: cleanDigits(oldMobile) });
      const list = Array.isArray(data) ? data : Array.isArray(data?.patients) ? data.patients : data?.patient ? [data.patient] : [];
      if (!list.length) throw new Error(t('noPatientFound', 'No patient record was found. Please check the ABHA number or mobile number.'));
      const normalized = list.map(normalizePatient);
      setMatches(normalized);
      if (normalized.length === 1) selectOldPatient(normalized[0]);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  const continueNew = () => {
    if (!newValid) return;
    const profile = normalizePatient({ full_name: name.trim(), age: Number(age), mobileNumber: cleanDigits(mobile), aadhaar: cleanDigits(aadhaar), abha: cleanDigits(abha), address: address.trim(), gender, abhaNumber: cleanDigits(abha), pathway: sessionData.pathway || 'allopathy' });
    updateSession({ authType: 'Mobile', identifier: profile.mobileNumber, isVerified: true, patientProfile: profile, abhaNumber: profile.abha, pathway: profile.pathway, consultationId: null, aiSessionId: null, pairingSession: null });
    setScreen(4);
  };

  const continueOld = () => {
    if (!selected) return;
    updateSession({
      registrationType: 'old',
      authType: 'Mobile',
      identifier: cleanDigits(selected.mobileNumber) || selected.abha || String(selected.id || ''),
      isVerified: true,
      patientProfile: selected,
      abhaNumber: selected.abha || selected.abhaNumber || '',
      pathway: selected.pathway || sessionData.pathway || 'allopathy',
      consultationId: null,
      aiSessionId: null,
      pairingSession: null,
    });
    setScreen(4);
  };

  return (
    <section className="screen-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">02 • {t('identity')}</p>
          <h2>{isOld ? t('findPatient', 'Find your patient record') : t('patientDetails', 'Patient details')}</h2>
        </div>
        {isOld ? <UserRoundSearch size={42} /> : <UserPlus size={42} />}
      </div>

      {isOld ? <>
        <div className="lookup-row">
          <label className="lookup-input-label"><span>{t('abha')} <small>({t('optional', 'optional')})</small></span><KioskInput id="old-abha" value={lookupAbha} onChange={(v) => setLookupAbha(cleanDigits(v).slice(0,14))} type="tel" maxLength={14} label={t('abha')} placeholder={t('abhaPlaceholder', '14 digit ABHA number')} /></label>
          <label className="lookup-input-label lookup-grow"><span>{t('mobile')} <small>({t('optional', 'optional')})</small></span><KioskInput id="old-patient-mobile" value={oldMobile} onChange={(v) => setOldMobile(cleanDigits(v).slice(0,10))} type="tel" maxLength={10} label={t('mobile')} placeholder={t('mobilePlaceholder', '10 digit mobile number')} /></label>
          <button className="primary-btn lookup-btn" disabled={!oldValid || loading} onClick={lookup}>{loading ? <Loader2 className="spin" size={18}/> : <Search size={18}/>} {t('findPatient', 'Find patient')}</button>
        </div>
        <p className="lookup-note">{t('lookupHelp', 'Enter an ABHA number or registered mobile number. If several records match the mobile number, choose the correct ABHA record.')}</p>
        {matches.length > 1 && <div className="patient-match-list"><h3>{t('multiplePatients', 'Multiple patient records found')}</h3>{matches.map((p) => <button key={p.id || p.abha} className={`patient-match ${selected?.id === p.id ? 'selected' : ''}`} onClick={() => selectOldPatient(p)}><span><strong>{p.full_name || t('patient','Patient')}</strong><small>{t('abha')}: {p.abha || '—'} · {t('age','Age')} {p.age || '—'} · {p.gender || '—'}</small><small>{p.mobileNumber || '—'}</small></span><ArrowRight size={19}/></button>)}</div>}
        {selected && <div className="selected-patient-card"><div><span className="eyebrow">{t('selected','Selected')}</span><h3>{selected.full_name}</h3><p>{t('abha')} <strong>{selected.abha}</strong> · {selected.age || '—'} {t('years','years')} · {selected.gender || '—'}</p><p>{selected.mobileNumber || '—'} · {selected.address || t('addressUnavailable','Address unavailable')}</p></div><button className="primary-btn" disabled={loading} onClick={continueOld}><ArrowRight size={18}/> {t('continue')}</button></div>}
      </> : <>
        <div className="form-grid">
          <label><span>{t('name')}</span><KioskInput id="patient-name" value={name} onChange={setName} label={t('name')} placeholder={t('fullNamePlaceholder','Full name')} /></label>
          <label><span>{t('age','Age')}</span><KioskInput id="patient-age" value={age} onChange={(v) => setAge(cleanDigits(v).slice(0,3))} type="number" maxLength={3} label={t('age','Age')} placeholder={t('years','Years')} /></label>
          <label><span>{t('mobile')}</span><KioskInput id="patient-mobile" value={mobile} onChange={(v) => setMobile(cleanDigits(v).slice(0,10))} type="tel" maxLength={10} label={t('mobile')} placeholder={t('mobilePlaceholder','10 digit mobile number')} /></label>
          <label><span>{t('gender','Gender')}</span><select value={gender} onChange={(e)=>setGender(e.target.value)}><option value="">{t('selectGender','Select gender')}</option><option value="male">{t('male','Male')}</option><option value="female">{t('female','Female')}</option><option value="other">{t('other','Other')}</option></select></label>
          <label><span>{t('abha')} *</span><KioskInput id="patient-abha" value={abha} onChange={(v) => setAbha(cleanDigits(v).slice(0,14))} type="tel" maxLength={14} label={t('abha')} placeholder={t('abhaPlaceholder','14 digit ABHA number')} /></label>
          <label><span>{t('aadhaar','Aadhaar')} <small>({t('optional','optional')})</small></span><KioskInput id="patient-aadhaar" value={aadhaar} onChange={(v) => setAadhaar(cleanDigits(v).slice(0,12))} type="tel" maxLength={12} label={t('aadhaar')} placeholder={t('aadhaarPlaceholder','12 digit Aadhaar')} /></label>
          <label className="full-span"><span>{t('address','Address')}</span><KioskInput id="patient-address" value={address} onChange={setAddress} label={t('address')} placeholder={t('addressPlaceholder','House / street / locality')} /></label>
        </div>
        <div className="info-strip">{t('abhaRequiredNote','Your ABHA number is the canonical patient identifier used to connect your health records across participating healthcare services.')}</div>
        <button className="primary-btn wide" disabled={!newValid || loading} onClick={continueNew}>{loading ? <Loader2 className="spin"/> : <ArrowRight size={18}/>} {t('continue')}</button>
      </>}
      {error && <div className="error-box">{error}</div>}
    </section>
  );
}
