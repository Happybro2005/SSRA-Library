import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { EBOOK_KEY, MAX_PDF_BYTES, storage } from "@/lib/storage";

/**
 * Issues a one-off token so the admin's browser can upload an e-book PDF straight to Vercel Blob.
 * The book record is saved afterwards by the normal Books form, which checks the file exists.
 */
export async function POST(request: Request) {
  if (!storage.direct) return Response.json({ error: "Direct uploads are only used on Vercel." }, { status: 400 });
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return Response.json({ error: "Only the admin can upload books." }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!EBOOK_KEY.test(pathname)) throw new Error("Invalid file name");
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
          validUntil: Date.now() + 60 * 60 * 1000,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Upload not allowed" }, { status: 400 });
  }
}
