---
description: "Review Vue 3 components in website/ for standard patterns, separation of concerns, and scoped styles."
---

Your goal is to review Vue 3 components to ensure they conform to the project conventions.

Requirements:
* Reference: [.github/instructions/vue-components.instructions.md](../instructions/vue-components.instructions.md)

Please check that:
1. Every component uses `<script setup lang="ts">`.
2. All components use scoped styles (`<style scoped>`) with CSS variables instead of hardcoded colors.
3. Composables own logic, while components own rendering.
