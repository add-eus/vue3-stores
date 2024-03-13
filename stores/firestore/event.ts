export default class EventEmitter {
    #events: { [key: string]: Array<(...args: any[]) => void> } = {};

    emit(event: string, ...args: any[]) {
        const callbacks = Array.isArray(this.#events[event]) ? this.#events[event] : [];
        for (let i = 0, length = callbacks.length; i < length; i++) {
            callbacks[i](...args);
        }
    }

    on(event: string, cb: (...args: any[]) => void) {
        this.#events[event]?.push(cb) || (this.#events[event] = [cb]);
        return () => {
            this.#events[event] = this.#events[event]?.filter((i) => cb !== i);
        };
    }

    off(event: string, cb: (...args: any[]) => void) {
        const index = this.#events[event].findIndex((event) => event === cb);
        this.#events[event].splice(index, 1);
    }
}
