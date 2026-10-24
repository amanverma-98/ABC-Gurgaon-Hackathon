'use client';

import React, { useState, useEffect } from 'react';
import { DocumentFile } from '../types/clinical';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const resolveDocumentUrl = (url?: string): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const backendBase =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
    'http://localhost:8001';

  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendBase.replace(/\/$/, '')}${cleanPath}`;
};

interface DocumentViewerModalProps {
  document: DocumentFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  // Reset image error and view settings when document changes
  useEffect(() => {
    setImageError(false);
    setZoom(100);
    setRotation(0);
  }, [document?.id, isOpen]);

  if (!isOpen || !document) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const rawUrl = document.downloadUrl || document.url || document.filePath;
  const fileUrl = resolveDocumentUrl(rawUrl);

  const isImage =
    document.type === 'image' ||
    (rawUrl && /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(rawUrl)) ||
    (document.mimeType && document.mimeType.startsWith('image/'));

  const isPdf =
    document.type === 'pdf' ||
    (rawUrl && /\.pdf$/i.test(rawUrl)) ||
    (document.mimeType && document.mimeType.includes('pdf'));

  const handleDownload = () => {
    if (fileUrl && (fileUrl.startsWith('http') || fileUrl.startsWith('blob:') || fileUrl.startsWith('data:'))) {
      const a = window.document.createElement('a');
      a.href = fileUrl;
      a.download = document.name || 'medical-report';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    }
  };

  const handleOpenExternal = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-800 text-teal-200 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate text-white">{document.name}</h3>
              <div className="flex items-center space-x-2 text-[11px] text-slate-300">
                <span className="bg-slate-800 px-2 py-0.5 rounded text-teal-300 font-medium">
                  {document.documentType || 'Medical Report'}
                </span>
                <span>·</span>
                <span>{document.date}</span>
                <span>·</span>
                <span>{document.size}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {isImage && !imageError && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-1 font-mono">{zoom}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {fileUrl && (
              <>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleOpenExternal}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-900/80 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4 relative">
          <div className="w-full h-full flex items-center justify-center">
            {isImage && fileUrl && !imageError ? (
              <div
                className="transition-transform duration-200 max-w-full max-h-full flex items-center justify-center overflow-auto"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt={document.name}
                  onError={() => {
                    setImageError(true);
                  }}
                  className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-lg border border-slate-300 bg-white"
                />
              </div>
            ) : isImage && imageError ? (
              /* Image Error Fallback Card */
              <div className="text-center p-8 bg-white rounded-xl shadow-md border border-slate-200 max-w-md space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Document Preview Unavailable</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Image failed to load from server endpoint:
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 bg-slate-50 p-2 rounded border border-slate-200 mt-1 truncate">
                    {fileUrl}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setImageError(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                  <button
                    onClick={handleOpenExternal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#054444] hover:bg-[#064e4b] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in New Tab</span>
                  </button>
                </div>
              </div>
            ) : isPdf && fileUrl ? (
              <div className="w-full h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={document.name}
                />
              </div>
            ) : fileUrl && (fileUrl.startsWith('http') || fileUrl.startsWith('/')) ? (
              <div className="w-full h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={document.name}
                />
              </div>
            ) : (
              /* Fallback info when raw key or preview is pending */
              <div className="text-center p-8 bg-white rounded-xl shadow-md border border-slate-200 max-w-md space-y-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-[#064e4b] flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{document.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {document.filePath || 'Stored on secure hospital EHR repository.'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 text-left space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-400">Status:</span>
                    <span className="font-semibold text-teal-800">{document.status || 'Verified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-400">Type:</span>
                    <span className="font-semibold text-slate-800">{document.documentType || 'Clinical Scanned File'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-400">Captured Date:</span>
                    <span className="font-semibold text-slate-800">{document.date}</span>
                  </div>
                </div>
                {fileUrl && (
                  <button
                    onClick={handleOpenExternal}
                    className="w-full py-2 bg-[#054444] hover:bg-[#064e4b] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Open Document in Browser Tab
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            {document.status === 'completed' || document.status === 'Verified' ? (
              <span className="inline-flex items-center text-emerald-700 font-semibold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Clinical Document
              </span>
            ) : document.status === 'processing' ? (
              <span className="inline-flex items-center text-amber-700 font-semibold gap-1">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Processing Active
              </span>
            ) : (
              <span className="inline-flex items-center text-slate-600 gap-1">
                <FileText className="w-3.5 h-3.5" />
                Medical File Record
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            AyushCare Secure EHR Document Storage
          </span>
        </div>
      </div>
    </div>
  );
};
