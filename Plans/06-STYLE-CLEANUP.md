# Phase 6 — Style Cleanup

## Goal

Move CSS rules to their correct scope. Styles that only apply to one component should be in that component's `<style scoped>` block, not in the global `style.css`. Additionally, fix one dead function parameter in `WandInfo.vue`.

**The rule used here:**
- Global `style.css`: design tokens (CSS variables), resets, typography, utility classes used by multiple components, keyframe animations used by multiple components.
- Component `<style scoped>`: rules that only apply to that component's markup.

## Files to Touch

| File | Change |
|------|--------|
| `website/src/style.css` | Remove component-specific rules |
| `website/src/components/ToyboxPanel.vue` | Receive the moved rules into scoped styles |
| `website/src/components/WandInfo.vue` | Remove unused function parameter |

---

## Step 1 — Move Toybox-Only Rules from `style.css` to `ToyboxPanel.vue`

### Rules to move

Open `website/src/style.css` and find these four rule blocks. They are only ever applied to elements inside `ToyboxPanel.vue`:

```css
.nfc-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.nfc-note {
  margin-bottom: 1rem;
  font-size: 0.85rem;
  opacity: 0.7;
}

.nfc-compat {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--danger);
  background: rgba(248, 113, 113, 0.08);
  color: var(--danger);
  font-size: 0.85rem;
}

.nfc-status {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--accent);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
}
```

### Action A — Verify before removing from `style.css`

Before removing, search the entire `website/src/` directory for any use of these class names outside of `ToyboxPanel.vue`. Run a search for each class name:

- `.nfc-controls`
- `.nfc-note`
- `.nfc-compat`
- `.nfc-status`

**If any of these classes appear in a component other than `ToyboxPanel.vue`**, do NOT remove them from `style.css` — instead, keep them global and skip that specific class. Only move classes that are exclusively used in `ToyboxPanel.vue`.

**Important exception:** `.nfc-controls` is used in `ToyboxPanel.vue` and **also** in `ConfigureSpotPage.vue` (for the terminal send button area). If it appears in `ConfigureSpotPage.vue`, keep it in `style.css`.

### Action B — Remove from `style.css`

Remove the rule blocks for any class names confirmed to be `ToyboxPanel.vue`-only. Do not remove `.nfc-input`, `.nfc-textarea`, `.btn-magic`, `.counter`, or any other rules.

### Action C — Add to `ToyboxPanel.vue`

Open `website/src/components/ToyboxPanel.vue`. Find the `<style scoped>` section at the bottom. Add the moved rules at the end of the scoped block:

```css
/* Rules moved from style.css — only used in this component */

.nfc-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.nfc-note {
  margin-bottom: 1rem;
  font-size: 0.85rem;
  opacity: 0.7;
}

.nfc-compat {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--danger);
  background: rgba(248, 113, 113, 0.08);
  color: var(--danger);
  font-size: 0.85rem;
}

.nfc-status {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--accent);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
}
```

Only add the rules you confirmed are `ToyboxPanel.vue`-only in Action A.

### Important: scoped styles and class name conflicts

Vue's `<style scoped>` adds a unique data attribute to all selectors, so `.nfc-controls` in `ToyboxPanel.vue` becomes `.nfc-controls[data-v-xxxxxx]` in the output. This means:

- The class only matches elements inside `ToyboxPanel.vue`'s own template.
- If a child component (like a button inside ToyboxPanel) uses `.nfc-controls` and that element is rendered by the child's own template, the scoped attribute will NOT match.

In `ToyboxPanel.vue`, the `.nfc-controls` div is rendered directly in ToyboxPanel's own template, so scoped styles work correctly here. No child components are involved.

---

## Step 2 — Fix `ownerNameStyle` Unused Parameter in `WandInfo.vue`

### Problem

`WandInfo.vue` has a function `ownerNameStyle` that takes a `name` parameter but never uses it:

```ts
function ownerNameStyle(name: string) {  // ← `name` is never used inside
  return {
    "--owner-font-size": fittedOwnerFontSize.value,
    "--owner-letter-spacing": fittedOwnerLetterSpacing.value,
  };
}
```

This generates a TypeScript `noUnusedParameters` warning (the `tsconfig.json` has `"noUnusedParameters": true`).

The function is called in the template as:
```html
<p ref="ownerNameRef" class="owner-name" :style="ownerNameStyle(metadata.name)">
```

The `metadata.name` argument is passed but ignored inside the function. The style object returned only uses the fitted font size and letter spacing refs.

### Change

Remove the unused `name` parameter from the function signature and update the template call:

**In `<script setup>`:**

```ts
// BEFORE
function ownerNameStyle(name: string) {
  return {
    "--owner-font-size": fittedOwnerFontSize.value,
    "--owner-letter-spacing": fittedOwnerLetterSpacing.value,
  };
}

// AFTER — convert to a computed property (no parameter needed)
const ownerNameStyle = computed(() => ({
  "--owner-font-size": fittedOwnerFontSize.value,
  "--owner-letter-spacing": fittedOwnerLetterSpacing.value,
}));
```

**In the template:**

```html
<!-- BEFORE -->
<p ref="ownerNameRef" class="owner-name" :style="ownerNameStyle(metadata.name)">

<!-- AFTER -->
<p ref="ownerNameRef" class="owner-name" :style="ownerNameStyle">
```

Note: `ownerNameStyle` is now a computed ref, so it is accessed without `()` in the template (Vue automatically unwraps computed refs in template bindings).

Also add `computed` to the import from `vue` at the top of `<script setup>` if it is not already there:

```ts
import { Transition, nextTick, onBeforeUnmount, onMounted, ref, watch, computed } from "vue";
```

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `style.css` does not contain `.nfc-controls`, `.nfc-note`, `.nfc-compat`, `.nfc-status` (unless confirmed to be used in multiple components — see Step 1, Action A)
- [ ] `ToyboxPanel.vue` `<style scoped>` contains the moved rules
- [ ] `WandInfo.vue` `ownerNameStyle` is a `computed` with no parameters
- [ ] `WandInfo.vue` template uses `:style="ownerNameStyle"` without `()`
- [ ] `WandInfo.vue` imports `computed` from `vue`
- [ ] Run `npm run build` from `website/` — must succeed with zero TypeScript errors and zero `noUnusedParameters` warnings
- [ ] Test: Toybox panel renders correctly — form inputs, dropdowns, and buttons are styled
- [ ] Test: WandInfo card renders with correct font sizing for owner name
- [ ] Test: both short names ("Bo") and long names ("Bartholomew") fit correctly in the owner name area
