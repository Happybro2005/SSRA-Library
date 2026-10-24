import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { hasActiveMembership } from "@/lib/queries";
import { todayIST } from "@/lib/dates";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return new Response("Please log in", { status: 401 });

  if (session.user.role !== "ADMIN") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.isActive || !(await hasActiveMembership(user.id, todayIST()))) {
      return new Response("An active membership is required to read e-books", { status: 403 });
    }
  }

  const book = await prisma.book.findUnique({ where: { id } });
  if (!book || book.type !== "EBOOK" || !book.filePath) return new Response("Not found", { status: 404 });

  const download = new URL(req.url).searchParams.get("download") === "1";

  // On Vercel: hand the member a short-lived signed link, so big PDFs never pass through a function.
  const signed = await storage.signedUrl(book.filePath, { download });
  if (signed) return Response.redirect(signed, 302);

  // On a normal server: stream from disk without loading the whole file into memory.
  const { stream, size } = await storage.readStream(book.filePath);
  const filename = (book.fileName ?? `${book.title}.pdf`).replace(/[^\w.\- ]/g, "_");
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(size),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
