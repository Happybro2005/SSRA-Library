import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PortalShell } from "@/components/PortalShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const t = await getTranslations();
  const [pending, bookRequests, openComplaints, newEnquiries] = await Promise.all([
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.bookRequest.count({ where: { status: "PENDING" } }),
    prisma.complaint.count({ where: { status: "OPEN" } }),
    prisma.enquiry.count({ where: { handled: false } }),
  ]);
  const nav = [
    { href: "/admin", label: t("admin.dashboard"), icon: "📊" },
    { href: "/admin/students", label: t("admin.students"), icon: "🎓" },
    { href: "/admin/seats", label: t("admin.seats"), icon: "🪑" },
    { href: "/admin/payments", label: t("admin.payments"), icon: "💰", badge: pending },
    { href: "/admin/receipts", label: t("admin.receipts"), icon: "🧾" },
    { href: "/admin/dues", label: t("admin.dues"), icon: "⏰" },
    { href: "/admin/plans", label: t("admin.plans"), icon: "🏷️" },
    { href: "/admin/books", label: t("admin.books"), icon: "📚" },
    { href: "/admin/books/issues", label: t("admin.issues"), icon: "📖", badge: bookRequests },
    { href: "/admin/enquiries", label: t("admin.enquiries"), icon: "✉️", badge: newEnquiries },
    { href: "/admin/complaints", label: t("admin.complaints"), icon: "📣", badge: openComplaints },
    { href: "/admin/offers", label: t("admin.offers"), icon: "🎉" },
    { href: "/admin/settings", label: t("admin.settings"), icon: "⚙️" },
    { href: "/admin/account", label: t("admin.changePassword"), icon: "🔑" },
  ];
  return (
    <PortalShell
      title={t("admin.panel")}
      userName={user.name ?? ""}
      nav={nav}
      logoutLabel={t("common.logout")}
      menuLabel={t("common.menu")}
      extraLink={{ href: "/", label: t("admin.viewSite") }}
    >
      {children}
    </PortalShell>
  );
}
