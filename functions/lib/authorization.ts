/**
 * T-088 — Function-level AUTHORIZATION layer (role → permission, fail-closed).
 *
 * Authentication (functions/lib/cf-access.ts) proves WHO the caller is. This
 * module decides WHAT the caller may do. It is a faithful TypeScript port of
 * the Selemene role/permission model, frozen in ISA iteration 6:
 *
 *   crates/noesis-api/src/cf_access.rs
 *     — role resolution + the fail-closed CF_PLATFORM_ADMIN_EMAILS →
 *       `platform-admin` mapping (decision 2026-07-26 23:22: Access rule
 *       groups are policy building blocks, not identity-provider group claims,
 *       so an exact email-allowlist match is the ONLY backend authority for
 *       `platform-admin`; unmatched identities remain viewers).
 *     — `permissions_for_roles`: the parent-grant permission matrix
 *       (`admin:analytics`, `admin:users`, … — never the leaf `:read` forms).
 *
 *   crates/noesis-api/src/handlers/admin.rs
 *     — `has_permission`: parent-grant semantics. `admin:analytics:read` is
 *       satisfied by holding the `admin:analytics` parent (and so on for
 *       `admin:users:*`, `admin:system:*`, `admin:audit:*`, `admin:keys:*`,
 *       `admin:history-sync:*`, `admin:billing:*`), plus `admin:*` wildcard.
 *
 * Deterministic, pure, zero dependencies (matches cf-access.ts / dev-identity.ts
 * style). No network, no storage. Fail-closed: nothing here silently grants.
 */

export const SUPPORTED_ROLES = ['viewer', 'support', 'admin', 'platform-admin'] as const
export type Role = (typeof SUPPORTED_ROLES)[number]

/** Highest-authority role, used by smoke probes to classify a principal. */
export type PrincipalClass = Role

export interface CfIdentity {
  sub: string
  email: string
  /** CF Access rule-group names (may be absent — not guaranteed in the JWT). */
  groups?: string[]
}

export interface Principal {
  email: string
  sub: string
  roles: Role[]
  permissions: string[]
  /** Single highest-authority role for smoke-principal classification. */
  principal: PrincipalClass
}

const ROLE_PRECEDENCE: Role[] = ['platform-admin', 'admin', 'support', 'viewer']

// ---------------------------------------------------------------------------
// Role resolution (cf_access.rs)
// ---------------------------------------------------------------------------

/** cf_access.rs `map_cf_group_to_role`: `selemene-admin` → `platform-admin`. */
export function mapCfGroupToRole(group: string): string {
  const trimmed = group.trim()
  return trimmed === 'selemene-admin' ? 'platform-admin' : trimmed
}

/**
 * cf_access.rs `roles_from_cf_groups` — map each group, keep only supported
 * roles (BTreeSet → sorted, deduped), default to `viewer` when empty.
 */
export function rolesFromCfGroups(groups: string[] = []): Role[] {
  const roles = new Set<Role>()
  for (const group of groups) {
    const mapped = mapCfGroupToRole(group)
    if ((SUPPORTED_ROLES as readonly string[]).includes(mapped)) {
      roles.add(mapped as Role)
    }
  }
  if (roles.size === 0) roles.add('viewer')
  return [...roles].sort()
}

/**
 * cf_access.rs `role_values_for_identity` — the fail-closed backend mapping.
 *
 * Access rule groups are NOT reliable authorities for role assignment (their
 * names are policy labels, not IdP group claims). So `platform-admin` is
 * granted only by an EXACT, case-insensitive match against the configured
 * `CF_PLATFORM_ADMIN_EMAILS` allowlist — after signature/issuer/audience
 * validation has already succeeded upstream. An unmatched identity remains a
 * viewer, regardless of what the `groups` claim contains. The allowlist is
 * optional: absent/empty → no one is platform-admin.
 *
 * NOTE: the parity helpers `mapCfGroupToRole` / `rolesFromCfGroups` above
 * preserve Selemene's group→role shape for SQL/role-storage use, but this
 * production identity path deliberately does NOT trust them for elevation.
 */
