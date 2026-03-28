<template>
  <Transition name="wand-appear">
    <div v-if="metadata" class="wand-info-card glass-card">
      <div class="sparkle-cascade" aria-hidden="true">
        <span class="sp" style="--sx: -30px; --sy: -45px; --d: 0s"
          >&#10022;</span
        >
        <span class="sp" style="--sx: 35px; --sy: -40px; --d: 0.12s"
          >&#10038;</span
        >
        <span class="sp" style="--sx: -20px; --sy: -55px; --d: 0.25s"
          >&#10047;</span
        >
        <span class="sp" style="--sx: 25px; --sy: -50px; --d: 0.08s"
          >&#10022;</span
        >
        <span class="sp" style="--sx: -40px; --sy: -35px; --d: 0.2s"
          >&#10038;</span
        >
        <span class="sp" style="--sx: 40px; --sy: -48px; --d: 0.16s"
          >&#10047;</span
        >
      </div>
      <div class="wand-badge">
        <IconWand class="wand-icon" aria-hidden="true" />
        <span class="wand-label">Your Wand</span>
      </div>
      <div class="wand-details">
        <div ref="ownerSectionRef" class="owner-section">
          <p class="detail-label">Owner</p>
          <p
            ref="ownerNameRef"
            class="owner-name"
            :style="ownerNameStyle(metadata.name)"
          >
            <span ref="ownerNameTextRef" class="owner-name-text">
              {{ metadata.name }}
            </span>
          </p>
        </div>
        <div class="divider"></div>
        <div class="year-section">
          <p class="detail-label">Activated</p>
          <p class="year-value">{{ metadata.creationYear }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  Transition,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import IconWand from "./icons/IconWand.vue";

interface Props {
  metadata: {
    name: string;
    creationYear: number;
  } | null;
}

const props = defineProps<Props>();
const ownerSectionRef = ref<HTMLElement | null>(null);
const ownerNameRef = ref<HTMLElement | null>(null);
const ownerNameTextRef = ref<HTMLElement | null>(null);
const fittedOwnerFontSize = ref("4.5rem");
const fittedOwnerLetterSpacing = ref("0.015em");

let ownerResizeObserver: ResizeObserver | null = null;

function ownerNamePreset(length: number) {
  if (length <= 6) {
    return { max: 12, min: 3.2, spacing: "0.01em" };
  }
  if (length <= 10) {
    return { max: 10, min: 2.8, spacing: "0.008em" };
  }
  if (length <= 14) {
    return { max: 8.5, min: 2.4, spacing: "0.004em" };
  }
  if (length <= 18) {
    return { max: 7, min: 2.1, spacing: "0em" };
  }

  return { max: 5.8, min: 1.8, spacing: "-0.006em" };
}

function fitOwnerName() {
  const ownerName = ownerNameRef.value;
  const ownerNameText = ownerNameTextRef.value;
  const name = props.metadata?.name?.trim();

  if (!ownerName || !ownerNameText || !name) return;

  const { max, min, spacing } = ownerNamePreset(name.length);

  fittedOwnerLetterSpacing.value = spacing;
  ownerName.style.setProperty("--owner-letter-spacing", spacing);
  let low = min;
  let high = max;
  let best = min;

  for (let i = 0; i < 16; i += 1) {
    const mid = (low + high) / 2;
    ownerName.style.setProperty("--owner-font-size", `${mid}rem`);

    const availableWidth = ownerName.getBoundingClientRect().width;
    const renderedWidth = ownerNameText.getBoundingClientRect().width;

    if (renderedWidth <= availableWidth) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  fittedOwnerFontSize.value = `${best.toFixed(2)}rem`;
  ownerName.style.setProperty("--owner-font-size", fittedOwnerFontSize.value);
}

function ownerNameStyle(name: string) {
  return {
    "--owner-font-size": fittedOwnerFontSize.value,
    "--owner-letter-spacing": fittedOwnerLetterSpacing.value,
  };
}

watch(
  () => props.metadata?.name,
  async () => {
    await nextTick();
    fitOwnerName();
  },
  { immediate: true },
);

onMounted(async () => {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await nextTick();
  fitOwnerName();

  if (typeof ResizeObserver !== "undefined" && ownerSectionRef.value) {
    ownerResizeObserver = new ResizeObserver(() => {
      fitOwnerName();
    });
    ownerResizeObserver.observe(ownerSectionRef.value);
  } else {
    window.addEventListener("resize", fitOwnerName);
  }
});

onBeforeUnmount(() => {
  ownerResizeObserver?.disconnect();
  window.removeEventListener("resize", fitOwnerName);
});
</script>

<style scoped>
.wand-info-card {
  margin: 1rem;
  padding: 1.1rem 1.25rem 0.95rem;
  border-color: var(--accent-border);
  position: relative;
  overflow: visible;
  animation: reveal-up 0.4s ease;
}

/* Magical gradient border glow */
.wand-info-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(212, 168, 67, 0.4),
    rgba(155, 109, 255, 0.2),
    rgba(212, 168, 67, 0.1)
  );
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  pointer-events: none;
  animation: border-glow 3s ease-in-out infinite;
}

.wand-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.wand-icon {
  font-size: 1.4rem;
  display: inline-block;
  color: var(--accent);
  filter: drop-shadow(0 0 8px rgba(212, 168, 67, 0.5));
}

.wand-details {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.18rem;
}

.owner-section {
  margin-inline: -0.65rem;
}

.detail-label {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.owner-name {
  font-family: var(--script);
  font-size: var(--owner-font-size, 4.5rem);
  display: flex;
  justify-content: center;
  width: 100%;
  font-weight: 400;
  letter-spacing: var(--owner-letter-spacing, 0.015em);
  line-height: 1.04;
  white-space: nowrap;
  text-align: center;
  color: var(--text-h);
  margin: -0.08rem 0 -0.52rem;
  animation: owner-name-reveal 0.8s ease 0.2s both;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.owner-name-text {
  display: inline-block;
}

.year-value {
  font-family: var(--heading);
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.divider {
  width: 100%;
  height: 1px;
  margin-top: -0.12rem;
  background: linear-gradient(
    90deg,
    transparent,
    var(--accent-border),
    transparent
  );
}

@media (max-width: 480px) {
  .wand-info-card {
    margin: 1rem;
    padding: 0.95rem 1rem 0.85rem;
  }

  .wand-details {
    gap: 0.14rem;
    text-align: center;
  }

  .owner-section {
    margin-inline: -0.55rem;
  }

  .year-value {
    font-size: 1.15rem;
  }

  .owner-name {
    max-width: 100%;
  }
}

/* Sparkle cascade particles */
.sparkle-cascade {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: 1;
}

.sp {
  position: absolute;
  font-size: 0.8rem;
  color: var(--accent);
  animation: sparkle-float 1s ease-out forwards;
  animation-delay: var(--d, 0s);
  opacity: 0;
  filter: drop-shadow(0 0 4px rgba(212, 168, 67, 0.6));
}

/* Entrance transition */
.wand-appear-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.wand-appear-leave-active {
  transition: all 0.3s ease;
}

.wand-appear-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(15px);
}

.wand-appear-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}

@keyframes owner-name-reveal {
  0% {
    opacity: 0;
    filter: brightness(2) blur(4px);
  }
  60% {
    filter: brightness(1.4) blur(0);
  }
  100% {
    opacity: 1;
    filter: brightness(1) blur(0);
  }
}
</style>
