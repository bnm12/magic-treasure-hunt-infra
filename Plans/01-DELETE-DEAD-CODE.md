# Phase 1 — Delete Dead Code

## Goal

Remove files and exports that are never imported or used anywhere. This phase has zero risk of breaking anything because these items are already unreachable.

## Files to Touch

| Action | File |
|--------|------|
| DELETE | `website/src/components/huntHeader.ts` |
| DELETE | `website/src/components/spotCard.ts` |
| DELETE | `website/src/counter.ts` |
| DELETE | `website/src/assets/vite.svg` |
| DELETE | `website/src/assets/typescript.svg` |
| EDIT | `website/src/composables/useNfc.ts` |
| EDIT | `website/src/utils/toyboxRecord1.ts` |
| EDIT | `website/src/components/ToyboxPanel.vue` |

---

## Step 1 — Delete Five Files

Delete these files entirely. They are not imported anywhere.

```
website/src/components/huntHeader.ts
website/src/components/spotCard.ts
website/src/counter.ts
website/src/assets/vite.svg
website/src/assets/typescript.svg
```

**Why they are safe to delete:**
- `huntHeader.ts` and `spotCard.ts` are old imperative DOM renderers superseded by `HuntView.vue` and `SpotCard.vue`. No `.vue` file or `.ts` file imports them.
- `counter.ts` is a Vite scaffold leftover. Never imported.
- `vite.svg` and `typescript.svg` are Vite scaffold assets. Never referenced in any component or CSS.

---

## Step 2 — Remove `hasScannedWand` from `useNfc.ts`

### Why

`useNfc.ts` currently exposes `hasScannedWand` as a plain function `() => lastReadRecords.length > 0` in its return object. `App.vue` never uses this returned function — instead `App.vue` computes its own `hasScannedWand` as a `computed` from `wandMetadata` and `collectedSpots`. The export is dead.

### Location

File: `website/src/composables/useNfc.ts`

Find the return statement at the bottom of the `useNfc` function. It currently looks like this:

```ts
return {
  isScanning,
  isWriting,
  status,
  nfcCompatMessage,
  record1Preview,
  collectedSpots,
  wandMetadata,
  hasScannedWand: () => lastReadRecords.length > 0,  // ← REMOVE this line
  nfcSupported,
  beginScanning,
  writeRecord1,
  initializeWand,
  unlockTestSpot,
};
```

### Change

Remove the `hasScannedWand` line from the return object. Result:

```ts
return {
  isScanning,
  isWriting,
  status,
  nfcCompatMessage,
  record1Preview,
  collectedSpots,
  wandMetadata,
  nfcSupported,
  beginScanning,
  writeRecord1,
  initializeWand,
  unlockTestSpot,
};
```

**Do not remove `record1Preview` even though it may seem unused — it may be used in future components.**

---

## Step 3 — Remove `TOYBOX_PRESETS` from `toyboxRecord1.ts`

### Why

`TOYBOX_PRESETS` is a constant array of preset configurations that was exported but never imported by any component. The Toybox UI was refactored to use a dropdown of action types instead of preset chips, and the presets were never wired up.

### Location

File: `website/src/utils/toyboxRecord1.ts`

Find and remove the entire `TOYBOX_PRESETS` constant. It looks like this:

```ts
export const TOYBOX_PRESETS: ToyRecordPreset[] = [
  {
    id: "companion-home",
    label: "Companion Home",
    action: "url",
    fields: { url: "https://tryllestav.example.org" },
  },
  {
    id: "secret-spell",
    label: "Secret Spell",
    action: "text",
    fields: { text: "By moonlight and maplight, reveal the next clue." },
  },
  {
    id: "playlist-portal",
    label: "Playlist Portal",
    action: "app",
    fields: { uri: "spotify:playlist:37i9dQZF1DX4WYpdgoIcn6" },
  },
  {
    id: "guardian-contact",
    label: "Guardian Contact",
    action: "contact",
    fields: {
      name: "Guardian of the Wand",
      phone: "+45 12 34 56 78",
      email: "guardian@example.org",
      note: "Please contact us if this wand is found.",
    },
  },
  {
    id: "meet-at-fountain",
    label: "Meet at Fountain",
    action: "geo",
    fields: {
      latitude: "55.6761",
      longitude: "12.5683",
      label: "Magic fountain meetup",
    },
  },
  {
    id: "owl-post",
    label: "Owl Post",
    action: "email",
    fields: {
      to: "owlpost@example.org",
      subject: "A message from my wand",
      body: "I found another treasure spot today.",
    },
  },
];
```

Also remove the `ToyRecordPreset` interface, since it only exists to type `TOYBOX_PRESETS`:

```ts
export interface ToyRecordPreset {
  id: string;
  label: string;
  action: ToyRecordAction;
  fields: Record<string, string>;
}
```

### What to keep

Keep everything else in the file:
- `ToyRecordAction` type
- `ToyRecordFieldDefinition` interface
- `ToyRecordActionDefinition` interface
- `ToyRecordWriteRequest` interface
- `TOYBOX_ACTIONS` constant
- `createEmptyToyRecordFields` function
- `buildToyRecord` function
- All the private builder functions (`buildVCard`, `buildCalendarInvite`, etc.)

---

## Step 4 — Remove Dead Styles from `ToyboxPanel.vue`

### Why

The `.preset-grid` and `.preset-chip` CSS classes exist in `ToyboxPanel.vue`'s `<style scoped>` block but the elements that used them were removed from the template when the preset chip UI was replaced with the dropdown. The styles are dead.

### Location

File: `website/src/components/ToyboxPanel.vue`

Find and remove these two CSS rule blocks from the `<style scoped>` section:

```css
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.preset-chip {
  border: 1px solid rgba(212, 168, 67, 0.25);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-h);
  padding: 0.6rem 0.8rem;
  font: inherit;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.preset-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(244, 217, 122, 0.55);
  background: rgba(244, 217, 122, 0.08);
}
```

Remove all three of these blocks (`.preset-grid`, `.preset-chip`, `.preset-chip:hover`). Do not touch any other styles in the file.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `website/src/components/huntHeader.ts` does not exist
- [ ] `website/src/components/spotCard.ts` does not exist
- [ ] `website/src/counter.ts` does not exist
- [ ] `website/src/assets/vite.svg` does not exist
- [ ] `website/src/assets/typescript.svg` does not exist
- [ ] `useNfc.ts` return object does not contain `hasScannedWand`
- [ ] `toyboxRecord1.ts` does not contain `TOYBOX_PRESETS` or `ToyRecordPreset`
- [ ] `ToyboxPanel.vue` scoped styles do not contain `.preset-grid` or `.preset-chip`
- [ ] Run `npm run build` from `website/` — must succeed with no errors
- [ ] Visually: the app looks and behaves identically to before
