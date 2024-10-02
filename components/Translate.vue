<script setup lang="ts">
import { useTranslate } from "../stores/translate";
import { useSlots, computed, Ref } from "vue";

export type TranslateProps = {
    path?: string;
    values?: any;
};

const props = withDefaults(defineProps<TranslateProps>(), {
    values: {},
});

const slots = useSlots();

let path: Ref;
if (slots.default) {
    path = computed(() => {
        const compiledSlots = slots.default();
        if (!compiledSlots || compiledSlots.length == 0) return "";
        return (compiledSlots[0].children || "").trim();
    });
} else {
    path = computed(() => props.path);
}

const values = computed(() => props.values);
const translated = useTranslate(path, values);
</script>

<template>
    {{ translated }}
</template>