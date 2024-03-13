import { resolveUnref, syncRef } from "@vueuse/core";
import type { Ref } from "vue";
import { getCurrentInstance, isRef, ref, watch } from "vue";

function parseOptions(options: any | string, values?: any): any {
    if (typeof options === "string")
        options = {
            path: options,
        };

    if (options.values === undefined) options.values = values;

    return options;
}

function transformOptionsFromNamespaces(
    options: any,
    namespacesUnfiltered: string[],
): any {
    const namespaces = namespacesUnfiltered.filter((namespace) => {
        return typeof namespace === "string";
    });

    const newOptions = { ...options };
    if (options.path.startsWith(".") === true) {
        let finalNamespace = "";
        for (let i = 0; i < namespaces.length; i++) {
            finalNamespace = namespaces[i] + finalNamespace;
            if (!namespaces[i].startsWith(".")) break;
        }
        newOptions.path = finalNamespace + options.path;
    }
    return newOptions;
}

export function translate(options: any, component: any, values?: any) {
    if (isRef(options)) {
        const translated = ref("");
        let stop: () => void | undefined;
        function update() {
            if (stop !== undefined) stop();
            const translatedSubRef = translate(options.value, component, values);
            stop = syncRef(translatedSubRef, translated);
        }
        watch(options, update);
        update();
        return translated;
    }
    const translated = ref("");

    component.scope.run(() => {
        options = parseOptions(options, values);

        const translationNamespaces: string[] = [];

        let parentComponent: any = {
            parent: component,
        };
        let index: number = 0;
        let transformedOptions;

        function translateInScope() {
            try {
                const unrefValues = resolveUnref(options.values);

                translated.value = component.appContext.app.config.globalProperties.$t(
                    transformedOptions.path,
                    unrefValues,
                );
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
        }
        while ((parentComponent = parentComponent.parent) !== null) {
            const currentIndex: number = index;
            if (parentComponent.translationNamespace !== undefined) {
                translationNamespaces[currentIndex] =
                    parentComponent.translationNamespace.value;
                const currentComponent = parentComponent;
                watch(currentComponent.translationNamespace, () => {
                    if (
                        currentComponent.translationNamespace === undefined ||
                        currentComponent.translationNamespace.value === undefined
                    ) {
                        return;
                    }
                    translationNamespaces[currentIndex] =
                        currentComponent.translationNamespace.value;
                    transformedOptions = transformOptionsFromNamespaces(
                        options,
                        translationNamespaces,
                    );

                    translateInScope();
                });
            }

            index++;
        }

        transformedOptions = transformOptionsFromNamespaces(
            options,
            translationNamespaces,
        );

        translateInScope();

        watch(
            () => options.values,
            () => {
                translateInScope();
            },
            { deep: true },
        );
    });

    return translated;
}

export function setTranslateNamespace(path: string | Ref<string>, instance?: any) {
    if (instance === undefined) instance = getCurrentInstance();
    if (isRef(path) === true && instance.translationNamespace === undefined) {
        instance.translationNamespace = path;
    } else if (instance.translationNamespace === undefined) {
        instance.translationNamespace = ref(path);
    } else instance.translationNamespace.value = path;
}

export const useTranslate = function () {
    const instance = getCurrentInstance();
    return {
        translate(options: any, values?: any) {
            return translate(options, instance, values);
        },
        setTranslateNamespace(path: string) {
            return setTranslateNamespace(path, instance);
        },
    };
};
