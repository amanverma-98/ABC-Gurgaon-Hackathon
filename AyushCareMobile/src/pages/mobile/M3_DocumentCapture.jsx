import React, { useRef, useState } from "react";
import { ArrowLeft, Camera, Image as ImageIcon, Upload, X } from "lucide-react";
import { useMobileStore } from "../../store/useMobileStore";
import { createDocumentPage, normalizeDocumentType } from "../../services/documentService";

export default function M3_DocumentCapture() {
  const { selectedDocumentType, documentType, capturedDocument, capturedDocuments, setCapturedDocument, setCapturedDocuments, setExtractedData, setScreen } = useMobileStore();
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const type = normalizeDocumentType(selectedDocumentType || documentType || capturedDocument?.documentType || "other");
  const pages = Array.isArray(capturedDocuments) && capturedDocuments.length ? capturedDocuments : capturedDocument?.pages || [];

  const saveFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => /^(image\/(jpeg|png|webp)|application\/pdf)$/i.test(file.type) && file.size <= 20 * 1024 * 1024);
    if (!files.length) { setError("Choose a JPEG, PNG, WebP image, or PDF up to 20 MB."); return; }
    try {
      const next = [];
      for (const file of files) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read the selected image."));
          reader.readAsDataURL(file);
        });
        next.push(createDocumentPage({ source: { file, dataUrl, previewUrl: dataUrl, imageUrl: dataUrl, mimeType: file.type, fileName: file.name, fileSize: file.size, source: "mobile-camera-or-upload" }, documentType: type, pageNumber: pages.length + next.length + 1 }));
      }
      const all = [...pages, ...next].map((page, index) => ({ ...page, pageNumber: index + 1, documentType: type }));
      setCapturedDocuments(all);
      setCapturedDocument({ ...(capturedDocument || {}), ...all[0], id: capturedDocument?.id || all[0].id, documentId: capturedDocument?.documentId || `document-${Date.now()}`, documentType: type, pages: all, pageCount: all.length });
      setExtractedData(null);
      setError("");
      setScreen("M4");
    } catch (e) { setError(e?.message || "The image could not be opened."); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button type="button" onClick={() => setScreen("M2")} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100" aria-label="Back"><ArrowLeft size={20}/></button>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Document upload</p><h1 className="text-lg font-bold">Add a photo or image</h1></div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-7 pb-28">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-50 text-teal-700"><Camera size={34}/></div>
          <h2 className="mt-5 text-center text-xl font-bold">Capture your medical document</h2>
          <p className="mt-2 text-center text-sm leading-6 text-slate-500">Take a fresh photo with your phone camera or choose an image already saved on your phone.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 font-semibold text-white"><Camera size={19}/> Take photo</button>
            <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-semibold text-slate-800"><ImageIcon size={19}/> Choose from phone</button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-teal-50/70 border border-teal-200/60 px-3.5 py-2 text-xs text-slate-700 shadow-sm">
            <span className="font-semibold text-teal-800">Supported file types:</span>
            <span className="font-medium text-slate-700">PDF, JPEG, PNG, WebP (up to 20MB)</span>
          </div>
          {pages.length > 0 && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold">{pages.length} image{pages.length === 1 ? "" : "s"} selected</p><p className="mt-1 text-xs text-slate-500">You can add more images before analysis.</p></div>}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">Camera photos and digital files supported • maximum 20 MB per file</p>
        </section>
      </main>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"  className="hidden" onChange={(e) => { void saveFiles(e.target.files); e.target.value = ""; }}/>
    </div>
  );
}
