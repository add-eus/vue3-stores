import { resolveUnref, syncRef, MaybeRef } from "@vueuse/core";
import type { Ref } from "vue";
import { getCurrentInstance, isRef, ref, watch, onMounted, computed, toValue } from "vue";
import { useI18n } from 'vue-i18n';
import type { ComputedRef } from "vue";
import { tr } from "date-fns/locale";

function parseOptions(options: any | string, values?: any): any {
    if (typeof options === "string" || isRef(options))
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
    const path = resolveUnref(newOptions.path);
    if (path.startsWith(".") === true) {
        let finalNamespace = "";
        for (let i = 0; i < namespaces.length; i++) {
            finalNamespace = namespaces[i] + finalNamespace;
            if (!namespaces[i].startsWith(".")) break;
        }
        newOptions.path = finalNamespace + path;
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
        let transformedOptions: { path: any; };

        function translateInScope() {

            try {
                const t = component.appContext.app.config.globalProperties.$t || ((text: any) => {
                    return text;
                });
                

                const unrefValues = resolveUnref(options.values);

                translated.value = t(
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

function transformTranslation(options, instance, t) {
    

    const translationNamespaces: string[] = [];

    let parentComponent: any = {
        parent: instance,
    };
    let index: number = 0;
    let transformedOptions: { path: any; };

    while ((parentComponent = parentComponent.parent) !== null) {
        const currentIndex: number = index;
        if (parentComponent.translationNamespace !== undefined) {
            translationNamespaces[currentIndex] =
                parentComponent.translationNamespace.value;
            const currentComponent = parentComponent;

            if (
                currentComponent.translationNamespace === undefined ||
                currentComponent.translationNamespace.value === undefined
            ) {
                return "";
            }
            translationNamespaces[currentIndex] =
                currentComponent.translationNamespace.value;
        }

        index++;
    }

    transformedOptions = transformOptionsFromNamespaces(
        options,
        translationNamespaces,
    );

    const unrefValues = resolveUnref(options.values);

    return t(
        transformedOptions.path,
        unrefValues,
    );
}

// Définition des types pour les options de traduction
interface TranslateOptions {
    path: string;
    values?: Record<string, any>;
  }
  
type TranslateInput = MayBeRef<string | string[]> | TranslateOptions;

// Surcharges de la fonction useTranslate
export function useTranslate(): {
    translate: (options: TranslateInput, values?: Record<string, any>) => Ref<string>;
    setTranslateNamespace: (path: string) => void;
  };
  
export function useTranslate(options: TranslateInput, values?: Record<string, any>): ComputedRef<string>;

  
export function useTranslate(options?: TranslateInput, values?: Record<string, any>) {
    const instance = getCurrentInstance();
    console.log(instance);

    if (options === undefined) {
        return {
            translate(options: any, values?: any) {
                return translate(options, instance, values);
            },
            setTranslateNamespace(path: string) {
                return setTranslateNamespace(path, instance);
            },
        };
    }

    const { t } = useI18n();

    return computed(() => {
        try {
            
            if (Array.isArray(toValue(options))) {
                return toValue(options).map((option) => {
                    let parsedOptions = parseOptions(option, values);
                    return transformTranslation(parsedOptions, instance, t);
                });
            }
            else {
                let parsedOptions = parseOptions(options, values);
                return transformTranslation(parsedOptions, instance, t);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            return "";
        }
    });
};