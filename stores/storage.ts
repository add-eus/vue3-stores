import { acceptHMRUpdate, defineStore } from "pinia";

import {
    ref as refStorage,
    deleteObject,
    getBlob,
    uploadBytes,
    updateMetadata,
    getDownloadURL,
} from "firebase/storage";
import { useFirebase } from "./firebase";
import { v4 as uuid } from "uuid";

export const useStorage = defineStore("Storage", () => {
    const storage = useFirebase().storage;
    const cached = {};

    const upload = async (file: File | Path | Blob, path: string) => {
        const pathName = path + "/" + uuid();
        const refFile = refStorage(storage, pathName);
        const arrayBuffer = await file.arrayBuffer();

        cached[pathName] = file;

        await uploadBytes(refFile, arrayBuffer);

        await updateMetadata(refFile, {
            contentType: file.type,
        });

        return refFile.fullPath;
    };
    const remove = async (url: string) => {
        const ref = refStorage(storage, url);
        await deleteObject(ref);
    };
    const fetch = async (url: string) => {
        if (cached[url] !== undefined) return cached[url];
        const refFile = refStorage(storage, url);
        const blob = await getBlob(refFile);
        cached[url] = blob;
        return blob;
    };
    const fetchAsDataUrl = async (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then((blob) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onload = () => {
                        resolve(reader.result as string);
                    };
                })
                .catch(reject);
        });
    };

    function publicUrlToPath(publicUrl: string): string {
        return publicUrl
            .replace(
                `${storage._protocol}://${
                    storage.host
                }${storage._bucket.fullServerUrl()}`,
                ""
            )
            .replace(/\?.*$/, "");
    }

    async function pathToPublicUrl(path: string): Promise<string> {
        const refFile = refStorage(storage, path);
        return getDownloadURL(refFile);
    }

    return { upload, remove, fetch, fetchAsDataUrl, pathToPublicUrl, publicUrlToPath };
});

/**
 * Pinia supports Hot Module replacement so you can edit your stores and
 * interact with them directly in your app without reloading the page.
 *
 * @see https://pinia.esm.dev/cookbook/hot-module-replacement.html
 * @see https://vitejs.dev/guide/api-hmr.html
 */
if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useStorage, import.meta.hot));
}
