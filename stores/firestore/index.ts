import type { Ref } from "vue";
import { watch, isRef, shallowReactive, onScopeDispose, getCurrentScope } from "vue";
import algoliasearch from "algoliasearch";
import type {
    WhereFilterOp,
    QueryConstraint,
    OrderByDirection,
    QueryFilterConstraint,
    FieldPath,
} from "firebase/firestore";
import {
    where,
    orderBy,
    collection,
    doc,
    or,
    and,
    DocumentSnapshot,
    DocumentReference,
    query,
    collectionGroup,
    getDocs,
} from "firebase/firestore";
import { useFirebase } from "../firebase";
import type { MaybeRef } from "@vueuse/core";
import { until } from "@vueuse/core";
import { Query } from "./query";
import { QuerySearch } from "./querySearch";
import type { Entity } from "./entity";

export { Input } from "./input";
export { Entity, EntityBase } from "./entity";
export { Var } from "./var";

export type WhereOption = [string | FieldPath, WhereFilterOp, any];
export type OrderOption = [string | FieldPath, OrderByDirection];

export interface CompositeConstraint {
    type: "OR" | "AND" | "WHERE";
    constraints: CompositeConstraint[] | WhereOption;
}

export interface CollectionOptions {
    wheres?: MaybeRef<WhereOption[]>;
    orders?: MaybeRef<OrderOption[]>;
    limit?: MaybeRef<number>;
    search?: MaybeRef<string>;
    compositeConstraint?: MaybeRef<CompositeConstraint>;
    path?: string;
    blacklistedProperties?: string[];
}

const cachedEntities: { [key: string]: { usedBy: number; entity: any } } = {};
const algoliaClient = algoliasearch(
    import.meta.env.VITE_ALGOLIA_APPLICATION_ID,
    import.meta.env.VITE_ALGOLIA_API_KEY,
);

function transformWheres(whereOptions: WhereOption[] = []): QueryConstraint[] {
    return whereOptions.map((whereOption: [string, WhereFilterOp, any]) => {
        return where(...whereOption);
    });
}

function transformOrders(orderOptions: OrderOption[] = []): QueryConstraint[] {
    return orderOptions.map((orderOption: [string, OrderByDirection]) => {
        return orderBy(...orderOption);
    });
}

function transformCompositeConstraint(
    compositeConstraint: CompositeConstraint,
): QueryFilterConstraint {
    if (compositeConstraint.type === "OR") {
        return or(
            ...compositeConstraint.constraints.map((c) =>
                transformCompositeConstraint(c as CompositeConstraint),
            ),
        );
    } else if (compositeConstraint.type === "AND") {
        return and(
            ...compositeConstraint.constraints.map((c) =>
                transformCompositeConstraint(c as CompositeConstraint),
            ),
        );
    } else if (compositeConstraint.type === "WHERE") {
        return where(...(compositeConstraint.constraints as WhereOption));
    }
    throw new Error("Invalid composite constraint type");
}

export class Collection<T> extends Array<T> {
    isUpdating: boolean = false;
    async fetched() {
        return until(() => {
            return this.isUpdating;
        }).toBe(false);
    }
}

/**
 * Get an updated collection from firestore
 *
 * @param collectionModel Entity A Model declared in src/models
 * @param options any An options of refs
 * @returns ref<any[]>
 */
