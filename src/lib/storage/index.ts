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
    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const key = `${folder}/${randomUUID()}${ext}`;
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

export const storage: Storage = new LocalStorage(path.resolve(process.env.STORAGE_DIR ?? "./storage"));

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
