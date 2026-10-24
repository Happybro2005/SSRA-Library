import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { MIN_ADMIN_PASSWORD } from "@/lib/passwords";
import { changeAdminPassword } from "./actions";

export default async function AdminAccountPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const session = await requireAdmin();
  const admin = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true, mobile: true, passwordHash: true } });
  const hasPassword = !!admin?.passwordHash;

  return (
    <>
      <PageHeader title="Change password" />
      <Flash params={await searchParams} />
      <div className="grid max-w-3xl gap-6 md:grid-cols-[1fr_16rem]">
        <form action={changeAdminPassword} className="card space-y-4">
          {hasPassword && (
            <label className="block">
              <span className="label">Current password</span>
              <input type="password" name="current" required autoComplete="current-password" className="input" />
            </label>
          )}
          <label className="block">
            <span className="label">New password (at least {MIN_ADMIN_PASSWORD} characters)</span>
            <input type="password" name="next" required minLength={MIN_ADMIN_PASSWORD} autoComplete="new-password" className="input" />
          </label>
          <label className="block">
            <span className="label">Type the new password again</span>
            <input type="password" name="confirm" required minLength={MIN_ADMIN_PASSWORD} autoComplete="new-password" className="input" />
          </label>
          <SubmitButton className="btn-brand" pendingText="Saving…">
            Change password
          </SubmitButton>
        </form>
        <aside className="card self-start text-sm text-slate-600">
          <div className="font-semibold text-ink">{admin?.name}</div>
          <div className="font-mono">{admin?.mobile}</div>
          <p className="mt-3">
            This changes the password for <b>Staff login</b> on this site. You can still log in with an OTP sent to this mobile number.
          </p>
          <p className="mt-2">
            <code>ADMIN_PASSWORD</code> in the server settings is only used the first time the admin account is created; changing it there does not change this password.
          </p>
        </aside>
      </div>
    </>
  );
}
