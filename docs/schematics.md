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

  Organizer[Hunt organizer] -->|Sets yearly hunt data| HuntPack[Yearly hunt definitions]
  HuntPack --> Spot
  HuntPack --> PWA
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

  H1[Hunt record\nMIME: app/vnd.tryllestav.hunt\nYear: 2026\nSpot IDs: [s1,s3,s9]]
  H2[Hunt record\nMIME: app/vnd.tryllestav.hunt\nYear: 2027\nSpot IDs: [s2,s8]]
  H3[Hunt record\nMIME: app/vnd.tryllestav.hunt\nYear: 2028\nSpot IDs: []]

  Note1[Physical order may vary]
  Note2[Website discovers by MIME and year]
  Note3[Spot appends only when ID is missing]

  H1 --> Note1
  H2 --> Note1
  H3 --> Note1
  Note1 --> Note2 --> Note3
```

## Delivery Milestones

```mermaid
flowchart LR
  M1[Milestone 1\nDefine ledger schema and record allocation]
  M2[Milestone 2\nReliable spot-to-wand collection writes]
  M3[Milestone 3\nWebsite progress and hints visualization]
  M4[Milestone 4\nMulti-year compatibility and migration]
  M5[Milestone 5\nOptional everyday magic actions via record 1]

  M1 --> M2 --> M3 --> M4 --> M5
```
