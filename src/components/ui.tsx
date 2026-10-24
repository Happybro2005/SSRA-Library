import Link from "next/link";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  CONFIRMED: "bg-green-100 text-green-800",
  EXPIRING: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  UPCOMING: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  NONE: "bg-slate-100 text-slate-600",
};

export function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STYLES[status] ?? BADGE_STYLES.NONE}`}>
      {label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  tone = "navy",
  href,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "navy" | "brand" | "green" | "amber";
  href?: string;
}) {
  const tones = {
    navy: "border-l-navy",
    brand: "border-l-brand",
    green: "border-l-green-600",
    amber: "border-l-amber-500",
  };
  const body = (
    <div className={`card border-l-4 ${tones[tone]} ${href ? "transition hover:shadow-md" : ""}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold text-ink">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{children}</div>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: React.ReactNode }) {
  const tones = {
    info: "bg-blue-50 text-blue-800 border-blue-200",
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
  };
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      <input
        className="input"
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
}
