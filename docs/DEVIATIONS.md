# CERS Canonical Deviation Log

## DEV-001 — Portal Retained as Active Operational Surface

**Date logged:** 2026-04-07
**Owner approval:** James Huson / Lake Area LLC
**Severity:** Tracked deviation — not a defect

### Description

The base engineering spec (§4.2, §36) defers portal implementation until all
engine-first steps are complete. The build session rules reinforce this.

However, `portal/` is retained in the repo because the California-base engine
was deployed to production prior to the extension build phase. The portal is
currently live and serving the California-base engine path at the production
droplet.

### Current State

- Portal is live on the old California-base snapshot.
- Extension work is in progress against the same repo.
- Portal will be updated once the extension build is closed to pick up Texas
  pack support and improved interface workflow.

### Exclusion from Closure Claims

This deviation is explicitly excluded from engine-first and extension closure
audit claims. The portal is a retained production surface, not an in-scope
deliverable for the current closure pass.

### Resolution Path

When extension build closure is confirmed by passing ci:gate, the portal will
be updated to integrate the extension resolver path. At that point this
deviation will be closed.
