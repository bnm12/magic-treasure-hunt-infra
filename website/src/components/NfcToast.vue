<template>
  <Transition name="nfc-toast">
    <div
      v-if="visible"
      class="nfc-toast"
      :class="{ writing: isWriting }"
      aria-live="polite"
    >
      <span class="nfc-toast-icon" aria-hidden="true">
        {{ isWriting ? "&#9998;" : "&#10024;" }}
      </span>
      {{ status }}
      <span v-if="!isWriting" class="toast-sparkles" aria-hidden="true">
        <span class="ts" style="--sx: -18px; --sy: -28px; --d: 0s">&#10022;</span>
        <span class="ts" style="--sx: 22px; --sy: -24px; --d: 0.1s">&#10038;</span>
        <span class="ts" style="--sx: -10px; --sy: -36px; --d: 0.2s">&#10022;</span>
        <span class="ts" style="--sx: 16px; --sy: -32px; --d: 0.15s">&#10047;</span>
      </span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  isWriting: boolean;
  status: string;
}>();
</script>

<style scoped>
.nfc-toast {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 0.5rem 1.25rem;
  border-radius: 12px;
  background: rgba(11, 11, 26, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: var(--glow-gold);
  pointer-events: none;
  white-space: nowrap;
}

.nfc-toast.writing {
  border-color: var(--accent2-border);
  color: var(--accent2);
  box-shadow: var(--glow-purple);
  animation: magic-write-pulse 1.5s ease-in-out infinite;
}

.nfc-toast-icon {
  font-size: 0.9rem;
}

.nfc-toast.writing .nfc-toast-icon {
  animation: sparkle-spin 1.5s linear infinite;
}

.toast-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}

.ts {
  position: absolute;
  font-size: 0.65rem;
  color: var(--accent);
  animation: sparkle-float 0.7s ease-out forwards;
  animation-delay: var(--d, 0s);
  opacity: 0;
}

.nfc-toast-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.nfc-toast-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.nfc-toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.nfc-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
