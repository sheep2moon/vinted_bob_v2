/**
 * Delay execution for a specified duration.
 * @param {number} ms - Duration in milliseconds.
 * @returns {Promise<void>} - Promise resolving after the delay.
 */
export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
