# Tryllestavsprojekt: System Architecture

This document explains how the system components interact, where responsibility boundaries lie, and how data flows through the system. Diagrams are provided for architecture, user flows, and delivery phases.

---

## System Context Diagram

```mermaid
flowchart LR
  Kid["👧 Kid"]

  Wand["🪄 Magic Wand\n(NFC Tag Ledger)"]
  Kid -->|Carries| Wand

  Spot["🏛️ Magic Spot\n(Arduino Reader)"]
  Kid -->|Finds & Taps| Spot
  Spot -->|Writes Ledger Entry| Wand

  Website["🌐 Website PWA\n(Hunt Visualization)"]
  Kid -->|Scans Wand| Website
  Website -->|Reads Progress| Wand

  Organizer["👩‍💼 Hunt Organizer"]
  Assets["📄 Hunt Assets\n(JSON + Images)"]
  Organizer -->|Edits| Assets
  Assets -->|Static Delivery| Website
  Assets -->|Informs Spot IDs| Spot

  Website -->|Shows Map, Hints, Progress| Kid

  style Wand fill:#fff4e6
  style Spot fill:#e6f7ff
  style Website fill:#f0e6ff
```

---

## Responsibility Boundaries

### `arduino/` (Spot Writers)

**Owns:**

- Spot reader hardware (PN532 via I2C, or RC522 via SPI)
- Wand ledger writes: append spot IDE to yearly hunt record
- Metadata verification: check wand has valid `x-hunt-meta` before writing
- Device diagnostics: serial console, test reports, troubleshooting guides

**Does NOT own:**

- Hunt content (spot names, hints, images)
- Website presentation logic
- Record 1 configuration UI
- Browser compatibility

**Key decision:** Spot firmware is stateless. It knows only the current year and spotId (via serial config), not the hunt's total spot count or names. Validation and progress visualization are the website's job.

### `website/` (Hunt Companion App)

**Owns:**

- Wand scanning UX and error messages
- Hunt progress visualization (which spots collected, which missing)
- Hint and context presentation
- Browser compatibility messaging
- Record 1 toy configuration (Toybox UI)
- Hunt asset delivery (JSON + images)

**Does NOT own:**

- On-tag write logic
- Spot identification logic
- Metadata verification
- Hardware interaction

**Key decision:** Website is read-only for hunt data. It displays collected progress but never initiates writes to the wand. Writes come only from physical spot readers.

### Both Own (Shared Contract)

- **Hunt record MIME type:** `application/x-hunt:<YYYY>`
- **Spot mask format:** 8-byte big-endian bitmask
- **Record 1 preservation:** Never written to by hunt logic
- **Metadata record:** `x-hunt-meta` for wand authentication
- **Yearly hunt boundaries:** Each year is a separate record; no shared state

---

## Hunt Asset Delivery: Non-Technical Authorship

```mermaid
flowchart TB
  Org["👩‍💼 Organizer\n(Non-technical)"]

  Org -->|Edits| JSON["hunt.json\n- Year title\n- Year description\n- Year banner image\n- Spot metadata\n- Hints & collected text"]

  Org -->|Adds/replaces| Images["Hunt Images\n(images/hunt-banner.jpg)\n(images/1-garden.jpg)\n(images/2-tower.jpg)"]

  JSON --> Build["Build Pipeline\n(npm run build)"]
  Images --> Build

  Build --> Static["Static Website\nBundle\n(dist/)"]

  Static --> Web["Website Runtime\n(spotLoader.ts)"]

  Web -->|Fetch| HTTP["Web Request\nGET /hunts/2026/hunt.json"]

  HTTP -->|Load & Cache| Render["Render Hunt\n- Header with branding\n- Spot cards\n- Images & hints/collected text"]

  Render --> Display["👧 Kid Sees\n- Hunt branding\n- Spot hints (before)\n- Collected msgs (after)\n- Progress bar"]

  style JSON fill:#fff4e6
  style Images fill:#fff4e6
  style Build fill:#f0e6ff
  style Web fill:#f0e6ff
```

**Key point:** Non-technical organizers edit JSON and add images. No code changes needed. Website auto-discovers new hunt years at build time.

---

## Spot Write Flow (Detailed)

