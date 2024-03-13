import type {
    CollectionOptions as UseCollectionOption,
    Collection as UseCollectionType,
} from ".";
import { newDoc, useCollection, useDoc } from ".";
import type { Entity } from "./entity";
import { onInitialize } from "./entity";
import type { EntityMetaData } from "./entityMetadata";
import { useFirebase } from "addeus-common-library/stores/firebase";
import type { DocumentData, DocumentReference } from "firebase/firestore";
import { collection, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { shallowReactive } from "vue";
import { watchArray } from "@vueuse/core";
import { securityCollectionCallbacks } from "./security/securityDecorators";

export type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

export type NonFunctionProperties<T> = {
    [K in Exclude<keyof T, FunctionPropertyNames<T>>]: T[K];
};

export interface CollectionOptions<T> {
    namespace: string;
    backlistFields?: Partial<
        Omit<Record<keyof NonFunctionProperties<T>, boolean>, "blacklistedProperties">
    >;
}

export interface EntityInfo {
    model: typeof Entity;
    subPaths: { path: string; blacklistedProperties: string[] }[];
}

/**
 * Map model to namespace of all entities
 */
export const entitiesInfos = new Map<string, EntityInfo>();

const onCollectionsInitialize = new Map<string, (() => void)[]>();

export function Collection<T>(options: CollectionOptions<T>) {
    return function (target: any, propertyKey?: string) {
        // On class
        if (propertyKey === undefined) {
            target.collectionName = options.namespace;

            // Associate namespace to model
            entitiesInfos.set(target.collectionName, {
                model: target,
                subPaths: [{ path: target.collectionName, blacklistedProperties: [] }],
            });
            onCollectionsInitialize.get(target.collectionName)?.forEach((init) => init());
            securityCollectionCallbacks.get(target.name)?.forEach((init) => init());
        }
        // On property
        else {
            if (options.namespace === undefined) {
                throw new Error("namespace is undefined");
            }
            const namespace = options.namespace;
            const onCollectionInitialize = () => {
                const info = entitiesInfos.get(namespace);
                if (info === undefined) {
                    throw new Error(`${namespace} info is undefined`);
                }

                const blacklistedProperties = Object.entries(options.backlistFields ?? {})
                    .filter(([, value]) => value)
                    .map(([key]) => key);

                // save propertyKey in subCollections of model
                const subPathInfo = info.subPaths.find(
                    ({ path }) => path === propertyKey,
                );
                if (subPathInfo !== undefined) {
                    subPathInfo.blacklistedProperties.forEach((blacklistedProperty) => {
                        if (!blacklistedProperties.includes(blacklistedProperty)) {
                            throw new Error(
                                `property ${propertyKey} already exists, a subcollection name must have the same blacklistedProperties`,
                            );
                        }
                    });
                } else {
                    info.subPaths.push({
                        path: propertyKey,
                        blacklistedProperties,
                    });
                }

                onInitialize(target, function (this: any, metadata: EntityMetaData) {
                    // tag property as collection property, used in Entity to save and parse this property
                    metadata.collectionProperties[propertyKey] = {
                        namespace,
                        blacklistedProperties,
                    };
                });
            };

            // wait Collection decorator on model
            const info = entitiesInfos.get(namespace);
            if (info === undefined) {
                const inits = onCollectionsInitialize.get(namespace);
                if (inits === undefined) {
                    onCollectionsInitialize.set(namespace, [onCollectionInitialize]);
                } else {
                    inits.push(onCollectionInitialize);
                }
            } else {
                onCollectionInitialize();
            }
        }
    };
}

export class SubCollection<T extends Entity> {
    private firestoreArray?: UseCollectionType<T>;
    private currentList = shallowReactive(new Array<T>());
    private model?: typeof Entity;
    private path?: string;
    private initialized = false;
    private stopWatch?: () => void;
    private isFetched = false;
    private new = false;
    public blacklistedProperties: string[] = [];

    init(
        model: typeof Entity,
        path: string | undefined,
        blacklistedProperties: string[],
    ) {
        this.model = model;
        this.path = path;
        this.blacklistedProperties = blacklistedProperties;
        this.initialized = true;
        this.new = path === undefined;
    }

    setOptions(options?: Omit<UseCollectionOption, "path" | "blacklistedProperties">) {
        if (!this.initialized) throw new Error(`property subcollection not initialized`);
        if (this.model === undefined)
            throw new Error(`model in property ${this.path} is undefined`);
        if (this.path === undefined)
            throw new Error(`path in property ${this.path} is undefined`);

        this.stopWatch?.();

        const useCollectionOptions: UseCollectionOption = {
            ...options,
            path: this.path,
            blacklistedProperties: this.blacklistedProperties,
        };
        this.firestoreArray = useCollection(
            this.model,
            useCollectionOptions,
        ) as UseCollectionType<T>;

        this.currentList.splice(0, this.currentList.length);

        this.stopWatch = watchArray(
            this.firestoreArray,
            (value, oldValue, added: T[], removed: T[]) => {
                added.forEach((a) => {
                    const alreadyInArray = this.currentList.some(
                        (entity) => entity.$getID() === a.$getID(),
                    );
                    if (!alreadyInArray) this.currentList.push(a);
                });
                removed.forEach((r) => {
                    const index = this.currentList.findIndex(
                        (entity) => entity.$getID() === r.$getID(),
                    );
                    if (index !== -1) this.currentList.splice(index, 1);
                });
            },
        );
        this.isFetched = true;
    }

    async exists(entity: Entity): Promise<boolean> {
        const id = entity.$getID();
        if (id === undefined) throw new Error("id is undefined");
        return await this.existsById(id);
    }

    async existsById(id: string): Promise<boolean> {
        if (!this.initialized) throw new Error(`property subcollection not initialized`);
        if (this.new) throw new Error(`property subcollection is new`);
        const firebase = useFirebase();
        const snap = await getDoc(doc(firebase.firestore, `${this.path}/${id}`));
        return snap.exists();
    }

    get list() {
        if (!this.isFetched && !this.new) this.setOptions();
        return this.currentList;
    }

    get entityModel() {
        return this.model;
    }

    get isInitialized() {
        return this.initialized;
    }

    get isNew() {
        return this.new;
    }

    fetched() {
        if (!this.isFetched) throw new Error(`property subcollection not initialized`);
        if (this.firestoreArray === undefined)
            throw new Error(`firestoreArray is undefined`);
        return this.firestoreArray.fetched();
    }

    /**
     * Get array modification between app datas and firestore datas
     * @param appArray Current data in app (with new or deleted entities)
     * @param firestoreArray Current data in firestore
     * @returns {toDelete, toAdd} entities to delete and entities to add
     */
    getArrayModification() {
        const dbEntities: Entity[] = [];
        if (this.firestoreArray) dbEntities.push(...this.firestoreArray);
        const appEntities = [...this.currentList];

        const toDelete = dbEntities.filter(
            (f) => !appEntities.some((a) => a.$getID() === f.$getID()),
        );
        const toAdd = appEntities.filter(
            (a) => !dbEntities.some((f) => a.$getID() === f.$getID()),
        );
        return { toDelete, toAdd };
    }

    newDoc(): T {
        if (!this.isInitialized)
            throw new Error(`property subcollection not initialized`);
        if (this.model === undefined) throw new Error(`model is undefined`);
        const entity = newDoc(this.model) as T;
        entity.$getMetadata().saveNewDocPath = this.path;
        this.currentList.push(entity);
        return entity;
    }

    useDoc(id: string): T | undefined {
        if (!this.isInitialized)
            throw new Error(`property subcollection not initialized`);
        if (this.model === undefined) throw new Error(`model is undefined`);
        const entity = useDoc(this.model, id, { fetch: true, collection: this.path }) as
            | T
            | undefined;
        return entity;
    }
}

/**
 * Add and/or remove elements from firestore
 * @param toRemove elements to remove
 * @param toAdd elements to add
 * @param path path of the collection
 */
export const updatePropertyCollection = async (
    toRemove: Array<Entity>,
    toAdd: Array<Entity>,
    path: string,
    blacklistedProperties: string[] = [],
) => {
    const firebase = useFirebase();

    const collectionRef = collection(firebase.firestore, path);
    const removePromises = toRemove.map(async (entity) => {
        const id = entity.$getMetadata().reference?.id;
        if (id === undefined) throw new Error("id is undefined");
        const docRef = doc(collectionRef, id);
        await deleteDoc(docRef);
    });
    const addPromises = toAdd.map(async (entity) => {
        let id = entity.$getMetadata().reference?.id;

        // entity is already in collection
        if (entity.$getMetadata().reference?.path === `${collectionRef.path}/${id}`) {
            return;
        }

        let docRef: DocumentReference<DocumentData> | undefined;
        if (id === undefined) {
            // entity is new, save it before add to collection
            await entity.$save();
            const reference = entity.$getMetadata().reference;
            if (reference === null) throw new Error("reference is null");
            id = reference.id;
            docRef = reference;
        } else {
            docRef = doc(collectionRef, id);
            await setDoc(docRef, entity.$getPlain(), { merge: true });
        }

        // save sub collections of added entity recursively
        const constructor = entity.constructor as typeof Entity;
        const model = new constructor();
        const metadata = model.$getMetadata();
        metadata.setReference(docRef);
        metadata.blacklistedProperties = blacklistedProperties;
        await metadata.savePropertyCollections(entity);
    });
    await Promise.all([...removePromises, ...addPromises]);
};
