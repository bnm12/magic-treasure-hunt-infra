# Localization Implementation Guide
## Part 3 of 4: Updating Vue Components

---

## Before You Begin

- Parts 1 and 2 must be complete and `npm run build` must be passing.
- This part is the most file-heavy. Work through components one at a time.
- Run `npm run build` after finishing each component. Fix errors immediately — do not continue to the next component with a broken build.

---

## What This Part Covers

Every Vue component that contains hardcoded user-facing strings. For each component you will:

1. Add `const { t } = useI18n();` to the `<script setup>` block
2. Replace hardcoded strings in the template with `t('key')` calls
3. Replace hardcoded strings in script logic with `t('key')` calls

---

## The Pattern — Memorize This Before Starting

Every component that needs translations follows this exact pattern:

**In `<script setup>`**, add the import and destructure `t`:

```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

**In the template**, replace a hardcoded string:

```html
<!-- Before -->
<p>No hunts available yet.</p>

<!-- After -->
<p>{{ t('archive.empty') }}</p>
```

**For attribute strings** (aria-label, placeholder, title), use the binding syntax:

```html
<!-- Before -->
<div role="tablist" aria-label="Select hunt year">

<!-- After -->
<div role="tablist" :aria-label="t('year_selector.aria_label')">
```

**For strings passed as props**, use binding syntax:

```html
<!-- Before -->
<PageHero eyebrow="Tryllestavsprojekt" title="Magic Wand Companion" />

<!-- After -->
<PageHero :eyebrow="t('hunt.eyebrow')" :title="t('hunt.title')" />
```

---

## Component 1: App.vue

Open `website/src/App.vue`.

### Script changes

Add to the imports:
```typescript
import { useI18n } from "vue-i18n";
```

Add inside `<script setup>`, near the top with the other composable calls:
```typescript
const { t } = useI18n();
```

Find this line in the `onMounted` block:
```typescript
nfcCompatMessage.value =
  "NFC permission was denied. Please allow NFC access in your browser settings and refresh.";
```
Replace with:
```typescript
nfcCompatMessage.value = t("nfc.permission_denied");
```

### Template changes

Find the nav tab definitions:
```typescript
const navTabs: NavTab[] = [
  { id: "hunt", label: "Hunt", icon: IconHuntMap },
  { id: "archive", label: "Archive", icon: IconArchive },
  { id: "toybox", label: "Toybox", icon: IconWandTweaker },
];
```

These are defined as a static `const` but `t()` is reactive — if the user switches language, the tabs will not update if defined as a plain `const`. Convert to a `computed`:

```typescript
import { ref, computed, onMounted, watch } from "vue";

const navTabs = computed<NavTab[]>(() => [
  { id: "hunt", label: t("nav.hunt"), icon: IconHuntMap },
  { id: "archive", label: t("nav.archive"), icon: IconArchive },
  { id: "toybox", label: t("nav.toybox"), icon: IconWandTweaker },
]);
```

The `PageHero` for the toybox tab in the template has hardcoded strings. Find:
```html
<PageHero
  :icon="IconWandTweaker"
  eyebrow="Wand Workshop"
  title="Toybox"
  copy="Initialize a wand and tune record 1 without disturbing your hunt progress."
  :compact="true"
/>
```
Replace with:
```html
<PageHero
  :icon="IconWandTweaker"
  :eyebrow="t('toybox.eyebrow')"
  :title="t('toybox.title')"
  :copy="t('toybox.copy')"
  :compact="true"
/>
```

---

## Component 2: HuntPage.vue

Open `website/src/components/HuntPage.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Find the `PageHero` call:
```html
<PageHero
  :icon="IconSeeking"
  eyebrow="Tryllestavsprojekt"
  title="Magic Wand Companion"
  copy="Tap your wand at a magic spot to collect it. Scan your wand here to see your progress and hints."
  ...
/>
```
Replace the hardcoded prop values:
```html
<PageHero
  :icon="IconSeeking"
  :eyebrow="t('hunt.eyebrow')"
  :title="t('hunt.title')"
  :copy="t('hunt.copy')"
  ...
/>
```

Find the empty state paragraph. It currently uses a ternary chain to pick a string. Replace all four string literals:

