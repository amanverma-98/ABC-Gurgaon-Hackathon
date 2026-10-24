import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMobileStore } from "../../store/useMobileStore";
import {
  buildDocumentPayload,
  normalizeDocumentPages,
} from "../../services/documentService";

const isUsableString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const getStringPreview = (page) => {
  const candidates = [
    page?.previewUrl,
    page?.preview,
    page?.imageUrl,
    page?.image,
    page?.url,
    page?.dataUrl,
  ];

  return candidates.find(isUsableString) || "";
};

const isPdfPage = (page, previewUrl = "") => {
  const mime = String(page?.mimeType || page?.fileType || "").toLowerCase();
  const name = String(page?.fileName || page?.name || "").toLowerCase();
  const preview = previewUrl || getStringPreview(page);
  return (
    mime.includes("pdf") ||
    name.endsWith(".pdf") ||
    (typeof preview === "string" && preview.startsWith("data:application/pdf"))
  );
};

const getBlobSource = (page) => {
  const candidates = [page?.file, page?.blob, page?.sourceFile, page?.rawFile];

  return (
    candidates.find(
      (value) => typeof Blob !== "undefined" && value instanceof Blob,
    ) || null
  );
};

const getFileName = (page, index) =>
  page?.fileName || page?.name || `Document_Page_${index + 1}.jpg`;

