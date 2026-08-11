---
description: "Use when creating, editing, or reviewing Vue components in website/."
applyTo: "website/src/**/*.vue"
---

# Vue Component Conventions

## Separation of concerns

1. **One responsibility per component**: A component should do one thing clearly to ensure code is highly reusable and easy to test. If a component is handling both data fetching and rendering, split it into separate components.
2. **Composables own logic; components own rendering**: Put NFC, data loading, and derived state into the `website/src/composables/` directory, so that business logic is completely decoupled from UI components. Components receive props and emit events.
3. **Smart/dumb split**: Container components (e.g., `App.vue`, `HuntView.vue`) wire state to presentational components. Presentational components (e.g., `SpotCard.vue`, `YearSelector.vue`) must only accept props and emit events—with no direct store or composable calls—to prevent side effects and keep components purely presentational.
4. **Props down, events up**: Parent passes data to children via props, and children communicate back via `defineEmits` to guarantee a unidirectional data flow. Never mutate props directly to prevent state corruption.
5. **`script setup` always**: Always use the `<script setup lang="ts">` form and avoid the Options API to ensure consistency, clean typescript integration, and optimal runtime performance.

## Component structure order

Always write `.vue` files in this order to maintain uniform structure across the codebase:

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

1. **Always use `<style scoped>` in component files**: Never use unscoped `<style>` in Vue components to prevent styles from leaking into the global namespace and causing unintended layout bugs.
2. **Global styles belong in `website/src/style.css` only**: Put CSS custom properties (variables), resets, typography, and shared utility classes like `.counter` and `.nfc-input` exclusively in `website/src/style.css` to keep all global design tokens centralized.
3. **Reference global variables freely**: Components may use `var(--accent)`, `var(--border)`, `var(--shadow)`, etc., from the global stylesheet inside scoped styles to ensure visual consistency with the theme.
4. **No hardcoded colours in components**: Always use a CSS variable to support global skinning and dark mode. Add a new variable to `website/src/style.css` if one doesn't exist.
5. **Dark mode via `@media (prefers-color-scheme: dark)`**: Place dark-theme media queries inside the scoped block when a component needs dark-specific overrides beyond what the global variables handle, to ensure high readability under low-light settings.
6. **Responsive breakpoints inside scoped styles**: Place `@media (max-width: 1024px)` and `@media (max-width: 600px)` inside scoped blocks to avoid mixing responsive breakpoints with layout definitions.

## TypeScript in components

1. Always type props with `defineProps<{...}>()` using an inline interface to ensure strict prop type checking.
2. Always type emits with `defineEmits<{...}>()` using named event syntax to avoid compile-time type errors.
3. Import types with `import type` and never import runtime Vue values for types only, to prevent bloated production bundles and compilation errors.
4. Derive computed values with `computed()` rather than duplicating logic in the template, to ensure clean and cached rendering.

## File naming

- Component files: Use `PascalCase.vue` format (e.g., `SpotCard.vue`, `HuntView.vue`) to ensure standard Vue component conventions.
- Composable files: Use `camelCase.ts` prefixed with `use` (e.g., `useNfc.ts`) to clearly distinguish composable state logic.
- Utility files: Use `camelCase.ts` format (e.g., `spotLoader.ts`) to indicate pure utility functions.
