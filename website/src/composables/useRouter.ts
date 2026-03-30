import { ref, computed } from "vue";

export type PageName = "hunt" | "archive" | "toybox" | "initialize" | "configureSpot";

export function useRouter() {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  let initialPageName: PageName = "hunt";

  // Check management.html entry point
  const isManagementFile = path.includes("management.html") || path.endsWith("/management/");

  if (params.has("initialize") || (isManagementFile && !params.has("configureSpot"))) {
    initialPageName = "initialize";
  } else if (params.has("configureSpot")) {
    initialPageName = "configureSpot";
  } else if (params.has("toybox")) {
    initialPageName = "toybox";
  } else if (params.has("archive")) {
    initialPageName = "archive";
  }

  const currentPage = ref<PageName>(initialPageName);

  const isManagement = computed(() => {
    return currentPage.value === "initialize" || currentPage.value === "configureSpot";
  });

  return { currentPage, isManagement };
}
