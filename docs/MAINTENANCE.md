# Documentation Maintenance Rules

This document explains how to keep Tryllestavsprojekt's documentation **always in sync** with the codebase. Every change to the system—code, architecture, data model—requires corresponding doc updates in the same commit/PR.

---

## When to Update Docs

### ALWAYS Update Docs When...

| Change Type                              | Docs to Update                                                                        | Reason                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Add/rename component                     | `docs/01-PROJECT-OVERVIEW.md` (component table) + `AGENTS.md`                         | Readers need to know what exists      |
| Change on-tag data format                | `docs/03-TECHNICAL-PROTOCOL.md` (protocol spec)                                       | Source of truth for serialization     |
| Add/remove MIME record type              | `docs/03-TECHNICAL-PROTOCOL.md` (record structure)                                    | Firmware & website must match         |
| Change record 1 handling                 | `docs/02-VISION-AND-PURPOSE.md` (design principles) + `docs/03-TECHNICAL-PROTOCOL.md` | Record 1 freedom is a core principle  |
| Add/change responsibility boundary       | `docs/04-SYSTEM-ARCHITECTURE.md` (boundaries) + `AGENTS.md`                           | Teams need to know who owns what      |
| Add new deployment target (OS, platform) | `docs/05-BUILD-AND-DEPLOY.md`                                                         | Builders need setup steps             |
| Add new hardware variant                 | `docs/05-BUILD-AND-DEPLOY.md` + `arduino/README.md`                                   | Hardware team needs wiring & defaults |
| Change user outcomes or vision           | `docs/02-VISION-AND-PURPOSE.md`                                                       | Alignment checklist depends on this   |
| Evolve data model version                | `docs/03-TECHNICAL-PROTOCOL.md` (version section) + migration guide                   | Data compatibility is critical        |
| Add new hunt year scaffold               | `website/public/hunts/README.md` (if structure changes)                               | Organizers need clear guidance        |

### DON'T Update Docs If...

- Fixing a bug in existing code (unless the fix changes an invariant)
- Refactoring internal implementation (unless the external behavior or contract changes)
- Adding a test or example (unless protocol/contract details are revealed)
- Updating comments within functions (doc strings are OK; markdown docs are not needed)

---

## Step-by-Step: Making a Docs-Aligned Change

### 1. Determine What's Changing

Before writing any code, ask:

> What **external** behavior is changing? (Not implementation details, but observable behavior)

Examples:

- ✅ "Changing MIME type from `x-hunt` to `x-hunt-v2:2026`" → Change is external → Update docs
- ✅ "Adding a new hardware board (Teensy 4.1)" → Change is external → Update docs
- ✅ "Splitting `useNfc.ts` into two files" → Change is internal → No doc update needed
- ❌ "Refactoring `getBitMask()` to use a helper function" → Change is internal → No doc update needed

### 2. Identify Which Doc to Update

Use the table above to determine the source of truth. Examples:

- Protocol change? → Edit `docs/03-TECHNICAL-PROTOCOL.md`
- Component added? → Edit `docs/01-PROJECT-OVERVIEW.md`
- Vision change? → Edit `docs/02-VISION-AND-PURPOSE.md`
- Build step change? → Edit `docs/05-BUILD-AND-DEPLOY.md`
- Architecture change? → Edit `docs/04-SYSTEM-ARCHITECTURE.md`

### 3. Make the Code Change

Write your code. Test it. Make sure it works.

### 4. Update the Docs

Edit the source-of-truth doc **in the same commit/PR**. Be specific:

- **For protocol changes:** Exact byte layouts, MIME types, examples
- **For component changes:** Update component table and role descriptions
- **For build/deploy changes:** Exact commands, file paths, expected output
- **For architecture changes:** Update flows, diagrams, and responsibility boundaries

### 5. Update Cross-References

Check if other docs reference the changed doc. Examples:

- If you update `03-TECHNICAL-PROTOCOL.md` on-tag format, check `02-VISION-AND-PURPOSE.md` and `04-SYSTEM-ARCHITECTURE.md` for any references
- If you add a new component, update `01-PROJECT-OVERVIEW.md` component table, and check if `AGENTS.md` needs updating

### 6. Update Agent Instructions (If Applicable)

If your change affects **how contributors should work**, update:

- `.github/instructions/project-vision.instructions.md` — If alignment checklist needs updating
- `.github/instructions/arduino.instructions.md` — If Arduino conventions changed
- `.github/instructions/build-and-deploy.instructions.md` — If build process changed

### 7. Commit with Context

Write a commit message that references the docs:

```
feat: Add support for 128 spots per year (16-byte bitmask)

- Update on-tag spotsMask format from 8-byte to 16-byte big-endian
- Spot IDs now support range 1-128 (was 1-64)
- Update docs/03-TECHNICAL-PROTOCOL.md with new payload format
- Update PN532 firmware to parse 16-byte mask correctly
- Update website useNfc.ts composable to handle larger bitmask

This supports larger hunts while maintaining backward compatibility.
Firmware will read old 8-byte records and auto-migrate on write.
```