```mermaid
sequenceDiagram
  participant Kid
  participant Spot as 🏛️ Spot Reader
  participant Wand as 🪄 Wand
  participant SpotFW as Spot Firmware

  Kid->>Spot: Taps wand to reader pad
  activate SpotFW

  SpotFW->>Wand: Initiate NFC scan
  Wand-->>SpotFW: NDEF message (all records)

  SpotFW->>SpotFW: Extract x-hunt-meta record
  alt Metadata missing or invalid
    SpotFW->>Kid: ❌ "This wand is not initialized"
    SpotFW->>Wand: (No write)
  else Metadata valid
    SpotFW->>SpotFW: Search for x-hunt:YYYY record
    alt Record not found
      SpotFW->>SpotFW: Initialize spotsMask = 0x00...
    else Record found
      SpotFW->>Wand: Read existing MIME payload
      Wand-->>SpotFW: 8-byte spotsMask
      SpotFW->>SpotFW: Decode mask (big-endian)
    end

    SpotFW->>SpotFW: Check spot bit (spotId)
    alt Spot bit already set
      SpotFW->>Kid: ✓ "You already collected this!"
    else Spot bit not set
      SpotFW->>SpotFW: Set bit in mask
      SpotFW->>Wand: Write updated MIME record
      Wand-->>SpotFW: Confirm (NDEF write OK)
      SpotFW->>Kid: ✓ "You found the dragon's garden! 🎭"
    end
  end

  deactivate SpotFW
```

---

## Website Scan & Visualization Flow

```mermaid
sequenceDiagram
  participant Kid
  participant Website
  participant Browser as Browser NFC API
  participant Wand as 🪄 Wand

  Kid->>Website: Click "Scan Wand" button
  activate Website

  Website->>Browser: Request NFC scan
  activate Browser

  Website->>Kid: "Hold wand to phone"

  Kid->>Wand: Hold wand to device
  Browser->>Wand: NFC RF field (read mode)
  Wand-->>Browser: NDEF message (all records)
  Browser-->>Website: NDEF records array

  deactivate Browser

  Website->>Website: Parse NDEF records
  Website->>Website: Extract all MIME records

  loop For each MIME record
    alt Type is "x-hunt:YYYY"
      Website->>Website: Decode 8-byte spotsMask
      Website->>Website: Build bit array (spots collected)
    else Type is "x-hunt-meta"
      Website->>Website: Extract owner name, creation year
    else Type is "uri"
      Website->>Website: Store as wand link
    end
  end

  Website->>Website: Load hunt.json files (from static cache)
  Website->>Website: Render hunt views for each discovered year
  Website->>Kid: Display collected/missing spots, hints, progress bar

  deactivate Website
```

---

## Multi-Year Wand: Data Coexistence

One wand contains multiple hunt years:

```mermaid
flowchart TB
  Wand["🪄 Wand (NTAG216)"]

  R1["Record 1\nURI to website"]
  R2["Record 2\nx-hunt-meta\n(2026, Alice)"]
  R3["Record 3\nx-hunt:2025\n(4 spots collected)"]
  R4["Record 4\nx-hunt:2026\n(2 spots collected)"]

  Wand --> R1
  Wand --> R2
  Wand --> R3
  Wand --> R4

  Website["🌐 Website\non scan"]
  Website -->|Discover all years| Wand
  Website -->|Show 2025 progress| R3
  Website -->|Show 2026 progress| R4
  Website -->|Display owner info| R2

  Website -->|Load from hunt.json| Hunts["Hunt Definitions\n2025/hunt.json\n2026/hunt.json"]
  Website -->|Render| UI["Two hunt views\nside-by-side\nor tabs"]

  style R1 fill:#ffe6e6
  style R2 fill:#e6f7ff
  style R3 fill:#e6ffe6
  style R4 fill:#e6ffe6
```

**Key:** Records are discovered by MIME type and year, not by position. A wand with 10 years of hunts still works perfectly — website fetches all `x-hunt:*` records and loads corresponding year metadata from JSON.

---

## Record Layout & Byte Budget

Typical wand over 10 years of hunts:

```
Total writable space (assumption): ~888 bytes

Record 1 (URI):
  NDEF TLV overhead: ~12 bytes
  Payload: "https://example.com" (~20–40 bytes)
  Subtotal: ~35 bytes

Record 2 (x-hunt-meta):
  NDEF TLV overhead: ~12 bytes
  Payload: 2 bytes (year) + 1 byte (length) + ~6 bytes (owner name "Alice")
  Subtotal: ~22 bytes

Records 3–13 (10 years of hunts, one per year):
  Each: NDEF TLV (~10 bytes) + 8-byte payload = ~18 bytes per year
  Subtotal: 10 × 18 = ~180 bytes

Total: 35 + 22 + 180 = ~237 bytes used
Remaining: ~651 bytes free (for future expansion)
```

This leaves ample room for:

- Metadata future extensions (e.g., per-spot achievement data)
- Additional user NFC records
- Larger owner names or wand descriptions

---

## Responsibility Boundary: Record 1

Record 1 is **user-owned NFC space**. Hunt logic never touches it.

