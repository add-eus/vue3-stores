/**
 * This is a store that hold responsive state
 *
 * Using useMediaQuery from @vueuse/core allow to bind
 * css media queries results to ref
 *
 * We can import and use isLargeScreen, isMediumScreen anywhere in our project
 * @see /src/components/navigation/LandingNavigation.vue
 * @see /src/state/activeNavbarState.ts
 */

import { OrientationLockType, useMediaQuery } from "@vueuse/core";

export const isLargeScreen = useMediaQuery("(min-width: 1023px)");
export const isMediumScreen = useMediaQuery("(min-width: 767px)");
export const isMobileScreen = useMediaQuery("(max-width: 767px)");

export function lockOrientation(orientation: OrientationLockType) {
    if (screen.orientation && typeof screen.orientation.lock === "function") {
        screen.orientation.lock(orientation);
    }
}