---

## Doc Maintenance Checklist

Use this checklist for every PR or commit that touches system boundaries:

- [ ] **Code change**: Implementation is tested and working
- [ ] **Primary doc updated**: The source-of-truth document (from table above) reflects the change
- [ ] **Examples updated**: If the change affects how code works, examples in docs are updated
- [ ] **Cross-references checked**: Other docs that link to the changed doc are still correct
- [ ] **Agent instructions updated**: If change affects contributor workflow, update `.github/instructions/*.md`
- [ ] **AGENTS.md updated**: If component structure or roles changed, update repository descriptions
- [ ] **Version notes added**: If this is a breaking change, add note to `docs/03-TECHNICAL-PROTOCOL.md#version--evolution-rules`
- [ ] **No duplication**: Changed doc doesn't duplicate info from another doc (use references instead)

---

## Doc Organization Rules

### Separation of Concerns

Each doc has a **single, clear purpose**. Never mix:

| Doc                         | Purpose                             | Include                                              | Don't Include                                  |
| --------------------------- | ----------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `01-PROJECT-OVERVIEW.md`    | What we're building + current state | Component list, role summary, timeline               | Implementation details, data serialization     |
| `02-VISION-AND-PURPOSE.md`  | Why we build + design principles    | Goals, user outcomes, non-goals, alignment checklist | On-tag byte layouts, hardware commands         |
| `03-TECHNICAL-PROTOCOL.md`  | Exact on-tag formats                | MIME types, payloads in bytes, examples, constraints | Vision rationale, UI design, user flows        |
| `04-SYSTEM-ARCHITECTURE.md` | How components interact             | Flows, diagrams, responsibility boundaries           | Byte-level serialization, setup commands       |
| `05-BUILD-AND-DEPLOY.md`    | How to build and run                | Commands, wiring, setup steps, troubleshooting       | Vision, design decisions, data model rationale |

### Reference, Don't Duplicate

If two docs need to discuss the same fact, **one is the source of truth**; the other references it:

**Good:**

```markdown
For the exact on-tag protocol, see [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md).
```

**Bad:**

```markdown
The MIME type is `application/x-hunt:<YYYY>` with an 8-byte big-endian payload...
[duplicate of protocol doc]
```

---

## Specific Rules for Each Doc

### 01-PROJECT-OVERVIEW.md

**Update when:**

- A component is added/removed
- Current state progress changes (✅ Completed, 🚧 In Progress)
- Key constraints change

**Must Include:**

- Current status table (with checkmarks)
- Component summary table
- Quick links to related docs
- Entry points for different reader types

**Update Rule:** After every major milestone, review the "Component Roles and States" table and update checkmarks and statuses.

### 02-VISION-AND-PURPOSE.md

**Update when:**

- User outcomes change
- Design principles are clarified or added
- Non-goals are added or removed
- Working agreement (alignment checklist) changes

**Must Include:**

- User outcomes (measurable, specific)
- Design principles with clear explanations
- Working agreement checklist (required before implementing features)

**Update Rule:** Before approving any feature PR, check that the PR's goals align with this doc. If they don't, update this doc **or** explain why the goal should not be a feature.

### 03-TECHNICAL-PROTOCOL.md

**Update when:**

- MIME types are added/changed
- On-tag payload format changes
- Byte layouts change
- Data validation rules change
- Hunt asset JSON schema changes

**Must Include:**

- Exact byte layouts with examples
- Constraints (ranges, limits, required fields)
- Write protocol algorithm
- Data loss prevention rules
- Testing checklist

**Update Rule:** **This is the most critical doc for data integrity.** Every change to serialization must be documented here **before** code is written. The code documents are a secondary check against this spec.

### 04-SYSTEM-ARCHITECTURE.md

**Update when:**

- A new component is added
- Responsibility boundaries shift
- Major flows change
- New diagrams needed

**Must Include:**

- System context diagram
- Responsibility boundaries (who owns what)
- Major flows (scan, write, visualization)
- Multi-year wand behavior
- Error handling strategy

**Update Rule:** Keep diagrams in sync with code. If you add a new component to AGENTS.md, update the architecture diagrams here.

### 05-BUILD-AND-DEPLOY.md

**Update when:**

- New setup steps are needed
- Commands change (arduino-cli, npm, etc.)
- Hardware requirements change
- Troubleshooting patterns emerge

**Must Include:**

- Exact commands with expected output
- Wiring diagrams (ASCII or Mermaid)
- Step-by-step setup instructions
- Common issues and fixes

**Update Rule:** After every new contributor gets stuck on setup, add the issue and solution to the troubleshooting section.

### AGENTS.md (Root Level)

**Update when:**

