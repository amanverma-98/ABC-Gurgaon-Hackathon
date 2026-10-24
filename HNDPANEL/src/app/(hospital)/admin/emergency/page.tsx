'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle, Bell, Clock, User, Shield, ChevronRight,
  CheckCircle2, XCircle, MessageSquare, UserPlus, ArrowUpCircle,
  RefreshCw, Search, Filter, Siren, Activity, Eye, Timer
} from 'lucide-react';
import { emergencyService, EmergencyCase, CaseAction, EmergencyStatus } from '../../../../services/emergency.service';
import { adminService } from '../../../../services/admin.service';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-red-100 text-red-800 border-red-300',
  acknowledged: 'bg-amber-100 text-amber-800 border-amber-300',
  assigned: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  escalated: 'bg-orange-100 text-orange-800 border-orange-300',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-300',
};

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'bg-red-600 text-white',
  urgent: 'bg-orange-500 text-white',
  less_urgent: 'bg-yellow-400 text-yellow-900',
  non_urgent: 'bg-green-100 text-green-800',
  undetermined: 'bg-slate-200 text-slate-600',
};

const IDENTITY_LABELS: Record<string, string> = {
  identified: 'Identified',
  unverified: 'Being Verified',
  unknown: 'Unidentified',
};

const COMM_LABELS: Record<string, string> = {
  able: 'Can Communicate',
  limited: 'Limited Communication',
  unable: 'Unable to Communicate',
  unknown: 'Unknown',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  escalated: 'Escalated',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function EmergencyDashboardPage() {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<EmergencyCase | null>(null);
  const [timeline, setTimeline] = useState<CaseAction[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([]);
  const [assignStaffId, setAssignStaffId] = useState('');

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 100 };
      if (filter) params.status = filter;
      const result = await emergencyService.listCases(params);
      setCases(result.cases || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load emergency cases');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadCases(); }, [loadCases]);

  useEffect(() => {
    adminService.getDoctors().then(d => setDoctors(d)).catch(() => {});
  }, []);

  const loadTimeline = async (caseId: string) => {
    setTimelineLoading(true);
    try {
      const data = await emergencyService.getTimeline(caseId);
      setTimeline(data || []);
    } catch { setTimeline([]); }
    finally { setTimelineLoading(false); }
  };

  const openCase = async (ec: EmergencyCase) => {
    setSelectedCase(ec);
    await loadTimeline(ec.id);
  };

  const doAction = async (fn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await fn();
      await loadCases();
      if (selectedCase) {
        try {
          const updated = await emergencyService.getCase(selectedCase.id);
          setSelectedCase(updated);
          await loadTimeline(selectedCase.id);
        } catch { setSelectedCase(null); }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = cases.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.case_number?.toLowerCase().includes(q) ||
            c.presenting_complaint?.toLowerCase().includes(q) ||
            c.emergency_category?.toLowerCase().includes(q) ||
            c.patient_name?.toLowerCase().includes(q));
  });

  const newCount = cases.filter(c => c.status === 'new').length;
  const activeCount = cases.filter(c => ['acknowledged', 'assigned', 'in_progress'].includes(c.status)).length;
  const escalatedCount = cases.filter(c => c.status === 'escalated').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center">
            <Siren className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Emergency / SOS Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium">P2Care Emergency Case Management</p>
          </div>
        </div>
        <button
          onClick={loadCases}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">New Alerts</span>
          </div>
          <p className={`text-2xl font-extrabold ${newCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{newCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Escalated</span>
          </div>
          <p className={`text-2xl font-extrabold ${escalatedCount > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{escalatedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Cases</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-700">{total}</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by case ID, complaint, patient name..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs px-2.5 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Case List */}
        <div className="flex-1 space-y-2">
          {loading && !cases.length && (
            <div className="text-center py-12 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading emergency cases...
            </div>
          )}

          {!loading && !filtered.length && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600">No emergency cases{filter ? ` with status "${filter}"` : ''}</p>
              <p className="text-xs text-slate-400 mt-1">Cases will appear here when emergency intakes are submitted</p>
            </div>
          )}

          {filtered.map(ec => (
            <button
              key={ec.id}
              onClick={() => openCase(ec)}
              className={`w-full text-left bg-white rounded-xl border ${selectedCase?.id === ec.id ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} p-3 hover:border-red-300 transition-all cursor-pointer shadow-2xs`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {ec.status === 'new' && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
                  <span className="text-xs font-bold text-slate-800 font-mono">{ec.case_number}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[ec.status]}`}>
                    {STATUS_LABELS[ec.status]}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo(ec.created_at)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${URGENCY_COLORS[ec.triage_urgency]}`}>
                  {ec.triage_urgency?.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ec.identity_status === 'unknown' ? 'bg-amber-100 text-amber-700' : ec.identity_status === 'identified' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {IDENTITY_LABELS[ec.identity_status]}
                </span>
                {ec.communication_status !== 'able' && ec.communication_status !== 'unknown' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                    {COMM_LABELS[ec.communication_status]}
                  </span>
                )}
              </div>

              {ec.presenting_complaint && (
                <p className="text-xs text-slate-600 truncate">{ec.presenting_complaint}</p>
              )}
              {ec.emergency_category && (
                <p className="text-[10px] text-slate-400 mt-0.5">{ec.emergency_category.replace(/_/g, ' ')}</p>
              )}

              <div className="flex items-center justify-between mt-1.5">
                <div className="text-[10px] text-slate-400">
                  {ec.patient_name ? (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{ec.patient_name}</span>
                  ) : (
                    <span className="italic">Patient unidentified</span>
                  )}
                </div>
                {ec.assigned_staff_name && (
                  <span className="text-[10px] text-blue-600 font-medium">→ {ec.assigned_staff_name}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Case Detail Panel */}
        {selectedCase && (
          <div className="lg:w-[420px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedCase.case_number}</h3>
                  <p className="text-[10px] text-slate-500">Created {new Date(selectedCase.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* Status & Urgency */}
              <div className="flex flex-wrap gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[selectedCase.status]}`}>
                  {STATUS_LABELS[selectedCase.status]}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${URGENCY_COLORS[selectedCase.triage_urgency]}`}>
                  Triage: {selectedCase.triage_urgency?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Identity & Communication */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Identity</span>
                  <p className="font-bold text-slate-800">{IDENTITY_LABELS[selectedCase.identity_status]}</p>
                  {selectedCase.patient_name && <p className="text-[10px] text-slate-500">{selectedCase.patient_name}</p>}
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <span className="text-[10px] text-slate-400 font-semibold">Communication</span>
                  <p className="font-bold text-slate-800">{COMM_LABELS[selectedCase.communication_status]}</p>
                </div>
              </div>

              {/* Details */}
              {selectedCase.presenting_complaint && (
                <div><span className="text-[10px] text-slate-400 font-semibold">Presenting Complaint</span><p className="text-xs text-slate-700">{selectedCase.presenting_complaint}</p></div>
              )}
              {selectedCase.accident_details && (
                <div><span className="text-[10px] text-slate-400 font-semibold">Accident Details</span><p className="text-xs text-slate-700">{selectedCase.accident_details}</p></div>
              )}
              {(selectedCase.red_flags as string[] || []).length > 0 && (
                <div>
                  <span className="text-[10px] text-red-500 font-bold">⚠ Red Flags</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(selectedCase.red_flags || []).map((f, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-200 font-medium">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {!['resolved', 'cancelled'].includes(selectedCase.status) && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Actions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCase.status === 'new' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => doAction(() => emergencyService.acknowledge(selectedCase.id))}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 cursor-pointer disabled:opacity-50"
                      >
                        <Bell className="w-3 h-3" /> Acknowledge
                      </button>
                    )}
                    <button
                      disabled={actionLoading}
                      onClick={() => doAction(() => emergencyService.escalate(selectedCase.id))}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-orange-500 text-white rounded-lg hover:bg-orange-600 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowUpCircle className="w-3 h-3" /> Escalate
                    </button>
                    {selectedCase.status !== 'in_progress' && (
                      <button
                        disabled={actionLoading}
                        onClick={() => doAction(() => emergencyService.updateStatus(selectedCase.id, 'in_progress'))}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 cursor-pointer disabled:opacity-50"
                      >
                        <Activity className="w-3 h-3" /> In Progress
                      </button>
                    )}
                    <button
                      disabled={actionLoading}
                      onClick={() => doAction(() => emergencyService.resolve(selectedCase.id, 'Resolved by staff'))}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Resolve
                    </button>
                  </div>

                  {/* Assign */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={assignStaffId}
                      onChange={e => setAssignStaffId(e.target.value)}
                      className="flex-1 text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="">Assign to staff...</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button
                      disabled={!assignStaffId || actionLoading}
                      onClick={() => { if (assignStaffId) doAction(() => emergencyService.assign(selectedCase.id, assignStaffId)); }}
                      className="px-2 py-1.5 text-[10px] font-bold bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Add Note */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add note..."
                      className="flex-1 text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none"
                    />
                    <button
                      disabled={!noteText.trim() || actionLoading}
                      onClick={() => { doAction(() => emergencyService.addNote(selectedCase.id, noteText)); setNoteText(''); }}
                      className="px-2 py-1.5 text-[10px] font-bold bg-slate-600 text-white rounded-lg hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Action Timeline</p>
                {timelineLoading ? (
                  <p className="text-[10px] text-slate-400">Loading...</p>
                ) : timeline.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No actions yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {timeline.map(a => (
                      <div key={a.id} className="flex items-start gap-2 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-700">{a.action_type.replace(/_/g, ' ')}</span>
                          {a.actor_name && <span className="text-slate-400"> by {a.actor_name}</span>}
                          {a.note && <p className="text-slate-500 mt-0.5">"{a.note}"</p>}
                          <p className="text-slate-400">{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
