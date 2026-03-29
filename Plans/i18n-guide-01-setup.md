# Localization Implementation Guide
## Part 1 of 4: Installation, Setup & Locale Files

---

## Before You Begin — Read This Carefully

This guide is one of four parts. Complete them **in order**. Do not skip ahead.

**After every file you create or modify, verify the TypeScript build still passes:**
```bash
cd website
npm run build
```

If the build fails, fix it before continuing. Do not accumulate broken files.

---

## What This Part Covers

1. Install `vue-i18n`
2. Create the English locale file (`en.json`)
3. Create the Danish locale file (`da.json`)
4. Create the `useLocale` composable
5. Wire i18n into `main.ts`

---

## Step 1 — Install vue-i18n

Run this from the `website/` directory:

```bash
cd website
npm install vue-i18n@9
```

Verify it was added to `package.json` under `dependencies` (not `devDependencies`). It must be a runtime dependency.

---

## Step 2 — Create the English locale file

Create this file exactly as shown. Every key in this file is the canonical source of truth. The Danish file in Step 3 must have the same keys.

**Create `website/src/locales/en.json`:**

```json
{
  "nav": {
    "hunt": "Hunt",
    "archive": "Archive",
    "toybox": "Toybox"
  },
  "hunt": {
    "eyebrow": "Tryllestavsprojekt",
    "title": "Magic Wand Companion",
    "copy": "Tap your wand at a magic spot to collect it. Scan your wand here to see your progress and hints.",
    "empty_no_data": "No hunt data found on your wand yet. Visit a magic spot!",
    "empty_scanning": "Hold your wand close to begin your magical adventure!",
    "empty_responding": "Your wand is responding...",
    "empty_preparing": "Preparing NFC scanner...",
    "progress_remaining": "0 spots remaining | 1 spot remaining | {n} spots remaining",
    "progress_complete": "All spots collected!",
    "progress_none": "No spots collected yet — tap your wand at a magic spot!"
  },
  "archive": {
    "eyebrow": "Past & Present",
    "title": "Hunt Archive",
    "copy": "Browse all hunts — including ones you may have missed.",
    "empty": "No hunts available yet."
  },
  "spot": {
    "collected": "Collected",
    "undiscovered": "Undiscovered"
  },
  "wand": {
    "owner": "Owner",
    "crafted": "Crafted"
  },
  "toybox": {
    "eyebrow": "Wand Workshop",
    "title": "Toybox",
    "copy": "Initialize a wand and tune record 1 without disturbing your hunt progress.",
    "install_title": "Install Companion",
    "install_note": "Add the wand companion to your home screen as a standalone app when your browser supports installation.",
    "install_btn": "Install App",
    "action_title": "Default Tap Action",
    "action_note": "Choose what the wand does on a normal NFC tap. Treasure progress is always preserved when writing.",
    "action_label": "Action type",
    "action_summary_fallback": "",
    "write_btn": "Write to Wand",
    "writing_btn": "Writing...",
    "admin_kicker": "Temporary",
    "admin_title": "Admin Tools",
    "admin_note": "These controls are for setup, testing, and debugging. We plan to remove them from the public Toybox flow later.",
    "init_title": "Initialize Wand",
    "init_note": "Initialize a blank NFC tag as an official wand. The wand can then collect treasures on your adventure.",
    "init_owner_label": "Owner name",
    "init_owner_placeholder": "e.g., Benjamin",
    "init_owner_counter": "{count}/127 characters",
    "init_year_label": "Creation year",
    "init_btn": "Initialize Wand",
    "init_btn_busy": "Initializing...",
    "init_error_name_required": "Please enter the owner's name.",
    "init_error_name_too_long": "Owner name is too long (max 127 characters).",
    "init_error_year_required": "Please choose a creation year.",
    "unlock_title": "Unlock Test Treasure",
    "unlock_note": "Add any spot from any hunt year onto the wand for testing and debug flows.",
    "unlock_year_label": "Hunt year",
    "unlock_spot_label": "Spot",
    "unlock_spot_option": "Spot {id}",
    "unlock_btn": "Unlock Spot {id}",
    "unlock_btn_busy": "Unlocking...",
    "unlock_error_select": "Choose a hunt year and a spot first."
  },
  "nfc": {
    "not_supported": "Web NFC is not available. Open this page in Chrome on Android over HTTPS.",
    "unavailable": "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.",
    "permission_denied": "NFC permission was denied. Please allow NFC access in your browser settings and refresh.",
    "detected": "Wand detected!",
    "read_failed": "Could not read the wand. Try again.",
    "scan_failed": "Scan failed: {error}",
    "write_verify": "Hold the wand near your device to verify and write...",
    "write_verify_reading": "Hold the wand near your device to verify its current records...",
    "write_record1_success": "Record 1 written! The tag was read first and treasure progress was preserved.",
    "write_record1_failed": "Write failed: {error}",
    "init_prompt": "Bring blank tag to initialize as wand...",
    "init_success": "SUCCESS: Wand initialized for {name} (year {year})!",
    "init_failed": "Initialization failed: {error}",
    "init_name_invalid": "Owner name must be 1-127 characters.",
    "unlock_prompt": "Hold the wand near your device to unlock spot {spot} for {year}...",
    "unlock_success": "Unlocked spot {spot} for {year} on the wand.",
    "unlock_failed": "Unlock failed: {error}",
    "unlock_invalid": "Choose a valid hunt year and a spot ID between 1 and 64."
  },
  "consent": {
    "title": "Enable Wand Scanner?",
    "desc": "Allow NFC scanning so your phone can read magic wands automatically.",
    "enable": "Enable NFC",
    "skip": "Skip for now"
  },
  "language": {
    "label": "Language",
    "en": "English",
    "da": "Dansk"
  },
  "init_page": {
    "eyebrow": "Mass Initialization",
    "title": "Wand Workshop",
    "copy": "Initializing wands for the {year} hunt.",
    "owner_label": "Owner name",
    "owner_placeholder": "e.g., Benjamin",
    "owner_counter": "{count}/127 characters",
    "year_label": "Creation year",
    "btn": "Initialize Wand",
    "btn_busy": "Initializing...",
    "clear": "Clear",
    "error_name_required": "Please enter the owner's name.",
    "error_name_too_long": "Owner name is too long (max 127 characters).",
    "error_no_nfc": "Web NFC is not supported on this device.",
    "error_no_year": "Please select a creation year.",
    "success": "Successfully initialized wand for {name}!",
    "history_title": "Recent Initializations"
  },
  "configure_page": {
    "eyebrow": "Device Configuration",
    "title": "Spot Configurator",
    "copy": "Connect to a Magic Spot over USB or Bluetooth to configure its ID and year.",
    "connect_instruction": "Connect your device and click a button below to start configuration.",
    "connect_usb": "Connect USB",
    "connect_bluetooth": "Connect Bluetooth",
    "connected": "Connected",
    "disconnect": "Disconnect",
    "year_label": "Hunt Year",
    "year_placeholder": "Select Year",
    "spot_label": "Spot ID",
    "spot_placeholder": "Select Spot",
    "spot_option": "Spot {id}",
    "terminal_header": "Received Data",
    "terminal_placeholder": "Waiting for data...",
    "terminal_clear": "Clear",
    "send_label": "Send Command",
    "send_placeholder": "e.g., setSpot: 5",
    "send_btn": "Send"
  }
}
```

