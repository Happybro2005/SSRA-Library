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

  const data = await storage.read(book.filePath);
  const download = new URL(req.url).searchParams.get("download") === "1";
  const filename = (book.fileName ?? `${book.title}.pdf`).replace(/[^\w.\- ]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
