---
description: How Tryllestavsprojekt documentation is organized and maintained.
---

# Documentation Structure

This file explains how Tryllestavsprojekt's documentation is organized and points to the maintance rules that keep it in sync.

---

## Documentation Organization

The project uses a **layered documentation approach** with each layer serving a distinct purpose:

### Layer 1: Project Understanding (START HERE)

**File:** [`docs/01-PROJECT-OVERVIEW.md`](../docs/01-PROJECT-OVERVIEW.md)

**Purpose:** What are we building? What components exist? What's the current state?

**For:**

- New contributors getting oriented
- Managers checking project status
- Overview of key components and responsibilities

**Maintains:** Project scope, component list, current status table

---

### Layer 2: Product Vision & Design

**File:** [`docs/02-VISION-AND-PURPOSE.md`](../docs/02-VISION-AND-PURPOSE.md)

**Purpose:** Why do we build this? What are the design principles? What are our constraints?

**For:**

- Deciding if a feature aligns with project goals
- Understanding design trade-offs
- Alignment checklist before implementing features

**Maintains:** Product goals, design principles, user outcomes, alignment rules

---

### Layer 3: Technical Protocol (SOURCE OF TRUTH)

**File:** [`docs/03-TECHNICAL-PROTOCOL.md`](../docs/03-TECHNICAL-PROTOCOL.md)

**Purpose:** Exact on-tag data format, MIME types, byte layouts, write protocol.

**For:**

- Firmware developers (writing to wands)
- Website developers (reading wands)
- Data validation and error handling

**Maintains:** Protocol version, MIME types, payload formats, byte layouts, constraints

⚠️ **This is the most critical document.** Changes here affect data integrity.

---

### Layer 4: System Architecture & Flows

**File:** [`docs/04-SYSTEM-ARCHITECTURE.md`](../docs/04-SYSTEM-ARCHITECTURE.md)

**Purpose:** How do components interact? What are the boundaries? What are the data flows?

**For:**

- Understanding system architecture
- Seeing responsibility boundaries
- Following data flows through the system

**Maintains:** Responsibility boundaries, system flows, diagrams, multi-year behavior

---

### Layer 5: Build & Deployment (HOW TO GET IT WORKING)

**File:** [`docs/05-BUILD-AND-DEPLOY.md`](../docs/05-BUILD-AND-DEPLOY.md)

**Purpose:** Hands-on Hackaday-style guide to building, testing, and deploying.

**For:**

- Setting up development environment
- Compiling and uploading firmware
- Deploying website
- Troubleshooting common issues

**Maintains:** Setup commands, wiring, build steps, deployment procedures, troubleshooting

---

### Layer 6: Maintenance Rules (KEEP DOCS IN SYNC)

**File:** [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md)

**Purpose:** How to keep all documentation in sync when code changes.

**For:**

- Every contributor making a code change
- PR reviewers checking doc updates
- Quarterly doc reviews

**Maintains:** Update rules, checklist, validation rules, cadence

---

## Specialized Documentation

### For Arduino Developers

