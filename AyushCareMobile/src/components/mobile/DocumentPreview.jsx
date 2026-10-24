import React from "react";
import {
  FileText,
  Image as ImageIcon,
  FileWarning,
} from "lucide-react";

function getValue(value, fallback = "") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return value;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDocumentTitle(documentData) {
  return (
    documentData?.title ||
    documentData?.name ||
    documentData?.fileName ||
    documentData?.documentTypeLabel ||
    documentData?.documentType ||
    "Medical document"
  );
}

function getDocumentType(documentData) {
  return (
    documentData?.documentTypeLabel ||
    documentData?.documentType ||
    "Document"
  );
}

function getPages(documentData) {
  if (Array.isArray(documentData?.pages)) {
    return documentData.pages;
  }

  if (
    documentData?.imageUrl ||
    documentData?.previewUrl ||
    documentData?.url
  ) {
    return [documentData];
  }

  return [];
}

function DocumentPreview({
  document,
  documentData,
  record,
  title,
  showMetadata = true,
  compact = false,
  className = "",
}) {
  const data =
    document ||
    documentData ||
    record ||
    {};

  const pages = getPages(data);

  const resolvedTitle =
    title || getDocumentTitle(data);

  const documentType =
    getDocumentType(data);

  const uploadedAt =
    data.uploadedAt ||
    data.createdAt ||
    data.date;

  const hasPreview =
    pages.length > 0;

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
      aria-label="Document preview"
    >
      <div className="flex items-start gap-3 border-b border-slate-100 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FileText size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {resolvedTitle}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {documentType}
          </p>
        </div>
      </div>

      {showMetadata && (
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Type
            </p>

            <p className="mt-1 text-xs font-medium text-slate-700">
              {documentType}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Date
            </p>

            <p className="mt-1 text-xs font-medium text-slate-700">
              {formatDate(uploadedAt) ||
                "Not available"}
            </p>
          </div>
        </div>
      )}

      {hasPreview ? (
        <div
          className={`grid ${
            compact
              ? "grid-cols-1"
              : "grid-cols-1 sm:grid-cols-2"
          } gap-3 bg-slate-50 p-4`}
        >
          {pages.map((page, index) => {
            const imageSource =
              page?.previewUrl ||
              page?.imageUrl ||
              page?.url ||
              page?.src;

            return (
              <div
                key={
                  page?.id ||
                  `document-page-${index}`
                }
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                {imageSource ? (
                  <img
                    src={imageSource}
                    alt={`${resolvedTitle} page ${
                      index + 1
                    }`}
                    className="block h-auto max-h-[520px] w-full object-contain"
                  />
                ) : (
                  <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 p-6 text-center">
                    <ImageIcon
                      size={28}
                      className="text-slate-300"
                    />

                    <p className="text-xs text-slate-500">
                      Preview unavailable
                    </p>
                  </div>
                )}

                {!compact && (
                  <div className="border-t border-slate-100 px-3 py-2">
                    <p className="text-center text-[11px] text-slate-400">
                      Page {index + 1}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FileWarning size={24} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              Preview unavailable
            </p>

            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              The original document can still be
              reviewed from its available record
              details.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default DocumentPreview;