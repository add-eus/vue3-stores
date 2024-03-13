import type { Entity } from "./entity";
import type { DocumentReference, DocumentSnapshot } from "firebase/firestore";
import { getDoc, onSnapshot } from "firebase/firestore";
import EventEmitter from "./event";
import { SubCollection, entitiesInfos, updatePropertyCollection } from "./collection";

export interface CollectionProperties {
    [key: string]: { namespace: string; blacklistedProperties: string[] };
}

export class EntityMetaData extends EventEmitter {
    reference: DocumentReference | null = null;
    isFullfilled: boolean = false;
    isFullfilling: null | Promise<any> = null;
    isDeleted: boolean = false;
    origin: any = {};
    previousOrigin: any = {};
    properties: { [key: string]: any } = {};
    entity: Entity;
    unsuscribeSnapshot: Function | null = null;
    disableWatch: boolean = false;

    blacklistedProperties: string[] = [];
    collectionProperties: CollectionProperties = {};
    saveNewDocPath?: string;

    constructor(entity: any) {
        super();
        this.entity = entity;
    }

    destroy() {
        this.emit("destroy");
        if (this.unsuscribeSnapshot) this.unsuscribeSnapshot();
    }

    async refresh() {
        if (!this.reference) return;
        if (!this.isFullfilling) {
            this.isFullfilling = getDoc(this.reference).then(async (querySnapshot) => {
                // this.previousOrigin = this.origin;
                this.entity.$setAndParseFromReference(querySnapshot);
                // this.origin = querySnapshot.data();
                // if (this.origin === undefined)
                //     throw new Error(`${this.reference.path} does not exist`);

                // this.emit("parse", this.origin);
                // this.isFullfilled = true;
            });
        }

        await this.isFullfilling;
    }

    async waitFullfilled() {
        return this.isFullfilling;
    }

    markAsDeleted() {
        this.isDeleted = true;
        this.emit("deleted");
    }

    watch() {
        if (this.unsuscribeSnapshot) return;
        let isFirstFetch = true;
        this.unsuscribeSnapshot = onSnapshot(
            this.reference,
            (document: DocumentSnapshot) => {
                if (isFirstFetch) {
                    isFirstFetch = false;
                    return;
                }

                // if (document.metadata.hasPendingWrites) return;

                if (!document.exists()) {
                    this.markAsDeleted();
                    return;
                }
                const data = document.data();

                if (data === undefined) return;
                this.emit("parse", data);
            },
            (err) => {
                if (err instanceof Error && err.code === "permission-denied") {
                    throw new Error(
                        `You don't have permission to access ${this.reference?.path}`
                    );
                }
                throw err;
            }
        );
    }

    stopWatch() {
        this.unsuscribeSnapshot?.();
        this.unsuscribeSnapshot = null;
    }

    setReference(reference: DocumentReference) {
        if (this.reference) return;
        this.reference = reference;

        this.watch();
        this.on("destroy", () => {
            this.unsuscribeSnapshot?.();
        });
    }

    initSubCollections(isNew: boolean = false) {
        // init subcollections
        Object.entries(this.collectionProperties)
            .filter(([propertyKey]) => !this.blacklistedProperties.includes(propertyKey))
            .map(([propertyKey, { namespace, blacklistedProperties }]) => {
                if (!isNew && this.reference === null)
                    throw new Error("reference in metadata is null, new doc ?");

                const info = entitiesInfos.get(namespace);
                if (info === undefined) throw new Error(`${namespace} info is undefined`);

                const subCollection = (this.entity as any)[propertyKey];
                if (!(subCollection instanceof SubCollection))
                    throw new Error(`${propertyKey} is not a SubCollection`);
                subCollection.init(
                    info.model,
                    isNew ? undefined : `${this.reference!.path}/${propertyKey}`,
                    blacklistedProperties
                );
            });
    }

    async savePropertyCollections(copyFrom?: Entity) {
        const savePropertyCollectionPromises = Object.keys(this.collectionProperties).map(
            async (propertyKey) => {
                await this.savePropertyCollection(propertyKey, copyFrom);
            }
        );
        await Promise.all(savePropertyCollectionPromises);
    }

    async savePropertyCollection(propertyKey: string, copyFrom?: Entity) {
        if (this.reference === null) throw new Error("reference in metadata is null");

        const constructor = this.entity.constructor as typeof Entity;
        const info = entitiesInfos.get(constructor.collectionName);
        if (info === undefined)
            throw new Error(`${constructor.collectionName} info is undefined`);

        const propertySubCollection = (this.entity as any)[
            propertyKey
        ] as SubCollection<Entity>;
        if (propertySubCollection.isNew) {
            propertySubCollection.init(
                propertySubCollection.entityModel!,
                `${this.reference.path}/${propertyKey}`,
                propertySubCollection.blacklistedProperties
            );
        }
        const copiedSubCollection =
            copyFrom === undefined
                ? undefined
                : ((copyFrom as any)[propertyKey] as SubCollection<Entity>);
        // get blacklisted properties of entity collection
        const parentBlacklistedProperties: string[] = [];
        entitiesInfos.forEach((info) => {
            info.subPaths.forEach((subPath) => {
                if (subPath.path === this.reference?.parent.id)
                    parentBlacklistedProperties.push(...subPath.blacklistedProperties);
            });
        });
        if (parentBlacklistedProperties.includes(propertyKey)) return;

        // elements changed in array, if copyFrom is defined, it's a new entity, all elements are added from copyFrom
        const { toDelete, toAdd } =
            copiedSubCollection !== undefined
                ? {
                      toDelete: [],
                      toAdd: [...copiedSubCollection.list],
                  }
                : propertySubCollection.getArrayModification();

        await updatePropertyCollection(
            toDelete,
            toAdd,
            `${this.reference.path}/${propertyKey}`,
            parentBlacklistedProperties
        );
    }
}