| File                                                                                              | Purpose                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`arduino/README.md`](../arduino/README.md)                                                       | Setup, wiring, library installation, troubleshooting    |
| [`.github/instructions/arduino.instructions.md`](.github/instructions/arduino.instructions.md)    | Pattern conventions and best practices for Arduino code |
| [`docs/03-TECHNICAL-PROTOCOL.md#write-protocol`](../docs/03-TECHNICAL-PROTOCOL.md#write-protocol) | Exact write protocol algorithm                          |

### For Website Developers

| File                                                                                                         | Purpose                                              |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [`.github/instructions/vue-components.instructions.md`](.github/instructions/vue-components.instructions.md) | Vue component patterns and conventions               |
| [`website/public/hunts/README.md`](../website/public/hunts/README.md)                                        | Hunt asset (JSON) configuration guide for organizers |
| [`docs/04-SYSTEM-ARCHITECTURE.md#website-scan-flow`](../docs/04-SYSTEM-ARCHITECTURE.md#website-scan-flow)    | Website data flow on scan                            |

### For Hunt Organizers

| File                                                                  | Purpose                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| [`website/public/hunts/README.md`](../website/public/hunts/README.md) | How to edit hunt.json and add images (no coding required) |

### For Project Maintainers

| File                                                                                                         | Purpose                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [`AGENTS.md`](../AGENTS.md)                                                                                  | Repository structure, components, and architectural notes |
| [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md)                                                              | Doc update rules and validation checklist                 |
| [`.github/instructions/project-vision.instructions.md`](.github/instructions/project-vision.instructions.md) | Alignment checklist for all features                      |

---

## Documentation Entry Points

**If you're new:**

```
Start → docs/01-PROJECT-OVERVIEW.md
      → docs/05-BUILD-AND-DEPLOY.md (set up locally)
      → docs/02-VISION-AND-PURPOSE.md (understand design)
```

**If you're implementing a feature:**

```
Start → docs/02-VISION-AND-PURPOSE.md (working agreement section)
      → Related detailed docs (03, 04, or 05)
      → .github/instructions/ for patterns
      → docs/MAINTENANCE.md (doc update checklist)
```

**If you're debugging NFC data:**

```
Start → docs/03-TECHNICAL-PROTOCOL.md (exact byte formats)
      → arduino/README.md (firmware troubleshooting)
      → docs/04-SYSTEM-ARCHITECTURE.md (data flows)
```

**If you're reviewing a PR:**

```
Start → docs/MAINTENANCE.md (doc update checklist)
      → Related docs (did the change match the doc update?)
      → Code changes (does code match both)?
```

---

## Key Principles

### 1. Single Source of Truth

Each fact lives in **one** primary document. Other docs reference it.

For example:

- **On-tag protocol** → `docs/03-TECHNICAL-PROTOCOL.md` (primary)
  - Architecture doc references: "See protocol doc for MIME types"
  - Build doc references: "See protocol doc for byte layout"

### 2. No Duplication

If you find the same fact in two docs, delete it from one and add a reference.

Good: "The MIME type is documented in [docs/03-TECHNICAL-PROTOCOL.md](docs/03-TECHNICAL-PROTOCOL.md)."  
Bad: "The MIME type is `x-hunt:YYYY`. For details, see docs/03-TECHNICAL-PROTOCOL.md."

### 3. Synchronized Updates

A code change **always** requires a doc update in the same commit/PR. See [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md) for rules.

### 4. Clear Purpose

Each doc has a **single, clear purpose**. Mixing purposes makes docs hard to maintain.

---

## Deprecated Documentation

### `VISION.md` (Root Level)

This file is deprecated in favor of [`docs/02-VISION-AND-PURPOSE.md`](../docs/02-VISION-AND-PURPOSE.md).

It contains the same content but is kept for backwards compatibility. **Treat the `docs/` version as the source of truth.**

Update rule: Changes go to `docs/02-VISION-AND-PURPOSE.md` first. Sync to `VISION.md` if needed for backwards compat.

---

## How to Update Docs

### Add a New Feature or Component

1. Update [`docs/01-PROJECT-OVERVIEW.md`](../docs/01-PROJECT-OVERVIEW.md) component table
2. Update [`AGENTS.md`](../AGENTS.md) if component responsibilities changed
3. Update relevant specialized doc (03, 04, or 05)
4. Update `.github/instructions/` if there's a new pattern or convention
5. Follow checklist in [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md)

### Change On-Tag Data Format

1. Update [`docs/03-TECHNICAL-PROTOCOL.md`](../docs/03-TECHNICAL-PROTOCOL.md) **first**
2. Code changes must match the spec
3. Update [`docs/04-SYSTEM-ARCHITECTURE.md`](../docs/04-SYSTEM-ARCHITECTURE.md) if flows changed
4. Update [`docs/05-BUILD-AND-DEPLOY.md`](../docs/05-BUILD-AND-DEPLOY.md) test steps if validation changed
5. Add version note to protocol doc if breaking change

### Change Build or Deployment

1. Update [`docs/05-BUILD-AND-DEPLOY.md`](../docs/05-BUILD-AND-DEPLOY.md) with exact steps
2. Update setup scripts if applicable
3. Update troubleshooting section if new issues emerge
4. Create `.github/instructions/build-and-deploy.instructions.md` if new conventions needed

### Update Design Principles or Goals

1. Update [`docs/02-VISION-AND-PURPOSE.md`](../docs/02-VISION-AND-PURPOSE.md)
2. Update alignment checklist in `.github/instructions/project-vision.instructions.md`
3. Sync changes to `VISION.md` (deprecated) if needed

---

## Validation Checklist

Before merging any PR:

- [ ] **If code changed a feature:** Does `docs/01-PROJECT-OVERVIEW.md` component table reflect it?
- [ ] **If protocol changed:** Is `docs/03-TECHNICAL-PROTOCOL.md` updated with exact byte layouts?
- [ ] **If architecture changed:** Are `docs/04-SYSTEM-ARCHITECTURE.md` flows and boundaries updated?
- [ ] **If build process changed:** Is `docs/05-BUILD-AND-DEPLOY.md` updated with exact commands?
- [ ] **If design changed:** Is `docs/02-VISION-AND-PURPOSE.md` or `.github/instructions/` updated?
- [ ] **Cross-references:** Are broken links fixed? Do examples still match code?
- [ ] **No duplication:** Is the changed fact in **only one** primary doc (with references elsewhere)?

---

## Questions?

- **How do I know which doc to update?** → See [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md#when-to-update-docs)
- **How do I keep docs in sync?** → Follow checklist in [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md#doc-maintenance-checklist)
- **How often should docs be reviewed?** → See [`docs/MAINTENANCE.md`](../docs/MAINTENANCE.md#doc-maintenance-cadence)
- **What's the protocol version?** → See [`docs/03-TECHNICAL-PROTOCOL.md`](../docs/03-TECHNICAL-PROTOCOL.md#version--evolution-rules)
- **How do I build locally?** → See [`docs/05-BUILD-AND-DEPLOY.md`](../docs/05-BUILD-AND-DEPLOY.md)
