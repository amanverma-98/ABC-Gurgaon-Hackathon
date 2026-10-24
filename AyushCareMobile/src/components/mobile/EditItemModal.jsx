import React, { useState, useEffect } from "react";
import { X, Check, Edit3 } from "lucide-react";
import useMobileStore from "../../store/useMobileStore";
import { useLanguage } from "../../i18n/translations";

/**
 * EditItemModal
 * Allows patient to correct or refine an extracted entity (medicine, lab investigation, procedure, record detail, or diagnosis text).
 */
export const EditItemModal = () => {
  const {
    editingEntity,
    setEditingEntity,
    updateMedicine,
    updateInvestigation,
    updateProcedure,
    updateRecordDetail,
    updateDiagnosis,
  } = useMobileStore();
  const { isHindi, tr } = useLanguage();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [notes, setNotes] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (editingEntity) {
      const d = editingEntity.data || {};
      if (editingEntity.type === "medicine") {
        setName(d.name || "");
        setDosage(d.dosage || "");
        setSchedule(d.schedule || "");
      } else if (editingEntity.type === "investigation") {
        setName(d.testName || d.name || "");
        setValue(d.value || "");
        setUnit(d.unit || "");
        setReferenceRange(d.referenceRange || "");
      } else if (editingEntity.type === "procedure") {
        setName(d.name || "");
        setNotes(d.notes || d.date || "");
      } else if (editingEntity.type === "recordDetail") {
        setLabel(d.label || "");
        setValue(d.value || "");
      } else if (editingEntity.type === "diagnosis") {
        setName(d.name || d.value || "");
      }
    }
  }, [editingEntity]);

  if (!editingEntity) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (editingEntity.type === "medicine") {
      updateMedicine(editingEntity.data.id, {
        name,
        dosage,
        schedule,
      });
    } else if (editingEntity.type === "investigation") {
      if (updateInvestigation) {
        updateInvestigation(editingEntity.data.id, {
          testName: name,
          value,
          unit,
          referenceRange,
        });
      }
    } else if (editingEntity.type === "procedure") {
      if (updateProcedure) {
        updateProcedure(editingEntity.data.id, {
          name,
          notes,
        });
      }
    } else if (editingEntity.type === "recordDetail") {
      if (updateRecordDetail) {
        updateRecordDetail(editingEntity.data.id, {
          label,
          value,
        });
      }
    } else if (editingEntity.type === "diagnosis") {
      updateDiagnosis({
        name,
      });
    }
    setEditingEntity(null);
  };

  const getModalTitle = () => {
    switch (editingEntity.type) {
      case "investigation":
        return tr('Edit Lab Investigation', 'जांच परिणाम संपादित करें');
      case "procedure":
        return tr('Edit Procedure Detail', 'प्रक्रिया विवरण संपादित करें');
      case "recordDetail":
        return tr('Edit Record Detail', 'दस्तावेज़ विवरण संपादित करें');
      case "diagnosis":
        return tr('Edit Diagnosis', 'निदान संपादित करें');
      default:
        return tr('Edit Medication', 'दवा संपादित करें');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={() => setEditingEntity(null)}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {getModalTitle()}
              </h3>
              <p className="text-[11px] text-slate-500">
                {tr('Correct OCR reading', 'ओसीआर पठन सुधारें')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditingEntity(null)}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {editingEntity.type === "recordDetail" ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {tr('Field Name / Label', 'फ़ील्ड का नाम')}
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {tr('Extracted Value', 'मान / विवरण')}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {editingEntity.type === "investigation"
                  ? (tr('Test / Investigation Name', 'जांच का नाम'))
                  : editingEntity.type === "procedure"
                  ? (tr('Procedure Name', 'प्रक्रिया का नाम'))
                  : editingEntity.type === "medicine"
                  ? (tr('Medicine Name', 'दवा का नाम'))
                  : (tr('Diagnosis Title', 'निदान शीर्षक'))}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-12 px-3.5 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                placeholder="e.g. Test / Clinical Entry"
              />
            </div>
          )}

          {editingEntity.type === "medicine" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {tr('Dosage', 'खुराक')}
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="e.g. 500 mg"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {tr('Schedule / Timing', 'समय / अनुसूची')}
                </label>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="e.g. BD · Twice daily"
                />
              </div>
            </div>
          )}

          {editingEntity.type === "investigation" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {tr('Observed Value', 'परिणाम मान')}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="e.g. 186"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {tr('Unit', 'इकाई')}
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                  placeholder="e.g. mg/dL"
                />
              </div>
            </div>
          )}

          {editingEntity.type === "procedure" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {tr('Procedure Notes', 'नोट्स / विवरण')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
                placeholder="e.g. Therapy details"
              />
            </div>
          )}

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={() => setEditingEntity(null)}
              className="flex-1 min-h-[48px] rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {tr('Cancel', 'रद्द करें')}
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[48px] rounded-xl bg-[#006666] hover:bg-[#005454] active:bg-[#004747] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {tr('Save Correction', 'सुधार सहेजें')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;
