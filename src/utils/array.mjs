/**
 * Returns an array of elements split into groups of the specified size.
 * If the array can't be split evenly, the final chunk will contain the remaining elements.
 * @param {T[]} array The array you want to split into chunks.
 * @param {number} size The chunk size.
 * @returns {T[][]} An array of chunks.
 */
export const chunks = (array, size) => {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
};

/**
 * Shuffles the array of elements in-place using the Fisher–Yates shuffle.
 * @param {T[]} array The array you want to shuffle.
 */
export const shuffle = (array) => {
    let currentIndex = array.length;
    while (currentIndex) {
        const randomIndex = Math.floor(Math.random() * currentIndex--);
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
};
