<template>
  <div class="magic-bg" aria-hidden="true">
    <!-- Star layers removed for clarity -->
    <!-- Slow aurora wisps -->
    <div class="aurora-layer">
      <div class="aurora a1"></div>
      <div class="aurora a2"></div>
      <div class="aurora a3"></div>
    </div>
    <!-- Animated magical runes -->
    <div class="motes">
      <span
        v-for="(rune, i) in motes"
        :key="i"
        class="mote"
        :style="{
          left: rune.startX + '%',
          top: rune.startY + '%',
          animationDelay: rune.delay + 's',
          animationDuration: rune.duration + 's',
          '--end-x': rune.endX + '%',
          '--end-y': rune.endY + '%',
          '--rotate': rune.rotate + 'deg',
        }"
      >
        {{ rune.char }}
      </span>
    </div>
    <div class="vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// Only magical rune-like Unicode symbols
const runeChars = [
  "ᚠ",
  "ᚢ",
  "ᚦ",
  "ᚱ",
  "ᚷ",
  "ᚹ",
  "ᚺ",
  "ᛁ",
  "ᛇ",
  "ᛈ",
  "ᛋ",
  "ᛏ",
  "ᛒ",
  "ᛖ",
  "ᛚ",
  "ᛟ",
  "ᛞ",
  "ᛠ",
  "ᛣ",
  "ᛦ",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

const motes = ref(
  Array.from({ length: 12 }, (_, i) => {
    const char = runeChars[Math.floor(Math.random() * runeChars.length)];
    return {
      char,
      startX: randomBetween(0, 90),
      startY: randomBetween(0, 90),
      endX: randomBetween(0, 90),
      endY: randomBetween(0, 90),
      delay: randomBetween(0, 24),
      duration: randomBetween(32, 48),
      rotate: randomBetween(-90, 90),
    };
  }),
);
</script>

<style scoped>
.magic-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: radial-gradient(
    ellipse at 50% 0%,
    #1a1040 0%,
    #0b0b1a 60%,
    #050510 100%
  );
}

/* Star layers using box-shadow for many tiny dots */
.stars {
  position: absolute;
  inset: 0;
  animation: drift 120s linear infinite;
}

.mote {
  position: absolute;
  font-size: 2.8rem;
  opacity: 0;
  color: rgba(212, 168, 67, 0.85);
  filter: drop-shadow(0 0 16px rgba(212, 168, 67, 0.45))
    drop-shadow(0 0 32px rgba(155, 109, 255, 0.18));
  animation-name: rune-float;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
  will-change: transform, opacity, filter;
}

@keyframes rune-float {
  0% {
    opacity: 0;
    filter: drop-shadow(0 0 0px rgba(212, 168, 67, 0));
    transform: translate(0, 0) scale(0.9) rotate(0deg);
  }
  10% {
    opacity: 1;
    filter: drop-shadow(0 0 24px rgba(212, 168, 67, 0.5));
  }
  50% {
    opacity: 0.85;
    filter: drop-shadow(0 0 32px rgba(155, 109, 255, 0.25));
    transform: translate(
        calc(var(--end-x, 0%) - var(--start-x, 0%)),
        calc(var(--end-y, 0%) - var(--start-y, 0%))
      )
      scale(1.15) rotate(var(--rotate, 0deg));
  }
  90% {
    opacity: 1;
    filter: drop-shadow(0 0 24px rgba(212, 168, 67, 0.5));
  }
  100% {
    opacity: 0;
    filter: drop-shadow(0 0 0px rgba(212, 168, 67, 0));
    transform: translate(0, 0) scale(0.9) rotate(0deg);
  }
}

@keyframes drift {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-20px);
  }
}

/* ═══ Aurora wisps ═══ */
.aurora-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0.85;
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px) drop-shadow(0 0 60px rgba(180, 150, 255, 0.25));
  will-change: transform, opacity;
}

.a1 {
  width: 50vw;
  height: 30vh;
  top: 10%;
  left: -10%;
  background: radial-gradient(
    ellipse,
    rgba(155, 109, 255, 0.4),
    transparent 70%
  );
  animation: aurora-drift-1 25s ease-in-out infinite alternate;
}

.a2 {
  width: 45vw;
  height: 25vh;
  top: 50%;
  right: -15%;
  background: radial-gradient(
    ellipse,
    rgba(212, 168, 67, 0.3),
    transparent 70%
  );
  animation: aurora-drift-2 30s ease-in-out infinite alternate;
}

