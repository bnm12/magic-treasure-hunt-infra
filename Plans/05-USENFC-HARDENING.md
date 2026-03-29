# Phase 5 — Harden `useNfc.ts`

## Goal

Fix three distinct issues in `useNfc.ts`:

1. **Duplicate guard boilerplate** — four async functions each start with the same 4-line NFC check. Extract to a helper.
2. **`finish()` double-call race** in `readTagOnce` — the timeout and the reading event can both call `finish()`. Add a guard.
3. **Document the singleton pattern** — `lastReadRecords` is module-level state shared across all callers. This is intentional but undocumented.

This phase makes **no changes to NFC protocol logic** — MIME parsing, bitmask encoding, record building, and all data model code is untouched.

## Files to Touch

| File | Change |
|------|--------|
| `website/src/composables/useNfc.ts` | Extract guard helper, fix race, add comment |

---

## Step 1 — Add the NFC Precondition Guard Helper

### Problem

These four functions each start with nearly identical boilerplate:

```ts
async function writeRecord1(...) {
  if (!nfcSupported()) {
    nfcCompatMessage.value = "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return;
  }
  if (isWriting.value) return;
  ...
}

async function initializeWand(...) {
  if (!nfcSupported()) {
    nfcCompatMessage.value = "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return;
  }
  if (isWriting.value) return;
  ...
}

async function unlockTestSpot(...) {
  if (!nfcSupported()) {
    nfcCompatMessage.value = "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return;
  }
  if (isWriting.value) return;
  ...
}
```

(`beginScanning` also checks `nfcSupported()` but handles it differently — leave that one alone.)

### Change

#### A. Add a private helper function inside `useNfc`

Add this function **inside** the `useNfc` function body, near the top alongside the other helper functions (after the `nfcSupported` function is a good place):

```ts
/**
 * Checks preconditions before a write operation.
 * Returns true if the caller should abort, false if it may proceed.
 * Sets nfcCompatMessage if NFC is not supported.
 */
function shouldAbortWrite(): boolean {
  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return true;
  }
  if (isWriting.value) return true;
  return false;
}
```

#### B. Replace the guard boilerplate in `writeRecord1`

Find the beginning of `writeRecord1`:

```ts
async function writeRecord1(request: ToyRecordWriteRequest): Promise<void> {
  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return;
  }
  if (isWriting.value) return;
  ...
```

Replace the first four lines with:

```ts
async function writeRecord1(request: ToyRecordWriteRequest): Promise<void> {
  if (shouldAbortWrite()) return;
  ...
```

#### C. Replace the guard boilerplate in `initializeWand`

Find the beginning of `initializeWand`:

```ts
async function initializeWand(ownerName: string, creationYear: number): Promise<void> {
  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return;
  }
  if (isWriting.value) return;
  if (!ownerName || ownerName.length === 0 || ownerName.length > 127) {
    status.value = "Owner name must be 1-127 characters.";
    return;
  }
  ...
```

Replace the first four lines (the NFC support check + writing check) with `shouldAbortWrite`. Keep the `ownerName` validation after it:

```ts
async function initializeWand(ownerName: string, creationYear: number): Promise<void> {
  if (shouldAbortWrite()) return;
  if (!ownerName || ownerName.length === 0 || ownerName.length > 127) {
    status.value = "Owner name must be 1-127 characters.";
    return;
  }
  ...
```

#### D. Replace the guard boilerplate in `unlockTestSpot`

Find the beginning of `unlockTestSpot`:

```ts
async function unlockTestSpot(year: number, spotId: number): Promise<void> {
  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
    return;
  }
  if (!isValidYear(year) || !Number.isInteger(spotId) || spotId < 1 || spotId > 64) {
    status.value = "Choose a valid hunt year and a spot ID between 1 and 64.";
    return;
  }
  if (isWriting.value) return;
  ...
```

Note: in `unlockTestSpot` the guard is split — NFC check, then validation, then `isWriting` check. Consolidate to:

```ts
async function unlockTestSpot(year: number, spotId: number): Promise<void> {
  if (shouldAbortWrite()) return;
  if (!isValidYear(year) || !Number.isInteger(spotId) || spotId < 1 || spotId > 64) {
    status.value = "Choose a valid hunt year and a spot ID between 1 and 64.";
    return;
  }
  ...
```

---

## Step 2 — Fix the `finish()` Double-Call Race in `readTagOnce`

### Problem

`readTagOnce` creates a `finish` closure that clears the timeout and aborts the scan controller. Both the `onreading` handler and the timeout call `finish()`:

