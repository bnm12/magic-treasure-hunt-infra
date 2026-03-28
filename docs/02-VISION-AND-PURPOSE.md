# Tryllestavsprojekt: Vision & Purpose

## Purpose

Tryllestavsprojekt exists to create a magical city treasure hunt for kids, where physical NFC "magic spots" and a personal "magic wand" work together as one integrated experience.

The wand is **fully passive, offline, and decentralized**:
- No batteries, no charging, no WiFi required to collect
- All collected data lives on the wand itself
- The wand can be used year after year, accumulating hunts
- Hunting works anywhere, even with no internet connection

---

## North Star

Deliver a dependable "find, tap, collect" loop where:

1. A child discovers a magic spot in the city
2. The child activates the spot with their wand
3. The spot writes a collectible entry to the wand ledger
4. The child can scan the wand on the website to see progress and hints
5. The same wand works next year with new hunts — prior years kept intact

---

## Primary User Outcomes

We measure success by whether we achieve these outcomes for the people who use Tryllestavsprojekt:

1. **Kids experience playful, discoverable magic.** A child picks up a wooden wand and taps it at a spot plaque. The experience feels like real magic — not "I'm interacting with an app."

2. **Progress is owned by the child.** The wand ledger is decentralized and in the child's hands. No servers, no cloud sync, no fear of lost progress.

3. **Friendliness and guidance are built-in.** The website shows which spots are collected, which are missing, and hints for locations they haven't found yet.

4. **Multi-year continuity is seamless.** A child who participated in the 2025 hunt comes back in 2026 with the same wand, sees last year's collected spots, and joins the new year's hunt alongside them.