.a3 {
  width: 40vw;
  height: 20vh;
  bottom: 5%;
  left: 20%;
  background: radial-gradient(
    ellipse,
    rgba(110, 90, 200, 0.3),
    transparent 70%
  );
  animation: aurora-drift-3 22s ease-in-out infinite alternate;
}

@keyframes aurora-drift-1 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(15vw, 8vh) scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: translate(5vw, -5vh) scale(0.9);
    opacity: 0.25;
  }
}

@keyframes aurora-drift-2 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.25;
  }
  50% {
    transform: translate(-12vw, -10vh) scale(1.15);
    opacity: 0.45;
  }
  100% {
    transform: translate(-5vw, 5vh) scale(0.95);
    opacity: 0.2;
  }
}

@keyframes aurora-drift-3 {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.2;
  }
  50% {
    transform: translate(10vw, -6vh) scale(1.3);
    opacity: 0.4;
  }
  100% {
    transform: translate(-8vw, 3vh) scale(0.85);
    opacity: 0.15;
  }
}

/* ═══ Floating magical glyphs ═══ */
.motes {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.mote {
  position: absolute;
  left: var(--mx);
  top: var(--my);
  font-size: 2.8rem;
  opacity: 0;
  animation-delay: var(--md, 0s);
  animation-fill-mode: both;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  will-change: transform, opacity;
}

/* Three distinct lazy drift paths so they feel random */
.mote-a {
  color: rgba(212, 168, 67, 0.65);
  filter: drop-shadow(0 0 8px rgba(212, 168, 67, 0.45))
    drop-shadow(0 0 16px rgba(212, 168, 67, 0.18));
  animation-name: glyph-drift-a;
  animation-duration: 45s;
}

.mote-b {
  color: rgba(155, 109, 255, 0.55);
  filter: drop-shadow(0 0 8px rgba(155, 109, 255, 0.35))
    drop-shadow(0 0 16px rgba(155, 109, 255, 0.15));
  animation-name: glyph-drift-b;
  animation-duration: 55s;
}

.mote-c {
  color: rgba(180, 150, 220, 0.5);
  filter: drop-shadow(0 0 8px rgba(180, 150, 220, 0.28))
    drop-shadow(0 0 16px rgba(180, 150, 220, 0.12));
  animation-name: glyph-drift-c;
  animation-duration: 50s;
}

@keyframes glyph-drift-a {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg) scale(0.7);
  }
  8% {
    opacity: 0.25;
  }
  25% {
    opacity: 0.35;
    transform: translate(12px, -20px) rotate(30deg) scale(1);
  }
  50% {
    opacity: 0.2;
    transform: translate(-8px, -45px) rotate(-15deg) scale(0.9);
  }
  75% {
    opacity: 0.3;
    transform: translate(18px, -30px) rotate(20deg) scale(1.05);
  }
  92% {
    opacity: 0.15;
  }
  100% {
    opacity: 0;
    transform: translate(5px, -60px) rotate(45deg) scale(0.6);
  }
}

@keyframes glyph-drift-b {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg) scale(0.8);
  }
  10% {
    opacity: 0.2;
  }
  30% {
    opacity: 0.3;
    transform: translate(-15px, -18px) rotate(-25deg) scale(1.1);
  }
  55% {
    opacity: 0.15;
    transform: translate(10px, -40px) rotate(10deg) scale(0.85);
  }
  80% {
    opacity: 0.25;
    transform: translate(-5px, -55px) rotate(-35deg) scale(1);
  }
  95% {
    opacity: 0.1;
  }
  100% {
    opacity: 0;
    transform: translate(-12px, -70px) rotate(-50deg) scale(0.65);
  }
}

@keyframes glyph-drift-c {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg) scale(0.75);
  }
  12% {
    opacity: 0.2;
  }
  20% {
    opacity: 0.3;
    transform: translate(20px, -12px) rotate(15deg) scale(1);
  }
  45% {
    opacity: 0.15;
    transform: translate(-12px, -35px) rotate(-20deg) scale(0.95);
  }
  70% {
    opacity: 0.25;
    transform: translate(8px, -50px) rotate(35deg) scale(1.1);
  }
  90% {
    opacity: 0.1;
  }
  100% {
    opacity: 0;
    transform: translate(15px, -65px) rotate(50deg) scale(0.7);
  }
}
</style>
