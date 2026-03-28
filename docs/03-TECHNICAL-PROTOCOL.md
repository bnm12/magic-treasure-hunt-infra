# Tryllestavsprojekt: Technical Protocol Reference

This is the canonical specification for the wand ledger format, on-tag data structures, and protocol rules. **This document is the source of truth for any NFC data contract.** All code changes that affect the data model must update this document in the same change.

---

## On-Tag Record Structure

### Overview

The wand is an NTAG215 or NTAG216 tag. Records are stored as NDEF (NFC Data Exchange Format) messages. The tag layout is:

| Position        | Content                                  | Purpose                             |
| --------------- | ---------------------------------------- | ----------------------------------- |
| Record 1        | User-defined NFC action                  | Reserved; not touched by hunt logic |
| Record 2–N      | Hunt records (MIME type `x-hunt:<YYYY>`) | One per year, never reordered       |
| Metadata record | MIME type `x-hunt-meta`                  | Wand authentication and ownership   |

**Critical rule:** Hunt records may appear in any physical order on the tag. **Never rely on record index order for discovery.** Always discover by MIME type and year metadata.

---

## Record 1: User-Defined NFC Action

**Purpose:** Holds wand's user-facing feature (typically a URL link, but may also be text or standards-based MIME content).

**Supported formats written by the website Toybox UI:**

- NDEF URI record (RFC 3986)
- NDEF text record
- NDEF MIME record for selected formats such as vCard (`text/vcard`) and calendar invites (`text/calendar`)

**Examples:**

```
Type: "U" (URI)
Payload: "https://example.com/hunt"
```

```
Type: "T" (text)
Payload: "By moonlight and maplight, reveal the next clue."
```

```
Type: MIME "text/vcard"
Payload: VCARD contact bytes
```

**Constraints:**

- Always preserved by hunt logic
- Never written to by spot firmware (except during wand initialization)
- Writable by website Toybox UI
- Website initialization currently writes the companion website URL by default
- Must never be lost during hunt record updates

**Toy configurations (examples):**

- Open a website link
- Share contact info
- Open an app
- Trigger a text message

---

## Wand Metadata Record: `x-hunt-meta`

**Purpose:** Authentication and ownership tracking for official wands.

**MIME Type:** `application/x-hunt-meta`

**Payload Format (exact bytes):**

```
Bytes 0-1:   creationYear (big-endian unsigned 16-bit, e.g., 0x07 0xEA = 2026 AD)
Byte 2:      ownerNameLength (unsigned 8-bit, 0–127 for variable-length owner name)
Bytes 3–N:   ownerName (UTF-8 encoded string, variable length)
```

**Size budget:**

- Fixed: 3 bytes (year + length)
- Variable: up to 127 bytes for owner name
- Total: typically 28–40 bytes per wand

**Example:**

```
Hex: 07 EA 06 45 72 69 6B 61 21
Decoded:
  creationYear: 0x07EA = 2026 AD
  ownerNameLength: 0x06 = 6 bytes
  ownerName: "Erika!" (UTF-8)
```

**Initialization rule:**

- Written once during wand setup by website Toybox UI
- Spot firmware **refuses all MIME hunt writes** to tags lacking a valid `x-hunt-meta` record
- This is the **only authentication mechanism**; presence of valid metadata = "official wand"

**Website behavior:**

- On wand scan, fetch and display `x-hunt-meta` to show owner name and wand age
- Warn user if metadata is missing or malformed

---

## Hunt Records: `x-hunt:<YYYY>`

**Purpose:** Store collected spot IDs for a specific hunt year.

**MIME Type:** `application/x-hunt:<YYYY>`

Where `<YYYY>` is the 4-digit year (e.g., `application/x-hunt:2026`).

**Payload Format (exactly 8 bytes):**

```
Bytes 0-7: spotsMask (unsigned 64-bit big-endian integer)
```

**Spot-to-Bit Mapping:**

| Spot ID | Bit Index | Hex Mask                  |
| ------- | --------- | ------------------------- |
| 1       | 0         | 0x01                      |
| 2       | 1         | 0x02                      |
| 3       | 2         | 0x04                      |
| ...     | ...       | ...                       |
| 64      | 63        | 0x80 00 00 00 00 00 00 00 |

**Formula:** `bit_index = spot_id - 1`

Example: Spot 5 collected → set bit 4 → mask |= (1 << 4)

