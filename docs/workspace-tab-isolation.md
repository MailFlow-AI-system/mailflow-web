# Workspace tab isolation — local checkpoint

Phase 5 is in progress; this checkpoint does not certify all its acceptance criteria.

## Verified behavior

The `tabIsolation.spec.ts` suite uses two pages in the same browser context, real
authentication cookies, the Core fixture server and the isolated PostgreSQL database.

- Changing the durable preference in one tab does not override the explicit host in
  another tab, including after refreshing both tabs.
- Revoking membership in Northwind denies that tab after refresh without denying
  the independently authorized Acme tab.
- Logout in one tab causes the other tab to require login after refresh. After a
  different identity logs in, the old Acme host denies access instead of recovering
  the previous identity's workspace.
- These scenarios do not set a global active organization or call the global Mail
  repository.

Web lint and typecheck passed; all 266 unit tests passed. Core's complete check
passed with 162 tests, including mixed-identity concurrent context reads through the
restricted connection pool.

## Still required before closing phase 5

- Deterministically delayed responses during identity/workspace transitions.
- In-place focus/revalidation and stale cache checks, not only full-page refresh.
- Complete workspace browser regression suite on the final changes.

The development remote was fetched on 2026-10-06 and contains two new commits,
including DS 0.7.0 and avatar changes. This checkpoint remains on the phase 4 stack
with DS 0.6.0; those changes have not been rebased into this stack or validated here.

No deploy, push, DNS changes, shared production cookies, or external secrets were
changed. Phase 6 and real-environment rollout gates remain outstanding.
