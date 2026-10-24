import { storage, mimeFor } from "@/lib/storage";

// Serves publicly viewable uploads (gallery, offer images, UPI QR, covers). E-books are never under public/.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = key.join("/");
  if (!path.startsWith("public/")) return new Response("Not found", { status: 404 });
  try {
    const data = await storage.read(path);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": mimeFor(path), "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
