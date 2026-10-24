import { getPickerData } from "@/lib/picker-data";
import { todayIST, toDateInput } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { MembershipForm } from "@/components/MembershipForm";
import { createStudent } from "../actions";
import { StudentFields } from "../StudentFields";

export default async function NewStudentPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const params = await searchParams;
  const picker = await getPickerData();
  return (
    <>
      <PageHeader title="New admission" />
      <Flash params={params} />
      <div className="card">
        <MembershipForm action={createStudent} {...picker} defaults={{ startDate: toDateInput(todayIST()) }} allowSkip>
          <h2 className="text-lg font-semibold">Student details</h2>
          <StudentFields passwordLabel="Password (optional — student can also log in with OTP)" />
          <hr className="border-slate-200" />
        </MembershipForm>
      </div>
    </>
  );
}
