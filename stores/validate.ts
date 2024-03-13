import * as rules from "@vee-validate/rules";
import { defineRule } from "vee-validate";

Object.keys(rules).forEach((name) => {
    const rule = rules[name];
    defineRule(name, (value, params) => {
        if (rule(value, params) === true) return true;
        return name;
    });
});

defineRule("phone", () => {
    // @Todo fix phone number validation
    return true;
});
