import { ref, watch, onBeforeUnmount } from "vue";
import type { Ref } from "vue";

export interface WandRevealState {
  scanRevealActive: Ref<boolean>;
  showScannedView: Ref<boolean>;
}

/**
 * Manages the wand-scan reveal animation.
 *
 * When `hasWand` transitions from false to true, a 900ms animation plays
 * (scanRevealActive = true), after which the full scanned view is shown
 * (showScannedView = true). When `hasWand` goes back to false, both reset.
 *
 * @param hasWand - A reactive boolean indicating whether a wand has been scanned.
 */
export function useWandReveal(hasWand: Ref<boolean>): WandRevealState {
  const scanRevealActive = ref(false);
  const showScannedView = ref(false);
  let revealTimer: ReturnType<typeof setTimeout> | undefined;

  watch(hasWand, (scanned) => {
    clearTimeout(revealTimer);

    if (!scanned) {
      scanRevealActive.value = false;
      showScannedView.value = false;
      return;
    }

    scanRevealActive.value = true;
    showScannedView.value = false;
    revealTimer = setTimeout(() => {
      scanRevealActive.value = false;
      showScannedView.value = true;
    }, 900);
  });

  onBeforeUnmount(() => {
    clearTimeout(revealTimer);
  });

  return { scanRevealActive, showScannedView };
}
