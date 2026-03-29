import { ref, onMounted } from "vue";

export type PageName = "hunt" | "archive" | "toybox" | "initialize" | "configureSpot";

export interface RouterState {
  currentPage: ReturnType<typeof ref<PageName>>;
  initializeYear: ReturnType<typeof ref<number>>;
}

export function useRouter(): RouterState {
  const currentPage = ref<PageName>("hunt");
  const initializeYear = ref<number>(new Date().getFullYear());

  onMounted(() => {
    const url = new URL(window.location.href);

    if (
      url.pathname.endsWith("/initialize") ||
      url.pathname.endsWith("/initialize/") ||
      url.searchParams.has("initialize")
    ) {
      currentPage.value = "initialize";
      const yearParam = url.searchParams.get("year");
      if (yearParam) {
        const year = parseInt(yearParam, 10);
        if (!isNaN(year)) {
          initializeYear.value = year;
        }
      }
      return;
    }

    if (
      url.pathname.endsWith("/configureSpot") ||
      url.pathname.endsWith("/configureSpot/") ||
      url.searchParams.has("configureSpot")
    ) {
      currentPage.value = "configureSpot";
      return;
    }

    // Default page is "hunt"; no change needed
  });

  return { currentPage, initializeYear };
}
