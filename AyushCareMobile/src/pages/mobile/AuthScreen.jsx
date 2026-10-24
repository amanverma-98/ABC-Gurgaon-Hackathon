import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  User,
  UserCheck,
} from "lucide-react";
import useMobileStore, { SCREENS } from "../../store/useMobileStore";
import {
  requestOtp,
  verifyOtp,
  selectPatientAccount,
} from "../../services/authService";
import { useLanguage } from "../../i18n/translations";
import { toast } from "sonner";

const AUTH_METHODS = [
  { id: "ABHA", label: "ABHA Number", hindi: "आभा नंबर", placeholder: "Enter 14-digit ABHA number", hindiPlaceholder: "14 अंकों का आभा नंबर दर्ज करें", maxLength: 14, isDemo: false },
  { id: "MOBILE", label: "Mobile Number", hindi: "मोबाइल नंबर", placeholder: "Enter 10-digit mobile number", hindiPlaceholder: "10 अंकों का मोबाइल नंबर दर्ज करें", maxLength: 10, isDemo: false },
];

function maskIdentifierValue(identifier, method) {
  const value = String(identifier || "").trim();

  if (!value) return "";

  if (method === "MOBILE") {
    if (value.length <= 4) return `••••${value}`;
    return `••••••${value.slice(-4)}`;
  }

  if (method === "AADHAAR") {
    return `•••• •••• ${value.slice(-4)}`;
  }

  if (method === "ABHA") {
    return `${value.slice(0, 2)}-••••-••••-${value.slice(-4)}`;
  }

  return `••••${value.slice(-4)}`;
}

