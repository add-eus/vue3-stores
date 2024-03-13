import { acceptHMRUpdate, defineStore } from "pinia";

const navigatorVibrate =
    navigator.vibrate ||
    navigator.webkitVibrate ||
    navigator.mozVibrate ||
    navigator.msVibrate;

const enabled = !!navigatorVibrate;

// calls to navigatorVibrate always bound to global navigator object

export const useHaptic = defineStore("haptic", () => {
    return {
        vibrate(tempo = 5) {
            if (enabled) {
                // vibrate will not work unless bound to navigator global
                navigatorVibrate.apply(navigator, [tempo]);
                return true;
            }
        },
    };
});

/**
 * Pinia supports Hot Module replacement so you can edit your stores and
 * interact with them directly in your app without reloading the page.
 *
 * @see https://pinia.esm.dev/cookbook/hot-module-replacement.html
 * @see https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useHaptic, import.meta.hot));
}
