/**
 * Abbreviates a number with SI symbols.
 * @param {number} number The number to abbreviate.
 * @returns {string} The abbreviated number with SI symbols.
 */
const abbreviate = (number) => {
    if (!number) return "0";
    const SI_PREFIX_SYMBOL = ["", "k", "M", "G", "T", "P", "E", "Z", "Y"];
    const symbolIndex = Math.log10(Math.abs(number)) / 3 | 0;
    if (symbolIndex === 0) return number.toString();
    const scaled = parseInt(number / Math.pow(10, symbolIndex * 3));
    return scaled.toFixed(3).replace(/(?:\.0+|0+)$/, "") + SI_PREFIX_SYMBOL[symbolIndex];
};

/**
 * Clamps a number within a specified range.
 * @param {number} number The number to clamp.
 * @param {number} lower The lower bound of the range.
 * @param {number} [upper] The upper bound of the range.
 * @returns {number} The clamped number.
 */
const clamp = (number, lower, upper) => {
    if (typeof upper !== "number") [lower, upper] = [-Infinity, lower];
    return Math.max(lower, Math.min(number, upper));
};

/**
 * Generates a random integer within a specified range.
 * @param {number} min The minimum value (inclusive).
 * @param {number} max The maximum value (inclusive).
 * @returns {number} A random integer within the specified range.
 */
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Checks if a number is in a specified range.
 * @param {number} number The number to check.
 * @param {number} lower The lower bound of the range.
 * @param {number} [upper] The upper bound of the range.
 * @returns {boolean} True if the number is within the specified range; otherwise, false.
 */
const inRange = (number, lower, upper) => {
    if (typeof upper !== "number") [lower, upper] = [-Infinity, lower];
    return number >= Math.min(lower, upper) && number <= Math.max(lower, upper);
};

/**
 * Finds the largest neighbor in a list that is greater than or equal to the specified number.
 * @param {number} number The number for which to find the largest neighbor.
 * @param {number[]} list The list of numbers to search.
 * @returns {number} The largest neighbor in the list.
 */
const largestNeighbor = (number, list) => {
    let nearest = Number.MAX_SAFE_INTEGER;
    for (const item of list) {
        if (item < nearest && item >= number) nearest = item;
    }
    return nearest;
};

/**
 * Finds the smallest neighbor in a list that is less than or equal to the specified number.
 * @param {number} number The number for which to find the smallest neighbor.
 * @param {number[]} list The list of numbers to search.
 * @returns {number} The smallest neighbor in the list.
 */
const smallestNeighbor = (number, list) => {
    let nearest = Number.MIN_SAFE_INTEGER;
    for (const item of list) {
        if (item > nearest && item <= number) nearest = item;
    }
    return nearest;
}

export {
    abbreviate,
    clamp,
    getRandomInt,
    inRange,
    largestNeighbor,
    smallestNeighbor,
};
