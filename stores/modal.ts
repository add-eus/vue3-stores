import { ref } from "vue";
import { until } from "@vueuse/core";
import ModalComponent from "../components/modal/Modal.vue";
import PromptComponent from "../components/modal/Prompt.vue";
import VButton from "../components/base/button/VButton.vue";
import { useComponent } from "./component";
import { acceptHMRUpdate, defineStore } from "pinia";

export class Modal {
    isClosed = ref(false);
    component: any = null;
    props: any = {};
    actions: any[] = [];
    events: any = {};
    title: string = "";
    reference: any = null;
    isCloseDisabled: boolean = false;
    size: string;
    onClose?: () => void;

    constructor(component: any, options: any) {
        this.component = component;
        this.title = options.title !== undefined ? options.title : "";
        this.actions = options.actions !== undefined ? options.actions : [];
        this.isCloseDisabled =
            options.isCloseDisabled !== undefined ? options.isCloseDisabled : false;
        this.props = options.props !== undefined ? options.props : {};
        this.events = options.events !== undefined ? options.events : {};
        this.size = options.size !== undefined ? options.size : "medium";
        this.onClose = options.onClose;
    }

    close() {
        this.isClosed.value = true;
        this.onClose?.();
    }

    disableClose() {
        this.isCloseDisabled = true;
    }

    enableClose() {
        this.isCloseDisabled = false;
    }
}

export const useModal = defineStore("modal", () => {
    const { initialize, destroy } = useComponent();
    async function prompt(
        titleArg: string,
        subTitleArg: string,
        messageArg: string,
        cancelArg: string,
        confirmArg: string,
        confirmColorArg: string = "primary"
    ) {
        const cancelReason = ref<any>(null);
        const successReason = ref<any>(null);

        const modal = createModal(PromptComponent, {
            title: titleArg,
            props: {
                subTitle: subTitleArg,
                message: messageArg,
            },
            actions: [
                {
                    component: VButton,
                    content: cancelArg,
                    props: {},
                    events: {
                        click() {
                            cancelReason.value = "closed";
                            modal.close();
                        },
                    },
                },
                {
                    component: VButton,
                    content: confirmArg,
                    props: {
                        color: confirmColorArg,
                    },
                    events: {
                        click() {
                            successReason.value = "success";
                            modal.close();
                        },
                    },
                },
            ],
        });

        return new Promise((resolve, reject) => {
            modal.onClose = () => {
                if (successReason.value !== null) resolve("success");
                else reject("closed");
            };
        });
    }

    function createModal(component: any, options: any) {
        const modal = new Modal(component, options);
        const vNode = initialize(ModalComponent, { modal: modal });

        void until(modal.isClosed)
            .toBe(true)
            .then(() => {
                destroy(vNode);
            });
        return modal;
    }

    return {
        prompt,
        createModal,
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
    import.meta.hot.accept(acceptHMRUpdate(useModal, import.meta.hot));
}
