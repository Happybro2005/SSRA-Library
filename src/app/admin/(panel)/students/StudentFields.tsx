import { Field } from "@/components/ui";

type Student = { name: string; mobile: string; fatherName: string | null; address: string | null; gender: string | null };

export function StudentFields({ student, passwordLabel }: { student?: Student; passwordLabel: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" name="name" defaultValue={student?.name} required />
      <Field label="Mobile number" name="mobile" type="tel" inputMode="numeric" defaultValue={student?.mobile} required placeholder="10-digit" />
      <Field label="Father's name" name="fatherName" defaultValue={student?.fatherName} />
      <label className="block">
        <span className="label">Gender</span>
        <select name="gender" defaultValue={student?.gender ?? ""} className="input">
          <option value="">—</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <Field label="Address" name="address" defaultValue={student?.address} />
      </div>
      <Field label={passwordLabel} name="password" autoComplete="off" minLength={6} />
    </div>
  );
}
