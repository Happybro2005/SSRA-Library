import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { waLink } from "@/lib/whatsapp";
import { Empty, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { setEnquiryHandled } from "./actions";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ show?: string; ok?: string; error?: string }> }) {
  const params = await searchParams;
  const showDone = params.show === "done";
  const [enquiries, newCount, doneCount] = await Promise.all([
    prisma.enquiry.findMany({ where: { handled: showDone }, orderBy: { createdAt: showDone ? "desc" : "asc" }, take: 200 }),
    prisma.enquiry.count({ where: { handled: false } }),
    prisma.enquiry.count({ where: { handled: true } }),
  ]);

  return (
    <>
      <PageHeader title="Enquiries" />
      <Flash params={params} />
      <p className="mb-4 text-slate-600">Messages sent from the “Contact us” form on the website. Call or WhatsApp back, then mark them done.</p>
      <div className="mb-4 flex gap-2">
        <Link
          href="/admin/enquiries"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${!showDone ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          New ({newCount})
        </Link>
        <Link
          href="/admin/enquiries?show=done"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${showDone ? "bg-navy text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Done ({doneCount})
        </Link>
      </div>

      {enquiries.length === 0 ? (
        <Empty>{showDone ? "Nothing marked done yet." : "No new enquiries."}</Empty>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((e) => (
            <li key={e.id} className={`card ${e.handled ? "opacity-70" : "border-l-4 border-l-amber-400"}`}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-semibold">{e.name}</span> <span className="text-sm text-slate-500">{e.mobile}</span>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(e.createdAt)}
                    {e.shift && ` · Wants: ${e.shift}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:+91${e.mobile}`} className="btn-outline btn-sm">
                    📞 Call
                  </a>
                  <a
                    href={waLink(e.mobile, `Hello ${e.name}, this is SSRA Library replying to your message: `)}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                  >
                    💬 WhatsApp
                  </a>
                  <form action={setEnquiryHandled.bind(null, e.id, !e.handled)}>
                    <SubmitButton className="btn-primary btn-sm">{e.handled ? "Move to new" : "Mark done"}</SubmitButton>
                  </form>
                </div>
              </div>
              <p className="whitespace-pre-line rounded-lg bg-paper px-3 py-2">{e.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