```ts
const finish = () => {
  clearTimeout(timeout);
  scanController.abort();
};

// Path 1: timeout fires first
const timeout = setTimeout(() => {
  scanController.abort();         // abort — but finish() not called here, so timeout NOT cleared
  reject(new DOMException("Timed out waiting for tag.", "TimeoutError"));
}, timeoutMs);

// Path 2: reading fires first
ndef.onreading = (event) => {
  const records = [...event.message.records];
  finish();   // clears timeout AND aborts controller
  resolve(records);
};
```

Looking more carefully at the current code:

```ts
return await new Promise<NDEFRecord[]>((resolve, reject) => {
  const scanController = new AbortController();
  const timeout = setTimeout(() => {
    scanController.abort();
    reject(new DOMException("Timed out waiting for tag.", "TimeoutError"));
  }, timeoutMs);

  const finish = () => {
    clearTimeout(timeout);
    scanController.abort();
  };
  ...
  ndef.onreading = (event: NDEFReadingEvent) => {
    const records = [...event.message.records];
    finish();
    resolve(records);
  };

  ndef.onreadingerror = () => {
    finish();
    reject(new DOMException("Could not read the tag.", "ReadError"));
  };
```

The `timeout` callback calls `scanController.abort()` directly without calling `finish()`. If the abort triggers `onreadingerror`, `finish()` would then be called from `onreadingerror`, calling `scanController.abort()` a second time. Calling `abort()` twice on an `AbortController` is harmless, but `clearTimeout` with an already-fired timer ID is also harmless, so the actual bug is mild. However, to be safe and clear:

### Change

Make the timeout call `finish()` too, and add a `finished` flag to prevent double-resolution:

Replace the entire `readTagOnce` Promise body with this:

```ts
return await new Promise<NDEFRecord[]>((resolve, reject) => {
  const scanController = new AbortController();
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    scanController.abort();
  };

  const timeout = setTimeout(() => {
    finish();
    reject(new DOMException("Timed out waiting for tag.", "TimeoutError"));
  }, timeoutMs);

  void (async () => {
    try {
      const ndef = new NDEFReader();

      ndef.onreading = (event: NDEFReadingEvent) => {
        const records = [...event.message.records];
        finish();
        resolve(records);
      };

      ndef.onreadingerror = () => {
        finish();
        reject(new DOMException("Could not read the tag.", "ReadError"));
      };

      await ndef.scan({ signal: scanController.signal });
    } catch (error) {
      finish();
      reject(error);
    }
  })();
});
```

The key changes are:
- `finished` flag prevents `finish()` from running more than once
- The timeout now calls `finish()` (which cleans up the controller) before rejecting
- The `catch` block also calls `finish()` to ensure cleanup on scan setup failure

---

## Step 3 — Document the Singleton Pattern for `lastReadRecords`

### Problem

`lastReadRecords` is declared inside `useNfc` but at closure scope — it persists across calls to `useNfc()` within the same module instance. This is an implicit singleton pattern. If a future developer calls `useNfc()` twice expecting independent instances, they will get confused.

### Change

Add a comment directly above the `lastReadRecords` declaration:

Find this line:

```ts
let lastReadRecords: NDEFRecord[] = [];
```

Replace with:

```ts
// NOTE: lastReadRecords is intentionally module-level (closure) state.
// useNfc() is designed to be called once in App.vue and treated as a singleton.
// Multiple calls to useNfc() share this state, which is the desired behaviour —
// all callers should see the same last-scanned wand records.
let lastReadRecords: NDEFRecord[] = [];
```

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `useNfc.ts` contains a `shouldAbortWrite()` private function
- [ ] `writeRecord1`, `initializeWand`, and `unlockTestSpot` each begin with `if (shouldAbortWrite()) return;`
- [ ] None of those three functions contain the old 4-line boilerplate check anymore
- [ ] `readTagOnce` contains a `finished` boolean flag
- [ ] `finish()` in `readTagOnce` checks `if (finished) return;` at its start
- [ ] The `timeout` callback calls `finish()` before calling `reject()`
- [ ] The `catch` block calls `finish()` before calling `reject()`
- [ ] `lastReadRecords` has a comment explaining the singleton pattern
- [ ] Run `npm run build` from `website/` — must succeed with zero TypeScript errors
- [ ] Test: scan a wand — data displays correctly (NFC read path is unchanged)
- [ ] Test: write record 1 via Toybox — write succeeds (NFC write path is unchanged)
- [ ] Test: tapping the scan timeout (hard to test manually — verify by code review that the `finished` flag is in place)
