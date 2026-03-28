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
    <!-- HP-style wand: tapered shaft with handle knob -->
    <path d="M4 20 L15.5 8.5" stroke-width="2" />
    <!-- Handle grip nub -->
    <circle
      cx="3.2"
      cy="20.8"
      r="1.4"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="0.5"
    />
    <!-- Tip sparkle trails -->
    <path d="M17 7 L19 3" stroke-width="1" />
    <path d="M17 7 L21 6" stroke-width="1" />
    <path d="M17 7 L19.5 9.5" stroke-width="1" opacity="0.6" />
    <!-- Sparkle star at tip -->
    <path
      d="M18.5 3.5 L19 2 L19.5 3.5 L21 4 L19.5 4.5 L19 6 L18.5 4.5 L17 4 Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
</template>

<style scoped>
.icon-svg {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
