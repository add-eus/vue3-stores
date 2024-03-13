import { acceptHMRUpdate, defineStore } from "pinia";
import type { Component, RendererNode, VNode } from "vue";
import { render, createVNode, getCurrentInstance } from "vue";

export const useComponent = defineStore("component", () => {
    const instance = getCurrentInstance();
    if (!instance) throw new Error("No instance found");

    return {
        initialize(
            component: Component,
            props: any,
            container?: RendererNode | undefined
        ): VNode {
            if (container === undefined && instance.vnode.el !== null) {
                container = instance.vnode.el;
                if (container.nodeName === "#text") container = container.parentNode;
            }

            if (container === undefined) container = document.body;
            const vnode: VNode = createVNode(component, props);
            vnode.appContext = instance.appContext;

            const parent = container.appendChild(document.createElement("div"));
            render(vnode, parent);
            return vnode;
        },
        destroy(vnode: VNode): void {
            if (vnode.el === null) throw new Error("No element found");

            const parent: Element = vnode.el.parentNode as Element;
            const container = parent.parentNode as Element;
            render(null, parent as Element);
            container.removeChild(parent);
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
    import.meta.hot.accept(acceptHMRUpdate(useComponent, import.meta.hot));
}
