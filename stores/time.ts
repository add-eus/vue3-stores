import { useIntervalFn } from "@vueuse/core";
import moment from "moment-with-locales-es6";
import type { Ref } from "vue";
import { computed, ref } from "vue";

function formatMoment(momentElement: moment, format?: string) {
    if (typeof format === "string") {
        return momentElement.format(format);
    }
    return momentElement;
}

export interface Options {
    interval?: number;
}

export function useTime(
    date: Ref<moment>,
    format?: string | Options,
    options?: Options
): Ref<string> {
    if (typeof format === "object") {
        options = format;
        format = undefined;
    } else if (typeof options === "undefined")
        options = {
            interval: 1000,
        };

    const currentTime = ref(formatMoment(date.value, format));

    useIntervalFn(() => {
        currentTime.value = formatMoment(
            date.value,
            typeof format === "object" ? undefined : format
        );
    }, options.interval);

    return currentTime;
}

export function useCurrentTime(
    format?: string | Options,
    options?: Options
): Ref<string | moment> {
    if (typeof format === "object") {
        options = format;
        format = undefined;
    } else if (typeof options === "undefined")
        options = {
            interval: 1000,
        };

    const currentTime = ref(moment());
    useIntervalFn(() => {
        currentTime.value = moment();
    }, options.interval);

    return useTime(currentTime, format, options);
}
