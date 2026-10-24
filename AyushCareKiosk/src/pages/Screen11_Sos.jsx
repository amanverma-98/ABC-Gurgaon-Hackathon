import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Home, Loader2, Search, Siren, ShieldAlert, UserX, Phone, Heart } from 'lucide-react';
import { kioskApi, getErrorMessage } from '../services/api';
import KioskInput from '../components/common/KioskInput';
import VirtualKeypad from '../components/common/VirtualKeypad';
import { useKioskStore } from '../store/useKioskStore';

const digits = (value) => String(value || '').replace(/\D/g, '');
const normalize = (patient = {}) => ({
  ...patient,
  id: patient.id || patient.patient_id,
  fullName: patient.full_name || patient.fullName || '',
  mobile: patient.mobile_number || patient.mobileNumber || patient.mobile || '',
  abha: patient.abha_number || patient.abhaNumber || '',
});

const EMERGENCY_CATEGORIES = [
  { value: 'accident_road', label: 'Road Accident / Trauma', icon: '🚗' },
  { value: 'injury', label: 'Injury / Fall', icon: '🩹' },
  { value: 'burns_electric_shock', label: 'Burns / Electric Shock', icon: '⚡' },
  { value: 'cuts_bleeding', label: 'Cuts / Severe Bleeding', icon: '🩸' },
  { value: 'pregnancy_related', label: 'Pregnancy Related', icon: '🤰' },
  { value: 'chest_pain', label: 'Chest Pain', icon: '💔' },
  { value: 'breathing_difficulty', label: 'Breathing Difficulty', icon: '😤' },
  { value: 'neurological_fainting_seizure', label: 'Fainting / Seizure', icon: '🧠' },
  { value: 'fever_acute_illness', label: 'High Fever / Acute Illness', icon: '🤒' },
  { value: 'other', label: 'Other Emergency', icon: '🆘' },
];

