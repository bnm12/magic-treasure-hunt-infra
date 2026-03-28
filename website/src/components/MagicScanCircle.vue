<template>
  <div
    class="scan-circle"
    :class="{ 'scan-circle--activated': activated }"
    aria-hidden="true"
  >
    <div class="scan-circle__halo"></div>
    <div class="scan-circle__ring scan-circle__ring--outer">
      <span class="scan-circle__runes scan-circle__runes--outer">
        {{ outerRunes }}
      </span>
    </div>
    <div class="scan-circle__ring scan-circle__ring--mid">
      <span class="scan-circle__runes scan-circle__runes--mid">
        {{ middleRunes }}
      </span>
    </div>
    <div class="scan-circle__ring scan-circle__ring--inner">
      <span class="scan-circle__runes scan-circle__runes--inner">
        {{ innerRunes }}
      </span>
    </div>

    <div class="scan-circle__geometry">
      <span class="scan-circle__axis scan-circle__axis--h"></span>
      <span class="scan-circle__axis scan-circle__axis--v"></span>
      <span class="scan-circle__star-line scan-circle__star-line--1"></span>
      <span class="scan-circle__star-line scan-circle__star-line--2"></span>
      <span class="scan-circle__star-line scan-circle__star-line--3"></span>
      <span class="scan-circle__star-line scan-circle__star-line--4"></span>
      <span class="scan-circle__star-line scan-circle__star-line--5"></span>
      <span class="scan-circle__node scan-circle__node--1"></span>
      <span class="scan-circle__node scan-circle__node--2"></span>
      <span class="scan-circle__node scan-circle__node--3"></span>
      <span class="scan-circle__node scan-circle__node--4"></span>
      <span class="scan-circle__node scan-circle__node--5"></span>
      <span class="scan-circle__tick scan-circle__tick--n"></span>
      <span class="scan-circle__tick scan-circle__tick--e"></span>
      <span class="scan-circle__tick scan-circle__tick--s"></span>
      <span class="scan-circle__tick scan-circle__tick--w"></span>
    </div>

    <div class="scan-circle__core">
      <div class="scan-circle__seal"></div>
      <slot />
    </div>

    <span class="scan-circle__spark scan-circle__spark--1"></span>
    <span class="scan-circle__spark scan-circle__spark--2"></span>
    <span class="scan-circle__spark scan-circle__spark--3"></span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activated?: boolean;
}>();

const outerRunes = "\u16A0 \u00B7 \u16B1 \u00B7 \u16C7 \u00B7 \u16D6 \u00B7 \u16A2 \u00B7 \u16B7 \u00B7 \u16C1 \u00B7 \u16DE";
const middleRunes = "\u16C1 \u2027 \u16DE \u2027 \u16A2 \u2027 \u16B7 \u2027 \u16D6 \u2027 \u16C7 \u2027 \u16B1 \u2027 \u16A0";
const innerRunes = "\u16A0 \u16B1 \u16C7 \u16D6 \u16A2 \u16B7";
</script>

<style scoped>
.scan-circle {
  position: relative;
  width: min(420px, 90vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.scan-circle--activated {
  animation: scan-circle-burst 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.scan-circle__halo {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background:
    radial-gradient(
      circle,
      rgba(212, 168, 67, 0.1) 0%,
      rgba(212, 168, 67, 0.04) 30%,
      rgba(155, 109, 255, 0.04) 58%,
      transparent 76%
    ),
    radial-gradient(
      circle at 50% 38%,
      rgba(240, 208, 120, 0.08),
      transparent 60%
    );
  filter: blur(18px);
  animation: halo-breathe 8s ease-in-out infinite;
}

.scan-circle--activated .scan-circle__halo {
  animation:
    halo-breathe 8s ease-in-out infinite,
    halo-burst 900ms ease-out forwards;
}

.scan-circle__geometry {
  position: absolute;
  inset: 0;
  opacity: 0.78;
}

.scan-circle--activated .scan-circle__geometry {
  animation: geometry-flare 900ms ease-out forwards;
}

.scan-circle__axis,
.scan-circle__star-line {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 1px;
  transform-origin: center;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(240, 208, 120, 0.12),
    rgba(240, 208, 120, 0.34),
    rgba(240, 208, 120, 0.12),
    transparent
  );
}

.scan-circle__axis {
  width: 62%;
  margin-left: -31%;
  margin-top: -0.5px;
}

.scan-circle__axis--v {
  transform: rotate(90deg);
}

.scan-circle__star-line {
  width: 44%;
  margin-left: -22%;
  margin-top: -0.5px;
  opacity: 0.8;
}

.scan-circle__star-line--1 {
  transform: translateY(-24%) rotate(-18deg);
}

.scan-circle__star-line--2 {
  transform: rotate(54deg);
}

.scan-circle__star-line--3 {
  transform: rotate(-54deg);
}

.scan-circle__star-line--4 {
  transform: translateY(19%) rotate(18deg);
}

.scan-circle__star-line--5 {
  transform: translateY(19%) rotate(-18deg);
}

.scan-circle__node {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(240, 208, 120, 0.95),
    rgba(212, 168, 67, 0.42) 55%,
    transparent 72%
  );
  box-shadow: 0 0 8px rgba(240, 208, 120, 0.14);
}

.scan-circle__node--1 {
  top: 18%;
  left: 50%;
  margin-left: -3px;
}

.scan-circle__node--2 {
  top: 40%;
  right: 25%;
}

.scan-circle__node--3 {
  bottom: 23%;
  right: 31%;
}

.scan-circle__node--4 {
  bottom: 23%;
  left: 31%;
}

.scan-circle__node--5 {
  top: 40%;
  left: 25%;
}

.scan-circle__tick {
  position: absolute;
  width: 18px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(240, 208, 120, 0.9),
    transparent
  );
  box-shadow: 0 0 8px rgba(240, 208, 120, 0.16);
}

