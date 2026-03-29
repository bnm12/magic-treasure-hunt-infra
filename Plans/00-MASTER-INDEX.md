# Tryllestavsprojekt Website Refactor — Master Index

## Overview

This refactor cleans up the website codebase across seven phases. Each phase has its own guide document. **Execute phases in order** — later phases depend on earlier ones.

The refactor makes zero changes to:

- The NFC data protocol (MIME types, bitmasks, byte layouts)
- Visual appearance of the app
- Any Arduino firmware
- Public hunt JSON assets

---

## Document Index

| #   | Document                    | What it does                                      | Risk       |
| --- | --------------------------- | ------------------------------------------------- | ---------- |
| 01  | `01-DELETE-DEAD-CODE.md`    | Remove unused files and exports                   | None       |
| 02  | `02-COMPUTED-VS-WATCH.md`   | Replace watches with computeds where appropriate  | Low        |
| 03  | `03-EXTRACT-COMPOSABLES.md` | Pull logic out of App.vue into composables        | Medium     |
| 04  | `04-EXTRACT-COMPONENTS.md`  | Pull markup out of App.vue into components        | Medium     |
| 05  | `05-USENFC-HARDENING.md`    | Fix subtle bugs in useNfc.ts                      | Low-Medium |
| 06  | `06-STYLE-CLEANUP.md`       | Move styles to correct scope                      | Low        |
| 07  | `07-SW-REGISTRATION.md`     | Move service worker registration to correct place | Low        |

---

## How to Use These Guides

Each guide document:

- Lists **exact files to touch**
- Shows the **before** state (what the code looks like now)
- Shows the **after** state (what it should look like)
- Has a **verification checklist** at the end

### Ground Rules for Agents

1. **Read the entire guide before writing any code.** Do not start at step 1 and code as you go.
2. **Do not change anything not listed in the guide.** Scope creep breaks later phases.
3. **Do not change any NFC protocol logic** — anything touching `x-hunt:`, bitmasks, `x-hunt-meta`, or NDEF records is off-limits unless the guide explicitly says otherwise.
4. **Do not change visual appearance.** CSS values, animation keyframes, and color variables are off-limits unless the guide explicitly says to move them.
5. After each phase, run `npm run build` from `website/` and confirm it succeeds with no TypeScript errors before moving to the next phase.

---

## Completion Checklist

- [ x ] Phase 1 complete — `npm run build` passes
- [ x ] Phase 2 complete — `npm run build` passes
- [ x ] Phase 3 complete — `npm run build` passes
- [ ] Phase 4 complete — `npm run build` passes
- [ ] Phase 5 complete — `npm run build` passes
- [ ] Phase 6 complete — `npm run build` passes
- [ ] Phase 7 complete — `npm run build` passes
