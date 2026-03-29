# Reference: Before & After File Structure

This document shows the complete state of `website/src/` before and after the refactor. Use it to verify you have not missed any files.

---

## Before (current state)

```
website/src/
├── App.vue                          ← 500+ lines; owns routing, NFC lifecycle,
│                                      hunt loading, year selection, PWA install,
│                                      wand reveal animation, consent overlay,
│                                      toast, and all page markup
├── counter.ts                       ← DEAD — Vite scaffold leftover
├── env.d.ts                         ← unchanged
├── main.ts                          ← creates app + registers service worker
├── style.css                        ← global styles + some component-specific rules
├── webnfc.d.ts                      ← unchanged
├── webserial.d.ts                   ← unchanged
│
├── assets/
│   ├── typescript.svg               ← DEAD — Vite scaffold
│   ├── vite.svg                     ← DEAD — Vite scaffold
│   └── fonts/
│       └── Magical.ttf              ← unchanged
│
├── components/
│   ├── BottomNav.vue                ← unchanged
│   ├── ConfigureSpotPage.vue        ← has watch-as-computed anti-pattern
│   ├── HuntView.vue                 ← unchanged
│   ├── InitializePage.vue           ← unchanged
│   ├── MagicBackground.vue          ← unchanged
│   ├── MagicScanCircle.vue          ← unchanged
│   ├── PageHero.vue                 ← unchanged
│   ├── SpotCard.vue                 ← unchanged
│   ├── ToyboxPanel.vue              ← has watch-as-computed anti-patterns;
│   │                                   dead .preset-grid/.preset-chip styles
│   ├── WandInfo.vue                 ← has unused function parameter
│   ├── YearSelector.vue             ← unchanged
│   ├── huntHeader.ts                ← DEAD — superseded by HuntView.vue
│   ├── spotCard.ts                  ← DEAD — superseded by SpotCard.vue
│   └── icons/
│       ├── IconArchive.vue          ← unchanged
│       ├── IconHuntMap.vue          ← unchanged
│       ├── IconSeeking.vue          ← unchanged
│       ├── IconWand.vue             ← unchanged
│       └── IconWandTweaker.vue      ← unchanged
│
├── composables/
│   ├── useBluetooth.ts              ← unchanged
│   ├── useCommunication.ts          ← unchanged
│   ├── useNfc.ts                    ← has dead export, duplicate boilerplate,
│   │                                   minor race condition, undocumented singleton
│   └── useSerial.ts                 ← unchanged
│
└── utils/
    ├── appUrl.ts                    ← unchanged
    ├── spotLoader.ts                ← unchanged
    └── toyboxRecord1.ts             ← has dead TOYBOX_PRESETS export
```

---

## After (target state)

```
website/src/
├── App.vue                          ← ~150 lines; orchestrates composables only
├── env.d.ts                         ← unchanged
├── main.ts                          ← creates app and mounts only (5 lines)
├── style.css                        ← global styles only; component-specific
│                                      rules removed
├── webnfc.d.ts                      ← unchanged
├── webserial.d.ts                   ← unchanged
│
├── assets/
│   └── fonts/
│       └── Magical.ttf              ← unchanged
│       (vite.svg and typescript.svg deleted)
│
├── components/
│   ├── ArchivePage.vue              ← NEW: archive tab page
│   ├── BottomNav.vue                ← unchanged
│   ├── ConfigureSpotPage.vue        ← fixed: availableSpots is computed
│   ├── HuntPage.vue                 ← NEW: hunt tab page
│   ├── HuntView.vue                 ← unchanged
│   ├── InitializePage.vue           ← unchanged
│   ├── MagicBackground.vue          ← unchanged
│   ├── MagicScanCircle.vue          ← unchanged
│   ├── NfcConsentOverlay.vue        ← NEW: NFC consent modal
│   ├── NfcToast.vue                 ← NEW: NFC status toast
│   ├── PageHero.vue                 ← unchanged
│   ├── SpotCard.vue                 ← unchanged
│   ├── ToyboxPanel.vue              ← fixed: watches→computeds; dead styles removed;
│   │                                   toybox-specific styles moved in from style.css
│   ├── WandInfo.vue                 ← fixed: ownerNameStyle is computed, no param
│   ├── YearSelector.vue             ← unchanged
│   └── icons/
│       ├── IconArchive.vue          ← unchanged
│       ├── IconHuntMap.vue          ← unchanged
│       ├── IconSeeking.vue          ← unchanged
│       ├── IconWand.vue             ← unchanged
│       └── IconWandTweaker.vue      ← unchanged
│       (huntHeader.ts and spotCard.ts deleted)
│
├── composables/
│   ├── useBluetooth.ts              ← unchanged
│   ├── useCommunication.ts          ← unchanged
│   ├── useHuntData.ts               ← NEW: hunt loading and derived data
│   ├── useNfc.ts                    ← fixed: dead export removed; guard helper
│   │                                   extracted; race fixed; singleton documented
│   ├── usePwa.ts                    ← NEW: SW registration + install prompt
│   ├── useRouter.ts                 ← NEW: URL-based page routing
│   ├── useSerial.ts                 ← unchanged
│   ├── useWandReveal.ts             ← NEW: scan reveal animation state
│   └── useYearSelection.ts          ← NEW: year selection for hunt + archive tabs
│
└── utils/
    ├── appUrl.ts                    ← unchanged
    ├── spotLoader.ts                ← unchanged
    └── toyboxRecord1.ts             ← fixed: TOYBOX_PRESETS and ToyRecordPreset removed
```

---

## New Composable Dependency Graph

```
App.vue
 ├── useNfc()              → isScanning, isWriting, status, collectedSpots,
 │                           wandMetadata, beginScanning, writeRecord1,
 │                           initializeWand, unlockTestSpot
 ├── useRouter()           → currentPage, initializeYear
 ├── usePwa()              → canInstallPwa, promptInstall
 ├── useHuntData()         → hunts, allYears, availableSpotIdsByYear
 ├── useWandReveal(        → scanRevealActive, showScannedView
 │     hasScannedWand
 │   )
 └── useYearSelection(     → wandYears, selectedYear, selectedYearOverride,
       collectedSpots,         selectedHunt, selectedCollectedIds,
       hunts,                  archiveYear, archiveHunt,
       allYears                archiveCollectedIds, yearProgress
     )
```

---

## What Stays in `App.vue` After Refactor

```
App.vue owns:
  - NFC consent state (showNfcConsent ref)
  - NFC toast visibility state (nfcToastVisible ref, toastTimer)
  - Toast watch (status → show toast for 3s)
  - handleNfcConsent() function
  - handleToyboxWrite() function
  - navTabs constant
  - Top-level template layout
```

Everything else is delegated to composables or child components.

---

## Checklist: Things That Must NOT Change

These are invariants across all phases. If you find yourself changing any of these, stop.

- [ ] The NFC MIME type format `x-hunt:<YYYY>` — do not rename or restructure
- [ ] The 8-byte bitmask encoding/decoding logic in `useNfc.ts`
- [ ] The `x-hunt-meta` metadata record format
- [ ] The `buildToyRecord` function in `toyboxRecord1.ts`
- [ ] The hunt JSON schema (`hunt.json` structure)
- [ ] Any CSS variable values or animation keyframe definitions in `style.css`
- [ ] The visual appearance of any component
- [ ] The `arduino/` directory — entirely out of scope
- [ ] The `public/` directory — entirely out of scope
- [ ] The `website/public/hunts/` directory — entirely out of scope