```html
<!-- Before -->
<p>
  {{
    showScannedView
      ? "No hunt data found on your wand yet. Visit a magic spot!"
      : scanRevealActive
        ? "Your wand is responding..."
        : isScanning
          ? "Hold your wand close to begin your magical adventure!"
          : "Preparing NFC scanner..."
  }}
</p>

<!-- After -->
<p>
  {{
    showScannedView
      ? t('hunt.empty_no_data')
      : scanRevealActive
        ? t('hunt.empty_responding')
        : isScanning
          ? t('hunt.empty_scanning')
          : t('hunt.empty_preparing')
  }}
</p>
```

---

## Component 3: ArchivePage.vue

Open `website/src/components/ArchivePage.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Find the `PageHero` call and replace hardcoded props:
```html
<PageHero
  :icon="IconArchive"
  :eyebrow="t('archive.eyebrow')"
  :title="t('archive.title')"
  :copy="t('archive.copy')"
  :no-spin="true"
  :compact="true"
/>
```

Find the empty state paragraph:
```html
<!-- Before -->
<p>No hunts available yet.</p>

<!-- After -->
<p>{{ t('archive.empty') }}</p>
```

---

## Component 4: HuntView.vue

Open `website/src/components/HuntView.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Find the progress text section at the bottom of the hunt header. It uses three `<template>` branches. Replace the strings in each branch:

```html
<!-- Before -->
<template v-if="collectedCount === totalCount && totalCount > 0">
  <span class="complete-text">&#10024; All spots collected!</span>
</template>
<template v-else-if="collectedCount === 0">
  No spots collected yet — tap your wand at a magic spot!
</template>
<template v-else>
  {{ totalCount - collectedCount }} spot{{
    totalCount - collectedCount === 1 ? "" : "s"
  }}
  remaining
</template>

<!-- After -->
<template v-if="collectedCount === totalCount && totalCount > 0">
  <span class="complete-text">&#10024; {{ t('hunt.progress_complete') }}</span>
</template>
<template v-else-if="collectedCount === 0">
  {{ t('hunt.progress_none') }}
</template>
<template v-else>
  {{ t('hunt.progress_remaining', { n: totalCount - collectedCount }) }}
</template>
```

**Important note on pluralization:** The `t()` call with `{ n: ... }` uses vue-i18n's built-in plural handling. The locale string `"0 spots remaining | 1 spot remaining | {n} spots remaining"` uses pipe `|` to separate the zero, one, and many forms. vue-i18n selects the right form based on the value of `n`. This replaces the manual `spot{{ ... === 1 ? "" : "s" }}` logic — remove that entirely.

---

## Component 5: SpotCard.vue

Open `website/src/components/SpotCard.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Find the collected badge label:
```html
<!-- Before -->
<span class="badge-label">Collected</span>

<!-- After -->
<span class="badge-label">{{ t('spot.collected') }}</span>
```

Find the undiscovered badge:
```html
<!-- Before -->
<span v-else class="undiscovered-badge">Undiscovered</span>

<!-- After -->
<span v-else class="undiscovered-badge">{{ t('spot.undiscovered') }}</span>
```

---

## Component 6: WandInfo.vue

Open `website/src/components/WandInfo.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Find the two detail labels:
```html
<!-- Before -->
<p class="detail-label">Owner</p>
...
<p class="detail-label">Crafted</p>

<!-- After -->
<p class="detail-label">{{ t('wand.owner') }}</p>
...
<p class="detail-label">{{ t('wand.crafted') }}</p>
```

---

## Component 7: YearSelector.vue

Open `website/src/components/YearSelector.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Find the `aria-label` attribute on the nav:
```html
<!-- Before -->
<div class="year-selector" role="tablist" aria-label="Select hunt year">

<!-- After -->
<div class="year-selector" role="tablist" :aria-label="t('year_selector.aria_label')">
```

Add this key to both locale files:

`en.json` — add under a new `"year_selector"` section:
```json
"year_selector": {
  "aria_label": "Select hunt year"
}
```

`da.json`:
```json
"year_selector": {
  "aria_label": "Vælg jagtår"
}
```

---

## Component 8: NfcConsentOverlay.vue

Open `website/src/components/NfcConsentOverlay.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Replace all four visible strings:
```html
<!-- Before -->
<h2 class="consent-title">Enable Wand Scanner?</h2>
<p class="consent-desc">
  Allow NFC scanning so your phone can read magic wands automatically.
</p>
<button class="consent-btn" @click="emit('consent')">
  Enable NFC
</button>
<button class="consent-skip" @click="emit('skip')">
  Skip for now
</button>

<!-- After -->
<h2 class="consent-title">{{ t('consent.title') }}</h2>
<p class="consent-desc">{{ t('consent.desc') }}</p>
<button class="consent-btn" @click="emit('consent')">
  {{ t('consent.enable') }}
</button>
<button class="consent-skip" @click="emit('skip')">
  {{ t('consent.skip') }}
</button>
```