---

## Step 3 — Create the Danish locale file

Create this file. Every key from `en.json` must appear here too. If you are unsure of a translation, copy the English string — the fallback mechanism will display the English version anyway, but having the key present avoids warnings.

**Create `website/src/locales/da.json`:**

```json
{
  "nav": {
    "hunt": "Jagt",
    "archive": "Arkiv",
    "toybox": "Legetøjskasse"
  },
  "hunt": {
    "eyebrow": "Tryllestavsprojekt",
    "title": "Tryllestav-følgesvend",
    "copy": "Tryk din tryllestav mod et magisk sted for at samle det. Scan din tryllestav her for at se din fremgang og tips.",
    "empty_no_data": "Ingen jagdata fundet på din tryllestav endnu. Besøg et magisk sted!",
    "empty_scanning": "Hold din tryllestav tæt på for at begynde dit magiske eventyr!",
    "empty_responding": "Din tryllestav svarer...",
    "empty_preparing": "Forbereder NFC-scanner...",
    "progress_remaining": "0 steder tilbage | 1 sted tilbage | {n} steder tilbage",
    "progress_complete": "Alle steder er samlet!",
    "progress_none": "Ingen steder samlet endnu — tryk din tryllestav mod et magisk sted!"
  },
  "archive": {
    "eyebrow": "Fortid og Nutid",
    "title": "Jagtarkiv",
    "copy": "Gennemse alle jagter — inklusiv dem du måske er gået glip af.",
    "empty": "Ingen jagter tilgængelige endnu."
  },
  "spot": {
    "collected": "Samlet",
    "undiscovered": "Uopdaget"
  },
  "wand": {
    "owner": "Ejer",
    "crafted": "Skabt"
  },
  "toybox": {
    "eyebrow": "Tryllestavs-værksted",
    "title": "Legetøjskasse",
    "copy": "Initialiser en tryllestav og juster post 1 uden at forstyrre din jagtfremgang.",
    "install_title": "Installer følgesvend",
    "install_note": "Tilføj tryllestav-følgesvenden til din startskærm som en selvstændig app, når din browser understøtter installation.",
    "install_btn": "Installer app",
    "action_title": "Standard trykhandling",
    "action_note": "Vælg hvad tryllestaven gør ved et normalt NFC-tryk. Skattefremgang bevares altid ved skrivning.",
    "action_label": "Handlingstype",
    "action_summary_fallback": "",
    "write_btn": "Skriv til tryllestav",
    "writing_btn": "Skriver...",
    "admin_kicker": "Midlertidig",
    "admin_title": "Administratorværktøjer",
    "admin_note": "Disse kontroller er til opsætning, test og fejlfinding. Vi planlægger at fjerne dem fra det offentlige Legetøjskasse-flow senere.",
    "init_title": "Initialiser tryllestav",
    "init_note": "Initialiser et tomt NFC-tag som en officiel tryllestav. Tryllestaven kan derefter samle skatte på dit eventyr.",
    "init_owner_label": "Ejernavn",
    "init_owner_placeholder": "f.eks. Benjamin",
    "init_owner_counter": "{count}/127 tegn",
    "init_year_label": "Oprettelsesår",
    "init_btn": "Initialiser tryllestav",
    "init_btn_busy": "Initialiserer...",
    "init_error_name_required": "Indtast venligst ejerens navn.",
    "init_error_name_too_long": "Ejernavn er for langt (maks. 127 tegn).",
    "init_error_year_required": "Vælg venligst et oprettelsesår.",
    "unlock_title": "Lås testskatte op",
    "unlock_note": "Tilføj et vilkårligt sted fra et vilkårligt jagtår på tryllestaven til test og fejlfindingsflows.",
    "unlock_year_label": "Jagtår",
    "unlock_spot_label": "Sted",
    "unlock_spot_option": "Sted {id}",
    "unlock_btn": "Lås sted {id} op",
    "unlock_btn_busy": "Låser op...",
    "unlock_error_select": "Vælg et jagtår og et sted først."
  },
  "nfc": {
    "not_supported": "Web NFC er ikke tilgængeligt. Åbn denne side i Chrome på Android over HTTPS.",
    "unavailable": "Web NFC er ikke tilgængeligt. Brug HTTPS på Android Chrome eller Samsung Internet.",
    "permission_denied": "NFC-tilladelse blev afvist. Tillad venligst NFC-adgang i dine browserindstillinger og opdater siden.",
    "detected": "Tryllestav registreret!",
    "read_failed": "Kunne ikke læse tryllestaven. Prøv igen.",
    "scan_failed": "Scanning mislykkedes: {error}",
    "write_verify": "Hold tryllestaven tæt på din enhed for at verificere og skrive...",
    "write_verify_reading": "Hold tryllestaven tæt på din enhed for at verificere dens aktuelle poster...",
    "write_record1_success": "Post 1 skrevet! Tagget blev læst først og skattfremgang blev bevaret.",
    "write_record1_failed": "Skrivning mislykkedes: {error}",
    "init_prompt": "Bring tomt tag for at initialisere som tryllestav...",
    "init_success": "SUCCES: Tryllestav initialiseret for {name} (år {year})!",
    "init_failed": "Initialisering mislykkedes: {error}",
    "init_name_invalid": "Ejernavn skal være 1-127 tegn.",
    "unlock_prompt": "Hold tryllestaven tæt på din enhed for at låse sted {spot} op for {year}...",
    "unlock_success": "Låste sted {spot} op for {year} på tryllestaven.",
    "unlock_failed": "Oplåsning mislykkedes: {error}",
    "unlock_invalid": "Vælg et gyldigt jagtår og et sted-ID mellem 1 og 64."
  },
  "consent": {
    "title": "Aktiver tryllestav-scanner?",
    "desc": "Tillad NFC-scanning, så din telefon automatisk kan læse magiske tryllestave.",
    "enable": "Aktiver NFC",
    "skip": "Spring over for nu"
  },
  "language": {
    "label": "Sprog",
    "en": "English",
    "da": "Dansk"
  },
  "init_page": {
    "eyebrow": "Masseinitialisering",
    "title": "Tryllestavs-værksted",
    "copy": "Initialiserer tryllestave til {year}-jagten.",
    "owner_label": "Ejernavn",
    "owner_placeholder": "f.eks. Benjamin",
    "owner_counter": "{count}/127 tegn",
    "year_label": "Oprettelsesår",
    "btn": "Initialiser tryllestav",
    "btn_busy": "Initialiserer...",
    "clear": "Ryd",
    "error_name_required": "Indtast venligst ejerens navn.",
    "error_name_too_long": "Ejernavn er for langt (maks. 127 tegn).",
    "error_no_nfc": "Web NFC understøttes ikke på denne enhed.",
    "error_no_year": "Vælg venligst et oprettelsesår.",
    "success": "Tryllestav initialiseret for {name}!",
    "history_title": "Seneste initialiseringer"
  },
  "configure_page": {
    "eyebrow": "Enhedskonfiguration",
    "title": "Sted-konfigurator",
    "copy": "Opret forbindelse til et magisk sted via USB eller Bluetooth for at konfigurere dets ID og år.",
    "connect_instruction": "Tilslut din enhed og klik på en knap nedenfor for at starte konfigurationen.",
    "connect_usb": "Tilslut USB",
    "connect_bluetooth": "Tilslut Bluetooth",
    "connected": "Tilsluttet",
    "disconnect": "Afbryd",
    "year_label": "Jagtår",
    "year_placeholder": "Vælg år",
    "spot_label": "Sted-ID",
    "spot_placeholder": "Vælg sted",
    "spot_option": "Sted {id}",
    "terminal_header": "Modtagne data",
    "terminal_placeholder": "Venter på data...",
    "terminal_clear": "Ryd",
    "send_label": "Send kommando",
    "send_placeholder": "f.eks. setSpot: 5",
    "send_btn": "Send"
  }
}
```

