import { createHash } from "node:crypto";
import path from "node:path";

export const DEFAULT_UPLOAD_LIMITS = {
  maxFiles: 50,
  maxFileBytes: 50 * 1024 * 1024,
  maxBatchBytes: 200 * 1024 * 1024,
} as const;

export type UploadCandidate = {
  name: string;
  type?: string;
  size: number;
  bytes: Uint8Array;
};

export type ValidatedUpload = UploadCandidate & {
  extension: string;
  sha256: string;
  safeName: string;
};

export type UploadBatchResult =
  | { ok: true; files: ValidatedUpload[]; duplicates: ValidatedUpload[]; totalBytes: number; noop: boolean }
  | { ok: false; errors: string[]; totalBytes: number };

type Limits = {
  maxFiles: number;
  maxFileBytes: number;
  maxBatchBytes: number;
};

const MIME_BY_EXTENSION: Record<string, Set<string>> = {
  ".pdf": new Set(["application/pdf"]),
  ".docx": new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  ".xls": new Set(["application/vnd.ms-excel"]),
  ".xlsx": new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
  ".csv": new Set(["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"]),
  ".txt": new Set(["text/plain"]),
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function hasExpectedSignature(extension: string, bytes: Uint8Array): boolean {
  if (extension === ".pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (extension === ".docx" || extension === ".xlsx") {
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]);
  }
  if (extension === ".xls") {
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  if (extension === ".csv" || extension === ".txt") return !bytes.includes(0);
  return false;
}

function validateFileName(name: string): string | null {
  if (!name || name.length > 240) return "File name must contain between 1 and 240 characters";
  if (name !== name.normalize("NFC")) return "File name must use normalized Unicode";
  if (/[\u0000-\u001F\u007F]/.test(name)) return "File name contains control characters";
  if (name.includes("/") || name.includes("\\") || path.basename(name) !== name || name === "." || name === "..") {
    return "File name must not contain a path";
  }
  return null;
}

function validateMime(extension: string, mime = ""): boolean {
  if (!mime || mime === "application/octet-stream") return true;
  return MIME_BY_EXTENSION[extension]?.has(mime.toLowerCase()) ?? false;
}

/**
 * Validates the complete upload before any write is attempted. Consumers must
 * persist only `files` after an `ok: true` result to preserve batch atomicity.
 */
export function validateUploadBatch(
  candidates: UploadCandidate[],
  options: Partial<Limits> & { existingHashes?: Iterable<string> } = {},
): UploadBatchResult {
  const limits = { ...DEFAULT_UPLOAD_LIMITS, ...options };
  const totalBytes = candidates.reduce((total, file) => total + Math.max(0, file.size), 0);
  const errors: string[] = [];
  if (candidates.length === 0) errors.push("At least one file is required");
  if (candidates.length > limits.maxFiles) errors.push(`A maximum of ${limits.maxFiles} files is allowed`);
  if (totalBytes > limits.maxBatchBytes) errors.push(`Total upload exceeds ${limits.maxBatchBytes} bytes`);

  const validated: ValidatedUpload[] = [];
  const names = new Set<string>();
  candidates.forEach((file, index) => {
    const label = file.name || `file ${index + 1}`;
    const nameError = validateFileName(file.name);
    if (nameError) errors.push(`${label}: ${nameError}`);
    const canonicalName = file.name.normalize("NFC").toLocaleLowerCase("en-GB");
    if (names.has(canonicalName)) errors.push(`${label}: Duplicate file name in batch`);
    names.add(canonicalName);
    if (!Number.isSafeInteger(file.size) || file.size <= 0) errors.push(`${label}: File must not be empty`);
    if (file.size > limits.maxFileBytes) errors.push(`${label}: File exceeds ${limits.maxFileBytes} bytes`);
    if (file.bytes.byteLength !== file.size) errors.push(`${label}: Declared file size does not match content`);
    const extension = path.extname(file.name).toLowerCase();
    if (!MIME_BY_EXTENSION[extension]) errors.push(`${label}: Unsupported file type ${extension || "(none)"}`);
    else {
      if (!validateMime(extension, file.type)) errors.push(`${label}: MIME type does not match ${extension}`);
      if (!hasExpectedSignature(extension, file.bytes)) errors.push(`${label}: File content does not match ${extension}`);
    }
    validated.push({
      ...file,
      extension,
      safeName: file.name,
      sha256: createHash("sha256").update(file.bytes).digest("hex"),
    });
  });

  if (errors.length > 0) return { ok: false, errors, totalBytes };

  const seen = new Set(options.existingHashes ?? []);
  const files: ValidatedUpload[] = [];
  const duplicates: ValidatedUpload[] = [];
  for (const file of validated) {
    if (seen.has(file.sha256)) duplicates.push(file);
    else {
      seen.add(file.sha256);
      files.push(file);
    }
  }
  return { ok: true, files, duplicates, totalBytes, noop: files.length === 0 };
}
