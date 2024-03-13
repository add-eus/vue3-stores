import { acceptHMRUpdate, defineStore } from "pinia";
import { ref as vRef } from "vue";
import type { Ref } from "vue";
import { getDatabase, ref, onValue } from "firebase/database";

export const useDatabaseStatus = defineStore("dbStatus", () => {
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

/**
 * Pinia supports Hot Module replacement so you can edit your stores and
 * interact with them directly in your app without reloading the page.
 *
 * @see https://pinia.esm.dev/cookbook/hot-module-replacement.html
 * @see https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useDatabaseStatus, import.meta.hot));
}
