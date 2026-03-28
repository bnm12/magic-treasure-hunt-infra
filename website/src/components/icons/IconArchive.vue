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
    <!-- Loose page sticking out top-right, slightly rotated -->
    <g transform="rotate(6 14 5)">
      <path d="M10 3 L18 2.5 L18.5 10 L10.5 10.5 Z" opacity="0.35" />
      <line x1="12" y1="5" x2="17" y2="4.7" opacity="0.25" />
      <line x1="12" y1="7" x2="16.5" y2="6.7" opacity="0.25" />
    </g>
    <!-- Book spine (center V-shape, seen from front half-open) -->
    <path d="M12 5 L12 20" stroke-width="2" />
    <!-- Left page/cover -->
    <path d="M12 5 C10 5 4 5.5 3 6 L3 19 C4 18.5 10 18 12 18" />
    <!-- Right page/cover -->
    <path d="M12 5 C14 5 20 5.5 21 6 L21 19 C20 18.5 14 18 12 18" />
    <!-- Left page text lines -->
    <line x1="5.5" y1="9" x2="10" y2="9" opacity="0.4" />
    <line x1="5" y1="11.5" x2="10.5" y2="11.5" opacity="0.4" />
    <line x1="5.5" y1="14" x2="10" y2="14" opacity="0.4" />
    <!-- Right page text lines -->
    <line x1="14" y1="9" x2="18.5" y2="9" opacity="0.4" />
    <line x1="13.5" y1="11.5" x2="19" y2="11.5" opacity="0.4" />
    <!-- Star symbol on right page -->
    <path
      d="M16.5 14.5 L17 13.2 L17.5 14.5 L18.8 14.5 L17.8 15.3 L18.1 16.5 L17 15.8 L15.9 16.5 L16.2 15.3 L15.2 14.5 Z"
      fill="currentColor"
      stroke="none"
      opacity="0.5"
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