---

## Step 4 — Create the useLocale composable

This composable owns all locale detection and persistence logic. Components never touch `localStorage` or `navigator.language` directly — they go through this.

**Create `website/src/composables/useLocale.ts`:**

```typescript
import { watch } from "vue";
import type { Composer } from "vue-i18n";

const STORAGE_KEY = "tryllestav-locale";
const SUPPORTED_LOCALES = ["en", "da"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Detects the preferred locale in priority order:
 * 1. Previously saved preference in localStorage
 * 2. Browser language (navigator.language, stripped to base tag e.g. "da-DK" → "da")
 * 3. English fallback
 */
export function detectLocale(): SupportedLocale {
  // 1. Saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && isSupportedLocale(saved)) return saved;

  // 2. Browser language
  const browserLang = navigator.language?.split("-")[0]?.toLowerCase() ?? "";
  if (isSupportedLocale(browserLang)) return browserLang;

  // 3. Fallback
  return "en";
}

/**
 * Returns composable helpers for reading and changing the active locale.
 * Pass in the i18n instance from useI18n() or i18n.global.
 */
export function useLocale(i18n: Composer) {
  function setLocale(locale: SupportedLocale) {
    i18n.locale.value = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }

  function currentLocale(): SupportedLocale {
    const val = i18n.locale.value;
    return isSupportedLocale(val) ? val : "en";
  }

  return {
    setLocale,
    currentLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
```

