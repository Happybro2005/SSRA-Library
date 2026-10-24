import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export interface Storage {
  /** Saves the file and returns its storage key (a relative path). */
  save(folder: string, file: File): Promise<string>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

class LocalStorage implements Storage {
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
    await fs.writeFile(full, Buffer.from(await file.arrayBuffer()));
    return key;
  }

  async read(key: string) {
    return fs.readFile(this.resolve(key));
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
 * Keys are blob pathnames; files are always served through this app's routes, never by blob URL.
 */
class BlobStorage implements Storage {
  private access = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";

  async save(folder: string, file: File) {
    const { put } = await import("@vercel/blob");
    const key = newKey(folder, file);
    await put(key, file, { access: this.access, contentType: file.type || mimeFor(key), addRandomSuffix: false });
    return key;
  }

  async read(key: string) {
    const { get } = await import("@vercel/blob");
    const result = await get(key, { access: this.access });
    if (!result || result.statusCode !== 200) throw new Error(`Blob not found: ${key}`);
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  async remove(key: string) {
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export const storage: Storage = useBlob ? new BlobStorage() : new LocalStorage(path.resolve(process.env.STORAGE_DIR ?? "./storage"));

/** Vercel functions accept request bodies up to 4.5 MB, so uploads there are capped lower than on a server. */
export const MAX_UPLOAD_BYTES = useBlob ? 4 * 1024 * 1024 : 50 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = `${MAX_UPLOAD_BYTES / 1024 / 1024} MB`;

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
