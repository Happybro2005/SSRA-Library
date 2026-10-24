"use client";

/** Header checkbox that ticks or clears every row checkbox (name="ids") in its form. */
export function SelectAll({ label }: { label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="h-4 w-4 accent-[var(--color-brand)]"
      onChange={(e) => {
        const form = e.currentTarget.form;
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]:not(:disabled)').forEach((box) => {
          box.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
