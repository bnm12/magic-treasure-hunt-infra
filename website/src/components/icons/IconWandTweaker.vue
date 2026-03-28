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
    <!-- Pentagram circle -->
    <circle cx="12" cy="11" r="8.5" stroke-width="1" opacity="0.5" />
    <!-- Pentagram star (5-point) -->
    <polygon
      points="12,2.5 14.1,8.3 20.3,8.3 15.1,12.5 17.2,18.5 12,14.5 6.8,18.5 8.9,12.5 3.7,8.3 9.9,8.3"
      stroke-width="1"
      opacity="0.35"
    />
    <!-- Wand (diagonal, crossing through the circle) -->
    <path d="M6.5 21 L13.5 10" stroke-width="2" />
    <!-- Handle knob -->
    <circle cx="5.8" cy="21.7" r="1.2" fill="currentColor" stroke="currentColor" stroke-width="0.5" />
    <!-- Sparkle at wand tip inside circle -->
    <path d="M14.2 8 L14.5 6.8 L14.8 8 L16 8.3 L14.8 8.6 L14.5 9.8 L14.2 8.6 L13 8.3 Z" fill="currentColor" stroke="none" />
  </svg>
</template>

<style scoped>
.icon-svg {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
