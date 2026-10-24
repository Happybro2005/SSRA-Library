import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { COMPLAINT_BADGE } from "@/lib/complaints";
import { waLink } from "@/lib/whatsapp";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { updateComplaint } from "./actions";

const FILTERS = ["OPEN_ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const filter = FILTERS.find((f) => f === params.status) ?? "OPEN_ALL";
  const tc = await getTranslations("complaint");
  const ts = await getTranslations("status");

  const [complaints, counts] = await Promise.all([
    prisma.complaint.findMany({
      where: filter === "OPEN_ALL" ? { status: { not: "RESOLVED" } } : { status: filter },
      include: { user: { include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { seat: true } } } } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 100,
    }),
    prisma.complaint.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const label = (f: (typeof FILTERS)[number]) =>
    f === "OPEN_ALL" ? `Not resolved (${count("OPEN") + count("IN_PROGRESS")})` : `${ts(f)} (${count(f)})`;

  return (
    <>
      <PageHeader title="Complaints" />
      <Flash params={params} />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/complaints?status=${f}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === f ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {label(f)}
          </Link>
        ))}
      </div>

      {complaints.length === 0 ? (
        <Empty>No complaints here.</Empty>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => {
            const seat = c.user.memberships[0]?.seat.number;
            return (
              <article key={c.id} className={`card ${c.status === "OPEN" ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold">{tc(`cat.${c.category}`)}</span>
                    <span className="ml-2 text-sm text-slate-500">{formatDateTime(c.createdAt)}</span>
                    <div className="text-sm">
                      <Link href={`/admin/students/${c.userId}`} className="text-navy hover:underline">
                        {c.user.name}
                      </Link>{" "}
                      <span className="text-slate-500">
                        {c.user.mobile}
                        {seat && ` · Seat #${seat}`}
                      </span>
                    </div>
                  </div>
                  <Badge status={COMPLAINT_BADGE[c.status]} label={ts(c.status)} />
                </div>
                <p className="mb-3 whitespace-pre-line rounded-lg bg-paper px-3 py-2">{c.message}</p>
                <form action={updateComplaint.bind(null, c.id)} className="space-y-2">
                  <textarea
                    name="reply"
                    rows={2}
                    defaultValue={c.reply ?? ""}
                    placeholder="Reply to the student (they see this in their portal)"
                    className="input"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select name="status" defaultValue={c.status === "OPEN" ? "IN_PROGRESS" : c.status} className="input w-auto">
                      <option value="OPEN">{ts("OPEN")}</option>
                      <option value="IN_PROGRESS">{ts("IN_PROGRESS")}</option>
                      <option value="RESOLVED">{ts("RESOLVED")}</option>
                    </select>
                    <SubmitButton className="btn-primary btn-sm">Save</SubmitButton>
                    <a
                      href={waLink(c.user.mobile, `Hello ${c.user.name}, regarding your complaint (${tc(`cat.${c.category}`)}) at SSRA Library: `)}
                      target="_blank"
                      rel="noopener"
                      className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
