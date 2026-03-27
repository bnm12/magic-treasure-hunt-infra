---
description: "Use when creating, editing, or reviewing Vue components in website/."
applyTo: "website/src/**/*.vue"
---

# Vue Component Conventions

## Separation of concerns

1. **One responsibility per component.** A component should do one thing clearly. If a component is handling both data fetching and rendering, split it.
2. **Composables own logic; components own rendering.** Put NFC, data loading, and derived state into `src/composables/`. Components receive props and emit events.
3. **Smart/dumb split.** Container components (e.g. `App.vue`, `HuntView.vue`) wire state to presentational components. Presentational components (e.g. `SpotCard.vue`, `YearSelector.vue`) only accept props and emit events — no direct store or composable calls.
4. **Props down, events up.** Parent passes data to children via props. Children communicate back via `defineEmits`. Never mutate props directly.
5. **`script setup` always.** Use the `<script setup lang="ts">` form. Avoid the Options API.

## Component structure order

Always write `.vue` files in this order:

```vue
<template>...</template>

<script setup lang="ts">
...
</script>

<style scoped>
...
</style>
```

## Scoped styles

1. **Always use `<style scoped>`** in component files. Never use unscoped `<style>` in components.
2. **Global styles belong in `src/style.css` only.** This includes CSS custom properties (variables), resets, typography, and shared utility classes like `.counter` and `.nfc-input`.
3. **Reference global variables freely.** Components may use `var(--accent)`, `var(--border)`, `var(--shadow)`, etc. from the global stylesheet inside scoped styles.
4. **No hardcoded colours in components.** Always use a CSS variable. Add a new variable to `style.css` if one doesn't exist.
5. **Dark mode via `@media (prefers-color-scheme: dark)`** inside the scoped block when a component needs dark-specific overrides beyond what the global variables already handle.
6. **Responsive breakpoints inside scoped styles.** Use `@media (max-width: 1024px)` and `@media (max-width: 600px)` consistent with the rest of the project.

## TypeScript in components

1. Always type props with `defineProps<{...}>()` using an inline interface.
2. Always type emits with `defineEmits<{...}>()` using named event syntax.
3. Import types with `import type` — never import runtime Vue values for types only.
4. Derive computed values with `computed()` rather than duplicating logic in the template.

## File naming

- Component files: `PascalCase.vue` (e.g. `SpotCard.vue`, `HuntView.vue`)
- Composable files: `camelCase.ts` prefixed with `use` (e.g. `useNfc.ts`)
- Utility files: `camelCase.ts` (e.g. `spotLoader.ts`)
