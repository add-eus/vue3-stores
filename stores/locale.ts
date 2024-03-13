// locale/index.ts

// WARNING: This is not a drop in replacement solution and
// it might not work for some edge cases. Test your code!
const set = (obj: {}, path: string[] | string, value: any) => {
    // Regex explained: https://regexr.com/58j0k
    const pathArray: string[] | null = Array.isArray(path)
        ? path
        : path.match(/([^[.\]])+/g);

    if (pathArray === null) return value;

    pathArray.reduce((acc: any, key, i) => {
        if (acc[key] === undefined) acc[key] = {};
        if (i === pathArray.length - 1) acc[key] = value;
        return acc[key];
    }, obj);
};

const messages: Record<string, any> = {};
const autoImportedLangs: Record<string, any> = import.meta.glob([`/locales/**/**.json`], {
    import: "default",
    eager: true,
});

for (const path in autoImportedLangs) {
    const absolutePath = path.replace("/locales", "");
    const lang: string = absolutePath.substring(
        absolutePath.indexOf("/") + 1,
        absolutePath.indexOf("/", absolutePath.indexOf("/") + 1)
    );

    if (messages[lang] === undefined) messages[lang] = {};
    set(
        messages[lang],
        absolutePath.replace(`/${lang}/`, "").replace(".json", "").replaceAll("/", "."),
        autoImportedLangs[path]
    );
}
export default messages;