---

## Component 9: ToyboxPanel.vue

Open `website/src/components/ToyboxPanel.vue`.

This is the largest component. Work through it section by section.

### Script changes

Add import and destructure at the top of `<script setup>`:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes — Install section

```html
<!-- Before -->
<h3>
  <span class="section-icon" aria-hidden="true">&#11015;</span> Install
  Companion
</h3>
<p class="note">
  Add the wand companion to your home screen as a standalone app when your
  browser supports installation.
</p>
<button @click="emit('install')" type="button" class="counter">
  &#10022; Install App
</button>

<!-- After -->
<h3>
  <span class="section-icon" aria-hidden="true">&#11015;</span>
  {{ t('toybox.install_title') }}
</h3>
<p class="note">{{ t('toybox.install_note') }}</p>
<button @click="emit('install')" type="button" class="counter">
  &#10022; {{ t('toybox.install_btn') }}
</button>
```

### Template changes — Default tap action section

```html
<!-- Before -->
<h3>
  <span class="section-icon" aria-hidden="true">&#9998;</span> Default Tap
  Action
</h3>
<p class="note">
  Choose what the wand does on a normal NFC tap. Treasure progress is
  always preserved when writing.
</p>
<label for="toy-action">Action type</label>
...
<button :disabled="isWriting" @click="handleWrite" type="button" class="counter">
  {{ isWriting ? "&#10024; Writing..." : "&#9733; Write to Wand" }}
</button>

<!-- After -->
<h3>
  <span class="section-icon" aria-hidden="true">&#9998;</span>
  {{ t('toybox.action_title') }}
</h3>
<p class="note">{{ t('toybox.action_note') }}</p>
<label for="toy-action">{{ t('toybox.action_label') }}</label>
...
<button :disabled="isWriting" @click="handleWrite" type="button" class="counter">
  {{ isWriting ? t('toybox.writing_btn') : t('toybox.write_btn') }}
</button>
```

### Template changes — Admin section header

```html
<!-- Before -->
<p class="admin-kicker">Temporary</p>
<h3>Admin Tools</h3>
<p class="note">
  These controls are for setup, testing, and debugging. We plan to
  remove them from the public Toybox flow later.
</p>

<!-- After -->
<p class="admin-kicker">{{ t('toybox.admin_kicker') }}</p>
<h3>{{ t('toybox.admin_title') }}</h3>
<p class="note">{{ t('toybox.admin_note') }}</p>
```

### Template changes — Initialize Wand subsection

```html
<!-- Before -->
<h4>
  <span class="section-icon" aria-hidden="true">&#10022;</span>
  Initialize Wand
</h4>
<p class="note">
  Initialize a blank NFC tag as an official wand...
</p>
<label for="wand-name">Owner name</label>
<input ... placeholder="e.g., Benjamin" ... />
<small>{{ wandName.length }}/127 characters</small>
<label for="wand-creation-year">Creation year</label>
<button ... >
  {{ isWriting ? "&#10024; Initializing..." : "&#10022; Initialize Wand" }}
</button>

<!-- After -->
<h4>
  <span class="section-icon" aria-hidden="true">&#10022;</span>
  {{ t('toybox.init_title') }}
</h4>
<p class="note">{{ t('toybox.init_note') }}</p>
<label for="wand-name">{{ t('toybox.init_owner_label') }}</label>
<input ... :placeholder="t('toybox.init_owner_placeholder')" ... />
<small>{{ t('toybox.init_owner_counter', { count: wandName.length }) }}</small>
<label for="wand-creation-year">{{ t('toybox.init_year_label') }}</label>
<button ... >
  {{ isWriting ? t('toybox.init_btn_busy') : t('toybox.init_btn') }}
</button>
```

### Script changes — validation errors in handleInitWand

Find the three error assignments in `handleInitWand()`:

