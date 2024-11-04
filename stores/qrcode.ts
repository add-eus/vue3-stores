import QRCode from "qrcode";

export const useQRCode = createGlobalState(() => {
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
