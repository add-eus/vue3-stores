import { ref } from "vue";
import { createGlobalState } from "@vueuse/core";

export const useViewWrapper = createGlobalState(() => {
    const isPushed = ref(false);
    const isPushedBlock = ref(false);
    const pageTitle = ref("Welcome");

    function setPushed(value: boolean) {
        isPushed.value = value;
    }
    function setPushedBlock(value: boolean) {
        isPushedBlock.value = value;
    }
    function setPageTitle(value: string) {
        pageTitle.value = value;
    }

    return {
        isPushed,
        isPushedBlock,
        pageTitle,
        setPushed,
        setPushedBlock,
        setPageTitle,
    } as const;
});