export default function M4_DocumentReview() {
  const {
    capturedDocument,
    capturedDocuments,
    selectedDocumentType,
    documentType,
    extractedData,
    setCapturedDocument,
    setCapturedDocuments,
    setRetargetPageForRetake,
    setExtractedData,
    setScreen,
  } = useMobileStore();

  const [selectedPage, setSelectedPage] = useState(0);
  const [blobPreviews, setBlobPreviews] = useState({});

  const pages = useMemo(
    () =>
      normalizeDocumentPages({
        capturedDocuments,
        capturedDocument,
        documentType: selectedDocumentType || documentType,
      }),
    [capturedDocuments, capturedDocument, selectedDocumentType, documentType],
  );

  const document = useMemo(
    () =>
      buildDocumentPayload({
        capturedDocuments: pages,
        capturedDocument,
        documentType: selectedDocumentType || documentType,
      }),
    [pages, capturedDocument, selectedDocumentType, documentType],
  );

  /*
   * Resolve Blob/File objects into browser-previewable
   * object URLs.
   *
   * M3 should normally create preview URLs itself, but
   * this makes M4 resilient if a File/Blob reaches the
   * review screen.
   */
  useEffect(() => {
    const createdUrls = [];
    const nextBlobPreviews = {};

    pages.forEach((page, index) => {
      const existingPreview = getStringPreview(page);

      if (existingPreview) {
        return;
      }

      const blob = getBlobSource(page);

      if (!blob) {
        return;
      }

      const key = page?.id || `page-${index}`;
      const objectUrl = URL.createObjectURL(blob);

      nextBlobPreviews[key] = objectUrl;
      createdUrls.push(objectUrl);
    });

    setBlobPreviews(nextBlobPreviews);

    return () => {
      createdUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [pages]);

  const getPreviewUrl = (page, index) => {
    const directPreview = getStringPreview(page);

    if (directPreview) {
      return directPreview;
    }

    const key = page?.id || `page-${index}`;

    return blobPreviews[key] || "";
  };

  const activePage = pages[selectedPage] || pages[0] || null;

  const syncPages = (nextPages) => {
    const normalized = normalizeDocumentPages({
      capturedDocuments: nextPages,
      documentType: selectedDocumentType || documentType,
    });

    if (typeof setCapturedDocuments === "function") {
      setCapturedDocuments(normalized);
    }

    if (typeof setCapturedDocument === "function") {
      if (!normalized.length) {
        setCapturedDocument(null);
        return;
      }

      const firstPage = normalized[0];

      setCapturedDocument({
        ...(capturedDocument || {}),
        ...firstPage,

        id: capturedDocument?.id || document.id,

        documentId: capturedDocument?.documentId || document.id,

        documentType:
          selectedDocumentType || documentType || normalized[0]?.documentType,

        pages: normalized,
        pageCount: normalized.length,
      });
    }
  };

  const removePage = (index) => {
    const nextPages = pages.filter((_, pageIndex) => pageIndex !== index);

    syncPages(nextPages);
    if (typeof setExtractedData === "function") {
      setExtractedData(null);
    }

    if (!nextPages.length) {
      setScreen("M3");
      return;
    }

    setSelectedPage(Math.min(selectedPage, nextPages.length - 1));
  };

  const handleRetake = () => {
    /*
     * Tell the store exactly which page is being retaken.
     * M3 can then replace this page instead of creating
     * an unexpected duplicate.
     */
    if (typeof setRetargetPageForRetake === "function") {
      setRetargetPageForRetake(selectedPage);
    }
    if (typeof setExtractedData === "function") {
      setExtractedData(null);
    }

    setScreen("M3");
  };

  const handleContinue = () => {
    if (!pages.length) {
      setScreen("M3");
      return;
    }

    syncPages(pages);

    // If already analyzed and pages haven't changed, skip re-uploading and go directly to results
    if (extractedData?.success || extractedData?.detected_entities || extractedData?.documents?.length) {
      setScreen("M6");
      return;
    }

    setScreen("M5");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => setScreen("M3")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Back to camera"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Step 3 of 6
            </p>

            <h1 className="truncate text-lg font-bold text-slate-900">
              Review your document
            </h1>
          </div>

          <div className="rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {!pages.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <ImageIcon size={28} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No document captured
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Capture or upload a document before continuing.
            </p>

            <button
              type="button"
              onClick={() => setScreen("M3")}
              className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white"
            >
              <Camera size={19} />
              Capture document
            </button>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative flex min-h-[340px] items-center justify-center bg-slate-900 p-3">
                {isPdfPage(activePage, getPreviewUrl(activePage, selectedPage)) ? (
                  <div className="flex flex-col items-center justify-center w-full min-h-[340px] max-h-[500px] p-4 text-white">
                    <object
                      data={getPreviewUrl(activePage, selectedPage)}
                      type="application/pdf"
                      className="w-full h-[420px] rounded-xl bg-white hidden sm:block shadow-inner"
                    >
                      <div className="flex flex-col items-center justify-center h-full text-slate-700 p-4">
                        <FileText size={48} className="text-red-500 mb-2" />
                        <p className="font-semibold text-sm text-slate-900">
                          {getFileName(activePage, selectedPage)}
                        </p>
                      </div>
                    </object>

                    <div className="flex flex-col items-center justify-center sm:hidden py-8 px-4 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 mb-4 border border-red-400/30">
                        <FileText size={44} />
                      </div>
                      <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 border border-red-500/30">
                        PDF DOCUMENT
                      </span>
                      <h3 className="mt-3 text-base font-bold text-white max-w-xs truncate">
                        {getFileName(activePage, selectedPage)}
                      </h3>
                      <p className="mt-1 text-xs text-white/60">
                        {activePage?.fileSize || "Ready for analysis"}
                      </p>
                    </div>

                    {getPreviewUrl(activePage, selectedPage) && (
                      <div className="mt-3 flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/10 text-xs">
                        <span className="truncate max-w-[200px] font-medium text-white/90">
                          📄 {getFileName(activePage, selectedPage)}
                        </span>
                        <a
                          href={getPreviewUrl(activePage, selectedPage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-300 hover:text-teal-200 underline font-semibold ml-2 shrink-0"
                        >
                          Open PDF ↗
                        </a>
                      </div>
                    )}
                  </div>
                ) : getPreviewUrl(activePage, selectedPage) ? (
                  <>
                    <img
                      src={getPreviewUrl(activePage, selectedPage)}
                      alt={`Document page ${selectedPage + 1}`}
                      className="max-h-[500px] w-full rounded-xl object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        const fallback =
                          event.currentTarget.parentElement?.querySelector(
                            "[data-preview-fallback]",
                          );

                        fallback?.classList.remove("hidden");
                      }}
                    />

                    <div
                      data-preview-fallback
                      className="hidden flex-col items-center text-center text-white/70"
                    >
                      <ImageIcon size={40} />

                      <p className="mt-3 text-sm">Preview unavailable</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center text-white/70">
                    <ImageIcon size={40} />

                    <p className="mt-3 text-sm">Preview unavailable</p>

                    <p className="mt-1 max-w-xs text-xs text-white/50">
                      The document was captured, but its preview image is not
                      available.
                    </p>
                  </div>
                )}

                <div className="absolute left-4 top-4 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white">
                  Page {selectedPage + 1} of {pages.length}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700"
                >
                  <RotateCcw size={18} />
                  Retake
                </button>

                <button
                  type="button"
                  onClick={() => removePage(selectedPage)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 font-semibold text-red-700"
                >
                  <Trash2 size={18} />
                  Remove
                </button>
              </div>
            </section>

            {pages.length > 1 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Pages</h2>

                  <span className="text-xs text-slate-500">Tap to preview</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {pages.map((page, index) => {
                    const preview = getPreviewUrl(page, index);

                    return (
                      <button
                        type="button"
                        key={page.id || `page-${index}`}
                        onClick={() => setSelectedPage(index)}
                        className={`relative overflow-hidden rounded-xl border-2 ${
                          selectedPage === index
                            ? "border-teal-600"
                            : "border-slate-200"
                        } bg-slate-100`}
                        aria-label={`Select page ${index + 1}`}
                      >
                        <div className="aspect-[3/4]">
                          {isPdfPage(page, preview) ? (
                            <div className="flex h-full flex-col items-center justify-center bg-red-50 text-red-600 p-1 text-center">
                              <FileText size={22} className="text-red-500" />
                              <span className="mt-1 text-[10px] font-bold text-red-700">PDF</span>
                              <span className="text-[8px] text-slate-500 truncate max-w-full px-1">
                                {getFileName(page, index)}
                              </span>
                            </div>
                          ) : preview ? (
                            <img
                              src={preview}
                              alt={`Thumbnail of page ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center text-slate-400">
                              <ImageIcon size={22} />

                              <span className="mt-1 px-1 text-center text-[9px]">
                                Preview unavailable
                              </span>
                            </div>
                          )}
                        </div>

                        <span className="absolute bottom-1 left-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {index + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2 size={19} />
                </div>

                <div>
                  <p className="font-semibold text-slate-900">Document ready</p>

                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {document.pageCount}{" "}
                    {document.pageCount === 1 ? "page" : "pages"} will be
                    processed together as one document.
                  </p>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={() => setScreen("M3")}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 font-semibold text-teal-800"
            >
              <Plus size={19} />
              Add another page
            </button>
            <p className="text-center text-xs text-slate-500 pt-1">Supported file types: PDF, JPEG, PNG, WebP (up to 20MB)</p>

            <div className="pt-4 pb-8 space-y-3">
              <button
                type="button"
                onClick={handleContinue}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.99]"
              >
                {extractedData?.success || extractedData?.detected_entities ? "View Extracted Information" : "Analyze document"}
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => setScreen("M3")}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
              >
                <ArrowLeft size={18} />
                Back to camera / upload
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
