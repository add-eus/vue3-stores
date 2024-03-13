import { createGlobalState } from "@vueuse/core";

const navigatorVibrate =
    navigator.vibrate ||
    navigator.webkitVibrate ||
    navigator.mozVibrate ||
    navigator.msVibrate;

const enabled = !!navigatorVibrate;

// calls to navigatorVibrate always bound to global navigator object

export const useHaptic = createGlobalState(() => {
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