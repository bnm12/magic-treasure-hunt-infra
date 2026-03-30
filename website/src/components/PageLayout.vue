<template>
  <div class="page-layout">

    <!-- NFC compatibility error banner — full width, sticky -->
    <!-- Hidden on pages that don't need it (e.g. ConfigureSpotPage) -->
    <div
      v-if="showNfcBanner && nfcCompatMessage"
      class="nfc-banner"
      role="alert"
    >
      <span class="nfc-banner__text">{{ nfcCompatMessage }}</span>
    </div>

    <!-- NFC status toast — floating, always mounted so transitions work -->
    <NfcToast
      :visible="nfcToastVisible"
      :is-writing="isWriting"
      :status="nfcStatus"
    />

    <!-- Constrained content column -->
    <div class="page-layout__column">

      <!-- PageHero — only rendered when heroTitle is provided -->
      <PageHero
        v-if="heroTitle"
        :icon="heroIcon!"
        :eyebrow="heroEyebrow ?? ''"
        :title="heroTitle"
        :copy="heroCopy"
        :compact="heroCompact"
        :no-spin="heroNoSpin"
        :show-indicator="heroShowIndicator"
        :indicator-active="heroIndicatorActive"
        :indicator-label="heroIndicatorLabel"
      />

      <!-- Page-specific content -->
      <div class="page-layout__content">
        <slot />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import NfcToast from "./NfcToast.vue";
import PageHero from "./PageHero.vue";

withDefaults(
  defineProps<{
    // ── NFC banner ──────────────────────────────────────────────────────
    nfcCompatMessage: string;
    /** Set to false on pages where the NFC banner is irrelevant (ConfigureSpotPage) */
    showNfcBanner?: boolean;

    // ── NfcToast ─────────────────────────────────────────────────────────
    nfcToastVisible: boolean;
    isWriting: boolean;
    nfcStatus: string;

    // ── PageHero — all optional ──────────────────────────────────────────
    // The hero is only rendered when heroTitle is provided.
    // If heroTitle is omitted, no hero appears and no empty space is reserved.
    heroIcon?: Component;
    heroEyebrow?: string;
    heroTitle?: string;
    heroCopy?: string;
    heroCompact?: boolean;
    heroNoSpin?: boolean;
    heroShowIndicator?: boolean;
    heroIndicatorActive?: boolean;
    heroIndicatorLabel?: string;
  }>(),
  {
    showNfcBanner: true,
    heroCompact: false,
    heroNoSpin: false,
    heroShowIndicator: false,
    heroIndicatorActive: false,
  }
);
</script>

<style scoped>
/* ── Outer wrapper ─────────────────────────────────────────────────────── */
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
  /* Entry animation — fires when PageLayout mounts (i.e. when the tab changes) */
  animation: reveal-up 0.35s ease;
}

/* ── NFC banner ────────────────────────────────────────────────────────── */
/*
  Spans the full viewport width so it reads as a system-level alert.
  The text inside is constrained to the same max-width as the content
  column so it aligns visually with the rest of the page.
  Using word-break + overflow-wrap prevents long Danish strings from
  causing horizontal scroll or layout shift.
*/
.nfc-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  padding: 0.6rem 1rem;
  background: rgba(248, 113, 113, 0.12);
  border-bottom: 1px solid rgba(248, 113, 113, 0.3);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.nfc-banner__text {
  display: block;
  max-width: 680px;
  margin: 0 auto;
  color: var(--danger);
  font-size: 0.8rem;
  text-align: center;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
}

/* ── Constrained content column ────────────────────────────────────────── */
/*
  Single canonical content width for the entire app.
  All pages render their content inside this column.
  The 5rem bottom padding gives space for the fixed BottomNav.
*/
.page-layout__column {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 0 0 5rem;
}

/* ── Inner content area ─────────────────────────────────────────────────── */
/*
  Horizontal padding lives here so the PageHero (which manages its own
  internal padding) sits flush edge-to-edge while slot content is inset.
  Exception: HuntView has its own 1rem padding on its root element — that
  is fine because it renders inside this container.
*/
.page-layout__content {
  padding: 0 1rem;
}
</style>