```typescript
// Before
wandInitError.value = "Please enter the owner's name.";
wandInitError.value = "Owner name is too long (max 127 characters).";
wandInitError.value = "Please choose a creation year.";
wandInitError.value = `Error: ${(error as Error).message}`;

// After
wandInitError.value = t("toybox.init_error_name_required");
wandInitError.value = t("toybox.init_error_name_too_long");
wandInitError.value = t("toybox.init_error_year_required");
wandInitError.value = `Error: ${(error as Error).message}`; // keep as-is, raw error message
```

### Template changes — Unlock Test Treasure subsection

```html
<!-- Before -->
<h4>
  <span class="section-icon" aria-hidden="true">&#10038;</span> Unlock
  Test Treasure
</h4>
<p class="note">Add any spot from any hunt year...</p>
<label for="debug-year">Hunt year</label>
<label for="debug-spot">Spot</label>
<option v-for="id in availableSpotIds" :key="id" :value="id">
  Spot {{ id }}
</option>
<button ...>
  {{ isWriting ? "&#10024; Unlocking..." : `&#9733; Unlock Spot ${debugSpotId || ""}` }}
</button>

<!-- After -->
<h4>
  <span class="section-icon" aria-hidden="true">&#10038;</span>
  {{ t('toybox.unlock_title') }}
</h4>
<p class="note">{{ t('toybox.unlock_note') }}</p>
<label for="debug-year">{{ t('toybox.unlock_year_label') }}</label>
<label for="debug-spot">{{ t('toybox.unlock_spot_label') }}</label>
<option v-for="id in availableSpotIds" :key="id" :value="id">
  {{ t('toybox.unlock_spot_option', { id }) }}
</option>
<button ...>
  {{ isWriting ? t('toybox.unlock_btn_busy') : t('toybox.unlock_btn', { id: debugSpotId || '' }) }}
</button>
```

### Script changes — error in handleUnlockSpot

```typescript
// Before
debugUnlockError.value = "Choose a hunt year and a spot first.";

// After
debugUnlockError.value = t("toybox.unlock_error_select");
```

---

## Component 10: Add the language toggle to ToyboxPanel.vue

This is a new UI element, not a string replacement. Add it at the very top of the toybox panel, before the install section.

### Script changes

Add import:
```typescript
import { useLocale } from "../composables/useLocale";
import type { SupportedLocale } from "../composables/useLocale";
const { setLocale, currentLocale, supportedLocales } = useLocale();
```

### Template changes

Add before the first `<div v-if="showInstallAction"...>`:

```html
<div class="toybox-section glass-card language-section">
  <h3>
    <span class="section-icon" aria-hidden="true">&#127760;</span>
    {{ t('language.label') }}
  </h3>
  <div class="language-buttons">
    <button
      v-for="locale in supportedLocales"
      :key="locale"
      class="lang-btn"
      :class="{ active: currentLocale() === locale }"
      type="button"
      @click="setLocale(locale as SupportedLocale)"
    >
      {{ t(`language.${locale}`) }}
    </button>
  </div>
</div>

<div class="toybox-divider" aria-hidden="true">
  <span class="toybox-divider-core"></span>
</div>
```

### Style changes

Add to `<style scoped>` in `ToyboxPanel.vue`:

```css
.language-section {
  padding: 1.25rem;
}

.language-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.lang-btn {
  padding: 0.4rem 1.25rem;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  font-family: var(--sans);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.lang-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.lang-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--glow-gold);
}
```

---

## Component 11: ManagementApp.vue

Open `website/src/ManagementApp.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

The `tabs` array has hardcoded labels. Convert to `computed` (same pattern as `navTabs` in App.vue):

```typescript
import { ref, computed, onMounted } from "vue";

const tabs = computed(() => [
  { id: "initialize", label: t("init_page.title"), icon: IconWandTweaker },
  { id: "configureSpot", label: t("configure_page.title"), icon: IconWand },
]);
```

Remove the old `const tabs = [...]` declaration.

---

## Component 12: InitializePage.vue

Open `website/src/components/InitializePage.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

Replace the four error string assignments in `handleInitWand()`:
```typescript
// Before
error.value = "Please enter the owner's name.";
error.value = "Owner name is too long (max 127 characters).";
error.value = "Web NFC is not supported on this device.";
error.value = "Please select a creation year.";

