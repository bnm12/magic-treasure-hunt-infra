# Tryllestav: Magic Wands with NFC Powers

## Project Vision

**Tryllestav** is a treasure hunt experience built around hand-crafted wooden wands that kids can carry, personalize, and use year after year. Each wand contains an embedded NFC tag that:

1. **Tracks spell collections** at magic "spots" placed around a city or event venue
2. **Persists data offline** — no server, no app login, no batteries required
3. **Grows with the child** across multiple hunts and seasons
4. **Doubles as a creative NFC tag** for day-to-day use (opening links, sharing info, embedding in school projects)

The goal is pure inspiration: to create a magical physical object that sparks curiosity about technology and maker culture, turning a fantasy hobby into a bridge to STEM.

---

## The Wand: Physical Design

Each wand is **hand-turned wood on a lathe**, tailored to an individual child. The aesthetic draws from Harry Potter — tapered, organic, personal — but the magic is real RF technology.

### Form Factor

- **Material**: Hand-turned hardwood, custom-finished
- **Length**: Approximately 10–12 inches (25–30 cm)
- **Tip cavities**: A 2–3 mm bore, 20 mm deep, drilled into the tip during turning
- **Aesthetics**: No visible electronics, no batteries, no plastic casings — pure wand
- **Decentralized**: All gameplay data lives **on the wand tag**, not a cloud server

### The Embedded Tag

The **tip cavity houses a glass ampule NTAG216** tag (a tiny passive NFC chip sealed in glass):

- **Passive**: No power source needed. Energy comes wireless from a reader at each spot.
- **Durable**: Glass form factor survives years of tapping, dropping, and adventure
- **Sealed**: Protected behind a thin resin cap, invisible to the user
- **Persistent**: Collected spots stay on the wand forever unless deliberately erased

---

## How It Works: The Hunt Loop

### 1. Spots Around the City

Each magic spot is a physical plaque or sign at a location (mural, landmark, statue, fountain, etc.). Behind the plaque sits an NFC reader (PN532 module) connected to a small computer.

### 2. The Tap

A child walks up to a spot, reads the engraved rune or clue, and taps their wand against the reader pad. The wand is now **in range**.

### 3. The Ledger

When the wand touches the reader:

- The reader scans the wand's tag
- It finds the annual hunt record (e.g., "hunt-2025")
- It checks which spots the child has already collected
- It marks the new spot as collected
- It writes the updated ledger back to the wand

**All of this happens in ~1 second with no internet connection.**

### 4. The Reward

The reader displays feedback: a success message, a hint for the next spot, a collectible image, or a riddle. The child's wand now officially remembers this spot.

### 5. Year-Over-Year Progression

Next year, the same child returns with the same wand:

- The wand still has last year's hunt data
- New spots are added for the new year
- The child can see their multi-year progress
- Missing hunts become challenge quests ("You didn't visit the Fountain in 2024, but you did in 2025!")

---

## The Technology: Decentralized Offline Ledger

Unlike traditional apps, **the wand is the database**. Here's why that matters:

### No Cloud Dependency

- Hunts work even if the internet is down
- Events can run during connectivity blips without losing progress
- Kids own their data — it's literally on their wand
- No login servers, no account management, no privacy concerns

### No Battery in the Wand

- Your child's wand never needs charging
- It works today, tomorrow, and in 2035
- No fear of bricked hardware or forced obsolescence
- True inheritance: you can pass the wand to a sibling, and their hunts stack on top

### Compact Data Format

Each hunt year uses:

- A **MIME record** that identifies the year (`application/vnd.tryllestav.hunt.year-2025`)
- A **64-bit "spot mask"** — a tiny bitmap where each bit represents a collected spot

This means one wand can reliably hold **8+ years of hunt data** without running out of space.

---

## Hardware & Reader Setup

### The Reader at Each Spot

Each magic spot runs:

- **PN532 NFC module** (I2C interface, very sensitive to small tag antennas)
- **Wemos D1 Mini** microcontroller (a tiny, cheap ESP8266 board)
- **No internet connection required** during the hunt

The reader firmware is open-source and simple:

- Scan for wands tapping the reader
- Read and parse the wand's hunt record
- Check which spots are already collected
- Update the record with the new spot
- Write back to the wand
- Display feedback

### Why PN532?

We tested RC522 readers (cheaper, popular), but they cannot reliably detect the small glass ampule antenna on the wand. The **PN532 has superior RF sensitivity** and is the right choice for small implant-form tags.

### Tag Inside the Wand

- **NTAG216**: A tiny passive NFC chip sealed in borosilicate glass
- **Touch-to-tap** interaction: the wand must come within direct contact (1–2 mm) of the reader coil
- **Ferrite optimization**: A small soft ferrite rod placed behind the tag improves magnetic coupling (pending field validation)

---

## The Second Life: Day-to-Day Maker Play

After the hunt season, the wand becomes **a personal NFC tag the child owns**.

Possible uses:

- **Link to a homepage**: "Tap to learn about my wand's journey"
- **School projects**: Embed the wand NFC in a poster or installation art piece
- **Maker experimentation**: Kids write their own custom data to the wand using Arduino or a Web NFC app
- **Social sharing**: Tap a friend's phone to unlock a shared hunt record or secret message

