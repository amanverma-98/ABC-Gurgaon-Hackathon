import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { useMobileStore } from "../../store/useMobileStore";
import { analyzeDocumentOCR } from "../../services/documentService";

const pagesOf = (docs, doc) => Array.isArray(docs) && docs.length ? docs : doc?.pages?.length ? doc.pages : doc ? [doc] : [];

// Resilient analysis controller: persists state across React 18 StrictMode double-mounts
const activeAnalysis = {
  running: false,
  key: null,
  progress: 10,
  stage: "Preparing your document…",
  error: "",
  listeners: new Set(),
};

function notifyListeners() {
  const snapshot = {
    progress: activeAnalysis.progress,
    stage: activeAnalysis.stage,
    error: activeAnalysis.error,
    running: activeAnalysis.running,
  };
  activeAnalysis.listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {}
  });
}

function startAnalysis(runKey) {
  if (activeAnalysis.running && activeAnalysis.key === runKey) {
    return;
  }

  activeAnalysis.running = true;
  activeAnalysis.key = runKey;
  activeAnalysis.error = "";
  activeAnalysis.progress = 10;
  activeAnalysis.stage = "Uploading document securely…";
  notifyListeners();

  const state = useMobileStore.getState();
  const currentPages = pagesOf(state.capturedDocuments, state.capturedDocument);
  const currentType = state.selectedDocumentType || state.documentType || state.capturedDocument?.documentType || "other";
  const currentConsultationId = state.documentUploadContext?.consultationId || null;

  if (!currentPages.length) {
    activeAnalysis.running = false;
    activeAnalysis.error = "No document is available for analysis.";
    activeAnalysis.stage = "Please capture or choose a document first.";
    notifyListeners();
    return;
  }

  (async () => {
    try {
      const result = await analyzeDocumentOCR(
        {
          consultationId: currentConsultationId,
          documentType: currentType,
          pages: currentPages,
          document: { ...(state.capturedDocument || {}), pages: currentPages, documentType: currentType },
        },
        (value, message) => {
          if (typeof value === "number") {
            activeAnalysis.progress = Math.max(0, Math.min(100, value));
          }
          if (message) {
            activeAnalysis.stage = message;
          }
          notifyListeners();
        }
      );

      if (!result?.success) {
        const failed = (result?.documents || []).find((d) => String(d.status).toLowerCase() === "failed");
        throw new Error(
          failed?.processing_error ||
          failed?.extracted_data?.error ||
          "We could not read this document. Please retake a clear photo and try again."
        );
      }

      activeAnalysis.progress = 100;
      activeAnalysis.stage = "Document analyzed successfully";
      activeAnalysis.running = false;
      notifyListeners();

      const store = useMobileStore.getState();
      const extracted = result.extractedData || {};

      store.setExtractedData({
        ...result,
        ...extracted,
        extractedData: extracted,
        documentType: currentType,
        pageCount: currentPages.length,
      });

      // Background refresh portal data for patient records
      store.loadPortalData?.().catch(() => {});

      // If user is currently on M5, automatically transition to M6
      setTimeout(() => {
        const current = useMobileStore.getState().currentScreen;
        if (current === "M5") {
          useMobileStore.getState().setScreen("M6");
        }
      }, 400);
    } catch (e) {
      activeAnalysis.running = false;
      activeAnalysis.error = e?.message || "Document analysis failed.";
      activeAnalysis.stage = "Analysis could not be completed";
      notifyListeners();
    }
  })();
}

export default function M5_DocumentAnalysis() {
  const setScreen = useMobileStore((s) => s.setScreen);
  const [retryCount, setRetryCount] = useState(0);

  const [state, setState] = useState(() => ({
    progress: activeAnalysis.progress || 10,
    stage: activeAnalysis.stage || "Preparing your document…",
    error: activeAnalysis.error || "",
    running: activeAnalysis.running,
  }));

  useEffect(() => {
    const handleUpdate = (nextState) => {
      setState(nextState);
    };

    activeAnalysis.listeners.add(handleUpdate);
    setState({
      progress: activeAnalysis.progress,
      stage: activeAnalysis.stage,
      error: activeAnalysis.error,
      running: activeAnalysis.running,
    });

    const storeState = useMobileStore.getState();
    const currentPages = pagesOf(storeState.capturedDocuments, storeState.capturedDocument);
    const pagesSignature = currentPages.map((p) => `${p.fileName || p.name || 'doc'}-${p.fileSize || p.size || p.id}`).join('|');
    const runKey = `${pagesSignature}-retry-${retryCount}`;

    startAnalysis(runKey);

    return () => {
      activeAnalysis.listeners.delete(handleUpdate);
    };
  }, [retryCount]);

  const handleRetry = () => {
    activeAnalysis.running = false;
    activeAnalysis.key = null;
    setRetryCount((c) => c + 1);
  };

  const { progress, stage, error } = state;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => setScreen("M4")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
            aria-label="Back to review"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">AI Document Reader</p>
            <h1 className="text-lg font-bold">Document Analysis</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 py-8">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
            {error ? (
              <AlertCircle size={44} className="text-red-600" />
            ) : (
              <>
                <div className="absolute inset-0 rounded-full bg-teal-100/70 animate-pulse-ring" />
                <LoaderCircle size={44} className="animate-spin text-teal-700 relative z-10" />
              </>
            )}
          </div>
          <h1 className="mt-5 text-xl font-bold">{error ? "Document analysis needs attention" : "Reading your document"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error || stage}</p>
          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">{progress}%</p>
          {error && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 font-semibold text-white shadow-sm"
              >
                <RotateCcw size={17} /> Try again
              </button>
              <button
                type="button"
                onClick={() => setScreen("M4")}
                className="inline-flex min-h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 font-semibold text-slate-700"
              >
                Back to review
              </button>
            </div>
          )}
          {!error && progress >= 85 && (
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-teal-700">
              <CheckCircle2 size={18} /> Extracting useful medical information
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
