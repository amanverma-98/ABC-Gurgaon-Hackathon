/**
 * P2Care Emergency Service — API client for Emergency Cases, SOS, Access Grants.
 */
import apiClient from '../lib/axios';
import { ApiResponse } from '../types/api';

export type EmergencyStatus = 'new' | 'acknowledged' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'cancelled';
export type IdentityStatus = 'identified' | 'unverified' | 'unknown';
export type CommunicationStatus = 'able' | 'limited' | 'unable' | 'unknown';
export type TriageUrgency = 'undetermined' | 'immediate' | 'urgent' | 'less_urgent' | 'non_urgent';

export interface EmergencyCase {
  id: string;
  case_number: string;
  hospital_id: string;
  patient_id?: string;
  identity_status: IdentityStatus;
  communication_status: CommunicationStatus;
  emergency_category?: string;
  presenting_complaint?: string;
  symptoms?: string[];
  vitals?: Record<string, any>;
  accident_details?: string;
  notes?: string;
  reported_circumstances?: string;
  approximate_age?: number;
  approximate_gender?: string;
  triage_urgency: TriageUrgency;
  red_flags?: string[];
  status: EmergencyStatus;
  intake_source?: string;
  assigned_staff_id?: string;
  assigned_staff_name?: string;
  escalated_to_id?: string;
  acknowledged_by?: string;
  acknowledged_by_name?: string;
  acknowledged_at?: string;
  resolved_reason?: string;
  resolved_at?: string;
  patient_name?: string;
  patient_mobile?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseAction {
  id: number;
  emergency_case_id: string;
  action_type: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  previous_status?: string;
  new_status?: string;
  note?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AccessGrant {
  id: string;
  staff_id: string;
  patient_id?: string;
  emergency_case_id?: string;
  data_categories: string[];
  purpose: string;
  scope: string;
  status: 'active' | 'expired' | 'revoked';
  issued_at: string;
  expires_at: string;
  revoked_at?: string;
  patient_name?: string;
  case_number?: string;
}

export interface AuditLogEntry {
  id: number;
  event_type: string;
  staff_id?: string;
  staff_name?: string;
  staff_role?: string;
  patient_id?: string;
  patient_name?: string;
  outcome: string;
  denial_reason?: string;
  created_at: string;
}

export const emergencyService = {
  // ── Emergency Cases ──
  listCases: async (params?: { status?: string; identity_status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<{ cases: EmergencyCase[]; total: number }>>('/emergency/cases', { params });
    return response.data.data;
  },

  getCase: async (id: string) => {
    const response = await apiClient.get<ApiResponse<EmergencyCase>>(`/emergency/cases/${id}`);
    return response.data.data;
  },

  acknowledge: async (id: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/cases/${id}/acknowledge`);
    return response.data.data;
  },

  assign: async (id: string, staffId: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/cases/${id}/assign`, { staff_id: staffId });
    return response.data.data;
  },

  escalate: async (id: string, escalateToId?: string, note?: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/cases/${id}/escalate`, { escalate_to_id: escalateToId, note });
    return response.data.data;
  },

  updateStatus: async (id: string, status: EmergencyStatus, note?: string) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/emergency/cases/${id}/status`, { status, note });
    return response.data.data;
  },

  addNote: async (id: string, note: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/cases/${id}/notes`, { note });
    return response.data.data;
  },

  resolve: async (id: string, reason?: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/cases/${id}/resolve`, { reason });
    return response.data.data;
  },

  getTimeline: async (id: string) => {
    const response = await apiClient.get<ApiResponse<CaseAction[]>>(`/emergency/cases/${id}/timeline`);
    return response.data.data;
  },

  confirmIdentity: async (id: string, payload: { patient_id?: string; create_new?: boolean; full_name?: string; gender?: string; date_of_birth?: string; mobile_number?: string }) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/cases/${id}/confirm-identity`, payload);
    return response.data.data;
  },

  // ── Access Grants ──
  createGrant: async (payload: { patient_id?: string; emergency_case_id?: string; data_categories?: string[]; purpose: string; hours?: number }) => {
    const response = await apiClient.post<ApiResponse<AccessGrant>>('/emergency/access-grants', payload);
    return response.data.data;
  },

  listGrants: async (status?: string) => {
    const response = await apiClient.get<ApiResponse<AccessGrant[]>>('/emergency/access-grants', { params: { status: status || 'active' } });
    return response.data.data;
  },

  getGrant: async (id: string) => {
    const response = await apiClient.get<ApiResponse<AccessGrant>>(`/emergency/access-grants/${id}`);
    return response.data.data;
  },

  revokeGrant: async (id: string, reason?: string) => {
    const response = await apiClient.post<ApiResponse<any>>(`/emergency/access-grants/${id}/revoke`, { reason });
    return response.data.data;
  },

  getAuthorizedData: async (patientId: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/emergency/patients/${patientId}/authorized-data`);
    return response.data.data;
  },

  // ── Audit Log ──
  getAuditLog: async (params?: { patient_id?: string; staff_id?: string; limit?: number }) => {
    const response = await apiClient.get<ApiResponse<AuditLogEntry[]>>('/emergency/audit-log', { params });
    return response.data.data;
  },
};
