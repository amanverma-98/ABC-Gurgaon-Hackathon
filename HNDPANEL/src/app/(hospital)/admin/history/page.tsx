'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminService, HistoricalVisitRecord } from '../../../../services/admin.service';
import {
  History,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Layers,
  Heart,
  Thermometer,
  Wind,
  Filter,
  User,
  Building2,
  FileText,
} from 'lucide-react';

export default function AdminHistoryPage() {
  const [timeRange, setTimeRange] = useState<'yesterday' | 'week' | 'month'>('yesterday');
  const [records, setRecords] = useState<HistoricalVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [customDate, setCustomDate] = useState('');

  const fetchHistory = async (range = timeRange) => {
    setLoading(true);
    try {
      const data = await adminService.getHistoricalVisits(range);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(timeRange);
  }, [timeRange]);

  const departmentsList = useMemo(() => {
    const set = new Set(records.map((r) => r.department));
    return ['all', ...Array.from(set)];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesDept = selectedDept === 'all' || r.department === selectedDept;
      const matchesSearch =
        r.patientName.toLowerCase().includes(search.toLowerCase()) ||
        r.tokenNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.doctorName.toLowerCase().includes(search.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [records, selectedDept, search]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const completed = filteredRecords.filter((r) => r.status === 'complete').length;
    const highRisk = filteredRecords.filter((r) => r.riskLevel === 'high_risk' || r.riskLevel === 'emergency').length;
    const ayushCount = filteredRecords.filter((r) => r.pathway === 'ayurveda').length;

    return { total, completed, highRisk, ayushCount };
  }, [filteredRecords]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-[#044e42]" />
            <span>Past Days Data & Historical Patient Records</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit yesterday’s intake volume, past department queues, triage decisions, and archived consultation logs.
          </p>
        </div>

        {/* Date Filter Segment */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto text-xs font-bold">
            {(['yesterday', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`py-1.5 px-3 rounded-lg capitalize transition-all cursor-pointer text-center ${
                  timeRange === range
                    ? 'bg-[#044e42] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'yesterday' ? 'Yesterday' : range === 'week' ? 'Past 7 Days' : 'Past 30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchHistory(timeRange)}
            className="p-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Archived Tokens</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {loading ? '...' : stats.total}
          </div>
          <p className="text-[10px] text-teal-700 font-semibold mt-1">
            {timeRange === 'yesterday' ? 'Yesterday’s Session' : `Archived in ${timeRange}`}
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Completed Consultations</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {loading ? '...' : stats.completed}
          </div>
          <p className="text-[10px] text-emerald-700 font-semibold mt-1">
            Signed off and documented in EHR
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Triage Priorities</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-2">
            {loading ? '...' : stats.highRisk}
          </div>
          <p className="text-[10px] text-rose-700 font-semibold mt-1">
            Urgent / High-Risk patients handled
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">AYUSH Intake</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-2">
            {loading ? '...' : stats.ayushCount}
          </div>
          <p className="text-[10px] text-amber-800 font-semibold mt-1">
            Ayurveda / Panchakarma OPD visits
          </p>
        </div>
      </div>

      {/* Search and Department Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient, token (e.g. OPD-101), clinician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#044e42]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#044e42] w-full sm:w-auto"
          >
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d === 'all' ? 'All Departments' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Historical Records Table (Desktop Table + Mobile Cards) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#044e42] mb-1.5" />
              Loading historical records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No historical records found for this selection.
            </div>
          ) : (
            filteredRecords.map((item) => (
              <div key={item.id} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#044e42] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {item.tokenNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{item.date}</span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{item.patientName}</h4>
                  <p className="text-[11px] text-slate-500">
                    {item.gender} · {item.age}y · Dr: {item.doctorName}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">{item.department}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Completed
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="p-3.5">Token No</th>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Attending Clinician</th>
                <th className="p-3.5">Recorded Vitals</th>
                <th className="p-3.5">Triage Risk</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#044e42] mb-1.5" />
                    <span>Loading historical records...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No historical patient records found for this period.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-[#044e42]">
                      <span className="px-2 py-1 bg-teal-50 border border-teal-200 rounded-lg">
                        {item.tokenNumber}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{item.patientName}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.gender || 'Patient'} · {item.age || '—'} yrs · {item.date}
                      </p>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.pathway === 'ayurveda'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-teal-50 text-teal-900 border-teal-200'
                        }`}
                      >
                        {item.department}
                      </span>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">
                      {item.doctorName}
                    </td>

                    <td className="p-3.5">
                      {item.vitals ? (
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                          <span>BP: <strong>{item.vitals.bp}</strong></span>
                          <span>HR: <strong>{item.vitals.pulse}</strong></span>
                          <span>SpO₂: <strong>{item.vitals.spo2}%</strong></span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Not recorded</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {item.riskLevel === 'high_risk' || item.riskLevel === 'emergency' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{item.riskLevel === 'emergency' ? 'Emergency' : 'High Risk'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Routine
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Completed</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
