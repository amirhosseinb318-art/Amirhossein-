import type { Role, SessionUser } from "@/lib/types";

const ROLE_RANK: Record<Role, number> = { viewer: 1, analyst: 2, admin: 3 };

export const PERMISSIONS = [
  "events:read",
  "events:annotate",
  "events:transition",
  "events:verify",
  "events:retract",
  "alerts:review",
  "analysis:run",
  "sources:read",
  "sources:manage",
  "ingestion:run",
  "invitations:manage",
  "users:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ["events:read", "sources:read", "analysis:run"],
  analyst: [
    "events:read",
    "events:annotate",
    "events:transition",
    "sources:read",
    "analysis:run",
  ],
  admin: [...PERMISSIONS],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function atLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export class AuthorizationError extends Error {
  readonly status = 403;
  readonly code = "forbidden";
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

export function requirePermission(user: SessionUser | null, permission: Permission): SessionUser {
  if (!user) throw new AuthorizationError("Authentication required.");
  if (!can(user.role, permission)) throw new AuthorizationError();
  return user;
}
