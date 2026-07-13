import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractTenderPack, ExtractionEmptyError } from "../lib/extraction";
import { buildAutonomousAnalysis } from "../lib/analysis-core";
import type { UploadedFileRecord } from "../lib/tender-types";

function rec(id: string, name: string, stored_path: string): UploadedFileRecord {
  return { id, project_id: "p", original_name: name, stored_path, mime_type: "", size_bytes: 0, sha256: "x" } as UploadedFileRecord;
}

async function tmpFile(name: string, content: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "br24-extract-"));
  const p = path.join(dir, name);
  await writeFile(p, content, "utf8");
  return p;
}

describe("extraction robustness", () => {
  it("attaches granular clause/section locations from headings", async () => {
    const p = await tmpFile("spec.txt", "Intro line.\nClause 2.1 Service standards. The Supplier must clean daily.\nClause 2.2 COSHH. The Supplier must maintain COSHH assessments.");
    const { fragments, failures } = await extractTenderPack([rec("f1", "spec.txt", p)]);
    assert.equal(failures.length, 0);
    assert.ok(fragments.length >= 1);
    // At least one fragment location should carry a clause reference, not just "Document".
    assert.ok(fragments.some((f) => /Clause 2\.\d/.test(f.location)), `expected a Clause location, got ${fragments.map((f) => f.location).join(", ")}`);
  });

  it("records per-file failures without throwing when some files are readable", async () => {
    const good = await tmpFile("good.txt", "The Supplier must hold valid insurance.");
    const { fragments, failures } = await extractTenderPack([
      rec("f1", "good.txt", good),
      rec("f2", "missing.pdf", "/no/such/path/missing.pdf"),
    ]);
    assert.ok(fragments.length >= 1, "readable file still yields fragments");
    assert.equal(failures.length, 1);
    assert.equal(failures[0].file.original_name, "missing.pdf");
    assert.match(failures[0].error, /ENOENT|no such file/i);
  });

  it("throws a typed ExtractionEmptyError (code + per-file reasons) when nothing is readable", async () => {
    await assert.rejects(
      () => buildAutonomousAnalysis({
        files: [rec("f1", "broken.pdf", "/no/such/path.pdf")],
        intakeJson: JSON.stringify({ company_name: "X", consent: true }),
        orderType: "preflight",
        policy: {} as never,
        allowProviderAnalysis: false,
      }),
      (err: unknown) => {
        assert.ok(err instanceof ExtractionEmptyError);
        assert.equal((err as ExtractionEmptyError).code, "EXTRACTION_EMPTY");
        assert.equal((err as ExtractionEmptyError).failures[0].name, "broken.pdf");
        assert.match((err as ExtractionEmptyError).failures[0].error, /ENOENT|no such file/i);
        return true;
      },
    );
  });

  it("reports provider status (deterministic when AI disabled) without swallowing", async () => {
    const good = await tmpFile("t.txt", "Clause 1. The Supplier must hold public liability insurance.");
    const out = await buildAutonomousAnalysis({
      files: [rec("f1", "t.txt", good)],
      intakeJson: JSON.stringify({ company_name: "X", consent: true }),
      orderType: "preflight",
      policy: {} as never,
      allowProviderAnalysis: false,
    });
    assert.ok(out.providerStatus, "providerStatus is returned");
    assert.equal(out.providerStatus.ok, false);
    assert.equal(out.providerStatus.provider, "deterministic");
    assert.equal(out.failures.length, 0);
  });
});
