/**
 * Calculate the frequency of characters in a string.
 * @param {string} string The input string.
 * @returns {Object} An object representing the character frequency.
 */
const frequency = (string) => {
    return [...string].reduce((charFreq, char) => {
        charFreq[char] = (charFreq[char] || 0) + 1;
        return charFreq;
    }, {});
};

/**
 * Convert a string to title case.
 * @param {string} string The input string.
 * @param {string} [splitSeparator=" "] The separator to split words.
 * @param {string} [joinSeparator=" "] The separator to join words.
 * @returns {string} The string in title case.
 */
const toTitleCase = (string, splitSeparator = " ", joinSeparator = " ") => {
    return string
        .split(splitSeparator)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(joinSeparator);
};

/**
 * Convert a string to snake case.
 * @param {string} string The input string.
 * @param {boolean} [upperCase=false] Whether to convert to uppercase.
 * @returns {string} The string in snake case.
 */
const toSnakeCase = (string, upperCase = false) => {
    const snakeString = string.split(" ").join("_");
    return upperCase ? snakeString.toUpperCase() : snakeString.toLowerCase();
};

/**
 * Convert camelCase to title case.
 * @param {string} string The input string.
 * @param {string} [separator=" "] The separator for title case.
 * @returns {string} The camelCase string in title case.
 */
const camelToTitleCase = (string, separator = " ") => {
    return toTitleCase(string.replace(/([A-Z])/g, " $1"), " ", separator).trim();
};

/**
 * Convert snake_case to title case.
 * @param {string} string The input string.
 * @param {string} [separator=" "] The separator for title case.
 * @returns {string} The snake_case string in title case.
 */
const snakeToTitleCase = (string, separator = " ") => {
    return toTitleCase(string, "_", separator);
};

const capFirstLetter = (str) => {
    if (str.length === 0 || !str) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export {
    frequency,
    toTitleCase,
    toSnakeCase,
    camelToTitleCase,
    snakeToTitleCase,
    capFirstLetter
};
