# Tryllestavsprojekt Schematics

This document visualizes the current intended system shape and delivery sequence.

## System Context

```mermaid
flowchart LR
  Kid[Kid] -->|Carries| Wand[Magic wand\nNFC tag ledger]
  Kid -->|Finds and taps| Spot[Magic spot\nArduino NFC writer]
  Spot -->|Writes collectible entry| Wand

  Kid -->|Scans wand| PWA[Website companion]
  PWA -->|Reads progress| Wand
  PWA -->|Configures record 1 toys| Wand
  PWA -->|Shows map progress and hints| Kid

  Organizer[Hunt organizer] -->|Edits hunt assets| Assets[Hunt JSON + Images]
  Assets -->|Static delivery| PWA
  Organizer -->|Configures spots| Assets

  Assets -->|Informs spot IDs| Spot
```

## Hunt Asset System

```mermaid
flowchart TB
  Org[Hunt Organizer<br/>Non-technical user]

  Org -->|Edit hunt.json| JSON["hunt.json<br/>- Year title<br/>- Year description<br/>- Year banner image<br/>- Spot metadata<br/>- Hints & collected text"]

  Org -->|Add/replace| Images["Hunt Images<br/>images/hunt-banner.jpg<br/>images/1-name.jpg<br/>images/2-name.jpg"]

  JSON --> Build["Build Pipeline<br/>npm run build"]
  Images --> Build

  Build --> Static["Static Website<br/>dist/ folder<br/>Contains all hunt data"]

  Static --> Web["Website Runtime<br/>spotLoader.ts"]

  Web -->|Fetch| HTTP["fetch('/hunts/2026/hunt.json')"]
  HTTP -->|Load & cache| Render["Render hunt header<br/>+ spot cards<br/>with images"]

  Render -->|Show to kid| Display["Kid sees<br/>Hunt branding<br/>Spot hints or<br/>collected messages<br/>Progress visualization"]
```

## Hunt Data Flow (Year View)

```mermaid
sequenceDiagram
  participant O as Organizer
  participant Ed as Text Editor
  participant FS as File System
  participant Build as npm build
  participant Web as Website
  participant Kid as Kid

  O->>Ed: Edit hunts/2026/hunt.json
  O->>FS: Add images/ files

  O->>Build: npm run build
  Build->>FS: Bundle assets into dist/
  Build->>Build: Website ready

  Kid->>Web: Visit website
  Web->>Web: Detect available years
  Web->>FS: fetch('/hunts/2026/hunt.json')
  FS-->>Web: Return hunt metadata + spots

  Web->>Web: Render hunt header<br/>with banner image
  Web->>Web: Render spot cards<br/>with images & hints/collected text
  Web-->>Kid: Display hunt progress
```

## Hunt Asset Folder Structure

```mermaid
graph TB
  Website["website/"]
  Public["public/"]
  Hunts["hunts/"]
  H2026["2026/"]
  Images2026["images/"]
  H2025["2025/"]
  Images2025["images/"]

  Website --> Public
  Public --> Hunts
  Hunts --> H2026
  Hunts --> H2025

  H2026 --> Hunt2026["hunt.json<br/>(Year branding + spots)"]
  H2026 --> Images2026
  Images2026 --> BannerImg["hunt-banner.jpg"]
  Images2026 --> Spot1["1-garden.jpg"]
  Images2026 --> Spot2["2-tower.jpg"]

  H2025 --> Hunt2025["hunt.json"]
  H2025 --> Images2025

  style Hunt2026 fill:#e6f7ff
  style Hunt2025 fill:#e6f7ff
  style BannerImg fill:#fff4e6
  style Spot1 fill:#fff4e6
  style Spot2 fill:#fff4e6
```

## Hunt JSON to Render Mapping

```mermaid
graph LR
  JSON["hunt.json<br/>{<br/>year: 2026,<br/>title: Dragon's Quest,<br/>image: images/hunt-banner.jpg,<br/>spots: {<br/>1: {<br/>name: Dragon's Garden,<br/>hint: ...,<br/>collectedText: ...,<br/>image: images/1-garden.jpg<br/>}<br/>}<br/>}"]

  Parser["Website Loads<br/>spotLoader.ts<br/>- loadHunts()<br/>- getHuntMetadata()<br/>- getSpot()"]

  Render["Rendering Components<br/>huntHeader.ts<br/>- Hunt title + image<br/>- Year label<br/><br/>spotCard.ts<br/>- Spot name<br/>- Hint OR collected text<br/>- Spot image<br/>- Location"]

  Display["Kid's View<br/>Hunt Header<br/>with branding<br/><br/>Spot Cards<br/>Hint/Collected state<br/>with images<br/><br/>Progress bar<br/>X of Y collected"]

  JSON --> Parser
  Parser --> Render
  Render --> Display
```

## Responsibility Boundaries

