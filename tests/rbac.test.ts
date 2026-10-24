import { describe, expect, it } from "vitest";
import { AuthorizationError, atLeast, can, requirePermission } from "@/lib/rbac";
import type { SessionUser } from "@/lib/types";

const viewer: SessionUser = { id: "u1", email: "v@example.com", name: "Viewer", role: "viewer", locale: "en" };

describe("role permissions", () => {
  it("keeps viewers read-only", () => {
    expect(can("viewer", "events:read")).toBe(true);
    expect(can("viewer", "events:transition")).toBe(false);
    expect(can("viewer", "sources:manage")).toBe(false);
    expect(can("viewer", "alerts:review")).toBe(false);
    expect(can("viewer", "invitations:manage")).toBe(false);
  });

  it("lets analysts transition events but not manage sources or users", () => {
    expect(can("analyst", "events:transition")).toBe(true);
    expect(can("analyst", "analysis:run")).toBe(true);
    expect(can("analyst", "sources:manage")).toBe(false);
    expect(can("analyst", "alerts:review")).toBe(false);
    expect(can("analyst", "users:manage")).toBe(false);
  });

  it("grants administrators every permission", () => {
    expect(can("admin", "alerts:review")).toBe(true);
    expect(can("admin", "sources:manage")).toBe(true);
    expect(can("admin", "audit:read")).toBe(true);
  });

  it("orders roles", () => {
    expect(atLeast("admin", "analyst")).toBe(true);
    expect(atLeast("analyst", "admin")).toBe(false);
    expect(atLeast("viewer", "viewer")).toBe(true);
  });

  it("throws for unauthenticated and unauthorized callers", () => {
    expect(() => requirePermission(null, "events:read")).toThrow(AuthorizationError);
    expect(() => requirePermission(viewer, "alerts:review")).toThrow(AuthorizationError);
  });
});
