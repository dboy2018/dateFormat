var angularJs = window.angularJs || {};
angularJs.extract = new function () {
    var self = this;
    var ZERO_CHAR = "0";
    var DATE_FORMATS_SPLIT =
            /((?:[^yMLdHhmsfaZEwG']+)|(?:'(?:[^']|'')*')|(?:E+|y+|M+|L+|d+|H+|h+|m+|s+|f+|a|Z|G+|w[1,7]+))([\s\S]*)/,
        NUMBER_STRING = /^-?\d+$/;

    var ALL_COLONS = /:/g;

    var R_ISO8601_STR =
        /^(\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d+))?)?)?(Z|([+-])(\d\d):?(\d\d))?)?$/;
// 1        2       3         4          5          6          7          8  9     10      11

    var slice = [].slice;

    var DATE_FORMATS = {
        yyyy: dateGetter("FullYear", 4, 0, false, true),
        yy: dateGetter("FullYear", 2, 0, true, true),
        y: dateGetter("FullYear", 1, 0, false, true),
        MMMM: dateStrGetter("Month"),
        MMM: dateStrGetter("Month", true),
        MM: dateGetter("Month", 2, 1),
        M: dateGetter("Month", 1, 1),
        LLLL: dateStrGetter("Month", false, true),
        dd: dateGetter("Date", 2),
        d: dateGetter("Date", 1),
        HH: dateGetter("Hours", 2),
        H: dateGetter("Hours", 1),
        hh: dateGetter("Hours", 2, -12),
        h: dateGetter("Hours", 1, -12),
        mm: dateGetter("Minutes", 2),
        m: dateGetter("Minutes", 1),
        ss: dateGetter("Seconds", 2),
        s: dateGetter("Seconds", 1),
        // while ISO 8601 requires fractions to be prefixed with `.` or `,`
        // we can be just safely rely on using `sss` since we currently don't support single or two digit fractions
        fff: dateGetter("Milliseconds", 3),
        EEEE: dateStrGetter("Day"),
        EEE: dateStrGetter("Day", true),
        a: ampmGetter,
        Z: timeZoneGetter,
        ww7: weekGetter(2, 7),
        ww1: weekGetter(2, 1),
        w7: weekGetter(1, 7),
        w1: weekGetter(1, 1),
        G: eraGetter,
        GG: eraGetter,
        GGG: eraGetter,
        GGGG: longEraGetter
    };

    var DATETIME_FORMATS = {
        "AMPMS": [
            "AM",
            "PM"
        ],
        "DAY": [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ],
        "ERANAMES": [
            "Before Christ",
            "Anno Domini"
        ],
        "ERAS": [
            "BC",
            "AD"
        ],
        "FIRSTDAYOFWEEK": 6,
        "MONTH": [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ],
        "SHORTDAY": [
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat"
        ],
        "SHORTMONTH": [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec"
        ],
        "STANDALONEMONTH": [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ],
        "WEEKENDRANGE": [
            5,
            6
        ],
        "fullDate": "EEEE, MMMM d, y",
        "longDate": "MMMM d, y",
        "medium": "MMM d, y h:mm:ss a",
        "mediumDate": "MMM d, y",
        "mediumTime": "h:mm:ss a",
        "short": "M/d/yy h:mm a",
        "shortDate": "M/d/yy",
        "shortTime": "h:mm a",
        "full": "yyyy-MM-dd HH:mm:ss.fff",
        "date": "yyyy-MM-dd",
        "time": "HH:mm:ss.fff",
        "simple":"yyyyMMddHHmmssfff"
    };


    var uppercase = function(string) { return isString(string) ? string.toUpperCase() : string; };

    var isNumberNaN = Number.isNaN ||
        function isNumberNaN(num) {
            // eslint-disable-next-line no-self-compare
            return num !== num;
        };

    function toInt(str) {
        return parseInt(str, 10);
    }

    function padNumber(num, digits, trim, negWrap) {
        var neg = "";
        if (num < 0 || (negWrap && num <= 0)) {
            if (negWrap) {
                num = -num + 1;
            } else {
                num = -num;
                neg = "-";
            }
        }
        num = "" + num;
        while (num.length < digits) num = ZERO_CHAR + num;
        if (trim) {
            num = num.substr(num.length - digits);
        }
        return neg + num;
    }

    function dateGetter(name, size, offset, trim, negWrap) {
        offset = offset || 0;
        return function(date) {
            var value = date["get" + name]();
            if (offset > 0 || value > -offset) {
                value += offset;
            }
            if (value === 0 && offset === -12) value = 12;
            return padNumber(value, size, trim, negWrap);
        };
    }


    function jsonStringToDate(string) {
        var match;
        if ((match = string.match(R_ISO8601_STR))) {
            var date = new Date(0),
                tzHour = 0,
                tzMin = 0,
                dateSetter = match[8] ? date.setUTCFullYear : date.setFullYear,
                timeSetter = match[8] ? date.setUTCHours : date.setHours;

            if (match[9]) {
                tzHour = toInt(match[9] + match[10]);
                tzMin = toInt(match[9] + match[11]);
            }
            dateSetter.call(date, toInt(match[1]), toInt(match[2]) - 1, toInt(match[3]));
            var h = toInt(match[4] || 0) - tzHour;
            var m = toInt(match[5] || 0) - tzMin;
            var s = toInt(match[6] || 0);
            var ms = Math.round(parseFloat("0." + (match[7] || 0)) * 1000);
            timeSetter.call(date, h, m, s, ms);
            return date;
        }
        return string;
    }


    function timezoneToOffset(timezone, fallback) {
        // Support: IE 9-11 only, Edge 13-15+
        // IE/Edge do not "understand" colon (`:`) in timezone
        timezone = timezone.replace(ALL_COLONS, "");
        var requestedTimezoneOffset = Date.parse("Jan 01, 1970 00:00:00 " + timezone) / 60000;
        return isNumberNaN(requestedTimezoneOffset) ? fallback : requestedTimezoneOffset;
    }


    function dateStrGetter(name, shortForm, standAlone) {
        return function(date, formats) {
            var value = date["get" + name]();
            var propPrefix = (standAlone ? "STANDALONE" : "") + (shortForm ? "SHORT" : "");
            var get = uppercase(propPrefix + name);

            return formats[get][value];
        };
    }


    function isString(value) {
        return typeof value === "string";
    }

    function isNumber(value) {
        return typeof value === "number";
    }

    function isDate(value) {
        return toString.call(value) === "[object Date]";
    }

    function concat(array1, array2, index) {
        return array1.concat(slice.call(array2, index));
    }

    function forEach(obj, iterator, context) {
        var key, length;
        if (obj) {
            if (isFunction(obj)) {
                for (key in obj) {
                    if (key !== "prototype" && key !== "length" && key !== "name" && obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            } else if (isArray(obj) || isArrayLike(obj)) {
                var isPrimitive = typeof obj !== "object";
                for (key = 0, length = obj.length; key < length; key++) {
                    if (isPrimitive || key in obj) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            } else if (obj.forEach && obj.forEach !== forEach) {
                obj.forEach(iterator, context, obj);
            } else if (isBlankObject(obj)) {
                // createMap() fast path --- Safe to avoid hasOwnProperty check because prototype chain is empty
                for (key in obj) {
                    iterator.call(context, obj[key], key, obj);
                }
            } else if (typeof obj.hasOwnProperty === "function") {
                // Slow path for objects inheriting Object.prototype, hasOwnProperty check needed
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            } else {
                // Slow path for objects which do not have a method `hasOwnProperty`
                for (key in obj) {
                    if (hasOwnProperty.call(obj, key)) {
                        iterator.call(context, obj[key], key, obj);
                    }
                }
            }
        }
        return obj;
    }

    function isFunction(value) { return typeof value === "function"; }

    function isArray(arr) {
        return Array.isArray(arr) || arr instanceof Array;
    }

    function convertTimezoneToLocal(date, timezone, reverse) {
        reverse = reverse ? -1 : 1;
        var dateTimezoneOffset = date.getTimezoneOffset();
        var timezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
        return addDateMinutes(date, reverse * (timezoneOffset - dateTimezoneOffset));
    }

    function addDateMinutes(date, minutes) {
        date = new Date(date.getTime());
        date.setMinutes(date.getMinutes() + minutes);
        return date;
    }

    function ampmGetter(date, formats) {
        return date.getHours() < 12 ? formats.AMPMS[0] : formats.AMPMS[1];
    }

    function eraGetter(date, formats) {
        return date.getFullYear() <= 0 ? formats.ERAS[0] : formats.ERAS[1];
    }

    function longEraGetter(date, formats) {
        return date.getFullYear() <= 0 ? formats.ERANAMES[0] : formats.ERANAMES[1];
    }

    function timeZoneGetter(date, formats, offset) {
        var zone = -1 * offset;
        var paddedZone = (zone >= 0) ? "+" : "";

        paddedZone += padNumber(Math[zone > 0 ? "floor" : "ceil"](zone / 60), 2) +
            padNumber(Math.abs(zone % 60), 2);

        return paddedZone;
    }

    function weekGetter(size, first) {
        return function(date) {
            var firstThurs = getFirstThursdayOfYear(date.getFullYear()),
                thisThurs = getThursdayThisWeek(date);

            var diff = +thisThurs - +firstThurs;
            var result;
            if (first == 7) {

                result = 1 + Math.round(diff / 6.048e8); // 6.048e8 ms per week
            } else {
                result = 0 + Math.round(diff / 6.048e8); // 6.048e8 ms per week
            }


            return padNumber(result, size);
        };
    }

    function getFirstThursdayOfYear(year) {
        // 0 = index of January
        var dayOfWeekOnFirst = (new Date(year, 0, 1)).getDay();
        // 4 = index of Thursday (+1 to account for 1st = 5)
        // 11 = index of *next* Thursday (+1 account for 1st = 12)
        return new Date(year, 0, ((dayOfWeekOnFirst <= 4) ? 5 : 12) - dayOfWeekOnFirst);
    }

    function getThursdayThisWeek(datetime) {
        return new Date(datetime.getFullYear(),
            datetime.getMonth(),
            // 4 = index of Thursday
            datetime.getDate() + (4 - datetime.getDay()));
    }


    self.format=function(date, formatstr, timezone) {
        var text = "",
            parts = [],
            fn,
            match;

        formatstr = formatstr || "mediumDate";
        formatstr = DATETIME_FORMATS[formatstr] || formatstr;
        if (isString(date)) {
            date = NUMBER_STRING.test(date) ? toInt(date) : jsonStringToDate(date);
        }

        if (isNumber(date)) {
            date = new Date(date);
        }

        if (!isDate(date) || !isFinite(date.getTime())) {
            return date;
        }

        while (formatstr) {
            match = DATE_FORMATS_SPLIT.exec(formatstr);
            if (match) {
                parts = concat(parts, match, 1);
                formatstr = parts.pop();
            } else {
                parts.push(formatstr);
                formatstr = null;
            }
        }

        var dateTimezoneOffset = date.getTimezoneOffset();
        if (timezone) {
            dateTimezoneOffset = timezoneToOffset(timezone, dateTimezoneOffset);
            date = convertTimezoneToLocal(date, timezone, true);
        }
        forEach(parts,
            function(value) {
                fn = DATE_FORMATS[value];
                text += fn
                    ? fn(date, DATETIME_FORMATS, dateTimezoneOffset)
                    : value === "''"
                    ? "'"
                    : value.replace(/(^'|'$)/g, "").replace(/''/g, "'");
            });

        return text;
    }


}
Date.prototype.format = function (formatStr, timezone) {
    return angularJs.extract.format(this, formatStr, timezone);
}
String.prototype.format = function (formatStr, timezone) {
    return angularJs.extract.format(this.toString(), formatStr, timezone);
}
Number.prototype.format = function (formatStr, timezone) {
    return angularJs.extract.format(Number(this), formatStr, timezone);
}
