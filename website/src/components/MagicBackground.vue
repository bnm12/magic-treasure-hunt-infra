<template>
  <div class="magic-bg" aria-hidden="true">
    <div class="aurora-layer">
      <div class="aurora a1"></div>
      <div class="aurora a2"></div>
      <div class="aurora a3"></div>
    </div>

    <div class="motes">
      <span
        v-for="(rune, i) in motes"
        :key="rune.id"
        :class="['mote', `mote-${rune.variant}`]"
        :style="{
          left: rune.startX + '%',
          top: rune.startY + '%',
          '--mote-duration': rune.duration + 's',
          '--sway-duration': rune.swayDuration + 's',
          '--phase': rune.phase + 's',
          '--drift-scale': rune.driftScale,
          '--drift-x-1': rune.driftX1 + 'vw',
          '--drift-y-1': rune.driftY1 + 'vh',
          '--drift-x-2': rune.driftX2 + 'vw',
          '--drift-y-2': rune.driftY2 + 'vh',
          '--drift-x-3': rune.driftX3 + 'vw',
          '--drift-y-3': rune.driftY3 + 'vh',
          '--rotate': rune.rotate + 'deg',
        }"
        @animationiteration="handleMoteIteration(i, $event)"
      >
        {{ rune.char }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

type Mote = {
  id: number;
  char: string;
  variant: number;
  startX: number;
  startY: number;
  duration: number;
  swayDuration: number;
  phase: number;
  driftScale: number;
  driftX1: number;
  driftY1: number;
  driftX2: number;
  driftY2: number;
  driftX3: number;
  driftY3: number;
  rotate: number;
};

const runeChars = [
  "\u16A0",
  "\u16A2",
  "\u16A6",
  "\u16B1",
  "\u16B7",
  "\u16B9",
  "\u16BA",
  "\u16C1",
  "\u16C7",
  "\u16C8",
  "\u16CB",
  "\u16CF",
  "\u16D2",
  "\u16D6",
  "\u16DA",
  "\u16DE",
  "\u16DF",
  "\u16E0",
  "\u16E3",
  "\u16E6",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function shuffledRunes(chars: string[]) {
  const pool = [...chars];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

let nextMoteId = 0;

function pickRuneChar(exclude: string[]) {
  const available = runeChars.filter((char) => !exclude.includes(char));
  const pool = available.length > 0 ? available : runeChars;

  return pool[Math.floor(Math.random() * pool.length)];
}

function createMote(char: string, phase = 0): Mote {
  return {
    id: nextMoteId += 1,
    char,
    variant: Math.floor(randomBetween(1, 4)),
    startX: randomBetween(6, 90),
    startY: randomBetween(10, 84),
    duration: randomBetween(46, 72),
    swayDuration: randomBetween(18, 28),
    phase,
    driftScale: randomBetween(0.72, 1),
    driftX1: randomBetween(-4, 4),
    driftY1: randomBetween(-5, 5),
    driftX2: randomBetween(-8, 8),
    driftY2: randomBetween(-9, 9),
    driftX3: randomBetween(-12, 12),
    driftY3: randomBetween(-11, 11),
    rotate: randomBetween(-75, 75),
  };
}

function refreshMote(index: number, phase: number) {
  const activeChars = motes.value
    .filter((_, moteIndex) => moteIndex !== index)
    .map((mote) => mote.char);

  motes.value[index] = createMote(pickRuneChar(activeChars), phase);
}

function handleMoteIteration(index: number, event: AnimationEvent) {
  if (event.animationName !== "glyph-drift") {
    return;
  }

  refreshMote(index, 0);
}

const motes = ref(
  shuffledRunes(runeChars)
    .slice(0, 10)
    .map((char) => createMote(char, randomBetween(-70, 0))),
);
</script>

<style scoped>
.magic-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 0%,
    #1a1040 0%,
    #0b0b1a 60%,
    #050510 100%
  );
}

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

.motes {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.mote {
  position: absolute;
  font-family: var(--heading);
  font-size: clamp(2.25rem, 4vw, 3.4rem);
  line-height: 1;
  color: var(--mote-color-a);
  opacity: 0;
  text-shadow:
    0 0 8px var(--mote-glow-soft),
    0 0 18px var(--mote-glow-main);
  animation:
    glyph-drift var(--mote-duration, 56s) cubic-bezier(0.38, 0.04, 0.18, 1)
      infinite both,
    glyph-sway var(--sway-duration, 22s) ease-in-out infinite alternate;
  animation-delay: var(--phase, 0s), var(--phase, 0s);
  will-change: transform, opacity, filter;
}

.mote-a {
  color: var(--mote-color-a);
  filter: drop-shadow(0 0 10px var(--mote-shadow-a))
    drop-shadow(0 0 26px var(--mote-shadow-deep-a));
}

.mote-b {
  color: var(--mote-color-b);
  filter: drop-shadow(0 0 8px var(--mote-shadow-b))
    drop-shadow(0 0 20px var(--mote-shadow-deep-b));
}

.mote-c {
  color: var(--mote-color-c);
  filter: drop-shadow(0 0 10px var(--mote-shadow-c))
    drop-shadow(0 0 24px var(--mote-shadow-deep-c));
}

@keyframes glyph-drift {
  0% {
    opacity: 0;
    filter: blur(1px);
    transform: translate3d(0, 0, 0) scale(0.72) rotate(0deg);
  }
  14% {
    opacity: 0.06;
    filter: blur(0.5px);
  }
  28% {
    opacity: 0.2;
    transform: translate3d(
        calc(var(--drift-x-1) * var(--drift-scale, 1)),
        calc(var(--drift-y-1) * var(--drift-scale, 1)),
        0
      )
      scale(0.94)
      rotate(calc(var(--rotate) * 0.22));
  }
  47% {
    opacity: 0.12;
    transform: translate3d(
        calc(var(--drift-x-1) * 0.55 * var(--drift-scale, 1)),
        calc(var(--drift-y-1) * 1.25 * var(--drift-scale, 1)),
        0
      )
      scale(1.02) rotate(calc(var(--rotate) * 0.45));
  }
  63% {
    opacity: 0.26;
    filter: blur(0);
    transform: translate3d(
        calc(var(--drift-x-2) * var(--drift-scale, 1)),
        calc(var(--drift-y-2) * var(--drift-scale, 1)),
        0
      )
      scale(1.08)
      rotate(calc(var(--rotate) * 0.72));
  }
  82% {
    opacity: 0.1;
    transform: translate3d(
        calc(var(--drift-x-3) * var(--drift-scale, 1)),
        calc(var(--drift-y-3) * var(--drift-scale, 1)),
        0
      )
      scale(0.96)
      rotate(var(--rotate));
  }
  100% {
    opacity: 0;
    filter: blur(1px);
    transform: translate3d(
        calc(var(--drift-x-3) * 1.15 * var(--drift-scale, 1)),
        calc(var(--drift-y-3) * 1.15 * var(--drift-scale, 1)),
        0
      )
      scale(0.72) rotate(calc(var(--rotate) * 1.2));
  }
}

@keyframes glyph-sway {
  0% {
    margin-left: -0.4vw;
    margin-top: -0.3vh;
  }
  50% {
    margin-left: 0.45vw;
    margin-top: 0.5vh;
  }
  100% {
    margin-left: -0.2vw;
    margin-top: 0.25vh;
  }
}
</style>
