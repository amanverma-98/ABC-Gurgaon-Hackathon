'use client';

import React, { useEffect, useState } from 'react';
import {
  adminService,
  DepartmentItem,
  DoctorDepartmentAssignment,
  ExtendedDoctor,
  DayRosterShift,
  WeekDay,
  DEFAULT_WEEK_ROSTER,
} from '../../../../services/admin.service';
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  Stethoscope,
  X,
  AlertCircle,
  Building2,
  RefreshCw,
  CheckCircle2,
  Layers,
  MapPin,
  CalendarDays,
  Edit3,
  Phone,
  Mail,
  Shield,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';

const SHIFT_OPTIONS: DayRosterShift['shift'][] = [
  'Morning (08:00 - 14:00)',
  'Evening (14:00 - 20:00)',
  'Full Day (09:00 - 17:00)',
  'Night (20:00 - 08:00)',
  'Off Duty',
];

const DAYS_OF_WEEK: WeekDay[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<ExtendedDoctor[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [assignments, setAssignments] = useState<DoctorDepartmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [isEditDoctorModalOpen, setIsEditDoctorModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  // Action target doctor
  const [targetDoctor, setTargetDoctor] = useState<ExtendedDoctor | null>(null);

  // Assign Dept State
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assignDeptId, setAssignDeptId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Add Doctor Form State
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorEmail, setNewDoctorEmail] = useState('');
  const [newDoctorSpecialization, setNewDoctorSpecialization] = useState('General Medicine');
  const [newDoctorPhone, setNewDoctorPhone] = useState('');
  const [newDoctorRoom, setNewDoctorRoom] = useState('OPD Room 101');
  const [newDoctorDeptId, setNewDoctorDeptId] = useState('');
  const [newDoctorActive, setNewDoctorActive] = useState(true);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Doctor Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Roster Editor State
  const [editingRoster, setEditingRoster] = useState<DayRosterShift[]>(DEFAULT_WEEK_ROSTER);
  const [submittingRoster, setSubmittingRoster] = useState(false);

  const fetchRosterData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [doctorsList, deptList, assignList] = await Promise.all([
        adminService.getDoctors().catch(() => []),
        adminService.getDepartments().catch(() => []),
        adminService.getDoctorDepartments().catch(() => []),
      ]);

      setDoctors(doctorsList || []);
      setDepartments(deptList || []);
      setAssignments(assignList || []);

      if (deptList && deptList.length > 0 && !newDoctorDeptId) {
        setNewDoctorDeptId(deptList[0].id);
      }
    } catch {
      setError('Failed to fetch clinician roster and departments from hospital database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  // Quick department mapping
  const doctorDeptsMap = assignments.reduce((acc, curr) => {
    if (!acc[curr.doctor_id]) acc[curr.doctor_id] = [];
    acc[curr.doctor_id].push(curr);
    return acc;
  }, {} as Record<string, DoctorDepartmentAssignment[]>);

  // Assign Doctor to Department
  const handleAssignDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDoctorId || !assignDeptId) {
      setError('Please select both a doctor and a department to assign.');
      return;
    }

    setSubmittingAssign(true);
    setError(null);
    try {
      await adminService.assignDoctorToDepartment(assignDoctorId, assignDeptId);
      setSuccessMessage('Doctor successfully assigned to department in hospital database.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsAssignModalOpen(false);
      setAssignDoctorId('');
      setAssignDeptId('');
      await fetchRosterData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to assign doctor to department.');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Add New Doctor Submit
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorName.trim() || !newDoctorEmail.trim()) {
      setError('Please provide a valid doctor name and email address.');
      return;
    }

    setSubmittingAdd(true);
    setError(null);
    try {
      const created = await adminService.createDoctor({
        name: newDoctorName.trim(),
        email: newDoctorEmail.trim(),
        specialization: newDoctorSpecialization.trim() || 'General Medicine',
        phone: newDoctorPhone.trim() || '+91 98765 00000',
        room: newDoctorRoom.trim() || 'OPD Room 101',
        is_active: newDoctorActive,
        roster: DEFAULT_WEEK_ROSTER,
      });

      if (newDoctorDeptId) {
        try {
          await adminService.assignDoctorToDepartment(created.id, newDoctorDeptId);
        } catch {
          // assignment fallback
        }
      }

      setSuccessMessage(`Dr. ${created.name} onboarded successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsAddDoctorModalOpen(false);

      // Reset form
      setNewDoctorName('');
      setNewDoctorEmail('');
      setNewDoctorPhone('');
      setNewDoctorRoom('OPD Room 101');
      await fetchRosterData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to onboard doctor.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Doctor Modal
  const openEditDoctor = (doc: ExtendedDoctor) => {
    setTargetDoctor(doc);
    setEditName(doc.name);
    setEditEmail(doc.email);
    setEditSpecialization(doc.specialization || 'General Medicine');
    setEditPhone(doc.phone || '+91 98765 00000');
    setEditRoom(doc.room || 'OPD Room 101');
    setEditActive(doc.is_active);
    setIsEditDoctorModalOpen(true);
  };

  // Save Edited Doctor Details
  const handleEditDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDoctor) return;

    setSubmittingEdit(true);
    setError(null);
    try {
      await adminService.updateDoctorDetails(targetDoctor.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        specialization: editSpecialization.trim(),
        phone: editPhone.trim(),
        room: editRoom.trim(),
        is_active: editActive,
      });

      setSuccessMessage(`Dr. ${editName} details updated successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsEditDoctorModalOpen(false);
      await fetchRosterData();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update doctor details.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Roster Scheduler
  const openRosterModal = (doc: ExtendedDoctor) => {
    setTargetDoctor(doc);
    setEditingRoster(doc.roster || DEFAULT_WEEK_ROSTER);
    setIsRosterModalOpen(true);
  };

  // Update a single day's roster shift
  const handleRosterShiftChange = (day: WeekDay, field: keyof DayRosterShift, value: any) => {
    setEditingRoster((prev) =>
      prev.map((item) => (item.day === day ? { ...item, [field]: value } : item))
    );
  };

  // Save Roster
  const handleSaveRoster = async () => {
    if (!targetDoctor) return;
    setSubmittingRoster(true);
    setError(null);
    try {
      await adminService.saveDoctorRoster(targetDoctor.id, editingRoster);
      setSuccessMessage(`Weekly roster for Dr. ${targetDoctor.name} saved successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setIsRosterModalOpen(false);
      await fetchRosterData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save roster.');
    } finally {
      setSubmittingRoster(false);
    }
  };

  // Apply Mon-Fri morning shift template
  const applyWeekdayTemplate = () => {
    setEditingRoster((prev) =>
      prev.map((item) => {
        if (item.day === 'Saturday' || item.day === 'Sunday') {
          return { ...item, shift: 'Off Duty', isActive: false };
        }
        return { ...item, shift: 'Morning (08:00 - 14:00)', isActive: true };
      })
    );
  };

  // Filter Doctors
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(search.toLowerCase()) ||
      doc.email.toLowerCase().includes(search.toLowerCase()) ||
      doc.room?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedDeptFilter === 'all') return true;
    const depts = doctorDeptsMap[doc.id] || [];
    return depts.some((d) => d.name === selectedDeptFilter || d.department_id === selectedDeptFilter);
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <Stethoscope className="w-5 h-5 text-[#044e42]" />
            <span>Doctor Roster & Medical Staff Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage hospital clinicians, configure day-wise duty rosters, modify profile records, and map OPD departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchRosterData}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Refresh clinician records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setError(null);
              setAssignDoctorId('');
              if (departments.length > 0) setAssignDeptId(departments[0].id);
              setIsAssignModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[#044e42] text-[#044e42] hover:bg-teal-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Assign Dept</span>
          </button>

          <button
            onClick={() => {
              setError(null);
              setIsAddDoctorModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#044e42] hover:bg-[#065f46] text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Doctor</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doctor name, specialization, room, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#044e42] focus:ring-1 focus:ring-[#044e42] transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.pathway === 'ayurveda' ? 'AYUSH' : 'Allopathy'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-slate-600 font-medium ml-auto">
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
              Doctors: <strong className="text-slate-800">{filteredDoctors.length}</strong>
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 hidden sm:inline-block">
              Active Duty:{' '}
              <strong className="text-emerald-900">
                {filteredDoctors.filter((d) => d.is_active).length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Card View (Visible on screens < md) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#044e42] mb-2" />
            <span className="text-xs">Loading doctor roster...</span>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No matching clinicians found.
          </div>
        ) : (
          filteredDoctors.map((doc) => {
            const depts = doctorDeptsMap[doc.id] || [];
            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-800 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                      {doc.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{doc.name}</h4>
                      <p className="text-xs text-teal-800 font-medium">{doc.specialization || 'General'}</p>
                      <p className="text-[11px] text-slate-400">{doc.email}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                      doc.is_active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        doc.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span>{doc.is_active ? 'Active' : 'On Leave'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">OPD Room</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {doc.room || 'Room 101'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-medium">Contact Phone</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {doc.phone || '+91 98765 00000'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] font-medium mb-1">
                    Assigned Departments
                  </span>
                  {depts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {depts.map((d, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            d.pathway === 'ayurveda'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-teal-50 text-teal-900 border-teal-200'
                          }`}
                        >
                          {d.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Unassigned</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openRosterModal(doc)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-slate-600" />
                    <span>Roster</span>
                  </button>
                  <button
                    onClick={() => openEditDoctor(doc)}
                    className="flex-1 py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-[#044e42] font-semibold text-xs rounded-xl border border-teal-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setAssignDoctorId(doc.id);
                      if (departments.length > 0) setAssignDeptId(departments[0].id);
                      setIsAssignModalOpen(true);
                    }}
                    className="py-1.5 px-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                    title="Assign Department"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (Visible on screens >= md) */}
      <div className="hidden md:block bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="p-4">Doctor Details</th>
                <th className="p-4">Specialization</th>
                <th className="p-4">Assigned Department(s)</th>
                <th className="p-4">OPD Room</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions & Roster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#044e42] mb-2" />
                    <span>Loading doctor roster from hospital database...</span>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No matching doctors found in the database.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => {
                  const depts = doctorDeptsMap[doc.id] || [];
                  const room = doc.room || 'Room 101';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-800 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-2xs">
                            {doc.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{doc.name}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" />
                              {doc.email}
                            </p>
                            {doc.phone && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />
                                {doc.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-800">
                          {doc.specialization || 'General Medicine'}
                        </span>
                      </td>

                      <td className="p-4">
                        {depts.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {depts.map((d, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  d.pathway === 'ayurveda'
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-teal-50 text-teal-900 border-teal-200'
                                }`}
                              >
                                {d.name} ({d.pathway === 'ayurveda' ? 'AYUSH' : 'Allopathy'})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {room}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            doc.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              doc.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{doc.is_active ? 'Active Duty' : 'On Leave'}</span>
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openRosterModal(doc)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Day-wise Duty Roster"
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-slate-600" />
                            <span>Roster</span>
                          </button>
                          <button
                            onClick={() => openEditDoctor(doc)}
                            className="px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Edit Doctor Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setAssignDoctorId(doc.id);
                              if (departments.length > 0) setAssignDeptId(departments[0].id);
                              setIsAssignModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#044e42] hover:bg-teal-50 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                            title="Assign to Department"
                          >
                            Assign Dept
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: Onboard New Doctor
         ========================================================================= */}
      {isAddDoctorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 animate-in zoom-in-95">
            <div className="bg-[#044e42] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#99f6e4]" />
                  <span>Onboard New Doctor</span>
                </h3>
                <p className="text-[11px] text-teal-100/90 mt-0.5">
                  Add a licensed medical clinician to the AyushCare Hospital registry.
                </p>
              </div>
              <button
                onClick={() => setIsAddDoctorModalOpen(false)}
                className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-[#033434] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Doctor Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajeshwari Nair"
                    value={newDoctorName}
                    onChange={(e) => setNewDoctorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="r.nair@hospital.gov.in"
                    value={newDoctorEmail}
                    onChange={(e) => setNewDoctorEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={newDoctorPhone}
                    onChange={(e) => setNewDoctorPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Medical Specialization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kayachikitsa / Internal Medicine"
                    value={newDoctorSpecialization}
                    onChange={(e) => setNewDoctorSpecialization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OPD Room</label>
                  <input
                    type="text"
                    placeholder="e.g. OPD Room 204, Block A"
                    value={newDoctorRoom}
                    onChange={(e) => setNewDoctorRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary OPD Department Assignment
                  </label>
                  <select
                    value={newDoctorDeptId}
                    onChange={(e) => setNewDoctorDeptId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.pathway === 'ayurveda' ? 'AYUSH / Ayurveda' : 'Allopathy'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-800 block">Active Clinical Duty</span>
                    <span className="text-[11px] text-slate-500">
                      Doctor will immediately be eligible to receive routed patient tokens from Kiosks.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newDoctorActive}
                    onChange={(e) => setNewDoctorActive(e.target.checked)}
                    className="w-5 h-5 accent-[#044e42] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-2 bg-[#044e42] hover:bg-[#065f46] text-white font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingAdd ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save & Onboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: Modify Doctor Details
         ========================================================================= */}
      {isEditDoctorModalOpen && targetDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6 animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-teal-400" />
                  <span>Modify Doctor Details: {targetDoctor.name}</span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Update clinician profile, contact credentials, consulting room, and status.
                </p>
              </div>
              <button
                onClick={() => setIsEditDoctorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditDoctorSubmit} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OPD Consulting Room</label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-800 block">Duty Status</span>
                    <span className="text-[11px] text-slate-500">
                      Toggle active duty or temporary leave / off-duty for this doctor.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditActive(!editActive)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      editActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {editActive ? 'Active Duty' : 'On Leave'}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditDoctorModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 bg-[#044e42] hover:bg-[#065f46] text-white font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Update Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: Day-Wise Duty Roster Scheduler
         ========================================================================= */}
      {isRosterModalOpen && targetDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in zoom-in-95">
            <div className="bg-[#044e42] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#99f6e4]" />
                  <span>Day-Wise Duty Roster: {targetDoctor.name}</span>
                </h3>
                <p className="text-[11px] text-teal-100/90 mt-0.5">
                  Configure day-by-day shift schedules and OPD consulting rooms (Mon – Sun).
                </p>
              </div>
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-[#033434] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded-xl text-xs">
                <div>
                  <p className="font-bold text-[#044e42]">Quick Shift Template</p>
                  <p className="text-[11px] text-teal-800">
                    Apply standard Monday–Friday morning shifts with weekends off.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyWeekdayTemplate}
                  className="px-3 py-1.5 bg-[#044e42] hover:bg-[#065f46] text-white rounded-lg font-semibold text-xs shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  Apply Mon–Fri
                </button>
              </div>

              {/* Day List */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {editingRoster.map((item) => (
                  <div
                    key={item.day}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      item.isActive
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : 'bg-slate-50 border-slate-200/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:w-32">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(e) =>
                          handleRosterShiftChange(item.day, 'isActive', e.target.checked)
                        }
                        className="w-4 h-4 accent-[#044e42] cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">{item.day}</span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                          Shift Time
                        </label>
                        <select
                          value={item.shift}
                          disabled={!item.isActive}
                          onChange={(e) =>
                            handleRosterShiftChange(
                              item.day,
                              'shift',
                              e.target.value as DayRosterShift['shift']
                            )
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#044e42] disabled:opacity-50"
                        >
                          {SHIFT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5 sm:hidden">
                          Consulting Room
                        </label>
                        <input
                          type="text"
                          disabled={!item.isActive}
                          value={item.room}
                          onChange={(e) =>
                            handleRosterShiftChange(item.day, 'room', e.target.value)
                          }
                          placeholder="e.g. Room 101"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#044e42] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRosterModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoster}
                  disabled={submittingRoster}
                  className="px-4 py-2 bg-[#044e42] hover:bg-[#065f46] text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingRoster ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Duty Roster</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: Assign Doctor to Department (Fixed dropdown with canonical fallback)
         ========================================================================= */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-[#044e42] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#99f6e4]" />
                  <span>Assign Doctor to Department</span>
                </h3>
                <p className="text-[11px] text-teal-100/90 mt-0.5">
                  Route patient tokens from Kiosk to this doctor based on department pathway.
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-teal-200 hover:text-white hover:bg-[#033434] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignDepartment} className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Select Doctor</label>
                <select
                  required
                  value={assignDoctorId}
                  onChange={(e) => setAssignDoctorId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                >
                  <option value="">-- Select Clinician --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.specialization || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Department
                </label>
                <select
                  required
                  value={assignDeptId}
                  onChange={(e) => setAssignDeptId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#044e42] focus:bg-white"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.pathway === 'ayurveda' ? 'AYUSH / Ayurveda' : 'Allopathy'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {departments.length} active departments loaded from hospital clinical directory.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-4 py-2 bg-[#044e42] hover:bg-[#065f46] text-white font-semibold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingAssign ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