export function resolveRoles(
  identity: Pick<CfIdentity, 'email' | 'groups'>,
  platformAdminEmails?: string,
): Role[] {
  const email = identity.email.trim().toLowerCase()
  const isPlatformAdmin = (platformAdminEmails ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(email)

  if (isPlatformAdmin) return ['platform-admin']

  // Fail-closed: unmatched identities remain viewers. Group names never
  // elevate here.
  return ['viewer']
}

// ---------------------------------------------------------------------------
// Permission matrix + gating (cf_access.rs + admin.rs)
// ---------------------------------------------------------------------------

/**
 * cf_access.rs `permissions_for_roles` — parent-grant permission matrix.
 * Every principal holds `basic:access`; `admin`/`platform-admin` additionally
 * hold the parent grants (which, via `hasPermission` below, satisfy the leaf
 * `:read`/`:list` forms named by the living-archive and admin-web gates).
 */
export function permissionsForRoles(roles: Role[]): string[] {
  const permissions = new Set<string>(['basic:access'])
  const isAdmin = roles.includes('platform-admin') || roles.includes('admin')
  if (isAdmin) {
    for (const perm of [
      'admin:users',
      'admin:analytics',
      'admin:system:read',
      'admin:audit:list',
      'admin:audit:read',
    ]) {
      permissions.add(perm)
    }
  }
  return [...permissions].sort()
}

/**
 * admin.rs `has_permission` — parent-grant semantics, ported exactly.
 *
 *   - exact match, or the `admin:*` wildcard → granted;
 *   - `admin:users:*`         ← `admin:users`;
 *   - `admin:analytics:*` /
 *     `admin:system:*` /
 *     `admin:audit:*`         ← `admin:analytics`;
 *   - `admin:keys:*` /
 *     `admin:history-sync:*`  ← `admin:users`;
 *   - `admin:billing:read`    ← any `admin:billing:*`.
 *
 * Everything else is denied (fail-closed). Notably a plain viewer holding only
 * `basic:access` never satisfies `admin:analytics:read` — the ISC-162 / ISC-188
 * gate.
 */
export function hasPermission(permissions: readonly string[], required: string): boolean {
  if (permissions.includes(required) || permissions.includes('admin:*')) return true

  if (required.startsWith('admin:users:') && permissions.includes('admin:users')) return true

  if (
    (required.startsWith('admin:analytics:') ||
      required.startsWith('admin:system:') ||
      required.startsWith('admin:audit:')) &&
    permissions.includes('admin:analytics')
  ) {
    return true
  }

  if (
    (required.startsWith('admin:keys:') || required.startsWith('admin:history-sync:')) &&
    permissions.includes('admin:users')
  ) {
    return true
  }

  if (
    required === 'admin:billing:read' &&
    permissions.some((perm) => perm.startsWith('admin:billing:'))
  ) {
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Principal assembly + smoke-principal classification
// ---------------------------------------------------------------------------

/** Highest-authority role for a set of roles (smoke-principal classification). */
export function classifyPrincipal(roles: readonly Role[]): PrincipalClass {
  for (const candidate of ROLE_PRECEDENCE) {
    if (roles.includes(candidate)) return candidate
  }
  return 'viewer'
}

/**
 * Resolve a full Principal from a verified identity. This is the single entry
 * point routes use after authentication has succeeded: `authenticate()` proves
 * identity, `resolvePrincipal()` derives the authority for route gating.
 */
export function resolvePrincipal(
  identity: CfIdentity,
  platformAdminEmails?: string,
): Principal {
  const roles = resolveRoles(identity, platformAdminEmails)
  const permissions = permissionsForRoles(roles)
  return {
    email: identity.email.trim().toLowerCase(),
    sub: identity.sub,
    roles,
    permissions,
    principal: classifyPrincipal(roles),
  }
}
