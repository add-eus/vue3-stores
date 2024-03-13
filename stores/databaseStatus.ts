import { ref as vRef } from "vue";
import type { Ref } from "vue";
import { getDatabase, ref, onValue } from "firebase/database";
import { createGlobalState } from "@vueuse/core";

export const useDatabaseStatus = createGlobalState(() => {
    const isOnline: Ref<Boolean | null> = vRef(null);

    const db = getDatabase();
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
        isOnline.value = snap.val();
    });

    return {
        isOnline,
    };
});
