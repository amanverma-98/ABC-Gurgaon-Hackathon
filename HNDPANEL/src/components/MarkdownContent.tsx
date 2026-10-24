'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Helper to check if text contains Devanagari script (Hindi/Sanskrit)
const containsDevanagari = (text: string) => /[\u0900-\u097F]/.test(text);

// Map of SOCRATES tags to distinctive, polished Tailwind badge styles
const SOCRATES_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  site: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  onset: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  character: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  radiation: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  associations: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  associated: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  timecourse: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  timing: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  exacerbatingfactors: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  aggravating: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  relieving: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  relievingfactors: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  severity: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
};

const getSocratesStyle = (label: string) => {
  const normalized = label.toLowerCase().replace(/[^a-z]/g, '');
  return (
    SOCRATES_BADGE_STYLES[normalized] || {
      bg: 'bg-teal-50',
      text: 'text-teal-950',
      border: 'border-teal-200',
    }
  );
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Preprocess content: Transform English\n---\nHindi into clean structured bilingual blocks
  const processedContent = content
    .replace(/([^\n]+)\n+---+\n+([^\n]+)/g, (match, p1, p2) => {
      if (containsDevanagari(p2) || containsDevanagari(p1)) {
        const en = containsDevanagari(p1) ? p2.trim() : p1.trim();
        const hi = containsDevanagari(p1) ? p1.trim() : p2.trim();
        return `${en}\n\n*${hi}*`;
      }
      return match;
    });

  return (
    <div className={`text-xs text-slate-800 leading-relaxed space-y-2.5 ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className="text-sm font-extrabold text-slate-900 mt-3 mb-1.5 border-b border-slate-200 pb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
              <span>{children}</span>
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="text-xs font-bold text-slate-900 mt-2.5 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 inline-block" />
              <span>{children}</span>
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider mt-2 mb-1">
              {children}
            </h4>
          ),
          strong: ({ children }) => {
            const rawLabel = String(children).replace(/:$/, '').trim();
            const badgeStyle = getSocratesStyle(rawLabel);

            // If this is a recognized SOCRATES tag or standard header, format with a sleek pill badge
            const isSocratesTag = Object.keys(SOCRATES_BADGE_STYLES).includes(
              rawLabel.toLowerCase().replace(/[^a-z]/g, '')
            );

            if (isSocratesTag) {
              return (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] uppercase tracking-wide mr-1.5 shadow-2xs border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                >
                  {children}
                </span>
              );
            }

            return (
              <strong className="font-bold text-slate-900 bg-teal-50/80 text-teal-950 px-1 py-0.2 rounded border border-teal-200/60">
                {children}
              </strong>
            );
          },
          em: ({ children }) => {
            const str = String(children);
            if (containsDevanagari(str)) {
              return (
                <span className="block text-[11px] text-slate-500 font-normal italic mt-0.5 leading-normal">
                  {children}
                </span>
              );
            }
            return <em className="italic text-slate-600">{children}</em>;
          },
          p: ({ children }) => {
            const childArray = React.Children.toArray(children);
            const strContent = childArray.map((c) => (typeof c === 'string' ? c : '')).join('');

            // Check if paragraph contains bilingual separator "---"
            if (strContent.includes('---')) {
              const parts = strContent.split(/\s*---\s*/);
              if (parts.length >= 2) {
                const enPart = parts[0].trim();
                const hiPart = parts.slice(1).join(' - ').trim();
                return (
                  <div className="my-1.5 space-y-0.5">
                    <p className="text-slate-900 font-medium leading-relaxed">{enPart}</p>
                    <p className="text-[11px] text-slate-500 font-normal italic leading-relaxed">
                      {hiPart}
                    </p>
                  </div>
                );
              }
            }

            return <p className="text-slate-800 leading-relaxed my-1.5">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="space-y-1.5 pl-4 list-disc marker:text-teal-700 my-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 pl-4 list-decimal marker:text-teal-700 my-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="text-slate-800 pl-0.5 leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-teal-600 pl-3 py-1.5 my-2 bg-teal-50/60 rounded-r-lg text-teal-950 italic text-[11px] leading-relaxed">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-slate-100 text-slate-800 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-200">
              {children}
            </code>
          ),
          hr: () => <hr className="my-2.5 border-t border-slate-200" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