```
┌─────────────────────────────────────────┐
│ Record 1: User NFC Action               │
│ ─────────────────────────────────────── │
│ Examples:                               │
│  • Open website link                    │
│  • Share contact info                   │
│  • Emergency info (lost wand)           │
│  • School project data                  │
└─────────────────────────────────────────┘
       ↑ RESERVED ↑
       NEVER written by hunt internals
       Configurable via Toybox UI

┌─────────────────────────────────────────┐
│ Records 2–N: Hunt Data                  │
│ ─────────────────────────────────────── │
│ • Metadata (x-hunt-meta)                │
│ • Yearly hunts (x-hunt:YYYY)            │
│ ─────────────────────────────────────── │
│ Changes only via spot writers           │
│ Read by website (display only)          │
└─────────────────────────────────────────┘
```

**Why?** A child should be able to:

1. Tap a wand on a spot and collect (hunts write only to records 2+)
2. Scan the wand on website and see progress (website reads records 2+)
3. Configure record 1 with a personal NFC action via Toybox (website writes record 1 only)
4. Never have their personal link overwritten by hunt logic

---

## Wand Initialization: Blank → Official Wand

When a child gets a blank tag and scanst it on the website Toybox UI:

```mermaid
sequenceDiagram
  participant Kid
  participant Website
  participant Browser as Browser NFC API
  participant BlankTag as Blank NTAG216

  Kid->>Website: Open Toybox "Initialize New Wand"
  Kid->>Website: Enter owner name (e.g., "Alice")
  Kid->>Website: Click "Tap wand to initialize"

  Website->>Browser: Begin NFC write
  Kid->>BlankTag: Hold blank tag to device

  Browser->>BlankTag: Write NDEF message:
  note over Browser: Record 1: URI (website link)<br/>Record 2: x-hunt-meta (2026, "Alice")

  BlankTag-->>Browser: Write confirm (OK)
  Browser-->>Website: Success

  Website->>Kid: ✓ "Wand initialized! You're ready to hunt."

  note over BlankTag: Tag now contains:<br/>Record 1: Website link<br/>Record 2: Metadata (official wand)<br/>No hunt records yet (will be added by spots)
```

**After initialization:** Wand is "official" (has metadata) and can be written to by spot readers.

---

## Error Handling & Safety

### Guard Conditions

Spot firmware includes these safety checks:

1. **Metadata must be present**
   - If `x-hunt-meta` missing → refuse write
   - Prevents writing to random tags

2. **Data loss prevention**
   - If existing NDEF cannot be fully read → probe blank pages
   - If pages are non-blank but unreadable → refuse write
   - If pages are blank → safe to initialize
   - Prevents transient read failures from clearing collected spots

3. **MIME record validation**
   - If year is outside expected range (1900–2100) → skip
   - If spot ID is outside 1–64 → reject
   - If payload is not exactly 8 bytes → malformed; don't write

### Website Error Handling

1. **Browser NFC not supported**
   - Display friendly message
   - Suggest alternative devices/browsers

2. **Wand not found after timeout**
   - Cancel gracefully
   - Offer retry

3. **Wand metadata missing**
   - Display: "This wand isn't initialized. Use Toybox first."

4. **Malformed hunt record**
   - Log to console
   - Display: "Some hunt data is unreadable. Contact support."

---

## Scalability & Future Evolution

### Hunt Size Limits

| Limit               | Value     | Notes                                                          |
| ------------------- | --------- | -------------------------------------------------------------- |
| Spots per year      | 64        | 8-byte bitmask limit; could expand to 128 with 16-byte payload |
| Years on one wand   | ~10–15    | With 888-byte budget and ~18–22 bytes per year                 |
| Hunt organizers     | Unbounded | Static JSON; no server bottleneck                              |
| Concurrent scanners | Unbounded | Tags handle multiple readers; no sync issues                   |

### Potential Future Extensions

**Without changing the core format:**

- Larger metadata (e.g., wand decoration data, achievement badges)
- Multi-language hunt descriptions in JSON
- Spot-level achievements or collectibles (stored in website, keyed by wand metadata)

**With format evolution (if needed post-launch):**

- Expand bitmask to 16 bytes (128 spots per year)
- Add per-spot achievement metadata to MIME payload
- Support hierarchical spot groups (e.g., "Chapter 1: Spots 1–10")

See [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md#version--evolution-rules) for format evolution rules.

---

## References

- **On-tag protocol details:** [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md)
- **Build & deployment:** [docs/05-BUILD-AND-DEPLOY.md](05-BUILD-AND-DEPLOY.md)
- **Vision & design principles:** [docs/02-VISION-AND-PURPOSE.md](02-VISION-AND-PURPOSE.md)
- **Code references:**
  - Website NFC: `website/src/composables/useNfc.ts`
  - Spot firmware: `arduino/NFC_Basic/NFC_Basic.ino`
  - Hunt asset loading: `website/src/utils/spotLoader.ts`