// After
error.value = t("init_page.error_name_required");
error.value = t("init_page.error_name_too_long");
error.value = t("init_page.error_no_nfc");
error.value = t("init_page.error_no_year");
```

### Template changes

Replace `PageHero` props:
```html
<PageHero
  :icon="IconWandTweaker"
  :eyebrow="t('init_page.eyebrow')"
  :title="t('init_page.title')"
  :copy="t('init_page.copy', { year: creationYear })"
  :compact="true"
/>
```

Replace form labels, placeholder, counter, button text, success message, and history title:

```html
<label for="wand-name">{{ t('init_page.owner_label') }}</label>
<input
  ...
  :placeholder="t('init_page.owner_placeholder')"
  ...
/>
<small>{{ t('init_page.owner_counter', { count: wandName.length }) }}</small>
<button @click="clearName" class="clear-btn" v-if="wandName">
  {{ t('init_page.clear') }}
</button>
<label for="wand-creation-year">{{ t('init_page.year_label') }}</label>
<button ... >
  {{ isWriting ? t('init_page.btn_busy') : t('init_page.btn') }}
</button>

<!-- Success message -->
<div v-if="lastInitialized" class="success-message">
  <span class="sparkle">✨</span>
  {{ t('init_page.success', { name: lastInitialized }) }}
</div>

<!-- History -->
<h3>{{ t('init_page.history_title') }}</h3>
```

---

## Component 13: ConfigureSpotPage.vue

Open `website/src/components/ConfigureSpotPage.vue`.

### Script changes

Add import and destructure:
```typescript
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

### Template changes

Replace `PageHero` props:
```html
<PageHero
  :icon="IconWandTweaker"
  :eyebrow="t('configure_page.eyebrow')"
  :title="t('configure_page.title')"
  :copy="t('configure_page.copy')"
  :compact="true"
/>
```

Replace connect section strings:
```html
<p class="instruction-text">{{ t('configure_page.connect_instruction') }}</p>
<button @click="connectSerial" class="primary-btn">
  🔌 {{ t('configure_page.connect_usb') }}
</button>
<button @click="connectBluetooth" class="primary-btn bluetooth-btn">
  📡 {{ t('configure_page.connect_bluetooth') }}
</button>
```

Replace status bar:
```html
<span class="status-indicator connected">{{ t('configure_page.connected') }}</span>
<button @click="disconnect" class="text-btn">{{ t('configure_page.disconnect') }}</button>
```

Replace form labels and select placeholders:
```html
<label for="year-select">{{ t('configure_page.year_label') }}</label>
<option disabled :value="0">{{ t('configure_page.year_placeholder') }}</option>

<label for="spot-select">{{ t('configure_page.spot_label') }}</label>
<option disabled :value="0">{{ t('configure_page.spot_placeholder') }}</option>
<option v-for="id in availableSpots" :key="id" :value="id">
  {{ t('configure_page.spot_option', { id }) }}
</option>
```

Replace terminal:
```html
<div class="terminal-header">{{ t('configure_page.terminal_header') }}</div>
<pre ...>{{ receivedText || t('configure_page.terminal_placeholder') }}</pre>
<button @click="clearTerminal" class="clear-terminal-btn" v-if="receivedText">
  {{ t('configure_page.terminal_clear') }}
</button>
```

Replace send command section:
```html
<label for="serial-input">{{ t('configure_page.send_label') }}</label>
<input
  ...
  :placeholder="t('configure_page.send_placeholder')"
  ...
/>
<button @click="handleSend" ... class="send-btn">
  {{ t('configure_page.send_btn') }}
</button>
```

---

## Final build check

After completing all 13 components, run:

```bash
cd website
npm run build
```

The build must pass with zero errors before you continue to Part 4.

---

## Checklist Before Moving to Part 4

- [ ] All 13 components updated
- [ ] `useI18n` is imported and `t` is destructured in every updated component
- [ ] `navTabs` in `App.vue` is a `computed` ref, not a static `const`
- [ ] `tabs` in `ManagementApp.vue` is a `computed` ref, not a static `const`
- [ ] The language toggle UI is added to `ToyboxPanel.vue` with styles
- [ ] `"year_selector"` key added to both `en.json` and `da.json`
- [ ] `npm run build` passes with zero errors

**Do not proceed to Part 4 until all boxes are checked.**
