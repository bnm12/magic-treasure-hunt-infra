# Wand NFC data contract

This is the canonical wire contract for wand NDEF data. The current format is strict v1.0. The wire values below are exact and are not aliases for an older MIME scheme.

## Record ownership

| Record | Owner | Rule |
| --- | --- | --- |
| Record 1 | Wand holder / Toybox | Preserve during hunt writes; the main website may write this user action |
| Wand metadata | Setup flow and spot writers | Validate before hunt writes |
| Hunt records | Spot writers | One record per hunt year |

Physical record order is non-semantic. Readers and writers discover records by record type and year, never by array position. Record 1 is protected by its user-facing type and ownership rule, not by assuming that it remains at a particular physical index. Implementations skip the user action by type, not by skipping the first array element.

## Wire values

### Wand metadata

- Record type: `x-hunt-meta`
- Payload:
  - Bytes 0-1: creation year, unsigned 16-bit big-endian
  - Byte 2: owner-name length in UTF-8 bytes, from 0 through 127
  - Bytes 3 onward: owner name

Metadata is valid only when the record type, payload length, year, length byte, and UTF-8 content are structurally valid.

Valid metadata is the deliberate write gate for spot collection. It is not cryptographic authentication. Open tinkering and manual reprogramming are part of the project design.

### Hunt records

- Record type: `x-hunt:<YYYY>`
- `<YYYY>` is the four-digit hunt year encoded in the record type.
- Payload: exactly 8 bytes, an unsigned 64-bit big-endian spot mask.
- Spot IDs: 1 through 64.
- Bit index: `spotId - 1`.

Example: collecting spots 1, 3, and 7 sets bit indexes 0, 2, and 6.

## Write algorithm

When a spot writer encounters a tag:

1. Read the complete NDEF message.
2. Find and validate `x-hunt-meta`.
3. If metadata is missing or malformed, refuse dependent hunt writes and report that setup is required.
4. Find `x-hunt:<current year>` by type.
5. Decode its 8-byte mask, or start from an empty mask when the record is absent.
6. Validate the configured spot ID.
7. Set the spot bit idempotently.
8. Preflight capacity when the reader can determine it.
9. Write the updated message while preserving Record 1, metadata, prior years, and unrelated records.
10. If capacity cannot be established or the write is only partly completed, report the exact partial result; never claim success for an unverified full write.

The write path must refuse when an existing tag cannot be read safely and is not demonstrably blank. A failed or ambiguous read must not be treated as an empty ledger.

## Read algorithm

The main website:

1. Requests a Web NFC scan.
2. Parses all NDEF records.
3. Finds `x-hunt-meta` and every `x-hunt:<YYYY>` record by type.
4. Decodes each 8-byte mask.
5. Loads matching static hunt assets from `website/public/hunts/<YYYY>/`.
6. Renders collected and missing spots.

The main website does not write hunt state. Toybox Record 1 writes and management operations are separate surfaces.

## Storage target

The design target is an NTAG216 glass ampoule with roughly 888 bytes of writable capacity. A hunt record is compact, but the full NDEF message also includes Record 1, metadata, and overhead. Other tags are supported only when capacity and coupling permit a safe complete write.

## Invariants

1. At most one hunt record exists for each year.
2. Hunt payloads are exactly 8 bytes.
3. Spot IDs are limited to 1-64.
4. Year is in the record type, not the hunt payload.
5. Physical record order is never used for discovery.
6. Record 1 remains user-controlled.
7. Hunt writes are idempotent.
8. Valid metadata is required before dependent spot writes.
9. No legacy dual-read branch is part of strict v1.0.

## Evolution

Any incompatible format change requires a new record type, an explicit migration plan, and coordinated firmware and website support. Until production migration requires it, v1.0 remains strict.

See [system-architecture-and-data-flows.md](system-architecture-and-data-flows.md) for the flows that consume this contract and [`website/public/hunts/README.md`](../../website/public/hunts/README.md) for the non-tag hunt content schema.
