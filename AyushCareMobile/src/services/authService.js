
import { apiRequest, unwrapApiResponse } from "./apiClient";

function normalizeMobile(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return raw.startsWith("+") ? raw : raw;
}

function maskMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 4 ? `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}` : "****";
}

export async function requestOtp({ authType = "ABHA", identifier = "" } = {}) {
  const type = String(authType).toUpperCase();
  const clean = String(identifier || '').replace(/\D/g,'');
  if (type === 'ABHA') {
    if (clean.length !== 14) return { success:false, error:'Enter a valid 14-digit ABHA number.' };
  } else if (type === 'MOBILE') {
    if (clean.length !== 10) return { success:false, error:'Enter a valid 10-digit Indian mobile number.' };
  } else return { success:false, error:'Use ABHA number or mobile number.' };
  const mobileNumber = type === 'MOBILE' ? normalizeMobile(clean) : undefined;
  const payload = unwrapApiResponse(await apiRequest("/mobile/portal/auth/send-otp", { method: "POST", body: JSON.stringify(type === 'ABHA' ? { abhaNumber: clean } : { mobileNumber }) }));
  if (payload?.otp) {
    console.log(`%c[DEV OTP RECEIVED]: ${payload.otp}`, 'color: #0d9488; font-weight: bold; font-size: 14px;');
  }

  return {
    success: true,
    authType: type,
    mobileNumber: payload?.mobile || mobileNumber,
    abhaNumber: type === "ABHA" ? clean : undefined,
    maskedIdentifier: type === "ABHA" ? maskMobile(payload?.mobile) : maskMobile(mobileNumber),
    otpSent: true,
    expiresInSeconds: 300,
    ...payload,
  };
}

export async function verifyOtp({ authType = "ABHA", identifier = "", otp = "" } = {}) {
  const type = String(authType).toUpperCase();
  const clean = String(identifier || '').replace(/\D/g,'');
  const mobileNumber = type === 'MOBILE' ? normalizeMobile(clean) : undefined;
  if (type === 'ABHA' && clean.length !== 14) return { success:false, error:'Enter a valid 14-digit ABHA number.' };
  if (type === 'MOBILE' && !/^\+91\d{10}$/.test(mobileNumber)) return { success:false, error:'Enter a valid 10-digit mobile number.' };
  if (!/^\d{6}$/.test(String(otp).trim())) {
    return { success: false, error: "Enter the 6-digit OTP." };
  }

  const payload = unwrapApiResponse(await apiRequest("/mobile/portal/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(type === "ABHA" ? { abhaNumber: clean, otp: String(otp).trim() } : { mobileNumber, otp: String(otp).trim() }),
  }));

  const accessToken = payload?.accessToken;
  if (accessToken) {
    try {
      localStorage.setItem("ayushcare_access_token", accessToken);
      localStorage.setItem("ayushcare_token_saved_at", String(Date.now()));
    } catch {}
  }

  return {
    success: true,
    ...payload,
    user: payload?.patient ? {
      id: payload.patient.id,
      patientId: payload.patient.abha_number || payload.patient.abhaNumber || payload.patient.id,
      name: payload.patient.full_name,
      mobile: payload.patient.mobile_number,
    } : payload?.user,
    session: {
      sessionId: payload?.patient?.id || null,
      expiresInSeconds: 28800, // 8 hours
    },
  };
}

export async function loginPatient({ authType = "ABHA", identifier = "", otp = "" } = {}) {
  return verifyOtp({ authType, identifier, otp });
}

export async function logoutPatient() {
  try {
    localStorage.removeItem("ayushcare_access_token");
    localStorage.removeItem("ayushcare_token_saved_at");
  } catch {}
  return { success: true };
}

export async function selectPatientAccount(patientId) {
  if (!patientId) throw new Error("ABHA number is required.");
  const payload = unwrapApiResponse(
    await apiRequest("/mobile/portal/select-patient", {
      method: "POST",
      body: JSON.stringify({ abhaNumber: patientId }),
    })
  );

  const accessToken = payload?.accessToken;
  if (accessToken) {
    try {
      localStorage.setItem("ayushcare_access_token", accessToken);
      localStorage.setItem("ayushcare_token_saved_at", String(Date.now()));
    } catch {}
  }

  return {
    success: true,
    ...payload,
  };
}


export async function exchangePatientQrToken(token) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Invalid patient QR token.');
  const payload = unwrapApiResponse(await apiRequest('/mobile/portal/qr/exchange', {
    method: 'POST',
    body: JSON.stringify({ token: value }),
  }));
  if (payload?.accessToken) {
    try {
      localStorage.setItem('ayushcare_access_token', payload.accessToken);
      localStorage.setItem('ayushcare_token_saved_at', String(Date.now()));
    } catch {}
  }

  const patientData = payload?.patient || {};
  const normalizedPatient = payload?.patient ? {
    ...patientData,
    id: patientData.id,
    patientId: patientData.abha_number || patientData.abhaNumber || patientData.id,
    abhaNumber: patientData.abha_number || patientData.abhaNumber,
    abha_number: patientData.abha_number || patientData.abhaNumber,
    abhaAddress: patientData.abha_address || patientData.abhaAddress,
    abha_address: patientData.abha_address || patientData.abhaAddress,
    name: patientData.full_name || patientData.name || 'Patient',
    full_name: patientData.full_name || patientData.name || 'Patient',
    gender: patientData.gender,
    dateOfBirth: patientData.date_of_birth || patientData.dateOfBirth,
    date_of_birth: patientData.date_of_birth || patientData.dateOfBirth,
    dob: patientData.date_of_birth || patientData.dateOfBirth,
    mobile: patientData.mobile_number || patientData.mobile,
    mobile_number: patientData.mobile_number || patientData.mobile,
    phone: patientData.mobile_number || patientData.mobile,
    address: patientData.address,
    aadhaarNumber: patientData.aadhaar_number || patientData.aadhaarNumber,
    aadhaar_number: patientData.aadhaar_number || patientData.aadhaarNumber,
    authMethod: 'QR',
  } : undefined;

  if (normalizedPatient) {
    try {
      localStorage.setItem('ayushcare_patient', JSON.stringify(normalizedPatient));
      localStorage.setItem('ayushcare_auth_type', 'QR');
    } catch {}
  }

  return {
    success: true,
    ...payload,
    patient: normalizedPatient,
    user: normalizedPatient,
  };
}