export default function Screen11_Sos() {
  const { resetSession } = useKioskStore();

  // Mode: 'choose' | 'identified' | 'unidentified'
  const [mode, setMode] = useState('choose');

  // Identified SOS flow (existing)
  const [stage, setStage] = useState('lookup');
  const [abha, setAbha] = useState('');
  const [mobile, setMobile] = useState('');
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newPatient, setNewPatient] = useState({ fullName: '', age: '', gender: '', address: '', aadhaar: '' });
  const [otp, setOtp] = useState('');

  // Emergency intake flow (new P2Care)
  const [emergencyCategory, setEmergencyCategory] = useState('');
  const [complaint, setComplaint] = useState('');
  const [communicationStatus, setCommunicationStatus] = useState('unknown');
  const [approxAge, setApproxAge] = useState('');
  const [approxGender, setApproxGender] = useState('');
  const [accidentDetails, setAccidentDetails] = useState('');
  const [emergencyResult, setEmergencyResult] = useState(null);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const updateNewPatient = (key, value) => setNewPatient((current) => ({ ...current, [key]: value }));

  // ── Identified SOS ──
  const lookup = async () => {
    if (digits(abha).length !== 14 && digits(mobile).length !== 10) return;
    setLoading(true); setError(''); setMatches([]); setSelected(null);
    try {
      const data = await kioskApi.lookupPatients({ abhaNumber: digits(abha), mobileNumber: digits(mobile) });
      const patients = (data?.patients || []).map(normalize);
      if (!patients.length) {
        setNewPatient((current) => ({ ...current, aadhaar: '', fullName: '' }));
        setStage('new');
      } else {
        setMatches(patients);
        if (patients.length === 1) setSelected(patients[0]);
      }
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  };

  const sendOtp = async () => {
    const targetMobile = digits(selected?.mobile || mobile);
    if (targetMobile.length !== 10) return;
    setLoading(true); setError('');
    try {
      const data = await kioskApi.sendSosOtp({ mobileNumber: targetMobile });
      setMobile(targetMobile);
      setStage('otp');
      setToast(`Testing OTP: ${data?.otp || '123456'}`);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    setLoading(true); setError('');
    try {
      await kioskApi.verifySosOtp({
        otp,
        patientId: selected?.id,
        abhaNumber: selected?.abha || abha,
        mobileNumber: selected?.mobile || mobile,
        fullName: newPatient.fullName,
        age: newPatient.age,
        gender: newPatient.gender,
        address: newPatient.address,
        aadhaarNumber: newPatient.aadhaar,
      });
      setToast('SOS request recorded successfully');
      setStage('success');
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  };

  // ── Unidentified Emergency Intake (P2Care) ──
  const submitEmergencyIntake = async () => {
    if (!emergencyCategory) { setError('Please select an emergency category'); return; }
    setLoading(true); setError('');
    try {
      const result = await kioskApi.emergencyIntake({
        emergency_category: emergencyCategory,
        presenting_complaint: complaint || undefined,
        identity_status: 'unknown',
        communication_status: communicationStatus,
        approximate_age: approxAge ? Number(approxAge) : undefined,
        approximate_gender: approxGender || undefined,
        accident_details: accidentDetails || undefined,
        intake_source: 'kiosk',
        idempotency_key: `kiosk-em-${Date.now()}`,
      });
      setEmergencyResult(result);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  };

  // ── Success states ──
  if (stage === 'success' && mode === 'identified') {
    return (
      <section className="screen-card sos-screen sos-success">
        <CheckCircle2 size={64} className="sos-success-icon" />
        <p className="eyebrow">SOS REQUEST RECEIVED</p>
        <h2>Stay close to the Kiosk machine</h2>
        <p>Hospital staff will address you in a while. Please remain nearby and keep your phone available.</p>
        <button className="primary-btn" onClick={resetSession}><Home size={19} /> Home</button>
      </section>
    );
  }

  if (emergencyResult) {
    return (
      <section className="screen-card sos-screen sos-success">
        <CheckCircle2 size={64} className="sos-success-icon" />
        <p className="eyebrow">EMERGENCY CASE REGISTERED</p>
        <h2>Help is on the way</h2>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '16px', padding: '16px 24px', margin: '12px 0', display: 'inline-block' }}>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>Case Number</p>
          <p style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', fontFamily: 'monospace' }}>{emergencyResult.case_number}</p>
        </div>
        <p>Hospital staff has been alerted. Please remain nearby. A medical team will reach you shortly.</p>
        <button className="primary-btn" onClick={resetSession}><Home size={19} /> Home</button>
      </section>
    );
  }

  // ── Mode selection ──
  if (mode === 'choose') {
    return (
      <section className="screen-card sos-screen">
        <div className="section-head">
          <div>
            <p className="eyebrow"><Siren size={16} /> EMERGENCY ASSISTANCE</p>
            <h2>SOS / Emergency Help</h2>
            <p>Select the type of emergency assistance you need.</p>
          </div>
          <AlertTriangle size={44} className="sos-heading-icon" />
        </div>
        <button type="button" className="secondary-btn sos-home-btn" onClick={resetSession}><Home size={18} /> Home</button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', maxWidth: '600px' }}>
          <button
            className="primary-btn"
            onClick={() => setMode('identified')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 16px', fontSize: '14px' }}
          >
            <Phone size={28} />
            <span style={{ fontWeight: 700 }}>I have my details</span>
            <small style={{ fontSize: '11px', opacity: 0.8 }}>ABHA / Mobile lookup</small>
          </button>
          <button
            className="primary-btn"
            onClick={() => setMode('unidentified')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 16px', fontSize: '14px', background: '#dc2626' }}
          >
            <ShieldAlert size={28} />
            <span style={{ fontWeight: 700 }}>Emergency — No ID</span>
            <small style={{ fontSize: '11px', opacity: 0.8 }}>Unidentified / urgent case</small>
          </button>
        </div>
      </section>
    );
  }

  // ── Unidentified Emergency Intake ──
  if (mode === 'unidentified') {
    return (
      <section className="screen-card sos-screen">
        {toast && <div className="sos-toast" role="status">{toast}</div>}
        <div className="section-head">
          <div>
            <p className="eyebrow"><ShieldAlert size={16} /> UNIDENTIFIED EMERGENCY</p>
            <h2>Emergency Intake</h2>
            <p>Report the emergency. Hospital staff will be notified immediately.</p>
          </div>
          <AlertTriangle size={44} className="sos-heading-icon" />
        </div>
        <button type="button" className="secondary-btn sos-home-btn" onClick={() => setMode('choose')}><Home size={18} /> Back</button>

        {/* Emergency category selector */}
        <div style={{ margin: '16px 0' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>What type of emergency?</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
            {EMERGENCY_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setEmergencyCategory(cat.value)}
                className={emergencyCategory === cat.value ? 'primary-btn' : 'secondary-btn'}
                style={{ padding: '10px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}
              >
                <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional details */}
        <div className="form-grid sos-form-grid" style={{ marginTop: '12px' }}>
          <label className="full-span">
            <span>What happened? <small>(optional)</small></span>
            <KioskInput id="em-complaint" value={complaint} onChange={setComplaint} label="Describe the situation" placeholder="Brief description of the emergency" />
          </label>
          <label>
            <span>Communication</span>
            <select value={communicationStatus} onChange={(e) => setCommunicationStatus(e.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="able">Patient can speak</option>
              <option value="limited">Limited communication</option>
              <option value="unable">Unable to communicate</option>
            </select>
          </label>
          <label>
            <span>Approximate Age <small>(optional)</small></span>
            <KioskInput id="em-age" value={approxAge} onChange={(v) => setApproxAge(digits(v).slice(0, 3))} type="number" maxLength={3} label="Age" placeholder="Approx age" />
          </label>
          <label>
            <span>Gender <small>(optional)</small></span>
            <select value={approxGender} onChange={(e) => setApproxGender(e.target.value)}>
              <option value="">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="full-span">
            <span>Accident details <small>(optional)</small></span>
            <KioskInput id="em-details" value={accidentDetails} onChange={setAccidentDetails} label="Additional details" placeholder="Location, number of people, etc." />
          </label>
        </div>

        <button className="primary-btn wide" disabled={!emergencyCategory || loading} onClick={submitEmergencyIntake} style={{ marginTop: '16px', background: '#dc2626' }}>
          {loading ? <Loader2 className="spin" /> : <Siren size={18} />} Submit Emergency Alert
        </button>

        {error && <div className="error-box">{error}</div>}
      </section>
    );
  }

  // ── Identified SOS flow (existing, preserved) ──
  const canLookup = digits(abha).length === 14 || digits(mobile).length === 10;
  const canSendNew = newPatient.fullName.trim() && newPatient.age && Number(newPatient.age) > 0 && Number(newPatient.age) <= 120 && newPatient.gender && newPatient.address.trim() && digits(mobile).length === 10;
  return (
    <section className="screen-card sos-screen">
      {toast && <div className="sos-toast" role="status">{toast}</div>}
      <div className="section-head">
        <div><p className="eyebrow"><Siren size={16} /> EMERGENCY ASSISTANCE</p><h2> SOS help</h2><p>Find your patient record to alert hospital staff immediately.</p></div>
        <AlertTriangle size={44} className="sos-heading-icon" />
      </div>
      <button type="button" className="secondary-btn sos-home-btn" onClick={() => setMode('choose')}><Home size={18} /> Back</button>

      {stage === 'lookup' && <>
        <div className="sos-lookup-grid">
          <label><span>ABHA number</span><KioskInput id="sos-abha" value={abha} onChange={(value) => setAbha(digits(value).slice(0, 14))} type="tel" maxLength={14} label="ABHA number" placeholder="14 digit ABHA" /></label>
          <label><span>Mobile number</span><KioskInput id="sos-mobile" value={mobile} onChange={(value) => setMobile(digits(value).slice(0, 10))} type="tel" maxLength={10} label="Mobile number" placeholder="10 digit mobile" /></label>
        </div>
        <p className="lookup-note">Enter either your ABHA number or registered mobile number.</p>
        <button className="primary-btn" disabled={!canLookup || loading} onClick={lookup}>{loading ? <Loader2 className="spin" /> : <Search size={18} />} Find patient</button>
        {matches.length > 1 && <div className="patient-match-list"><h3>Multiple patient records found</h3>{matches.map((patient) => <button key={patient.id} className={`patient-match ${selected?.id === patient.id ? 'selected' : ''}`} onClick={() => setSelected(patient)}><span><strong>{patient.fullName}</strong><small>ABHA: {patient.abha || 'Not linked'} · {patient.mobile || 'No mobile'}</small></span><ArrowRight size={19} /></button>)}</div>}
        {selected && <div className="sos-selected"><strong>{selected.fullName}</strong><span>{selected.abha || 'ABHA not linked'} · {selected.mobile}</span><button className="primary-btn" disabled={loading} onClick={sendOtp}>Send OTP <ArrowRight size={18} /></button></div>}
        {matches.length === 0 && canLookup && <button className="secondary-btn sos-new-link" onClick={() => setStage('new')}>Register as a new patient</button>}
      </>}

      {stage === 'new' && <>
        <div className="form-grid sos-form-grid">
          <label><span>Full name</span><KioskInput id="sos-name" value={newPatient.fullName} onChange={(value) => updateNewPatient('fullName', value)} label="Full name" placeholder="Full name" /></label>
          <label><span>Age</span><KioskInput id="sos-age" value={newPatient.age} onChange={(value) => updateNewPatient('age', digits(value).slice(0, 3))} type="number" maxLength={3} label="Age" placeholder="Years" /></label>
          <label><span>Mobile number</span><KioskInput id="sos-new-mobile" value={mobile} onChange={(value) => setMobile(digits(value).slice(0, 10))} type="tel" maxLength={10} label="Mobile number" placeholder="10 digit mobile" /></label>
          <label><span>Gender</span><select value={newPatient.gender} onChange={(event) => updateNewPatient('gender', event.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
          <label><span>ABHA number <small>(optional)</small></span><KioskInput id="sos-new-abha" value={abha} onChange={(value) => setAbha(digits(value).slice(0, 14))} type="tel" maxLength={14} label="ABHA number" placeholder="14 digit ABHA" /></label>
          <label><span>Aadhaar <small>(optional)</small></span><KioskInput id="sos-aadhaar" value={newPatient.aadhaar} onChange={(value) => updateNewPatient('aadhaar', digits(value).slice(0, 12))} type="tel" maxLength={12} label="Aadhaar" placeholder="12 digit Aadhaar" /></label>
          <label className="full-span"><span>Address</span><KioskInput id="sos-address" value={newPatient.address} onChange={(value) => updateNewPatient('address', value)} label="Address" placeholder="House / street / locality" /></label>
        </div>
        <button className="primary-btn wide" disabled={!canSendNew || loading} onClick={sendOtp}>{loading ? <Loader2 className="spin" /> : <ArrowRight size={18} />} Send OTP</button>
      </>}

      {stage === 'otp' && <div className="sos-otp-panel"><p>Enter the 6-digit OTP sent to the registered mobile number.</p><KioskInput id="sos-otp" value={otp} onChange={(value) => setOtp(digits(value).slice(0, 6))} type="tel" maxLength={6} label="OTP" placeholder="Enter OTP" /><VirtualKeypad onKeyPress={(key) => setOtp((current) => `${current}${key}`.slice(0, 6))} onBackspace={() => setOtp((current) => current.slice(0, -1))} onClear={() => setOtp('')} onSubmit={verify} submitLabel="Verify OTP" /></div>}
      {error && <div className="error-box">{error}</div>}
    </section>
  );
}