- Repository structure changes
- Component responsibilities change
- A new top-level folder is added

**Must Include:**

- Repository structure overview
- Brief description of each folder's role
- Link to detailed docs

**Update Rule:** Keep this as a **high-level index**, not detailed docs. Point readers to the detailed `docs/` folder.

### VISION.md (Root Level)

**Update when:** Never (deprecated in favor of `docs/02-VISION-AND-PURPOSE.md`)

**Action:** Keep it for backwards compatibility, but add a deprecation notice at the top:

```markdown
---
# ⚠️ DEPRECATED

This file is maintained for backwards compatibility.
**See [docs/02-VISION-AND-PURPOSE.md](docs/02-VISION-AND-PURPOSE.md) for the current vision.**
---
```

---

## Validation Rules

Before merging a PR, check:

1. **Does the code change match the doc change?**
   - Read the PR description and docs together
   - Do they say the same thing?

2. **Are examples still correct?**
   - Run examples by hand (if applicable)
   - Do byte layouts match the code?

3. **Are diagrams still accurate?**
   - Do Mermaid diagrams match the described flows?

4. **Are there any conflicts or ambiguities?**
   - Can two readers interpret the doc differently?
   - If yes, make it more specific

5. **Is any doc duplicated?**
   - Search the docs folder for the same fact in two places
   - If found, remove from one and add a reference

---

## Doc Maintenance Cadence

### Per PR/Commit

- Update source-of-truth doc for the change
- Check for cross-references and stale links
- Run checklist above before merging

### Per Month (Or When Major Milestone Hits)

- Review `01-PROJECT-OVERVIEW.md` status table
- Update "Component Roles and States" section
- Move tasks from In Progress to Completed

### Per Major Release (Or After Field Test)

- Review `02-VISION-AND-PURPOSE.md` design principles
- Update `03-TECHNICAL-PROTOCOL.md` if any real-world constraints emerged
- Document any lessons learned in session notes

### Quarterly or Yearly

- Full review of all docs
- Fix any stale links or outdated examples
- Re-read for clarity; improve readability where possible

---

## Example: Adding a Feature (Complete Walkthrough)

### Scenario: Add support for per-spot hint sequences

**Step 1: Determine what's changing**

- New data structure on-tag? **No** (hunts still 8-byte masks per year)
- Hunt.json changes? **Yes** (spots can now have multiple hint objects)
- Website behavior changes? **Yes** (shows sequential hints as child progresses)
- Firmware behavior changes? **No** (still just writes spotId to mask)

→ **Docs to update:**

- `docs/04-SYSTEM-ARCHITECTURE.md` (website flow changes)
- `website/public/hunts/README.md` (hunt.json schema updates)
- [No update needed for `03-TECHNICAL-PROTOCOL.md` — on-tag format unchanged]

**Step 2: Make the code change**

```javascript
// website/src/components/SpotCard.vue
// Show hints one by one based on collected status
```

**Step 3: Update docs**

In `website/public/hunts/README.md`, show new hunt.json structure:

```json
"1": {
  "name": "The Garden",
  "hint": "First look for....",
  "hints": [
    "First hint: Look for the red door",
    "Second hint (if hint button clicked): Check the north wall",
    "Third hint: Behind the fountain"
  ],
  "collectedText": "You found it!",
  ...
}
```

In `docs/04-SYSTEM-ARCHITECTURE.md`, update website scan flow diagram to show hint selection.

**Step 4: Update cross-references**

Check `docs/01-PROJECT-OVERVIEW.md` to see if website feature list mentions hints. If yes, note that hints are now sequential.

**Step 5: Update instructions (if needed)**

No change to alignment checklist or build process, so `project-vision.instructions.md` and `build-and-deploy.instructions.md` don't need updates.

**Step 6: Commit**

```
feat: Add sequential hint system for spots

- Update spot card to show hints one by one
- Add "hints" array to hunt.json spot schema (optional; backwards compatible with single "hint")
- Update website/public/hunts/README.md with new schema
- Update docs/04-SYSTEM-ARCHITECTURE.md website flow diagram
- Hints remain on website only; wand data model unchanged

Fixes #42
```

---

## Questions to Ask Yourself

Before finalizing a change:

- **Will a new contributor understand this?** If not, the doc needs more detail or examples.
- **Is this the source of truth, or a reference?** If reference, does it link to the source?
- **Could this be misunderstood?** If yes, add an clarifying example.
- **Does this conflict with another doc?** If yes, pick the source of truth and update the reference doc.
- **Is this section longer than 100 lines?** If yes, can it be split into separate concerns?

---

## References

- Source of truth docs: `docs/01-05-*.md`
- Deprecated: root `VISION.md` (→ `docs/02-VISION-AND-PURPOSE.md`)
- Agent alignment checklist: `.github/instructions/project-vision.instructions.md`
- Related: `.github/DOCUMENTATION-STRUCTURE.md` (how docs are organized)
