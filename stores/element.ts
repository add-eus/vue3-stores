import type { ComputedRef, Ref } from "vue";
import type { MaybeElement } from "@vueuse/core";
import { unrefElement } from "@vueuse/core";
import { useElementBounding } from "@vueuse/core";
import { computed } from "vue";

export const getScrollableParent = (node: HTMLElement | Element | undefined | null) => {
    if (!node) return null;

    const regex = /(auto|scroll)/;
    const parents = (_node, ps) => {
        if (_node.parentNode === null) {
            return ps;
        }
        return parents(_node.parentNode, ps.concat([_node]));
    };

    const style = (_node, prop) => getComputedStyle(_node, null).getPropertyValue(prop);
    const overflow = (_node) =>
        style(_node, "overflow") +
        style(_node, "overflow-y") +
        style(_node, "overflow-x");
    const scroll = (_node) => regex.test(overflow(_node));

    /* eslint-disable consistent-return */
    const scrollParent = (_node) => {
        if (!(_node instanceof HTMLElement || _node instanceof SVGElement)) {
            return;
        }

        const ps = parents(_node.parentNode, []);

        for (let i = 0; i < ps.length; i += 1) {
            if (scroll(ps[i])) {
                return ps[i];
            }
        }

        return document.scrollingElement || document.documentElement;
    };

    return scrollParent(node);
    /* eslint-enable consistent-return */
};

export function isInParentView(
    element: HTMLElement | Element | undefined | null,
    scrollableParent?: HTMLElement | Element | null | undefined
) {
    if (!element) return false;

    if (element.parentElement === null) return true;

    if (!scrollableParent || !scrollableParent.contains(element)) {
        scrollableParent = getScrollableParent(element);
    }

    if (!scrollableParent) return true;

    const rect = element.getBoundingClientRect();

    if (rect.height === 0 || rect.width === 0) return true;

    const parentRect = scrollableParent.getBoundingClientRect();

    return (
        rect.top + rect.height >= parentRect.top &&
        rect.left + rect.width >= parentRect.left &&
        rect.bottom - rect.height <= parentRect.bottom &&
        rect.right - rect.width <= parentRect.right
    );
}

export function isVisible(
    node: HTMLElement | Element | null | undefined,
    parentScrollable?: HTMLElement | Element | null
): boolean {
    if (!node) return false;

    const style = window.getComputedStyle(node);
    if (style.display === "none") return false;
    else if (style.opacity === 0) return false;
    else if (node === document.body) {
        return true;
    } else if (!isInParentView(node, parentScrollable)) {
        return false;
    } else if (node.parentElement !== null) {
        return isVisible(node.parentElement, parentScrollable);
    }
    return false;
}

export function isHidden(node: HTMLElement): Boolean {
    return !isVisible(node);
}

export function useScrollableParent(
    node: Ref<MaybeElement>
): ComputedRef<HTMLElement | null> {
    return computed(() => {
        if (!node.value) return null;
        return getScrollableParent(unrefElement(node.value));
    });
}

export function useVisibleElement(
    node: Ref<MaybeElement>,
    parentScrollable: ComputedRef<MaybeElement>
): ComputedRef<boolean> {
    const rect = useElementBounding(node);
    const parentRect = useElementBounding(parentScrollable);
    return computed(() => {
        if (!node.value) return false;

        // Watch property
        rect.top.value;
        rect.left.value;
        rect.bottom.value;
        rect.right.value;
        parentRect.left.value;
        parentRect.top.value;
        parentRect.bottom.value;
        parentRect.right.value;

        if (rect.height.value === 0 || rect.width.value === 0) return false;
        else if (parentRect.height.value === 0 || parentRect.width.value === 0)
            return false;
        return isVisible(unrefElement(node.value), unrefElement(parentScrollable.value));
    });
}