```mermaid
flowchart TB
  subgraph Website[website]
    ReadWand[Read wand ledger]
    Viz[Visualize collected/missing spots]
    Hints[Render hints]
    Toybox[Record 1 toy configurator]
    Compat[Browser compatibility and user messaging]
  end

  subgraph Firmware[arduino]
    SpotID[Spot identity and year namespace]
    WriteLedger[Append unique spot ID to yearly list]
    DeviceDiag[Diagnostics and deployment verification]
  end

  subgraph Guidance[Project guidance]
    Vision[VISION.md]
    Agents[AGENTS.md]
    Instr[project-vision.instructions.md]
  end

  subgraph WandRules[Wand record rules]
    FreeR1[Record 1 user free-write]
    HuntRAny[Hunt records in any order]
    MimeKey[MIME plus year key for discovery]
  end

  ReadWand --> Viz
  ReadWand --> Hints
  Toybox --> FreeR1
  SpotID --> WriteLedger
  WriteLedger --> HuntRAny
  ReadWand --> MimeKey
  MimeKey --> HuntRAny
  FreeR1 -.reserved.-> ReadWand
  Vision --> ReadWand
  Vision --> WriteLedger
  Agents --> Instr
```

## Hunt Interaction Flow

```mermaid
sequenceDiagram
  participant K as Kid
  participant S as Magic Spot (Arduino)
  participant T as Wand NFC tag
  participant W as Website

  K->>S: Tap wand at city spot
  S->>T: Write "collected spot" event
  T-->>S: Write complete
  S-->>K: Physical success feedback

  K->>W: Scan wand in website
  W->>T: Read hunt ledger records
  T-->>W: Return collected entries
  W-->>K: Show collected spots and missing-spot hints
```

## Seasonal Continuity

```mermaid
flowchart LR
  Y2026[Hunt 2026 spots] --> WandLedger[Wand ledger\nMulti-year entries]
  Y2027[Hunt 2027 spots] --> WandLedger
  Y2028[Hunt 2028 spots] --> WandLedger

  WandLedger --> View[Website reads all years]
  View --> Split[Show progress per year\nand combined history]
```

## Wand Ledger Data Model

```mermaid
flowchart TB
  R1[Record 1\nUser toy action] --> EX1[URL, text, or common NFC action]

  H1[Hunt record\nMIME: app/vnd.tryllestav.hunt.year-2026\nBytes: [64-bit mask]]
  H2[Hunt record\nMIME: app/vnd.tryllestav.hunt.year-2027\nBytes: [64-bit mask]]
  H3[Hunt record\nMIME: app/vnd.tryllestav.hunt.year-2028\nBytes: [64-bit mask]]

  Note1[Physical order may vary]
  Note2[Website discovers by MIME and year]
  Note3[Spot appends only when ID is missing]

  H1 --> Note1
  H2 --> Note1
  H3 --> Note1
  Note1 --> Note2 --> Note3
```

## Website Architecture (Vue 3)

```mermaid
graph TB
  IndexHTML["index.html<br/>Root entry point<br/>div#app"]

  Main["src/main.ts<br/>Bootstrap Vue 3<br/>createApp & mount"]

  AppVue["App.vue<br/>Root component<br/>NFC scan & write<br/>Hunt progress<br/>Record 1 toy config"]

  Utils["src/utils/<br/>spotLoader.ts<br/>Fetch hunt JSON<br/>Cache hunts by year"]

  Components["src/components/<br/>Planned:<br/>HuntHeader.vue<br/>SpotCard.vue<br/>ProgressBar.vue"]

  Style["src/style.css<br/>Global styles<br/>Component theme"]

  HuntJSON["public/hunts/[YEAR]/<br/>hunt.json<br/>+ images/"]

  IndexHTML --> Main
  Main --> AppVue
  AppVue --> Utils
  AppVue --> Components
  AppVue --> Style
  Utils --> HuntJSON

  style AppVue fill:#e6f7ff
  style Main fill:#fff4e6
  style Utils fill:#f0f9ff
  style Components fill:#f0f9ff
```

## Vue 3 Component Hierarchy

```mermaid
graph TD
  App["App.vue<br/>(root)<br/>Manages state:<br/>isScanning<br/>isWriting<br/>huntYears<br/>collectedSpots"]

  NFC["NFC Scanning<br/>startScan()<br/>stopScan()<br/>Reads MIME records<br/>Parses hunt data"]

  Render["Hunt Rendering<br/>(future components)<br/>HuntHeader.vue<br/>SpotCard.vue<br/>LeaderProgress.vue"]

  Config["Record 1 Config<br/>toyAction<br/>toyPayload<br/>writeToy()"]

  App --> NFC
  App --> Render
  App --> Config
```

## Website Build & Deployment

```mermaid
graph LR
  TS["TypeScript<br/>*.ts, *.vue files"]
  Vite["Build: npm run build<br/>Vite plugin: @vitejs/plugin-vue<br/>TSC type check"]
  Dist["dist/<br/>Bundled app<br/>+ hunt.json<br/>+ images"]

  TS --> Vite
  Vite --> Dist

  style Vite fill:#fff4e6
```
