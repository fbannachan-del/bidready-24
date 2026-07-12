import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { validateUploadBatch, type UploadCandidate } from "../../lib/validation/uploads";

const encoder = new TextEncoder();
function candidate(name: string, bytes: Uint8Array, type = "application/octet-stream"): UploadCandidate {
  return { name, bytes, type, size: bytes.byteLength };
}
function pdf(name = "ITT.pdf", body = "tender") {
  return candidate(name, encoder.encode(`%PDF-1.7\n${body}`), "application/pdf");
}
function text(name = "instructions.txt", body = "Submit through the portal") {
  return candidate(name, encoder.encode(body), "text/plain");
}

describe("atomic upload validation", () => {
  it("accepts supported file signatures and normalises extension case", () => {
    const result = validateUploadBatch([pdf("ITT.PDF"), text()]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.files[0].extension, ".pdf");
    assert.equal(result.files.length, 2);
  });

  it("rejects an empty batch and empty files", () => {
    assert.equal(validateUploadBatch([]).ok, false);
    const empty = candidate("empty.txt", new Uint8Array(), "text/plain");
    assert.equal(validateUploadBatch([empty]).ok, false);
  });

  it("rejects extension, MIME, and content-signature mismatches", () => {
    assert.equal(validateUploadBatch([text("malware.exe")]).ok, false);
    assert.equal(validateUploadBatch([candidate("fake.pdf", encoder.encode("not a PDF"), "application/pdf")]).ok, false);
    assert.equal(validateUploadBatch([candidate("fake.pdf", encoder.encode("%PDF-1.7"), "text/plain")]).ok, false);
  });

  it("rejects path traversal, separators, controls, and non-normalised unicode", () => {
    for (const name of ["../ITT.pdf", "folder/ITT.pdf", "folder\\ITT.pdf", "bad\u0000.pdf", "cafe\u0301.pdf"]) {
      assert.equal(validateUploadBatch([pdf(name)]).ok, false, name);
    }
  });

  it("enforces exact batch, individual, and file-count boundaries", () => {
    const one = text("one.txt", "12345");
    const two = text("two.txt", "12345");
    assert.equal(validateUploadBatch([one, two], { maxBatchBytes: 10 }).ok, true);
    assert.equal(validateUploadBatch([one, two], { maxBatchBytes: 9 }).ok, false);
    assert.equal(validateUploadBatch([one], { maxFileBytes: 4 }).ok, false);
    assert.equal(validateUploadBatch([one, two], { maxFiles: 1 }).ok, false);
  });

  it("rejects a forged declared size", () => {
    const forged = { ...text(), size: 1 };
    assert.equal(validateUploadBatch([forged]).ok, false);
  });

  it("de-duplicates within a batch without failing the whole request", () => {
    const result = validateUploadBatch([pdf("first.pdf"), pdf("second.pdf")]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.files.length, 1);
    assert.equal(result.duplicates.length, 1);
    assert.equal(result.noop, false);
  });

  it("turns re-uploaded immutable content into an idempotent no-op", () => {
    const file = pdf();
    const hash = createHash("sha256").update(file.bytes).digest("hex");
    const result = validateUploadBatch([file], { existingHashes: [hash] });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.noop, true);
    assert.equal(result.files.length, 0);
    assert.equal(result.duplicates.length, 1);
  });

  it("returns no persistable files when any candidate is invalid", () => {
    const result = validateUploadBatch([pdf(), text("payload.exe")]);
    assert.equal(result.ok, false);
    assert.equal("files" in result, false);
  });

  it("rejects case-insensitive duplicate names to prevent write collisions", () => {
    assert.equal(validateUploadBatch([pdf("ITT.pdf", "one"), pdf("itt.PDF", "two")]).ok, false);
  });
});
