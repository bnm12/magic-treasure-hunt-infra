---
description: "Use when changing the website application or its static hunt content."
applyTo: "website/**"
---

# Website ownership

Read the [system architecture](../../docs/reference/system-architecture-and-data-flows.md) and [wand contract](../../docs/reference/wand-nfc-data-contract.md) before changing NFC or entry-point behavior.

- The main website reads hunt state and writes only the user-controlled Record 1 action through Toybox.
- The management app owns initialisation, bulk writes, spot configuration, and deliberate debug operations.
- Discover `x-hunt:<YYYY>` records by type and year; preserve metadata, Record 1, prior years, and unrelated records.
- Keep browser NFC lifecycle coordination behind the shared per-entry session context; keep ledger parsing in the website store.
- Keep hunt content in `website/public/hunts/<YYYY>/` and follow its folder README.
