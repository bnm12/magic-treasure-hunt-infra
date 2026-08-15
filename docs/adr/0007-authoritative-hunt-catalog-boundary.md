---
status: accepted
---

# Authoritative hunt catalog boundary

Issue #21 confirmed a single hunt catalog boundary for static hunt assets.
The catalog centralizes validated and normalized discovery and stable indexes
so the main website and management app share one asset policy without changing
the wand-centered hunt loop.

## Decision

The hunt catalog owns validated and normalized hunt-asset discovery, URL rules,
and canonical hunt and spot indexes. It accepts hunts independently: a valid
hunt may enter the catalog when another hunt is rejected, while each rejected
hunt produces structured diagnostics for callers and organisers.

Catalog results and in-flight loads are cached for the browser session. An
explicit reload is available to discard the session view and fetch the current
asset state again. Canonical indexes are ascending by hunt year and spot ID;
user interfaces may project the hunt index newest-first without changing the
catalog order.

The catalog remains an asset-discovery boundary, not hunt-state storage. Wand
data remains authoritative for collected spots. The main website remains the
child-facing read/progress surface and writes only Record 1; the management
app remains responsible for setup, bulk writes, spot configuration, and
deliberate debug operations.

## Alternatives considered

- **Keep fetching, URL rewriting, validation, caching, and index derivation in
  each caller:** rejected because policies would drift and malformed or
  missing assets could be silently skipped.
- **Reject the entire catalog when one hunt fails:** rejected because one
  malformed hunt should not hide valid hunts, and structured per-hunt
  diagnostics are more useful to organisers.
- **Let each consumer choose its own index order:** rejected because callers
  would derive inconsistent hunt and spot indexes; presentation order belongs
  to the UI.
- **Use a central server or database as the catalog:** rejected because hunt
  content must remain static and organiser-editable while the core loop stays
  offline-friendly.
- **Make the catalog authoritative for collected hunt state:** rejected because
  the wand is the source of truth and the catalog only describes available
  hunt assets.