export function useCollection<T extends typeof Entity>(
    collectionModel: T,
    options: CollectionOptions,
): Collection<InstanceType<T>> {
    if (options.wheres !== undefined && options.compositeConstraint !== undefined) {
        throw new Error("You can't use both wheres and compositeConstraint");
    }
    const onDestroy: (() => void)[] = [];
    getCurrentScope()
        ? onScopeDispose(() => {
              onDestroy.forEach((callback) => callback());
          })
        : void 0;
    const entities = shallowReactive<any>(new Collection());
    const firebase = useFirebase();
    const algoliaIndex = algoliaClient.initIndex(
        `${
            import.meta.env.VITE_ALGOLIA_PREFIX !== undefined
                ? import.meta.env.VITE_ALGOLIA_PREFIX
                : ""
        }${collectionModel.collectionName}`,
    );

    const collectionRef = collection(
        firebase.firestore,
        options.path === undefined ? collectionModel.collectionName : options.path,
    );

    entities.isUpdating = true;

    let wheres: QueryConstraint[] = transformWheres(
        isRef(options.wheres) ? options.wheres.value : options.wheres,
    );
    let orders: QueryConstraint[] = transformOrders(
        isRef(options.orders) ? options.orders.value : options.orders,
    );
    let search: string | undefined = isRef(options.search)
        ? options.search.value
        : options.search;

    const compositeConstraintOption = isRef(options.compositeConstraint)
        ? options.compositeConstraint.value
        : options.compositeConstraint;
    let compositeConstraint =
        compositeConstraintOption === undefined
            ? undefined
            : transformCompositeConstraint(compositeConstraintOption);

    let query: Query | QuerySearch | null;

    async function fetch() {
        entities.splice(0, entities.length);
        if (query) query.destroy();

        if (search && search.length > 0) {
            const constraints = [...wheres, ...orders];
            if (compositeConstraint !== undefined)
                constraints.push(compositeConstraint as any);
            query = new QuerySearch(
                constraints,
                entities,
                (doc: DocumentSnapshot) => {
                    return transform(
                        doc,
                        collectionModel,
                        (callback) => {
                            onDestroy.push(callback);
                        },
                        options.blacklistedProperties,
                    );
                },
                collectionRef,
                search,
                algoliaIndex,
            );
        } else {
            const constraints = [...wheres, ...orders];
            if (compositeConstraint !== undefined)
                constraints.push(compositeConstraint as any);
            query = new Query(
                constraints,
                entities,
                (doc: DocumentSnapshot) => {
                    return transform(
                        doc,
                        collectionModel,
                        (callback) => {
                            onDestroy.push(callback);
                        },
                        options.blacklistedProperties,
                    );
                },
                collectionRef,
            );
        }

        let limit = -1;
        if (isRef(options.limit) && typeof options.limit.value === "number")
            limit = options.limit.value;
        else if (typeof options.limit === "number") limit = options.limit;
        if (limit === 0) return;

        try {
            entities.isUpdating = true;

            await query.next(limit);
            entities.isUpdating = false;
        } catch (err) {
            entities.isUpdating = false;
            throw err;
        }
    }

    if (isRef(options.wheres))
        watch(options.wheres, () => {
            wheres = transformWheres((options.wheres as Ref).value);

            // eslint-disable-next-line no-console
            fetch().catch(console.error);
        });

    if (isRef(options.orders))
        watch(options.orders, () => {
            orders = transformOrders((options.orders as Ref).value);
            // eslint-disable-next-line no-console
            fetch().catch(console.error);
        });

    if (isRef(options.limit))
        watch(options.limit, async (newLimit: number, oldLimit: number) => {
            if (!query) return;
            const limit = newLimit - oldLimit;
            if (limit <= 0) return;
            entities.isUpdating = true;

            await query.next(limit);
            entities.isUpdating = false;
        });

    if (isRef(options.search))
        watch(options.search, async () => {
            search = (options.search as Ref).value;
            await fetch();
        });

    if (isRef(options.compositeConstraint))
        watch(options.compositeConstraint, async () => {
            compositeConstraint = transformCompositeConstraint(
                (options.compositeConstraint as Ref).value,
            );
            await fetch();
        });

    fetch().catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
    });

    return entities;
}

interface UseDocOptions {
    fetch: boolean;
    collection?: string;
}
export function useDoc<T extends typeof Entity>(
    collectionModel: T,
    id?: string,
    options: UseDocOptions = { fetch: true },
): InstanceType<T> {
    if (id === undefined) return newDoc(collectionModel);
    const { firestore } = useFirebase();
    const collectionName = options.collection ?? collectionModel.collectionName;
    const reference = doc(collection(firestore, collectionName), id);
    const model = transform(
        reference,
        collectionModel,
        getCurrentScope() ? onScopeDispose : undefined,
    );

    if (options.fetch) void model.$getMetadata().refresh();
    return model;
}

export function newDoc<T extends typeof Entity>(collectionModel: T): InstanceType<T> {
    const entity = new collectionModel();
    entity.$getMetadata().initSubCollections(true);

    if (getCurrentScope() !== undefined) {
        onScopeDispose(() => {
            if (typeof entity.$getID !== "function") return;
            const cachedIdEntity = `${collectionModel.collectionName}/${entity.$getID()}`;
            if (cachedEntities[cachedIdEntity] === undefined) return;
            cachedEntities[cachedIdEntity].usedBy--;
            if (cachedEntities[cachedIdEntity].usedBy === 0) {
                cachedEntities[cachedIdEntity].entity.$getMetadata().destroy();
                delete cachedEntities[cachedIdEntity];
            }
        });
    }

    entity.$getMetadata().on("saved", () => {
        const cachedIdEntity = `${collectionModel.collectionName}/${entity.$getID()}`;
        if (cachedEntities[cachedIdEntity] !== undefined) {
            cachedEntities[cachedIdEntity] = {
                usedBy: 1,
                entity,
            };
        }
    });
    return entity;
}

