import { useTranslate } from "./translate";
import { Notyf } from "notyf";
const notyf = new Notyf();

export function useNotification() {
    const { translate } = useTranslate();
    return {
        success(message, params) {
            return notyf.success(translate(message, params).value);
        },
    };
}