.scan-circle__tick--n,
.scan-circle__tick--s {
  left: 50%;
  margin-left: -9px;
  transform: rotate(90deg);
}

.scan-circle__tick--e,
.scan-circle__tick--w {
  top: 50%;
  margin-top: -1px;
}

.scan-circle__tick--n {
  top: 8%;
}

.scan-circle__tick--e {
  right: 9%;
}

.scan-circle__tick--s {
  bottom: 8%;
}

.scan-circle__tick--w {
  left: 9%;
}

.scan-circle__ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
}

.scan-circle__ring--outer {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(240, 208, 120, 0.12);
  box-shadow:
    0 0 18px rgba(212, 168, 67, 0.05),
    inset 0 0 20px rgba(212, 168, 67, 0.03);
  animation:
    ring-pulse 5.6s ease-in-out infinite,
    ring-spin-cw 36s linear infinite;
}

.scan-circle--activated .scan-circle__ring--outer {
  animation:
    ring-pulse 5.6s ease-in-out infinite,
    ring-spin-cw 36s linear infinite,
    ring-outer-burst 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.scan-circle__ring--mid {
  width: 72%;
  height: 72%;
  border: 1px dashed rgba(212, 168, 67, 0.16);
  box-shadow:
    0 0 14px rgba(212, 168, 67, 0.05),
    inset 0 0 16px rgba(212, 168, 67, 0.04);
  animation:
    ring-pulse 4.8s ease-in-out 0.7s infinite,
    ring-spin-ccw 28s linear infinite;
}

.scan-circle--activated .scan-circle__ring--mid {
  animation:
    ring-pulse 4.8s ease-in-out 0.7s infinite,
    ring-spin-ccw 28s linear infinite,
    ring-mid-burst 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.scan-circle__ring--inner {
  width: 45%;
  height: 45%;
  border: 1px solid rgba(232, 220, 200, 0.16);
  box-shadow:
    0 0 10px rgba(240, 208, 120, 0.04),
    inset 0 0 12px rgba(212, 168, 67, 0.04);
  animation:
    ring-pulse 4.2s ease-in-out 1.4s infinite,
    ring-spin-cw 18s linear infinite;
}

.scan-circle--activated .scan-circle__ring--inner {
  animation:
    ring-pulse 4.2s ease-in-out 1.4s infinite,
    ring-spin-cw 18s linear infinite,
    ring-inner-burst 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.scan-circle__runes {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--heading);
  white-space: nowrap;
  text-shadow: 0 0 8px currentColor;
}

.scan-circle__runes--outer {
  font-size: 0.72rem;
  letter-spacing: 0.32em;
  color: rgba(240, 208, 120, 0.44);
  animation: rune-fade 5.4s ease-in-out infinite;
}

.scan-circle__runes--mid {
  font-size: 0.58rem;
  letter-spacing: 0.26em;
  color: rgba(212, 168, 67, 0.52);
  animation: rune-fade 4.6s ease-in-out 0.8s infinite;
}

.scan-circle__runes--inner {
  font-size: 0.54rem;
  letter-spacing: 0.18em;
  color: rgba(232, 220, 200, 0.4);
  animation: rune-fade 4.1s ease-in-out 1.5s infinite;
}

.scan-circle__core {
  position: relative;
  width: 25%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  z-index: 2;
}

.scan-circle--activated .scan-circle__core {
  animation: core-burst 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.scan-circle__seal {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(212, 168, 67, 0.22);
  background:
    radial-gradient(
      circle,
      rgba(11, 11, 26, 0.9) 0%,
      rgba(11, 11, 26, 0.8) 55%,
      rgba(212, 168, 67, 0.05) 74%,
      transparent 84%
    );
  box-shadow:
    0 0 10px rgba(212, 168, 67, 0.08),
    inset 0 0 12px rgba(212, 168, 67, 0.06);
  animation: seal-breathe 4s ease-in-out infinite;
}

.scan-circle__spark {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(240, 208, 120, 0.95),
    rgba(212, 168, 67, 0.18) 58%,
    transparent 75%
  );
  box-shadow: 0 0 10px rgba(240, 208, 120, 0.22);
  opacity: 0;
  animation: spark-drift 9s linear infinite;
}

.scan-circle__spark--1 {
  top: 18%;
  left: 23%;
  animation-delay: 0s;
}

.scan-circle__spark--2 {
  top: 68%;
  right: 20%;
  animation-delay: 2.8s;
}

.scan-circle__spark--3 {
  bottom: 20%;
  left: 31%;
  animation-delay: 5.2s;
}

:slotted(.scan-circle__icon) {
  position: relative;
  z-index: 1;
  font-size: 3rem;
  color: var(--accent);
  filter:
    drop-shadow(0 0 3px rgba(11, 11, 26, 0.95))
    drop-shadow(0 0 8px rgba(212, 168, 67, 0.16));
  animation: icon-float 3s ease-in-out infinite;
}

.scan-circle--activated :slotted(.scan-circle__icon) {
  animation:
    icon-float 3s ease-in-out infinite,
    icon-burst 900ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

@keyframes halo-breathe {
  0%,
  100% {
    opacity: 0.72;
    transform: scale(0.97);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes halo-burst {
  0% {
    opacity: 1;
    filter: blur(18px);
  }
  45% {
    opacity: 1;
    filter: blur(24px);
  }
  100% {
    opacity: 0;
    filter: blur(32px);
  }
}

@keyframes geometry-flare {
  0% {
    opacity: 0.78;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes seal-breathe {
  0%,
  100% {
    transform: scale(0.98);
  }
  50% {
    transform: scale(1.02);
  }
}

@keyframes icon-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes icon-burst {
  0% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
    filter:
      drop-shadow(0 0 3px rgba(11, 11, 26, 0.95))
      drop-shadow(0 0 8px rgba(212, 168, 67, 0.16));
  }
  35% {
    opacity: 1;
    transform: scale(1.12) rotate(12deg);
    filter:
      drop-shadow(0 0 4px rgba(11, 11, 26, 0.95))
      drop-shadow(0 0 18px rgba(240, 208, 120, 0.42));
  }
  100% {
    opacity: 0;
    transform: scale(1.36) rotate(30deg);
    filter:
      drop-shadow(0 0 2px rgba(11, 11, 26, 0.95))
      drop-shadow(0 0 24px rgba(240, 208, 120, 0.18));
  }
}

@keyframes ring-pulse {
  0%,
  100% {
    opacity: 0.48;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.92;
    transform: translate(-50%, -50%) scale(1.03);
  }
}

@keyframes ring-outer-burst {
  0% {
    opacity: 0.92;
    transform: translate(-50%, -50%) scale(1);
    border-color: rgba(240, 208, 120, 0.12);
  }
  40% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.08) rotate(50deg);
    border-color: rgba(240, 208, 120, 0.42);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.28) rotate(160deg);
    border-color: rgba(240, 208, 120, 0.08);
  }
}

@keyframes ring-mid-burst {
  0% {
    opacity: 0.88;
    transform: translate(-50%, -50%) scale(1);
  }
  45% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12) rotate(-90deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.32) rotate(-220deg);
  }
}

@keyframes ring-inner-burst {
  0% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1);
  }
  35% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.18) rotate(110deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45) rotate(260deg);
  }
}

@keyframes core-burst {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  40% {
    opacity: 1;
    transform: scale(1.18);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes ring-spin-cw {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes ring-spin-ccw {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
}

@keyframes rune-fade {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes spark-drift {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  15% {
    opacity: 0.95;
  }
  50% {
    opacity: 0.48;
    transform: translate(16px, -10px) scale(1.15);
  }
  85% {
    opacity: 0.18;
  }
  100% {
    opacity: 0;
    transform: translate(-8px, -20px) scale(0.4);
  }
}

@media (max-width: 600px) {
  .scan-circle {
    width: min(360px, 88vw);
  }

  :slotted(.scan-circle__icon) {
    font-size: 2.6rem;
  }
}
</style>
