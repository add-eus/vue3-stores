import {
    ref as refStorage,
    deleteObject,
    getBlob,
    uploadBytes,
    updateMetadata,
    getDownloadURL,
} from "firebase/storage";
import { useFirebase } from "@addeus/web-utils/src/firebase";
import { v4 as uuid } from "uuid";
import { createGlobalState } from "@vueuse/core";

export const useStorage = createGlobalState(() => {
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