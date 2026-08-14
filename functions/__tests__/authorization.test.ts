/**
 * T-088 — Authorization layer unit tests (role → permission, fail-closed).
 *
 * Ports the Selemene role/permission model to TS and locks it:
 *
 *   1. cf_access.rs  `map_cf_group_to_role` — `selemene-admin` → `platform-admin`.
 *   2. cf_access.rs  `roles_from_cf_groups` — supported-only, sorted, viewer default.
 *   3. cf_access.rs  `role_values_for_identity` — fail-closed email allowlist
 *      (`CF_PLATFORM_ADMIN_EMAILS`) is the ONLY backend authority for
 *      `platform-admin`; unmatched identities remain viewers.
 *   4. cf_access.rs  `permissions_for_roles` — parent-grant matrix.
 *   5. admin.rs      `has_permission` — parent-grant semantics
 *      (`admin:analytics:read` ← `admin:analytics`, wildcard, etc.).
 *   6. smoke-principal classification — highest-authority role precedence.
 *
 * The consent-bypass denial (ISC-154 / ISC-176) is asserted directly:
 * `platform-admin` permissions NEVER satisfy relationship consent — consent is
 * participant-state authority held in the relationships DAL, not a permission.
 */
import { describe, it, expect } from 'vitest'
import {
  classifyPrincipal,
  hasPermission,
  mapCfGroupToRole,
  permissionsForRoles,
  resolvePrincipal,
  resolveRoles,
  rolesFromCfGroups,
  type Role,
} from '../lib/authorization'

describe('mapCfGroupToRole (cf_access.rs)', () => {
  it('maps selemene-admin → platform-admin', () => {
    expect(mapCfGroupToRole('selemene-admin')).toBe('platform-admin')
  })
  it('passes every other group through unchanged (trimmed)', () => {
    expect(mapCfGroupToRole('support')).toBe('support')
    expect(mapCfGroupToRole('  viewer  ')).toBe('viewer')
    expect(mapCfGroupToRole('admin')).toBe('admin')
  })
})

describe('rolesFromCfGroups (cf_access.rs)', () => {
  it('filters duplicate, empty, and unsupported roles; sorts', () => {
    expect(
      rolesFromCfGroups(['selemene-admin', '', 'support', 'selemene-admin', 'bogus']),
    ).toEqual(['platform-admin', 'support'])
  })
  it('defaults to viewer when nothing maps to a supported role', () => {
    expect(rolesFromCfGroups(['bogus', ''])).toEqual(['viewer'])
  })
  it('returns viewer for an empty group list', () => {
    expect(rolesFromCfGroups([])).toEqual(['viewer'])
  })
})

describe('resolveRoles (cf_access.rs role_values_for_identity)', () => {
  it('requires an exact email allowlist match for platform-admin', () => {
    expect(
      resolveRoles({ email: 'Owner@Example.com', groups: ['selemene-admin'] }, 'owner@example.com'),
    ).toEqual(['platform-admin'])
  })
  it('unmatched identity remains a viewer (allowlist is the only authority)', () => {
    expect(resolveRoles({ email: 'other@example.com', groups: [] }, undefined)).toEqual(['viewer'])
    expect(
      resolveRoles({ email: 'other@example.com', groups: ['selemene-admin'] }, 'owner@example.com'),
    ).toEqual(['viewer'])
  })
  it('absent/empty allowlist → never platform-admin (fail-closed)', () => {
    expect(resolveRoles({ email: 'owner@example.com', groups: [] }, undefined)).toEqual(['viewer'])
    expect(resolveRoles({ email: 'owner@example.com', groups: [] }, '')).toEqual(['viewer'])
  })
  it('platform-admin promotion removes viewer and dedupes', () => {
    expect(
      resolveRoles(
        { email: 'owner@example.com', groups: ['viewer', 'selemene-admin'] },
        'owner@example.com',
      ),
    ).toEqual(['platform-admin'])
  })
  it('multi-entry allowlist matches case-insensitively with whitespace', () => {
    expect(
      resolveRoles(
        { email: 'second@example.com', groups: [] },
        ' first@example.com , SECOND@EXAMPLE.COM ',
      ),
    ).toEqual(['platform-admin'])
  })
})

