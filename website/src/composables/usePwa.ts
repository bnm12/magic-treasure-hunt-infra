import { ref, computed, onMounted, onBeforeUnmount, type ComputedRef } from "vue";
import { resolveVersionedAppUrl } from "../utils/appUrl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaState {
  canInstall: ComputedRef<boolean>;
  promptInstall: () => Promise<void>;
}

export function usePwa(): PwaState {
  const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isStandalone = ref(false);

  // ── Service Worker ─────────────────────────────────────────────────────

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(resolveVersionedAppUrl("sw.js"))
        .catch((error: unknown) => {
          console.error("Service worker registration failed:", error);
        });
    });
  }

  // ── Install Prompt ─────────────────────────────────────────────────────

  function detectStandaloneMode() {
    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };
    isStandalone.value =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true;
  }

  function handleBeforeInstallPrompt(event: Event) {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    deferredInstallPrompt.value = installEvent;
  }

  function handleAppInstalled() {
    deferredInstallPrompt.value = null;
    detectStandaloneMode();
  }

  async function promptInstall(): Promise<void> {
    if (!deferredInstallPrompt.value) return;

    await deferredInstallPrompt.value.prompt();
    const choice = await deferredInstallPrompt.value.userChoice;

    if (choice.outcome !== "accepted") return;

    deferredInstallPrompt.value = null;
    detectStandaloneMode();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  onMounted(() => {
    detectStandaloneMode();
    registerServiceWorker();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  });

  // ── Public API ─────────────────────────────────────────────────────────

  const canInstall = computed(
    () => deferredInstallPrompt.value !== null && !isStandalone.value,
  );

  return { canInstall, promptInstall };
}
