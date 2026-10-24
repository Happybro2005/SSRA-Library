import { getTranslations } from "next-intl/server";
import { requireStudent } from "@/lib/session";
import { getCurrentMembership } from "@/lib/queries";
import { todayIST } from "@/lib/dates";
import { statusOf } from "@/lib/student-status";
import { StudentShell } from "@/components/StudentShell";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
  const t = await getTranslations();
  const today = todayIST();
  const m = await getCurrentMembership(user.id, today);
  const status = statusOf(m, today);

  const items = [
    { href: "/student", label: t("student.dashboard"), short: t("student.navHome"), icon: "🏠", inBottomBar: true },
    { href: "/student/pay", label: t("student.pay"), short: t("student.navPay"), icon: "💳", inBottomBar: true },
    { href: "/student/library", label: t("student.library"), short: t("student.navLibrary"), icon: "📚", inBottomBar: true },
    { href: "/student/ebooks", label: t("student.ebooks"), short: t("student.ebooks"), icon: "📱" },
    { href: "/student/books", label: t("student.books"), short: t("student.books"), icon: "📖", inBottomBar: true },
    { href: "/student/complaints", label: t("student.complaints"), short: t("student.complaints"), icon: "📣" },
    { href: "/student/payments", label: t("student.payments"), short: t("student.payments"), icon: "🧾" },
    { href: "/student/profile", label: t("student.profile"), short: t("student.profile"), icon: "👤", inBottomBar: true },
  ];

  return (
    <StudentShell
      profile={{
        name: user.name,
        mobile: user.mobile,
        seat: m ? String(m.seat.number) : null,
        shift: m ? `${m.shift.nameEn} · ${m.shift.startTime}–${m.shift.endTime}` : null,
        status: { key: status, label: t(`status.${status}`) },
      }}
      items={items}
      labels={{
        portal: t("student.portal"),
        logout: t("common.logout"),
        seat: t("student.seat"),
        noSeat: t("student.noSeat"),
        changePassword: t("student.changePassword"),
      }}
    >
      {children}
    </StudentShell>
  );
}