describe('permissionsForRoles (cf_access.rs)', () => {
  it('always grants basic:access', () => {
    expect(permissionsForRoles(['viewer'])).toContain('basic:access')
  })
  it('admin/platform-admin hold the parent grants', () => {
    for (const role of ['admin', 'platform-admin'] as Role[]) {
      const perms = permissionsForRoles([role])
      expect(perms).toContain('admin:users')
      expect(perms).toContain('admin:analytics')
      expect(perms).toContain('admin:system:read')
      expect(perms).toContain('admin:audit:list')
      expect(perms).toContain('admin:audit:read')
    }
  })
  it('viewer does NOT hold admin parents', () => {
    const perms = permissionsForRoles(['viewer'])
    expect(perms).toEqual(['basic:access'])
  })
})

describe('hasPermission (admin.rs parent-grant semantics)', () => {
  const viewer = permissionsForRoles(['viewer'])
  const admin = permissionsForRoles(['admin'])
  const platformAdmin = permissionsForRoles(['platform-admin'])

  it('exact match', () => {
    expect(hasPermission(admin, 'admin:analytics')).toBe(true)
    expect(hasPermission(viewer, 'basic:access')).toBe(true)
  })

  it('admin:analytics:read is satisfied by the admin:analytics parent', () => {
    expect(hasPermission(admin, 'admin:analytics:read')).toBe(true)
    expect(hasPermission(platformAdmin, 'admin:analytics:read')).toBe(true)
  })

  it('viewer (basic:access only) is DENIED admin:analytics:read (ISC-162/ISC-188)', () => {
    expect(hasPermission(viewer, 'admin:analytics:read')).toBe(false)
  })

  it('admin:* wildcard satisfies any admin leaf', () => {
    expect(hasPermission(['admin:*'], 'admin:anything:read')).toBe(true)
  })

  it('admin:users:* ← admin:users; admin:keys:* ← admin:users', () => {
    expect(hasPermission(admin, 'admin:users:list')).toBe(true)
    expect(hasPermission(admin, 'admin:keys:list')).toBe(true)
  })

  it('admin:billing:read ← any admin:billing:*', () => {
    expect(hasPermission(['admin:billing:subscriptions:cancel'], 'admin:billing:read')).toBe(true)
    expect(hasPermission(viewer, 'admin:billing:read')).toBe(false)
  })

  it('unrelated required permission is denied', () => {
    expect(hasPermission(admin, 'admin:nonexistent:write')).toBe(false)
  })
})

describe('classifyPrincipal (smoke-principal precedence)', () => {
  it('orders platform-admin > admin > support > viewer', () => {
    expect(classifyPrincipal(['viewer', 'support', 'admin', 'platform-admin'])).toBe('platform-admin')
    expect(classifyPrincipal(['viewer', 'support'])).toBe('support')
    expect(classifyPrincipal(['viewer'])).toBe('viewer')
    expect(classifyPrincipal([])).toBe('viewer')
  })
})

describe('resolvePrincipal (single entry point)', () => {
  it('produces a viewer principal for an unmatched identity', () => {
    const principal = resolvePrincipal({ sub: 's', email: 'x@example.com', groups: [] })
    expect(principal.principal).toBe('viewer')
    expect(principal.roles).toEqual(['viewer'])
    expect(principal.permissions).toEqual(['basic:access'])
  })

  it('produces a platform-admin principal only via the allowlist', () => {
    const principal = resolvePrincipal(
      { sub: 's', email: 'owner@example.com', groups: ['selemene-admin'] },
      'owner@example.com',
    )
    expect(principal.principal).toBe('platform-admin')
    expect(hasPermission(principal.permissions, 'admin:analytics:read')).toBe(true)
  })

  it('normalizes email to lowercase in the principal', () => {
    const principal = resolvePrincipal({ sub: 's', email: 'Owner@Example.com', groups: [] })
    expect(principal.email).toBe('owner@example.com')
  })
})

describe('ISC-154 / ISC-176 — admin authority cannot bypass relationship consent', () => {
  it('no permission string exists that represents consent (consent is DAL state)', () => {
    // Consent is participant-state authority, not a permission: the permission
    // vocabulary must contain no `relationship:*` or `consent:*` grant that an
    // admin could hold to short-circuit the two-participant requirement.
    const admin = permissionsForRoles(['platform-admin'])
    const consentShaped = admin.filter((p) => p.includes('consent') || p.includes('relationship'))
    expect(consentShaped).toEqual([])
  })
  it('platform-admin permissions still do not satisfy a hypothetical consent gate', () => {
    const admin = permissionsForRoles(['platform-admin'])
    expect(hasPermission(admin, 'relationship:consent:override')).toBe(false)
  })
})
