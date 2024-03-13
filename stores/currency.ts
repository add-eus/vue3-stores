import { toValue } from "@vueuse/core";
import type { ComputedRef, MaybeRefOrGetter } from "vue";
import { computed } from "vue";
import CurrencyCodes from "iso-country-currency";

const Currencies = CurrencyCodes.getAllISOCodes();
export const Currency: { [key: string]: string } = {};
export const CurrencySymbol: { [key: string]: string } = {};

Currencies.forEach((currency) => {
    Currency[currency.currency] = currency.iso;
    CurrencySymbol[currency.currency] = currency.symbol;
});

export function useCurrencySymbol(
    currency: MaybeRefOrGetter<string | undefined>
): ComputedRef<string> {
    return computed(() => {
        const key = toValue(currency);

        if (typeof key !== "string" || CurrencySymbol[key] === undefined)
            return CurrencySymbol[0];

        return CurrencySymbol[key];
    });
}
