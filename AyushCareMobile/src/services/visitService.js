import { getPortalVisits, getPortalDocuments } from './portalService.js';
import { apiRequest, unwrapApiResponse } from './apiClient.js';

export function normalizeVisit(visit = {}) {
  const createdDate=visit.created_at||visit.date||''; const status=String(visit.status||'').toLowerCase();
  const isComplete=['complete','completed','cancelled'].includes(status);
  return {...visit,id:visit.id,visitId:visit.id,date:createdDate,visitDate:createdDate,appointmentDate:createdDate,doctor:visit.doctor_name||visit.doctor||'AyushCare Medical Officer',doctorName:visit.doctor_name||visit.doctor||'AyushCare Medical Officer',department:visit.department_name||visit.department||'General OPD',departmentName:visit.department_name||visit.department||'General OPD',facility:visit.hospital_name||visit.facility||'AyushCare Center',hospitalName:visit.hospital_name||visit.facility||'AyushCare Center',status:isComplete?(status==='cancelled'?'Cancelled':'Completed'):(visit.status||'Waiting Triage'),summary:visit.remarks||visit.chief_complaint||(visit.intake_pathway?`Intake: ${visit.intake_pathway}`:'Clinical consultation'),chiefComplaint:visit.remarks||visit.chief_complaint||'',riskLevel:visit.risk_level||'routine',tokenNumber:visit.token_number||null};
}
export async function fetchVisits(){try{const raw=await getPortalVisits();const list=Array.isArray(raw)?raw:(raw?.visits||raw?.data||[]);return {success:true,visits:list.map(normalizeVisit)}}catch(error){return {success:false,visits:[],error:error.message}}}
export async function fetchVisitDetails(visitId){try{const data=unwrapApiResponse(await apiRequest(`/mobile/portal/visits/${encodeURIComponent(visitId)}`));return {success:true,visit:normalizeVisit(data?.visit||data),summary:data?.summary||null,vitals:data?.vitals||null,documents:Array.isArray(data?.documents)?data.documents:[]}}catch(error){return {success:false,visit:null,error:error.message}}}
export async function fetchPastVisits(){const res=await fetchVisits();return {success:true,visits:res.visits.filter(v=>['completed','cancelled'].includes(String(v.status).toLowerCase()))}}
export async function fetchActiveVisit(){const res=await fetchVisits();return {success:true,visit:res.visits.find(v=>!['completed','cancelled'].includes(String(v.status).toLowerCase()))||null}}
export async function getDocumentsForVisit(visitId){const data=await getPortalDocuments();const list=Array.isArray(data)?data:(data?.documents||[]);return list.filter(d=>String(d.consultation_id||d.visitId||'')===String(visitId))}
export async function attachDocumentToVisit(visitId,documentId){return {success:true,visitId,documentId}}
export function buildVisitWithDocuments(visit,records=[]){return {...visit,documents:records}}
export default {normalizeVisit,fetchVisits,fetchVisitDetails,fetchPastVisits,fetchActiveVisit,getDocumentsForVisit,attachDocumentToVisit,buildVisitWithDocuments};