5. **The wand is a creative tool.** Record 1 (the wand's user-facing NFC record) stays free for kids to program with NFC actions: opening a website link, sharing info, embedding in school projects.

---

## Product Goals (Current Phase)

1. **Integrated hunt loop:** Spot activation writes proof of discovery to the wand ledger, immediately and offline.
2. **Decentralized data model:** No central server required for core collection progress.
3. **Website companion:** Scan wand → see collected spots, missing spots, contextual hints.
4. **Year-over-year continuity:** New yearly hunts coexist with previous years on one wand.
5. **Open wand utility:** Record 1 remains free for normal everyday NFC use outside the hunt.
6. **Website toybox:** Kids (or guardians) can configure record 1 for common NFC actions (opening a link, sharing contact info, etc.)

---

## Non-Goals (Current Phase)

1. **Cloud-first architecture** for core progression logic.
2. **Always-online gameplay** assumptions.
3. **Advanced anti-cheat systems** before baseline hunt reliability is proven.
4. **Complex social features** (accounts, friends, leaderboards) in initial releases.
5. **Mandatory app installation** — web-based interface is sufficient.

---

## Design Principles

### 1. Kid-First Clarity
Interactions should feel magical but remain understandable. A child should be able to:
- Pick up a wand and know it's something special
- Tap it at a spot and immediately get feedback
- Scan it on a website and understand their progress at a glance

### 2. Offline by Default
Wand data is the source of truth for progression. The system works:
- In airplane mode
- During internet outages
- In remote venues with no connectivity
- Without a central server

### 3. Reliability Before Spectacle
- Writes, reads, and feedback must be dependable
- NFC interactions are failure-prone; we design for robustness, not flash
- Data loss (losing collected spots) is the worst possible failure mode; we design to prevent it

### 4. Preserve Responsibility Boundaries
- `arduino/` owns spot write logic, spot identity, and hardware reliability
- `website/` owns hunt visualization, hint delivery, and UX feedback
- Shared contract: wand ledger schema, yearly identifiers, and record allocation rules

### 5. Keep Record 1 Free
The wand's first NFC record is reserved for user-defined actions. Hunt internals never touch it. This enables:
- Opening a website link
- Sharing contact or school project info
- Any future kid-defined NFC use case

### 6. Embrace Decentralization
Every design decision assumes:
- No backend services
- No synchronization server
- No accounts or authentication
- The wand **is** the database

---

## Success Signals

We'll know we're succeeding when:

1. A first-time child can collect at least one spot with minimal assistance
2. Spot collection survives disconnected operation and is visible on the website later
3. A wand used in year N still works in year N+1 without losing year N data
4. Hunt writes never overwrite record 1 user-defined content
5. Non-technical hunt organizers can edit hunt.json and add spot images without coding

---

## Milestone Framing

### Phase 1: Hunt Foundations
- Define wand ledger format and spot write protocol ✅
- Implement PN532 spot writer firmware ✅
- Build website scanning and visualization ✅

### Phase 2: Spot Network & Field Validation
- Deploy test spots in a real venue
- Gather field reliability data with actual wand + tag hardware
- Validate RF coupling at realistic tap distances
- Identify real-world failure modes and fix them

### Phase 3: Companion Web & Hint Delivery
- Website shows detailed progress, missing spots, contextual hints
- Hunt organizers can add per-spot hint sequences
- Kids see "you've collected 7 of 10 spots" progress

### Phase 4: Seasonal Continuity
- Validate multi-year hunt support in the field
- Build migration rules for evolving the data model if needed
- Support returning participants discovering prior years on their wand

### Phase 5: Extended Magic
- Toybox UX for configuring record 1 NFC actions
- Approve and document common use cases (link, contact, text)
- Build a simple UI for that configuration

### Phase 6: Wand Form & Manufacturing
- Finalize wooden wand design and manufacturing process
- Test ferrite rod coupling improvement in tip cavity
- Document build instructions for DIY and small-batch production

---

## Working Agreement

Before implementing a feature or making an architectural change, answer these questions:

1. **Which user outcome does this improve?** Connect to the list above.
2. **Which goal does it support?** Confirm it's not a non-goal.
3. **How does offline/decentralized behavior stay safe?** If adding networking, explain fallback.
4. **How does record 1 freedom stay protected?** Does this change touch record 1 write logic?
5. **What happens if the network is unavailable?** System should degrade gracefully.
6. **Is the on-tag data model still respected?** No new fields in the payload; stay compact.

---

## Resolved Architecture Decisions (v1.0)

### Wand Ledger Schema
- One hunt record per year containing only numeric spot IDs
- External hunt metadata (spot names, hints, images) resolved via `(year, spotId)` lookup in website
- Spot identity is year-scoped because each year has its own record

### Spot Write Behavior
- Writes are idempotent: add spot ID only if it's not already present in that year's list
- No server coordination; spot writer logic is entirely self-contained

### Tag Family & Storage
- Target: NTAG215/216 (small glass ampule form factor)
- Data model must stay compact (roughly 888 bytes total writable space)
- Hunt record payloads: exactly 8 bytes per year (64-bit spot mask)

### Year Rollover
- Managed by yearly firmware/config updates on spots
- Website discovers all present yearly records on wand; no server state
- Hunt records may appear in any physical order; never rely on index

### Record Allocation
- **Record 1:** Reserved for user NFC actions (URI link, contact share, etc.)
- **Hunt records:** One per year, keyed by MIME type + year metadata
- Parsing rule: discover by MIME type + year; never assume physical order

---

## Scope Boundaries

### `arduino/` Owns
- Spot reader hardware operation
- Spot identity and year namespace
- Append-only writes to yearly ledger
- Metadata verification (wand must have `x-hunt-meta`)
- Device diagnostics and deployment verification

### `website/` Owns
- Wand scan UX and error messaging
- Hunt visualization and progress rendering
- Hint presentation logic
- Browser compatibility messaging
- Record 1 toy configuration UI
- Hunt asset delivery (JSON + images)

### Both Own
- Wand ledger schema contract: `x-hunt:<YYYY>` MIME type + 8-byte spot mask
- Yearly hunt identifiers and spot ID ranges
- Record 1 preservation rules
- Wand metadata record format (`x-hunt-meta`)

---

## Documentation & References

- **On-tag data model details:** See [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md)
- **System flows & diagrams:** See [docs/04-SYSTEM-ARCHITECTURE.md](04-SYSTEM-ARCHITECTURE.md)
- **Build & deploy:** See [docs/05-BUILD-AND-DEPLOY.md](05-BUILD-AND-DEPLOY.md)
- **Wand hardware & physics:** See [docs/wand-design-and-purpose.md](wand-design-and-purpose.md)
- **How to keep docs in sync:** See [docs/MAINTENANCE.md](MAINTENANCE.md)