export default function AuthScreen() {
  const {
    setScreen,
    setVerifiedPatient,
    loadPortalData,
  } = useMobileStore();

  const { isHindi, tr } = useLanguage();

  const [method, setMethod] = useState("ABHA");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("identifier"); // "identifier" | "otp" | "select_patient"
  const [availablePatients, setAvailablePatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [expiresIn, setExpiresIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedMethod = useMemo(
    () =>
      AUTH_METHODS.find((item) => item.id === method) ||
      AUTH_METHODS[0],
    [method]
  );

  const changeMethod = (nextMethod) => {
    setMethod(nextMethod);
    setIdentifier("");
    setOtp("");
    setStep("identifier");
    setAvailablePatients([]);
    setSelectedPatientId("");
    setError("");
  };

  const handleInputChange = (event) => {
    const raw = event.target.value.replace(/\D/g, "");
    const limit = selectedMethod.maxLength || 14;
    setIdentifier(raw.slice(0, limit));
    setError("");
  };

  const handleRequestOtp = async () => {
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError(
        tr('Please enter your details.', 'कृपया अपना विवरण दर्ज करें।')
      );
      return;
    }

    if (method === "ABHA") {
      if (cleanIdentifier.length !== 14) { setError(tr("Enter a valid 14-digit ABHA number.", "14 अंकों का वैध आभा नंबर दर्ज करें।")); return; }
      setLoading(true); setError("");
      try {
        const result = await requestOtp({ authType: "ABHA", identifier: cleanIdentifier });
        if (!result?.success) throw new Error(result?.message || "Unable to verify ABHA number.");
        setMaskedIdentifier(result?.maskedIdentifier || "registered mobile");
        setStep("otp");
        if (result?.otp) {
          toast.success(`OTP: ${result.otp}`, {
            description: isHindi ? 'लॉगिन करने के लिए यह OTP दर्ज करें' : 'Enter this OTP to login',
            duration: 12000,
          });
        }
      } catch (e) { setError(e?.message || "Unable to send OTP."); } finally { setLoading(false); }
      return;
    }

    if (method === "MOBILE") {
      if (cleanIdentifier.length !== 10) {
        setError(tr('Enter a valid 10-digit mobile number.', '10 अंकों का वैध मोबाइल नंबर दर्ज करें।'));
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await requestOtp({
          authType: "MOBILE",
          identifier: cleanIdentifier,
        });

        if (!result?.success) {
          throw new Error(
            result?.message || "Unable to verify details."
          );
        }

        setMaskedIdentifier(
          result.maskedIdentifier ||
            maskIdentifierValue(cleanIdentifier, method)
        );

        setExpiresIn(
          result?.session?.expiresInSeconds || 300
        );

        setStep("otp");
        if (result?.otp) {
          toast.success(`OTP: ${result.otp}`, {
            description: isHindi ? 'लॉगिन करने के लिए यह OTP दर्ज करें' : 'Enter this OTP to login',
            duration: 12000,
          });
        }
      } catch (requestError) {
        setError(
          requestError?.message ||
            (tr('Verification request failed.', 'सत्यापन अनुरोध पूरा नहीं हो सका।'))
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (method === "AADHAAR") {
      if (cleanIdentifier.length !== 12) {
        setError(tr('Enter a valid 12-digit Aadhaar number.', '12 अंकों का आधार नंबर दर्ज करें।'));
        return;
      }

      setLoading(true);
      setTimeout(() => {
        setMaskedIdentifier(maskIdentifierValue(cleanIdentifier, "AADHAAR"));
        setExpiresIn(300);
        setStep("otp");
        setLoading(false);
      }, 350);
      return;
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError(tr('Enter the 6-digit OTP.', '6 अंकों का OTP दर्ज करें।'));
      return;
    }

    setLoading(true);
    setError("");

    if (method === "AADHAAR") {
      setTimeout(() => {
        const demoPatient = {
          id: `demo-${identifier.slice(-4)}`,
          patientId: `1234567890${identifier.slice(-4)}`.slice(0,14),
          abhaNumber: `1234567890${identifier.slice(-4)}`.slice(0,14),
          full_name: "Aadhaar Demo Patient",
          name: "Aadhaar Demo Patient",
          gender: "Male",
          age: 32,
          last_visit: "Today",
          department: "Ayush OPD",
          doctor: "Dr. Sharma",
          mobile_number: "+919876543210",
          abha_number: "12-3456-7890-1234",
          authMethod: method,
          isDemo: true,
          verifiedAt: new Date().toISOString(),
        };
        setAvailablePatients([demoPatient]);
        setSelectedPatientId(demoPatient.abhaNumber);
        setStep("select_patient");
        setLoading(false);
      }, 350);
      return;
    }

    try {
      const result = await verifyOtp({
        authType: method,
        identifier: identifier.trim(),
        otp: cleanOtp,
      });

      if (!result?.success) {
        throw new Error(
          result?.message || "OTP verification failed."
        );
      }

      const patients = Array.isArray(result?.patients) && result.patients.length > 0
        ? result.patients
        : [result?.patient || {}];

      setAvailablePatients(patients);
      setSelectedPatientId(patients[0]?.abha_number || patients[0]?.abhaNumber || "");
      setStep("select_patient");
    } catch (verifyError) {
      setError(
        verifyError?.message ||
          (tr('OTP verification failed.', 'OTP सत्यापन विफल हुआ।'))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPatient = async () => {
    const chosen = availablePatients.find((p) => (p.abha_number || p.abhaNumber) === selectedPatientId) || availablePatients[0];
    if (!chosen) return;

    setLoading(true);
    setError("");

    try {
      let activePatient = chosen;
      let activeToken = chosen.accessToken;

      if (!chosen.isDemo) {
        const response = await selectPatientAccount(chosen.abha_number || chosen.abhaNumber);
        activePatient = response.patient || chosen;
        activeToken = response.accessToken;
      }

      const normalized = {
        id: activePatient.id,
        patientId: activePatient.abha_number || activePatient.abhaNumber || activePatient.patientId,
        abhaNumber: activePatient.abha_number || activePatient.abhaNumber,
        name: activePatient.full_name || activePatient.name || "Patient",
        full_name: activePatient.full_name || activePatient.name || "Patient",
        gender: activePatient.gender,
        age: activePatient.age,
        date_of_birth: activePatient.date_of_birth,
        mobile_number: activePatient.mobile_number || identifier.trim(),
        authMethod: method,
        identifier: identifier.trim(),
        accessToken: activeToken,
        verifiedAt: new Date().toISOString(),
      };

      setVerifiedPatient(normalized, method);
      await loadPortalData?.();
      setScreen(SCREENS.M1);
    } catch (err) {
      setError(err?.message || (tr('Failed to activate profile.', 'प्रोफ़ाइल सक्रिय करने में विफल।')));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "select_patient") {
      setStep("otp");
      setError("");
      return;
    }

    if (step === "otp") {
      setStep("identifier");
      setOtp("");
      setError("");
      return;
    }

    setScreen(SCREENS.M1);
  };

  return (
    <div className="mobile-auth-shell">
      <div className="mobile-auth-brand">
        <div className="mobile-auth-logo-wrap">
          <img
            src="/ayushCareLogo.png"
            alt="P2Care Logo"
            className="mobile-auth-logo-img"
          />
        </div>
        <div>
          <strong><span className="brand-title-ayush">P2</span><span className="brand-title-care">Care</span></strong>
          <small>Patient to Care · Without Delay</small>
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col pb-10">
        {step !== "identifier" && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 flex w-fit items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition active:scale-[0.98]"
          >
            <ArrowLeft size={18} />
            {tr('Back', 'वापस')}
          </button>
        )}

        <div className="mb-6 mt-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {step === "select_patient"
              ? tr('Select Patient Account', 'मरीज़ प्रोफ़ाइल चुनें')
              : tr('Sign In to P2Care', 'P2Care में प्रवेश करें')}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 max-w-xs mx-auto">
            {step === "select_patient"
              ? tr('Choose the patient profile registered with this number that you want to access.', 'इस मोबाइल नंबर से जुड़े खाते नीचे दिए गए हैं। जिस प्रोफ़ाइल को आप खोलना चाहते हैं उसे चुनें।')
              : tr('Verify your identity to access your visits and health records.', 'अपनी पहचान सत्यापित करके अपने स्वास्थ्य रिकॉर्ड और विज़िट देखें।')}
          </p>
        </div>

        {step !== "select_patient" && (
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
            {AUTH_METHODS.map((item) => {
              const active = item.id === method;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeMethod(item.id)}
                  className={`rounded-xl px-2 py-3 text-xs font-semibold transition flex flex-col items-center gap-0.5 ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{isHindi ? item.hindi : item.label}</span>
                  {item.isDemo && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${active ? "text-emerald-100" : "text-amber-600"}`}>Demo</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selectedMethod.isDemo && step === "identifier" && (
          <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-center text-xs text-amber-800">
            {tr('Demo mode: Enter any ${selectedMethod.maxLength} digits for ${selectedMethod.label} and any 6-digit OTP to preview.', 'डेमो मोड: ${selectedMethod.label} के लिए कोई भी ${selectedMethod.maxLength} अंक और 6-अंकीय OTP दर्ज करें।')}
          </div>
        )}

        {step === "select_patient" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                {tr('Registered Profiles', 'उपलब्ध खाते')} ({availablePatients.length})
              </span>
              <span className="text-xs text-slate-500">
                {identifier.slice(0, 10)}
              </span>
            </div>

            <div className="space-y-3">
              {availablePatients.map((patient) => {
                const isSelected = (patient.abha_number || patient.abhaNumber) === selectedPatientId;

                return (
                  <div
                    key={patient.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPatientId(patient.abha_number || patient.abhaNumber)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPatientId(patient.id);
                      }
                    }}
                    className={`relative flex flex-col gap-3 rounded-3xl p-5 shadow-sm transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
                      isSelected
                        ? "border-2 border-teal-600 bg-white ring-4 ring-teal-100/70"
                        : "border border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                            isSelected
                              ? "bg-teal-700 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <User size={22} />
                        </div>

                        <div>
                          <h2 className="text-base font-bold text-slate-900 leading-tight">
                            {patient.name || patient.full_name}
                          </h2>
                          <p className="mt-0.5 text-xs text-slate-500 font-medium">
                            {patient.age ? `${patient.age} yrs` : "Age N/A"} • {patient.gender || "Patient"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold font-mono text-slate-700">
                          {patient.abha_number || patient.abhaNumber || patient.patientId}
                        </span>
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                            isSelected
                              ? "border-teal-700 bg-teal-700 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>

                    {/* Card Metadata Grid */}
                    <div className="mt-1 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <CalendarDays size={15} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          <strong className="font-semibold text-slate-800">{tr('Last: ', 'अंतिम विज़िट: ')}</strong>
                          {patient.last_visit || "None"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-700">
                        <Building2 size={15} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          {patient.department || "General OPD"}
                        </span>
                      </div>

                      <div className="col-span-2 flex items-center gap-2 text-slate-700 pt-1 border-t border-slate-200/60">
                        <Stethoscope size={15} className="text-teal-700 shrink-0" />
                        <span className="truncate font-medium text-slate-800">
                          {patient.doctor || "Duty Medical Officer"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleConfirmPatient}
                disabled={loading || !selectedPatientId}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 text-base font-bold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {tr('Opening profile...', 'प्रोफ़ाइल खुल रही है...')}
                  </>
                ) : (
                  <>
                    <UserCheck size={20} />
                    {tr('Go to Profile', 'प्रोफ़ाइल खोलें (आगे बढ़ें)')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("identifier");
                  setOtp("");
                  setError("");
                }}
                className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {tr('Use a different number', 'दूसरा नंबर उपयोग करें')}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            {step === "identifier" ? (
              <>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  {isHindi
                    ? selectedMethod.hindi
                    : selectedMethod.label}
                </label>

                <input
                  type="tel"
                  value={identifier}
                  onChange={handleInputChange}
                  placeholder={
                    isHindi
                      ? selectedMethod.hindiPlaceholder
                      : selectedMethod.placeholder
                  }
                  inputMode="numeric"
                  maxLength={selectedMethod.maxLength}
                  autoComplete="off"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

                {error ? (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? tr('Checking...', 'जाँच हो रही है...')
                    : tr('Send OTP', 'OTP भेजें')}
                </button>
              </>
            ) : (
              <>
                <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        {tr('OTP sent', 'OTP भेज दिया गया है')}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-800">
                        {maskedIdentifier ||
                          maskIdentifierValue(
                            identifier,
                            method
                          )}
                      </p>
                    </div>
                  </div>
                </div>

                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  {tr('Enter OTP', 'OTP दर्ज करें')}
                </label>

                <input
                  type="tel"
                  value={otp}
                  onChange={(event) => {
                    setOtp(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    );
                    setError("");
                  }}
                  placeholder={
                    tr('6-digit OTP', '6 अंकों का OTP')
                  }
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-bold tracking-[0.35em] text-slate-900 outline-none transition placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />

                <p className="mt-3 text-xs text-slate-500">
                  {isHindi
                    ? `OTP की वैधता लगभग ${Math.ceil(
                        expiresIn / 60
                      )} मिनट है।`
                    : `OTP is valid for about ${Math.ceil(
                        expiresIn / 60
                      )} minutes.`}
                </p>

                {error ? (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? tr('Verifying...', 'सत्यापन हो रहा है...')
                    : tr('Verify & Continue', 'सत्यापित करें')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("identifier");
                    setOtp("");
                    setError("");
                  }}
                  className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  {tr('Change details', 'विवरण बदलें')}
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-auto pt-6">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4">
            <LockKeyhole
              size={18}
              className="mt-0.5 shrink-0 text-slate-600"
            />

            <p className="text-xs leading-5 text-slate-600">
              {tr('Secure 8-hour sessions keep you logged in. Your health records are protected with digital privacy controls.', 'सुरक्षित सत्र 8 घंटे तक सक्रिय रहता है। आपके स्वास्थ्य डेटा की पूर्ण गोपनीयता सुनिश्चित की जाती है।')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}