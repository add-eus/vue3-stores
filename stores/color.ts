import { toValue, useCssVar } from "@vueuse/core";
import type { Ref } from "vue";

export type Colors =
    | "primary"
    | "primary-dark"
    | "primary-light"
    | "info"
    | "info-light"
    | "info-dark"
    | "warning"
    | "warning-light"
    | "warning-dark"
    | "danger"
    | "danger-light"
    | "danger-dark"
    | "success"
    | "success-light"
    | "success-dark"
    | "black-bis"
    | "black-ter"
    | "grey-darker"
    | "grey-dark"
    | "grey"
    | "grey-light"
    | "grey-lighter"
    | "white-ter"
    | "white-bis"
    | "gold"
    | "silver"
    | "bronze"
    | "orange"
    | "yellow"
    | "green"
    | "turquoise"
    | "cyan"
    | "blue"
    | "purple"
    | "red";

export function useColor(color: Ref<Colors> | Colors) {
    return useCssVar(() => {
        return `--${toValue(color)}`;
    }, document.body);
}

export function useInvertedColor(color: Ref<Colors> | Colors) {
    return useCssVar(() => {
        return `--${toValue(color)}-invert`;
    }, document.body);
}
