<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon-svg"
  >
    <!-- Compass / seeking circle -->
    <circle cx="12" cy="12" r="9" stroke-width="1" opacity="0.4" />
    <circle cx="12" cy="12" r="5" stroke-width="1" opacity="0.25" />
    <!-- Crosshair lines -->
    <line x1="12" y1="2.5" x2="12" y2="6" opacity="0.4" />
    <line x1="12" y1="18" x2="12" y2="21.5" opacity="0.4" />
    <line x1="2.5" y1="12" x2="6" y2="12" opacity="0.4" />
    <line x1="18" y1="12" x2="21.5" y2="12" opacity="0.4" />
    <!-- Wand (angled, pointing into center) -->
    <path d="M5 19 L10.5 13.5" stroke-width="2" />
    <circle cx="4.3" cy="19.7" r="1.1" fill="currentColor" stroke="currentColor" stroke-width="0.5" />
    <!-- NFC waves radiating from center -->
    <path d="M13.5 10.5 Q15 9 16.5 10.5" stroke-width="1.2" fill="none" />
    <path d="M14.5 9 Q16.5 7 18.5 9" stroke-width="1" fill="none" opacity="0.5" />
    <!-- Sparkle at wand tip / center -->
    <path d="M11.3 11.3 L12 10 L12.7 11.3 L14 12 L12.7 12.7 L12 14 L11.3 12.7 L10 12 Z" fill="currentColor" stroke="none" />
  </svg>
</template>

<style scoped>
.icon-svg {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
