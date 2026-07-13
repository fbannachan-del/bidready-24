import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProject, getProjectByToken } from "../lib/projects";
import { resolveAccessibleProject } from "../lib/project-access";
import { getOrCreateAccount, linkProjectToAccount } from "../lib/customer-auth";
import { getDb } from "../lib/db";

function expireToken(id: string) {
  getDb().prepare(`UPDATE projects SET token_expires_at = datetime('now', '-1 day') WHERE id = ?`).run(id);
}

describe("session/admin project access resolver", () => {
  it("a logged-in owner keeps access after the token expires, and the token is slid forward", () => {
    const project = createProject({ order_type: "preflight", amount_pence: 0 });
    getDb().prepare(`UPDATE projects SET status = 'paid' WHERE id = ?`).run(project.id);
    const account = getOrCreateAccount("owner@test.invalid");
    linkProjectToAccount(project.id, account.id, "test");
    expireToken(project.id);

    // Token is expired: the public token path fails.
    assert.equal(getProjectByToken(project.secure_token), undefined);
    // A stranger (no session) is denied.
    assert.equal(resolveAccessibleProject(project.secure_token, { accountId: null, isAdmin: false }), null);
    // The owner still gets in.
    const asOwner = resolveAccessibleProject(project.secure_token, { accountId: account.id, isAdmin: false });
    assert.ok(asOwner && asOwner.id === project.id);
    // Sliding expiry: the token is live again after owner access.
    assert.ok(getProjectByToken(project.secure_token));
  });

  it("an admin session opens any non-revoked project past expiry", () => {
    const project = createProject({ order_type: "preflight", amount_pence: 0 });
    expireToken(project.id);
    assert.equal(resolveAccessibleProject(project.secure_token, { accountId: null, isAdmin: false }), null);
    const asAdmin = resolveAccessibleProject(project.secure_token, { accountId: null, isAdmin: true });
    assert.ok(asAdmin && asAdmin.id === project.id);
  });

  it("a non-owner logged-in account is still denied", () => {
    const project = createProject({ order_type: "preflight", amount_pence: 0 });
    expireToken(project.id);
    const stranger = getOrCreateAccount("stranger@test.invalid");
    assert.equal(resolveAccessibleProject(project.secure_token, { accountId: stranger.id, isAdmin: false }), null);
  });

  it("a revoked token is denied even for an admin", () => {
    const project = createProject({ order_type: "preflight", amount_pence: 0 });
    getDb().prepare(`UPDATE projects SET token_revoked = 1 WHERE id = ?`).run(project.id);
    assert.equal(resolveAccessibleProject(project.secure_token, { accountId: null, isAdmin: true }), null);
  });
});
