import { computed } from "vue";
import { useColor } from "./color";

let iconClasses: string[] = [],
    iconStyles: string[] = [];

export function setIconClasses(iconClassesArg: string[]) {
    iconClasses = iconClassesArg;
}

export function getIconClasses() {
    return iconClasses;
}

export function setIconStyles(iconStylesArg: string[]) {
    iconStyles = iconStylesArg;
}

export function getIconStyles(computedColor) {
    const color = useColor(computedColor);

    return computed(() => {
        return [...iconStyles, `color: ${color.value}`];
    });
}
