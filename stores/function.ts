import { useFirebase } from "./firebase";
import { httpsCallable as firebaseHttpsCallable } from "firebase/functions";

export async function httpsOpen(path: string, args: { [name: string]: string | number }) {
    const { functions } = useFirebase();
    const url = (<any>functions)._url(path);
    const query = Object.keys(args)
        .map((key) => `${key}=${encodeURIComponent(args[key])}`)
        .join("&");
    const page = <Window>window.open(`${url}?${query}`);
    await new Promise((resolve) => {
        const i = setInterval(() => {
            if (page.closed) {
                clearInterval(i);
                resolve(page);
            }
        }, 100);
    });
}

export default new Proxy(
    {},
    {
        get(object: { [key: string]: Function }, name: string) {
            if (!object[name]) {
                const callableFunction = firebaseHttpsCallable(
                    useFirebase().functions,
                    name
                );
                object[name] = async function (...args: any[]) {
                    const result = await callableFunction(...args, navigator?.language);
                    return result.data;
                };
            }
            return object[name];
        },
    }
);
