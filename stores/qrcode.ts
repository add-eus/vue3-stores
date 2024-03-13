import { acceptHMRUpdate, defineStore } from "pinia";
import QRCode from "qrcode";

export const useQRCode = defineStore("qrcode", () => {
    const canvas = document.createElement("canvas");
    return {
        download(options) {
            return new Promise((resolve, reject) => {
                QRCode.toCanvas(canvas, options.value, options, (error) => {
                    if (error) return reject(error);

                    canvas.toBlob((blob) => {
                        const data = window.URL.createObjectURL(blob);

                        const link = document.createElement("a");
                        link.href = data;
                        link.download = options.filename || "download.png";

                        // this is necessary as link.click() does not work on the latest firefox
                        link.dispatchEvent(
                            new MouseEvent("click", {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                            })
                        );

                        setTimeout(() => {
                            // For Firefox it is necessary to delay revoking the ObjectURL
                            window.URL.revokeObjectURL(data);
                            link.remove();
                            resolve();
                        }, 100);
                    });
                });
            });
        },
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
    import.meta.hot.accept(acceptHMRUpdate(useQRCode, import.meta.hot));
}
