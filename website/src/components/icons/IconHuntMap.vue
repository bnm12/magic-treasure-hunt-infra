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
    <!-- Map / scroll base -->
    <path d="M3 6 L3 19 Q8 16 12 19 Q16 22 21 19 L21 6 Q16 9 12 6 Q8 3 3 6Z" />
    <!-- Map fold lines -->
    <path d="M8 5.2 L8 17.5" opacity="0.4" />
    <path d="M16 7.5 L16 20" opacity="0.4" />
    <!-- X marks the spot -->
    <line x1="11" y1="10" x2="13.5" y2="12.5" stroke-width="2" />
    <line x1="13.5" y1="10" x2="11" y2="12.5" stroke-width="2" />
    <!-- Small sparkle near the X -->
    <circle cx="14.5" cy="9" r="0.7" fill="currentColor" stroke="none" />
  </svg>
</template>

<style scoped>
.icon-svg {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
