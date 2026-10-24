import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Base atomic Skeleton block with smooth shimmer gradient
 */
export const Skeleton = ({ className = '', style = {} }) => {
  return (
    <div
      className={`kiosk-shimmer rounded-lg ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Text line skeleton
 */
export const SkeletonText = ({ lines = 1, className = '', height = 'h-3' }) => {
  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`${height} ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton with border and padding
 */
export const SkeletonCard = ({ className = '', children }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-3 shadow-xs ${className}`}>
      {children}
    </div>
  );
};

/**
 * Full page lazy-loading fallback for React.Suspense
 */
export const KioskPageSkeleton = ({ message = 'Loading AyushCare kiosk...' }) => {
  return (
    <div className="h-full w-full max-w-5xl mx-auto px-4 py-3 select-none flex flex-col justify-between">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="space-y-1.5 flex-1 max-w-xs">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-3 w-72 rounded" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>

      {/* 2-Column ATM Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.85fr] gap-3 items-start flex-1 min-h-0">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-2.5 h-full min-h-[280px]">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col justify-between gap-3 h-full min-h-[280px]">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Subtle loader note */}
      <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
        <span>{message}</span>
      </div>
    </div>
  );
};

/**
 * Screen 2: Patient Verification API Skeleton
 */
export const SkeletonPatientVerification = () => {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-2.5 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-36 rounded" />
        <Skeleton className="h-3 w-48 rounded" />
      </div>
      <div className="flex items-center gap-1 text-[11px] text-teal-800 font-bold">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
        <span>Verifying e-KYC...</span>
      </div>
    </div>
  );
};

/**
 * Screen 3: Department & Doctor Roster API Skeleton
 */
export const SkeletonDepartmentGrid = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[74px] rounded-xl border border-slate-200 bg-white p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-4 h-4 rounded-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-2.5 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Screen 3: Doctor Roster Skeleton
 */
export const SkeletonDoctorList = () => {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
};

/**
 * Screen 4: ML Symptom Suggestions Skeleton
 */
export const SkeletonSymptomGrid = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[66px] rounded-xl border border-slate-200 bg-white p-2 flex flex-col justify-between">
          <Skeleton className="w-5 h-5 rounded-md" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-2 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Screen 5: AI Dynamic Clinical Questions Skeleton
 */
export const SkeletonFollowUpWizard = () => {
  return (
    <div className="h-full w-full max-w-2xl mx-auto flex flex-col justify-between p-2">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-6 w-3/4 rounded" />
        <Skeleton className="h-9 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[62px] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
        <span>Generating personalized clinical follow-up questions...</span>
      </div>
    </div>
  );
};

/**
 * Screen 8: OCR Prescription Digitization Skeleton
 */
export const SkeletonOCRExtraction = () => {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-2.5 space-y-2">
      <div className="flex items-center gap-2 text-xs text-teal-900 font-bold">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" />
        <span>ML OCR Engine: Extracting clinical entities...</span>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-48 rounded bg-teal-200/50" />
        <Skeleton className="h-3 w-36 rounded bg-teal-200/50" />
      </div>
    </div>
  );
};

export default Skeleton;
