import type { EntityInfo } from "../collection";
import { entitiesInfos } from "../collection";
import type { CollectionProperties } from "../entityMetadata";

interface Model {
    [key: string]: Collection[];
}

interface Collection {
    path: string;
    namespace: string;
    group: string;
    parentNamespace?: string;
    parentGroupsWithThisCollection: string[];
    blacklistedSubPaths: string[];
}

export const createCloudFunctionModel = (): string => {
    const collections = getCollections();
    const model = collections.reduce((acc, collection) => {
        if (acc[collection.namespace] === undefined) {
            acc[collection.namespace] = [collection];
        } else {
            acc[collection.namespace].push(collection);
        }
        return acc;
    }, {} as Model);
    return JSON.stringify(model, null, 4);
};

const getCollectionProperties = (entitiesInfo: EntityInfo): CollectionProperties => {
    const entity = new entitiesInfo.model();
    const metadata = entity.$getMetadata();
    return metadata.collectionProperties;
};

const getNamespaceCollections = (
    namespace: string,
    path?: string,
    blacklistedSubPaths: string[] = [],
): Collection[] => {
    const collections: Collection[] = [];
    if (path === undefined) {
        collections.push({
            path: namespace,
            namespace,
            group: namespace,
            parentGroupsWithThisCollection: [],
            blacklistedSubPaths,
        });
        path = namespace;
    }
    const entitiesInfo = entitiesInfos.get(namespace);
    if (entitiesInfo === undefined) {
        throw new Error(`Collection ${namespace} is not defined`);
    }
    const collectionNamespaces = Object.entries(getCollectionProperties(entitiesInfo));
    const collectionsPaths = collectionNamespaces
        .filter(([name]) => !blacklistedSubPaths.includes(name))
        .map(([name, group]): Collection[] => {
            const collectionPath = `${path}/${name}`;
            const collectionNamespace = `${group.namespace}`;
            const collectionBlacklistedSubPaths = group.blacklistedProperties as
                | string[]
                | undefined;
            const subPaths = getNamespaceCollections(
                collectionNamespace,
                collectionPath,
                collectionBlacklistedSubPaths,
            );

            return [
                {
                    path: collectionPath,
                    namespace: collectionNamespace,
                    group: name,
                    parentGroupsWithThisCollection: [],
                    parentNamespace: namespace,
                    blacklistedSubPaths: collectionBlacklistedSubPaths ?? [],
                },
                ...subPaths,
            ];
        });
    collections.push(...collectionsPaths.flat());
    return collections;
};

const getCollections = (): Collection[] => {
    const model: Model = {};
    entitiesInfos.forEach((_, rootCollection) => {
        model[rootCollection] = getNamespaceCollections(rootCollection);
    });

    const collections: Collection[] = Object.entries(model)
        .map(([name]) => {
            return getNamespaceCollections(name);
        })
        .flat();

    collections.forEach((collection) => {
        const parentGroups = collections.filter(
            (parentCollection) =>
                parentCollection.namespace === collection.parentNamespace &&
                !parentCollection.blacklistedSubPaths.includes(collection.group),
        );
        collection.parentGroupsWithThisCollection = parentGroups.map(
            (parentCollection) => parentCollection.group,
        );
    });

    return collections;
};
