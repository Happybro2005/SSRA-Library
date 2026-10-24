import { createReadStream, createWriteStream, promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

export interface Storage {
  /**
   * True when the browser uploads big files straight to storage (Vercel Blob) instead of through
   * the server — Vercel functions can't receive request bodies over 4.5 MB.
   */
  readonly direct: boolean;
  /** Saves the file and returns its storage key (a relative path). */
  save(folder: string, file: File): Promise<string>;
  read(key: string): Promise<Buffer>;
  /** Streams a file without loading it into memory (for big PDFs). */
  readStream(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number }>;
  exists(key: string): Promise<boolean>;
  /** A short-lived link the browser can open directly, or null when files are served by this app. */
  signedUrl(key: string, opts: { download: boolean }): Promise<string | null>;
  remove(key: string): Promise<void>;
}

class LocalStorage implements Storage {
  readonly direct = false;

  constructor(private root: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async save(folder: string, file: File) {
    const key = newKey(folder, file);
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    // Stream to disk so a 500 MB PDF isn't copied around in memory.
    await pipeline(Readable.fromWeb(file.stream() as import("stream/web").ReadableStream), createWriteStream(full));
    return key;
  }

  async read(key: string) {
    return fs.readFile(this.resolve(key));
  }

  async readStream(key: string) {
    const full = this.resolve(key);
    const { size } = await fs.stat(full);
    return { stream: Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>, size };
  }

  async exists(key: string) {
    return fs.access(this.resolve(key)).then(
      () => true,
      () => false,
    );
  }

  async signedUrl() {
    return null;
  }

  async remove(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

function newKey(folder: string, file: File) {
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  return `${folder}/${randomUUID()}${ext}`;
}

/**
 * Vercel Blob, used when BLOB_READ_WRITE_TOKEN is set (Vercel has no persistent disk).
 * Keys are blob pathnames. Small files are served through this app's routes; e-books are opened
 * with a short-lived signed link so big PDFs never pass through a function.
 */
class BlobStorage implements Storage {
  readonly direct = true;
  readonly access = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";

  async save(folder: string, file: File) {
    const { put } = await import("@vercel/blob");
    const key = newKey(folder, file);
    await put(key, file, { access: this.access, contentType: file.type || mimeFor(key), addRandomSuffix: false, multipart: file.size > 8 * 1024 * 1024 });
    return key;
  }

  async read(key: string) {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: this.access });
    if (!result || result.statusCode !== 200) throw new Error(`Blob not found: ${key}`);
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  async readStream(key: string) {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: this.access });
    if (!result || result.statusCode !== 200) throw new Error(`Blob not found: ${key}`);
    return { stream: result.stream, size: result.blob.size };
  }

  async exists(key: string) {
    const { head } = await import("@vercel/blob");
    return head(key).then(
      () => true,
      () => false,
    );
  }

  async signedUrl(key: string, { download }: { download: boolean }) {
    const { issueSignedToken, presignUrl } = await import("@vercel/blob");
    const validUntil = Date.now() + SIGNED_LINK_MINUTES * 60 * 1000;
    const token = await issueSignedToken({ pathname: key, operations: ["get"], validUntil });
    const { presignedUrl } = await presignUrl(token, { operation: "get", pathname: key, access: this.access, validUntil });
    // download=1 makes Blob send the file as an attachment; it isn't part of the signature.
    return download ? `${presignedUrl}${presignedUrl.includes("?") ? "&" : "?"}download=1` : presignedUrl;
  }

  async remove(key: string) {
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}

/** How long an e-book link handed to a member stays valid. */
export const SIGNED_LINK_MINUTES = 15;

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export const storage: Storage = useBlob ? new BlobStorage() : new LocalStorage(path.resolve(process.env.STORAGE_DIR ?? "./storage"));
export const blobAccess = useBlob ? (storage as BlobStorage).access : "private";

const MB = 1024 * 1024;
/** E-book PDFs up to 500 MB. On Vercel they go straight from the browser to Blob storage. */
export const MAX_PDF_BYTES = 500 * MB;
/** Cover images still go through the server, which Vercel caps at 4.5 MB per request. */
export const MAX_IMAGE_BYTES = useBlob ? 4 * MB : 20 * MB;
export const sizeLabel = (bytes: number) => `${Math.round(bytes / MB)} MB`;

/** E-book keys created by the browser upload: ebooks/<uuid>.pdf */
export const EBOOK_KEY = /^ebooks\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

export const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export function mimeFor(key: string): string {
  return MIME_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}
