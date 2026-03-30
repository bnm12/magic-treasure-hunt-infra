import { ref, computed } from "vue";

export type PageName = "hunt" | "archive" | "toybox" | "initialize" | "configureSpot";

export function useRouter() {
  const params = new URLSearchParams(window.location.search);

  // Detection for which app we are in can be done by looking at the path or query params.
  // Since we have two entry points, they both use this same composable.

  const isManagementApp = window.location.pathname.includes("management.html") || params.has("initialize") || params.has("configureSpot");

  const initialPage = ref<PageName>("hunt");

  if (params.has("initialize")) {
    initialPage.value = "initialize";
  } else if (params.has("configureSpot")) {
    initialPage.value = "configureSpot";
  } else if (isManagementApp) {
    // Default for management app
    initialPage.value = "initialize";
  }

  const currentPage = ref<PageName>(initialPage.value);

  const isManagement = computed(() => {
    return currentPage.value === "initialize" || currentPage.value === "configureSpot";
  });

  return { currentPage, isManagement };
}