**Constraint:** Spot IDs are in range 1–64. IDs outside this range are invalid and rejected by firmware.

**Size:**

- Fixed payload: 8 bytes (64-bit)
- Total record size with NDEF TLV overhead: ~20–25 bytes per year
- Budget assumption: roughly 888 bytes total writable space; supports 10+ years per wand

**Example (spots 1, 3, 7 collected in 2026):**

```
MIME: application/x-hunt:2026
Payload (8 bytes): 0x4A 0x00 0x00 0x00 0x00 0x00 0x00 0x00
Decoded:
  Binary: 0000 0000 0000 0000 ... 0100 1010
  Bit 0 set (spot 1) ✓
  Bit 2 set (spot 3) ✓
  Bit 6 set (spot 7) ✓
```

---

## Hunt Asset Structure (Non-Tag)

Hunt metadata (names, hints, images) is **not stored on the tag**. Instead:

1. **Organizers edit:** `website/public/hunts/<YYYY>/hunt.json` and add images
2. **Website at build time:** Bundles JSON + images as static assets
3. **Website at runtime:** Fetches `(year, spotId)` → spot metadata via JSON lookup
4. **Spot IDs on tag:** Only numeric IDs (1–64), no strings or metadata

### hunt.json Schema

**Location:** `website/public/hunts/<YYYY>/hunt.json`

**Structure:**

```json
{
  "year": 2026,
  "title": "The Dragon's Quest",
  "description": "Help the dragons find their lost treasures...",
  "image": "images/hunt-banner.jpg",
  "imageAlt": "Dragons flying over the city",
  "spots": {
    "1": {
      "name": "The Dragon's Garden",
      "hint": "Look for the red door with a golden knocker.",
      "collectedText": "You found the magical garden! 🎭",
      "image": "images/1-garden.jpg",
      "imageAlt": "Lush green garden with stone statues",
      "location": "Central Park, North Gate"
    },
    "2": { ... }
  }
}
```

**Key invariants:**

- `year` must match folder name
- Spot IDs in `spots` keys must be numeric strings (`"1"`, `"2"`, ..., `"64"`)
- All JSON must be valid (validate with jsonlint.com)
- Images are referenced by relative path; bundled at build time

---

## Write Protocol

### Spot Firmware Behavior (Arduino)

When a spot writer (PN532 or RC522 sketch) encounters a wand:

1. **Read and validate metadata**
   - Fetch the `x-hunt-meta` record
   - If missing or malformed → **refuse all writes**
   - This ensures only initialized wands collect hunts

2. **Discover hunt record for this year**
   - Search all MIME records for type `x-hunt:<YYYY>` (where `<YYYY>` = current year)
   - If found → read existing spot mask
   - If not found → initialize empty mask (all zeros)

3. **Append spot ID (idempotent)**
   - Decode existing spot mask (64-bit big-endian)
   - If spot bit already set → skip (already collected)
   - If spot bit not set → set bit in mask
   - Re-encode mask as 8-byte big-endian

4. **Write updated record**
   - If new record → create MIME record `x-hunt:<YYYY>` with updated 8-byte payload
   - If updating existing record → replace entire record with new payload
   - Preserve all other records (record 1, metadata, prior years)

5. **Return feedback**
   - Display success/collected message via spot reader (LCD, speaker, LED, etc.)
   - Serial console logs entire transaction for diagnostics

### Example Write Transaction

**Before tap:**

```
Record 1: [URI to website]
Record 2: [Metadata: 2026, "Alice"]
```

**Spot 3 writer taps (2026 hunt):**

```
1. Read Record 2 → Metadata valid ✓
2. Search for MIME x-hunt:2026 → Not found
3. Initialize spotsMask = 0x0000000000000000
4. Spot 3 → Set bit 2 → spotsMask = 0x0400000000000000
5. Create new MIME record with payload 0x0400000000000000
6. Write back to tag
7. Display: "You found the dragon's garden!"
```

**After first tap:**

```
Record 1: [URI to website]
Record 2: [Metadata: 2026, "Alice"]
Record 3: [MIME x-hunt:2026, payload 0x0400000000000000]
```

**Another spot 7 writer taps (same year):**

```
1. Read Record 2 → Metadata valid ✓
2. Search for MIME x-hunt:2026 → Found Record 3
3. Read spotsMask = 0x0400000000000000 (bit 2 set)
4. Spot 7 → Set bit 6 → spotsMask = 0x4400000000000000
5. Replace Record 3 payload with 0x4400000000000000
6. Display: "You found the enchanted tower!"
```

