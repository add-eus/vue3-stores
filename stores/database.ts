import { ref, toRaw } from "vue";
import {
    ref as refDatabase,
    onChildAdded as onChildAddedDatabase,
    onChildRemoved as onChildRemovedDatabase,
    set as setDatabase,
    push as pushDatabase,
    get as getDatabase,
    remove as removeDatabase,
} from "firebase/database";
import { useFirebase } from "@addeus/web-utils/src/firebase";

export const useDatabase = (path: string, options = {}) => {
    const firebase = useFirebase();

    const dataRef = refDatabase(toRaw(firebase.database), path);
    const cible = options.toArray ? [] : {};
    const data = ref(cible);

    const refs = {};

    onChildAddedDatabase(dataRef, async (childRef) => {
        if (options.toArray) {
            data.value.push(childRef.val());
            refs[childRef.key] = childRef.val();
        } else {
            data.value[childRef.key] = childRef.val();
        }
    });

    onChildRemovedDatabase(dataRef, async (childRef) => {
        if (options.toArray) {
            const refO = refs[childRef.key];
            const index = data.value.findIndex((childRef) => childRef == refO);
            data.value.splice(index, 1);
        } else delete data.value[childRef.key];
    });

    return data.value;
};

export async function setFromPath(path, value) {
    const firebase = useFirebase();
    const ref = refDatabase(toRaw(firebase.database), path);
    await setDatabase(ref, value);
}

export async function pushFromPath(path, value) {
    const firebase = useFirebase();
    const ref = refDatabase(toRaw(firebase.database), path);
    await pushDatabase(ref, value);
    const r = await getDatabase(ref);
    return r.val();
}

export async function removeFromPath(path) {
    const firebase = useFirebase();
    const ref = refDatabase(toRaw(firebase.database), path);
    await removeDatabase(ref);
    const r = await getDatabase(ref.parent);
    return r.val();
}