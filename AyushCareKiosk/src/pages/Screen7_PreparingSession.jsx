import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Info,
  Minus,
  Plus,
  Thermometer,
  Droplets,
  Gauge,
  UserRound,
  Keyboard,
} from 'lucide-react';

import { useKioskStore } from '../store/useKioskStore';
import { useTranslation } from '../hooks/useTranslation';
import { useKeyboard } from '../context/KeyboardContext';
import { kioskApi } from '../services/api';

const Screen7_PreparingSession = () => {
  const {
    nextScreen,
    prevScreen,
    sessionData,
    updateSessionData,
  } = useKioskStore();

  const { t, isHindi } = useTranslation();

  const { vitals } = sessionData;

  const [bp, setBp] = useState(vitals?.bp || '');
  const [pulse, setPulse] = useState(vitals?.pulse || '');
  const [temp, setTemp] = useState(vitals?.temp || '');
  const [spo2, setSpo2] = useState(vitals?.spo2 || '');

  const [isCapturing, setIsCapturing] = useState(false);
  const [completed, setCompleted] = useState(false);

  /*
   * Mock peripheral capture.
   *
   * In the production version this can be replaced with:
   * - BP monitor API
   * - Pulse oximeter
   * - Temperature sensor
   *
   * No UI architecture change will be required.
   */
  const simulateVitalsCapture = () => {
    setIsCapturing(true);

    setTimeout(() => {
      setBp('120/80');
      setPulse('76');
      setTemp('98.4');
      setSpo2('98');

      setIsCapturing(false);
      setCompleted(true);
    }, 1200);
  };

  /*
   * Keep store synchronized with the local vitals.
   *
   * Existing store has vitals inside sessionData,
   * so we use updateSessionData instead of adding
   * another store action.
   */
  useEffect(() => {
    updateSessionData({
      vitals: {
        bp,
        pulse,
        temp,
        spo2,
      },
    });
  }, [bp, pulse, temp, spo2, updateSessionData]);

  const handleContinue = async () => {
    updateSessionData({
      vitals: {
        bp,
        pulse,
        temp,
        spo2,
      },
    });

    if (sessionData.consultationId && (bp || pulse || temp || spo2)) {
      try {
        await kioskApi.vitals(sessionData.consultationId, {
          bp,
          pulse,
          temp,
          spo2,
          source: completed ? 'kiosk_sensors' : 'manual',
        });
      } catch (err) {
        console.warn('Could not save vitals to consultation:', err);
      }
    }

    nextScreen();
  };

  const hasAnyVitals = bp || pulse || temp || spo2;

  return (
    <div className="h-full w-full max-w-5xl mx-auto px-4 py-2 select-none flex flex-col justify-between">
      {/* --------------------------------------------------
          COMPACT HEADER
      --------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
              {t('screen7.stepLabel', 'Step 5 · Clinical Vitals')}
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              {t('screen7.title', 'Record Baseline Health Vitals')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('screen7.subtitle', 'Use the integrated kiosk sensors or enter your vital signs')}
          </p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <HeartPulse className="w-5 h-5" />
        </div>
      </div>

      {/* --------------------------------------------------
          TWO-COLUMN ATM LAYOUT
      --------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.85fr] gap-3 items-start flex-1 min-h-0">

        {/* LEFT COLUMN: 4 Vitals in 2x2 Grid + Automatic Sensor Button */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-800">
              {t('screen7.title', 'Vital Signs')}
            </h2>
            {completed && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Captured
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Blood Pressure */}
            <VitalInput
              icon={<Gauge className="w-4 h-4" />}
              title={t('screen7.bloodPressure', 'Blood Pressure')}
              subtitle="Systolic / Diastolic"
              value={bp}
              placeholder="120/80"
              onChange={setBp}
              suffix="mmHg"
            />

            {/* Pulse */}
            <VitalInput
              icon={<Activity className="w-4 h-4" />}
              title={t('screen7.pulse', 'Pulse Rate')}
              subtitle="Heart beats / min"
              value={pulse}
              placeholder="76"
              onChange={setPulse}
              suffix="bpm"
            />

            {/* Temperature */}
            <VitalInput
              icon={<Thermometer className="w-4 h-4" />}
              title={t('screen7.temperature', 'Body Temperature')}
              subtitle="Body temperature"
              value={temp}
              placeholder="98.4"
              onChange={setTemp}
              suffix="°F"
            />

            {/* SpO2 */}
            <VitalInput
              icon={<Droplets className="w-4 h-4" />}
              title={t('screen7.spo2', 'Oxygen (SpO2)')}
              subtitle="Blood oxygen level"
              value={spo2}
              placeholder="98"
              onChange={setSpo2}
              suffix="%"
            />
          </div>

          {/* Automatic Sensor Button */}
          <button
            type="button"
            onClick={simulateVitalsCapture}
            disabled={isCapturing}
            className="h-9 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xs cursor-pointer transition active:scale-[0.99] disabled:cursor-wait"
          >
            <HeartPulse className="w-4 h-4 text-teal-700" />
            <span>
              {isCapturing ? t('screen7.capturing', 'Reading kiosk sensors...') : t('screen7.takeVitalsNow', 'Auto-Capture from Kiosk Sensors')}
            </span>
          </button>
        </div>

        {/* RIGHT COLUMN: Patient & Session Status + Continue */}
        <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs">
          {/* Patient Card */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <UserRound className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Patient</p>
              <p className="text-xs font-black text-slate-900 truncate">
                {sessionData.patientProfile?.name || 'Patient'}
              </p>
            </div>
          </div>

          {/* Session Checklist */}
          <div className="space-y-1.5 text-xs py-1 border-y border-slate-100">
            <StatusRow label="Patient verified" done={sessionData.isVerified} />
            <StatusRow label="Clinical history" done={Boolean(sessionData.chiefComplaint) || sessionData.symptoms?.length > 0} />
            <StatusRow label="Baseline vitals" done={Boolean(hasAnyVitals)} />
            <StatusRow label="Documents" done={sessionData.documents?.length > 0} />
          </div>

          <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-[10px] text-teal-900">
            <strong>Clinical Safety:</strong> Measurements assist the doctor. The kiosk does not diagnose.
          </div>

          {/* Action Continue Button */}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full h-11 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black flex items-center justify-between px-4 cursor-pointer transition text-sm shadow-xs"
          >
            <span>{t('screen7.continueSession', 'Continue to Documents')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Reusable components                                                        */
/* -------------------------------------------------------------------------- */

const VitalInput = ({
  icon,
  title,
  subtitle,
  value,
  placeholder,
  onChange,
  suffix,
}) => {
  const { openKeyboard } = useKeyboard();

  const handleOpen = () => {
    openKeyboard({
      id: title,
      value,
      onChange,
      type: 'number',
      placeholder,
      label: title,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-md bg-white text-teal-700 flex items-center justify-center shadow-2xs shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-900 truncate leading-tight">{title}</p>
          <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 pr-16 text-xs font-bold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-teal-500 cursor-pointer"
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400">{suffix}</span>
          <button
            type="button"
              title="Open Touch Numpad"
            aria-label="Open Touch Numpad"
            className="w-5 h-5 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs"
          >
            <Keyboard className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusRow = ({ label, done }) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-semibold text-slate-600 truncate">{label}</span>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full shrink-0 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>
        <CheckCircle2 className="w-3 h-3" />
      </span>
    </div>
  );
};

export default Screen7_PreparingSession;
export { Screen7_PreparingSession };