This bridges fantasy play into actual maker culture — the wand transforms from a consumable prop into a canvas for creativity.

---

## The Website: Progress Tracking & Customization

While the wand stores all hunt data offline, the website serves as a **companion experience** for kids to review progress, compare with friends, and customize their wand.

### Features for Kids

#### Progress Tracker
- **Scan your wand** via your phone's browser using Web NFC (requires Android or compatible phones)
- **See your collected spots** across all hunt years
- **Track multi-year progress**: "You've visited 12 spots in 2024 and 8 in 2025"
- **Visual hunt map**: See which spots you've found and which remain
- **Hints and lore**: Read the story and backstory of each spot you've visited
- **Compare with friends**: Show a friend your wand's progress (via a shared link or direct scan)

#### The Toybox Panel
- **Customize Record 1**: Configure the URL your wand links to
- **Options**: personal site, a social media profile, a YouTube channel showing your wand story, or a maker portfolio
- **Safety**: The Toybox preserves your hunt records while letting you update your link
- **Instant activation**: Changes take effect immediately; no re-writes needed

### Kiosk Mode at Events

For events where phones may not have Web NFC support, **kiosk stations** are set up:

- A tablet or computer with a Web NFC reader at the event entrance or gathering point
- Kids can tap their wand to see their instant progress dashboard
- Large display shows their year-over-year achievements
- Encourages social sharing: "Look, I found 15 spots this year!"
- Optional instant badges or printable certificates

### Progressive Web App (PWA)

The website is built as a **Progressive Web App**:

- Installable on home screen (iOS and Android)
- Works offline for viewing cached hunt definitions
- No app store required; just open a link and install
- Minimal battery drain (static site, no background services)
- Updates automatically when online

### Hunt Definition & Metadata

The website serves the **hunt definitions** (what spots exist, where they are, what they're called):

- Hunt creators (event organizers, city cultural boards) manage JSON files with spot lists, images, and lore
- These are bundled into the website at build time — no backend database required
- Kids download the metadata once and hunt offline
- Multiple hunt years coexist: e.g., 2024 hunt (12 spots) and 2025 hunt (15 spots)

---

## Data Model & Record Structure

The wand stores **two types of records**:

### Record 1: User Link (Optional)

- A standard NFC URI record (clickable URL)
- Points to the hunt website, a personal blog, or a maker portfolio
- Preserved during hunts and free for the child to configure
- Can be updated via the website's "Toybox" panel

### Hunt Records (One Per Year)

- Media type: `application/vnd.tryllestav.hunt.year-<YYYY>`
- Payload: 8 bytes (64-bit spot mask, big-endian)
- Discovery: automatic by parsing the MIME type
- Support: up to 64 spots per year (one bit per spot ID)

Example:

- 2024: Hunt record with bits 1, 3, 7 set (visited 3 spots)
- 2025: New hunt record created; bits 2, 5, 8 set (visited 3 different spots)
- Both records coexist on the same wand, never overwritten

---

## Safety & Data Integrity

The firmware includes a **write safety guard** to prevent accidental data loss:

1. Before writing, the reader checks if it can read the existing hunt record
2. If the read succeeds: update the record by setting the new spot bit
3. If the read fails (RF glitch):
   - Probe the first 16 bytes of the wand's memory
   - If blank: safe to initialize a new record
   - If non-blank but unreadable: **refuse to write** (better to skip a tap than lose prior spots)

This means a child's collected spots survive even transient RF failures during a hunt.

---

## Roadmap & Future Extensions

### Current (v1.0)

- Basic treasure hunt: tap spots, collect bitmasks, verify offline
- Year-over-year data accumulation
- Wand reader firmware (PN532 + Arduino)
- Website for hunt definition and progress tracking

### Potential Future

- Custom wand initialization (pick your wand's "name" or power)
- Multi-player challenges (find hidden spots together, share clues)
- Wand leveling (unlock hints after collecting N spots)
- Maker station: kids reprogramme their wand's Record 1 at an event
- Mobile web app: scan your wand with your phone to see hunts and progress
- Extended tag lifetime: backup/restore wand data to USB or another medium

---

## The Philosophy: Ownership, Resilience, Imagination

**Every wand is unique.** It's not a mass-market item; it's a one-of-a-kind object a child carries, personalizes, and owns.

**The child owns the data.** Not a company, not a cloud, not a server. The wand is a physical ledger the child stewards.

**It survives disconnection.** Networks fail. Events get rained out. Power goes down. The wand works anyway.

**It bridges fantasy and technology.** A wooden object with invisible RF powers teaches kids that magic and science are not opposites — they're partners.

**It inspires makers.** Kids see a wand work with NFC and wonder, "How?" That curiosity is the seed of STEM.

---

## Technical Details

For implementation details, firmware, and schematics, see:

- [Schematics](./schematics.md) — system flow diagrams
- [Arduino README](../arduino/README.md) — hardware setup, reader firmware, libraries
- [AGENTS.md](../AGENTS.md) — code structure and module responsibilities
- [VISION.md](../VISION.md) — product principles and constraints