**After second tap:**

```
Record 1: [URI to website]
Record 2: [Metadata: 2026, "Alice"]
Record 3: [MIME x-hunt:2026, payload 0x4400000000000000] ← Updated
```

### Data Loss Prevention

**Guard rule:** If existing NDEF cannot be fully read, firmware probes early user pages:

- If blank → safe to initialize
- If non-blank but unreadable → **refuse write** (prevents accidental global wipe)

This prevents transient read errors from clearing a wand's data.

---

## Website Scanning & Parsing

### Read Protocol (Browser)

When website scans a wand:

1. **Request Web NFC scan**
2. **Receive NDEF message** from browser API
3. **Extract all MIME records**
4. **For each MIME record:**
   - If type is `x-hunt:<YYYY>` → Parse 8-byte payload as big-endian bitmask
   - If type is `x-hunt-meta` → Parse year + owner name
   - If type is URI → Display as wand link

5. **Build hunt progress table**
   - For each discovered year, show collected spot count / total spots in JSON

### Example Parse

**Wand NDEF message contains:**

```
Record 1: [URI type] https://example.com
Record 2: [MIME x-hunt-meta] 07 EA 06 41 6C 69 63 65
Record 3: [MIME x-hunt:2025] 0x0F00000000000000 (bits 0-3 set = spots 1-4)
Record 4: [MIME x-hunt:2026] 0x4400000000000000 (bits 2, 6 set = spots 3, 7)
```

**Website decodes:**

```
Owner: "Alice"
Wand Age: 2026 - (current year) = [display in UI]
Hunts found: [2025, 2026]

2025 Hunt:
  Collected: 4 spots (IDs 1, 2, 3, 4)
  Total spots in hunt: (from hunt.json) 10
  Progress: 4/10

2026 Hunt:
  Collected: 2 spots (IDs 3, 7)
  Total spots in hunt: (from hunt.json) 8
  Progress: 2/8
```

---

## Data Model Invariants

These rules must **always** hold. Violations indicate a protocol error.

1. **One-year-per-record:** Only one `x-hunt:<YYYY>` record per year
2. **Max 64 spots:** Only bits 0–63 in spot mask are valid
3. **Big-endian encoding:** All multi-byte integers use big-endian (network byte order)
4. **Record 1 untouched:** Hunt logic never reads or writes to record 1
5. **Idempotent writes:** Same spot on same wand + year = no data loss
6. **Metadata required:** Spots refuse writes if `x-hunt-meta` is missing
7. **Immutable year:** Once a hunt record is created for a year, year suffix never changes
8. **Size constraints:** Entire wand data must fit in ~888 bytes; no payload exceeds 8 bytes for hunts

---

## Version & Evolution Rules

**Current version:** 1.0 (locked for launch)

**Backwards compatibility:**

- No legacy formats in production code (no dual-read paths)
- Until production wands exist in the field, assume strict v1.0

**If format must change (post-launch):**

1. The change must be documented here **first**
2. A new MIME type must be introduced (e.g., `x-hunt-v2:<YYYY>`)
3. Both firmware and website must support **both** old and new formats during transition
4. Migration guide must be written (how to upgrade old wands)
5. This document must be updated with dated change notes

---

## Testing & Validation Checklist

Before deploying a change that touches the on-tag format:

- [ ] Spot firmware reads existing wands without error
- [ ] Spot firmware correctly parses 8-byte spot mask (big-endian)
- [ ] Spot firmware correctly sets bit for new spot ID (1–64 range)
- [ ] Spot firmware preserves all other records (record 1, metadata, prior years)
- [ ] Website correctly parses all hunt records from a scanned wand
- [ ] Website displays collected and total spot counts correctly
- [ ] Website preserves Record 1 URI during all operations
- [ ] Multi-year wands show all years correctly (no data loss)
- [ ] Edge cases: blank wand, missing metadata, malformed payload → proper error handling

---

## References

- See [docs/04-SYSTEM-ARCHITECTURE.md](04-SYSTEM-ARCHITECTURE.md) for flows and diagrams
- See `website/src/composables/useNfc.ts` for website parsing implementation
- See `arduino/NFC_Basic/NFC_Basic.ino` for spot writer implementation
- See `website/public/hunts/README.md` for hunt.json schema details