export async function findDoc<T extends typeof Entity>(
    collectionModel: T,
    options: any,
): Promise<InstanceType<T> | undefined> {
    const wheres: QueryConstraint[] = transformWheres(
        isRef(options.wheres) ? options.wheres.value : options.wheres,
    );
    const orders: QueryConstraint[] = transformOrders(
        isRef(options.orders) ? options.orders.value : options.orders,
    );
    const search: string = isRef(options.search) ? options.search.value : options.search;

    let query: Query | QuerySearch | null;

    const entities: any[] = [];
    const firebase = useFirebase();

    const collectionRef = collection(firebase.firestore, collectionModel.collectionName);

    const onDestroy: (() => void)[] = [];
    getCurrentScope()
        ? onScopeDispose(() => {
              onDestroy.forEach((callback) => callback());
          })
        : void 0;

    if (search && search.length > 0) {
        const algoliaIndex = algoliaClient.initIndex(
            import.meta.env.PROD
                ? collectionModel.collectionName
                : `dev_${collectionModel.collectionName}`,
        );
        query = new QuerySearch(
            [...wheres, ...orders],
            entities,
            (doc: DocumentSnapshot) => {
                return transform(doc, collectionModel, (callback) => {
                    onDestroy.push(callback);
                });
            },
            collectionRef,
            search,
            algoliaIndex,
        );
    } else {
        query = new Query(
            [...wheres, ...orders],
            entities,
            (doc: DocumentSnapshot) => {
                return transform(doc, collectionModel, (callback) => {
                    onDestroy.push(callback);
                });
            },
            collectionRef,
        );
    }
    const docs = await query.next(1);
    if (docs.length <= 0) return;
    return docs[0];
}

/**
 * Transform a document to an entity and cache it
 * @param doc DocumentReference or DocumentSnapshot
 * @param Model
 * @param onDisposed
 * @returns
 */
function transform<T extends typeof Entity>(
    doc: DocumentSnapshot | DocumentReference,
    Model: T,
    onDisposed?: (callback: () => void) => void,
    blacklistedProperties: string[] = [],
): InstanceType<T> {
    let path: string | undefined = undefined;
    if (doc instanceof DocumentReference) {
        path = doc.path;
    } else if (doc instanceof DocumentSnapshot) {
        path = doc.ref.path;
    }
    const cachedIdEntity = path ?? `${Model.collectionName}/${doc.id}`;
    if (cachedEntities[cachedIdEntity] === undefined) {
        const model = new Model();
        model.$setAndParseFromReference(doc);
        model.$getMetadata().blacklistedProperties = blacklistedProperties;
        cachedEntities[cachedIdEntity] = {
            entity: model,
            usedBy: 0,
        };
    }

    cachedEntities[cachedIdEntity].usedBy++;

    onDisposed?.(() => {
        if (cachedEntities[cachedIdEntity] === undefined) return;
        cachedEntities[cachedIdEntity].usedBy--;
        if (cachedEntities[cachedIdEntity].usedBy === 0) {
            cachedEntities[cachedIdEntity].entity.$getMetadata().destroy();
            delete cachedEntities[cachedIdEntity];
        }
    });

    return cachedEntities[cachedIdEntity].entity;
}

export const useParentOfCollectionGroup = (
    model: typeof Entity,
    collectionGroupName: string,
    wheres: MaybeRef<WhereOption[]>,
) => {
    const firebase = useFirebase();

    const workspaceRefs = shallowReactive<any>(new Collection());

    if (isRef<WhereOption[]>(wheres)) {
        watch(
            wheres,
            async (value) => {
                const whereConstraints: QueryConstraint[] = transformWheres(value);
                const groupQuery = query(
                    collectionGroup(firebase.firestore, collectionGroupName),
                    ...whereConstraints,
                );
                const groupSnapshot = await getDocs(groupQuery);
                const newWorkspaceRefs = groupSnapshot.docs
                    .filter(
                        (doc) =>
                            doc.ref.parent.parent !== null &&
                            doc.ref.parent.parent?.parent?.path === model.collectionName,
                    )
                    .map((doc) => doc.ref.parent.parent);
                workspaceRefs.splice(0, workspaceRefs.length, ...newWorkspaceRefs);
            },
            { immediate: true },
        );
    }

    return workspaceRefs;
};

export function clearCache() {
    for (const cachedIdEntity in cachedEntities) {
        cachedEntities[cachedIdEntity].entity.$getMetadata().destroy();
        delete cachedEntities[cachedIdEntity];
    }
}
