"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "…",
  confirm,
  disabled = false,
  formAction,
  formNoValidate,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  confirm?: string;
  disabled?: boolean;
  /** Lets one form have several actions (e.g. row Delete and bulk Delete selected). */
  formAction?: (formData: FormData) => void | Promise<void>;
  formNoValidate?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      formAction={formAction}
      formNoValidate={formNoValidate}
      name={name}
      value={value}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
