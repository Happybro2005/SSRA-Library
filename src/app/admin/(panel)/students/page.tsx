import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { formatDate, todayIST } from "@/lib/dates";
import { statusOf } from "@/lib/student-status";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("status");
  const today = todayIST();
  const q = params.q?.trim() ?? "";

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { mobile: { contains: q } }] } : {}),
    },
    include: {
      memberships: { orderBy: { endDate: "desc" }, take: 1, include: { seat: true, shift: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = students
    .map((s) => ({ s, m: s.memberships[0], status: statusOf(s.memberships[0], today) }))
    .filter((r) => !params.status || r.status === params.status);

  const filters = ["", "ACTIVE", "EXPIRING", "EXPIRED", "UPCOMING", "NONE"];

  return (
    <>
      <PageHeader title={`Students (${students.length})`}>
        <Link href="/admin/students/new" className="btn-brand">
          + New admission
        </Link>
      </PageHeader>
      <Flash params={params} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or mobile" className="input max-w-xs" />
        <select name="status" defaultValue={params.status ?? ""} className="input max-w-[12rem]">
          {filters.map((f) => (
            <option key={f} value={f}>
              {f ? t(f) : "All"}
            </option>
          ))}
        </select>
        <button className="btn-primary">Search</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No students found.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Seat / Shift</th>
                <th>Valid till</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, m, status }) => (
                <tr key={s.id} className={s.isActive ? "" : "opacity-50"}>
                  <td>
                    <Link href={`/admin/students/${s.id}`} className="font-semibold text-navy hover:underline">
                      {s.name}
                    </Link>
                    {!s.isActive && <span className="ml-2 text-xs text-red-600">(inactive)</span>}
                  </td>
                  <td>{s.mobile}</td>
                  <td>{m ? `#${m.seat.number} · ${m.shift.nameEn}` : "—"}</td>
                  <td>{formatDate(m?.endDate)}</td>
                  <td>
                    <Badge status={status} label={t(status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
