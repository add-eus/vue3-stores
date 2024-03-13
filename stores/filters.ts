import moment from "moment-with-locales-es6";

export default {
    calendar(value: moment) {
        if (value) {
            if (value.toDate && value.seconds) value = value.toDate();
            return moment(value).calendar();
        }
        return null;
    },
    nlToBr(value: string) {
        return value.replaceAll(/\n/g, "<br>");
    },
};
