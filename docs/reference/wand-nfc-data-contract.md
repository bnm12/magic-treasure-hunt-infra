# Wand NFC data contract

This is the canonical wire contract for wand NDEF data. The website and the
future ESP32 adapter use the same normalized ledger codec. The codec is a
semantic seam: Web NFC records are normalized before interpretation and output
is canonicalized, so a browser cannot promise byte-for-byte preservation of
the original NDEF serialization.

## Record ownership

The first logical NDEF record is **Record 1**. It belongs to the wand holder
and is preserved opaquely by hunt writes. Every representable field is carried
through the normalized form: `recordType`, `mediaType`, `id`, `encoding`,
`lang`, raw payload bytes, and nested records where the adapter exposes them.
Output may use a different NDEF serialization while preserving those
semantics.

Records after Record 1 are discovered by exact logical owned type. The
adapter-neutral form may carry the owned value directly in `recordType`;
Web NFC represents these same values as `recordType: "mime"` with the value in
`mediaType`:

| Exact logical type | Owner | Rule |
| --- | --- | --- |
| `x-hunt-meta` | Setup and spot writers | Validates dependent hunt writes |
| `x-hunt:<YYYY>` | Spot writers | One canonical record per hunt year |
| Anything else | Existing record owner | Preserve as an opaque record |

Record order is otherwise non-semantic. Distinct hunt years and opaque records
retain their relative order during canonical rewrites.

## Wire values

### Wand metadata

- Logical type: exactly `x-hunt-meta`
- Website Web NFC shape: `recordType: "mime"`, `mediaType: "x-hunt-meta"`
- Payload:
  - Bytes 0-1: creation year, unsigned 16-bit big-endian
  - Byte 2: owner-name length in UTF-8 bytes, from 0 through 127
  - Bytes 3 onward: owner name

The codec uses fatal UTF-8 decoding and requires the payload length to match
the length byte exactly. A valid metadata record is a deliberate validation
and write gate, not cryptographic authentication.

### Hunt records

- Logical type: exactly `x-hunt:<YYYY>`
- Website Web NFC shape: `recordType: "mime"`, `mediaType: "x-hunt:<YYYY>"`
- `<YYYY>` is exactly four ASCII decimal digits
- Payload: exactly 8 bytes, an unsigned 64-bit big-endian spot mask
- Spot IDs: 1 through 64, with bit index `spotId - 1`

Year syntax is the only structural year validation in the codec. Application
policy owns supported and current year ranges. Metadata creation years are
uint16 values and are not restricted to the application's hunt-year range.

Aliases such as `mediaType: "application/x-hunt:2026"` and
`x-hunt-invalid:<YYYY>` are unrelated opaque records. They are never
interpreted as hunt state.

## Read behavior

Reads are non-mutating. The codec returns safe valid progress together with
typed diagnostics. A malformed exact hunt record is excluded from progress and
diagnosed. A malformed, missing, duplicate, or conflicting metadata record
diagnoses the problem; safe valid hunt progress remains available.

Only records after Record 1 participate in metadata and hunt discovery. A
valid hunt record for a year is merged with other valid records for that year
using bitwise OR. Invalid exact payloads do not contribute bits.

## Write behavior

All website spot writes, including `unlockTestSpot`, require exactly one valid
`x-hunt-meta` record. Missing metadata, malformed metadata, duplicate metadata,
and conflicting metadata block the write. Metadata is never invented; wand
initialization is an explicit operation.

An intentional write canonicalizes the message:

1. Preserve Record 1 and all opaque records in normalized form.
2. Merge valid duplicate hunt records by bitwise OR.
3. Emit one canonical `x-hunt:<YYYY>` at the first valid record's position and
   remove remaining valid duplicates.
4. Preserve relative order of distinct years and opaque records.
5. Append a new hunt year when no valid record for that year exists.
6. For an exact `x-hunt:<YYYY>` with the wrong payload, rename it to
   `x-hunt-invalid:<YYYY>` while preserving its fields and payload. Keep valid
   same-year records; create a fresh valid record only when no valid same-year
   record exists.

Spot IDs outside 1 through 64 are explicit typed errors. A supplied capacity
limit is checked against the codec's deterministic normalized message-size
estimate before the adapter is called. Readback equivalence is semantic after
normalization, not exact serialized-byte equality.

Record 1 writes do not modify hunt state and do not require metadata. The main
website remains read-only for hunt state; management and debug writes use the
same codec gate.

## Staged implementation

The website and current ESP32 target now share the language-neutral fixture
source. The website uses the adapter-neutral TypeScript codec, while the
ESP32-C3 spot writer uses the portable pure C++ codec and generated native
conformance vectors. NFC session lifecycle coordination remains in
`nfcSession`; the raw Type-2 transport is an adapter around the codec's
bounded parse, write-plan, encode, and semantic-readback seams.

Authoritative fixtures live in
[`website/src/utils/test-fixtures/wand-ledger-codec.json`](../../website/src/utils/test-fixtures/wand-ledger-codec.json).

## Storage target

The design target is an NTAG216 glass ampoule with roughly 888 bytes of
writable capacity. Other tags are supported only when their capacity and
coupling permit a safe complete write.

## Invariants

1. Record 1 remains user-controlled and is never interpreted as hunt state.
2. Exact owned types are only `x-hunt:<YYYY>` and `x-hunt-meta`.
3. At most one canonical hunt record exists for each year after a rewrite.
4. Hunt payloads are exactly 8 bytes.
5. Hunt spot IDs are limited to 1-64.
6. Valid metadata is required before dependent spot writes.
7. Reads never repair or mutate a wand.
8. The core loop does not require a central server.

See [system-architecture-and-data-flows.md](system-architecture-and-data-flows.md)
for ownership and runtime flows, and
[`website/public/hunts/README.md`](../../website/public/hunts/README.md) for
the non-tag hunt content schema.