---

## Step 5 — Wire i18n into main.ts

Replace the contents of `website/src/main.ts` with the following. The changes are: import `createI18n`, create the instance with detected locale and fallback, install it before mounting.

**Replace `website/src/main.ts`:**

```typescript
import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import App from "./App.vue";
import "./style.css";
import en from "./locales/en.json";
import da from "./locales/da.json";
import { detectLocale } from "./composables/useLocale";

const i18n = createI18n({
  legacy: false,           // IMPORTANT: must be false for Composition API usage
  locale: detectLocale(),
  fallbackLocale: "en",
  messages: { en, da },
});

const app = createApp(App);
app.use(i18n);
app.mount("#app");
```

**Do the same for `website/management/main.ts`:**

```typescript
import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import ManagementApp from "../src/ManagementApp.vue";
import "../src/style.css";
import en from "../src/locales/en.json";
import da from "../src/locales/da.json";
import { detectLocale } from "../src/composables/useLocale";
import { resolveVersionedAppUrl } from "../src/utils/appUrl";

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: "en",
  messages: { en, da },
});

const app = createApp(ManagementApp);
app.use(i18n);
app.mount("#app");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("../management-sw.js"))
      .catch((error: unknown) => {
        console.error("Management service worker registration failed:", error);
      });
  });
}
```

---

## Step 5 — Verify the build

Run this now before continuing to Part 2:

```bash
cd website
npm run build
```

**Expected result:** Build succeeds. You will not see any translated strings yet — that happens in Part 2 and 3. You are only verifying that the i18n plugin installs without errors.

**If the build fails:** Check that `legacy: false` is set in `createI18n`. Check that the import paths to the JSON files are correct. Check that `vue-i18n` appears in `package.json` dependencies.

---

## Checklist Before Moving to Part 2

- [ ] `vue-i18n` is in `package.json` dependencies
- [ ] `src/locales/en.json` exists and is valid JSON
- [ ] `src/locales/da.json` exists and has the same keys as `en.json`
- [ ] `src/composables/useLocale.ts` exists
- [ ] `src/main.ts` imports and installs i18n with `legacy: false`
- [ ] `management/main.ts` imports and installs i18n with `legacy: false`
- [ ] `npm run build` passes

**Do not proceed to Part 2 until all boxes are checked.**
