"use client";

export default function DownloadReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden bg-brand-gradient text-white text-sm font-semibold px-4 py-2 rounded-lg"
    >
      Download report (PDF)
    </button>
  );
}
