import sleep from "@addeus/web-utils/src/sleep";
import { isVisible, isHidden } from "./element";

export async function waitForElementPresent(selector, parent = document.body) {
    await new Promise((resolve) => {
        if (parent.querySelector(selector) !== null) {
            return resolve(parent.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (parent.querySelector(selector) !== null) {
                resolve(parent.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(parent, {
            childList: true,
            subtree: true,
        });
    });
}

export async function waitForElementLoaded(element) {
    const elements = Array.from(element.getElementsByTagName("img")).concat(
        ...element.getElementsByTagName("iframe")
    );

    await Promise.all(
        Array.prototype.map.call(elements, async (element) => {
            if (element.tagName.toLowerCase() === "img") {
                if (element.complete === true && element.naturalHeight !== 0) return;
                return new Promise((resolve, reject) => {
                    element.addEventListener("load", resolve);
                    element.addEventListener("error", reject);
                });
            } else if (element.tagName.toLowerCase() === "iframe") {
                if (element.contentDocument.readyState === "complete") {
                    await sleep(100);
                    return;
                }
                return new Promise((resolve, reject) => {
                    element.contentDocument.addEventListener("load", resolve);
                    element.contentDocument.addEventListener("error", reject, false);
                });
            }
        })
    );
}

export async function waitForElementVisible(element: Element): Promise<Element> {
    return new Promise((resolve) => {
        const intersectionObserver = new IntersectionObserver(
            () => {
                if (isVisible(element)) {
                    intersectionObserver.disconnect();
                    resolve(element);
                }
            },
            {
                threshold: 0,
            }
        );
        // start observing
        intersectionObserver.observe(element);
    });
}

export async function waitForElementHidden(element: Element): Promise<Element> {
    return new Promise((resolve) => {
        const intersectionObserver = new IntersectionObserver(
            () => {
                if (isHidden(element) === true) {
                    intersectionObserver.disconnect();
                    resolve(element);
                }
            },
            {
                threshold: 0,
            }
        );
        // start observing
        intersectionObserver.observe(element);
    });
}

const transitionPropertyNames = [
    "-webkit-transition",
    "-o-transition",
    "-moz-transition",
    "-ms-transition",
    "transition",
];

function setTransition(element, value) {
    transitionPropertyNames.forEach((property) => {
        element.style[property] = value;
    });
}

function getTransition(element) {
    let value = null;
    transitionPropertyNames.forEach((property) => {
        if (element.style[property] !== undefined) {
            value = element.style[property];
        }
    });
    return value;
}

export async function waitTransition(element, styles, duration, easing) {
    let oldTransition;
    if (typeof duration === "number" && typeof easing === "string") {
        oldTransition = getTransition(element);
        const transition = Object.keys(styles)
            .map((key) => {
                return `${key} ${duration}s ${easing || "linear"}`;
            })
            .join(", ");
        setTransition(element, transition);
    }
    await Promise.all(
        Object.keys(styles).map((key) => {
            if (element.style[key] === styles[key]) return;

            return new Promise<void>((resolve) => {
                const transitionEnded = (e) => {
                    if (e.propertyName !== key) return;
                    element.removeEventListener("transitionend", transitionEnded);
                    resolve();
                };
                element.addEventListener("transitionend", transitionEnded);

                const transitionStarted = (e) => {
                    if (e.propertyName !== key) return;
                    clearTimeout(timeout);
                    element.removeEventListener("transitionstart", transitionStarted);
                };
                element.addEventListener("transitionstart", transitionStarted);
                const timeout = setTimeout(() => {
                    resolve();
                }, 100);
                element.style[key] = styles[key];
            });
        })
    );
    if (typeof duration === "number") {
        setTransition(element, oldTransition);
    }
}
