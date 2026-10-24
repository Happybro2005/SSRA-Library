"use client";

/** Opens the browser print dialog; choose "Save as PDF" there to download the receipt. */
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary btn-sm">
      🖨️ Print / Save as PDF
    </button>
  );
}
