/**
 * Random number generator between min and max (inclusive)
 */
export function random(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Random integer generator between min and max (inclusive)
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Smoothly interpolate between two values
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
export function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * Smooth step function - acceleration/deceleration curve
 * @param {number} x - Input value (0-1)
 * @returns {number} - Smooth-stepped value (0-1)
 */
export function smoothStep(x) {
    // Clamp input to 0-1 range
    x = clamp(x, 0, 1);
    // Evaluate polynomial
    return x * x * (3 - 2 * x);
}

/**
 * Cubic easing in/out function - smoother acceleration/deceleration
 * @param {number} x - Input value (0-1)
 * @returns {number} - Eased value (0-1)
 */
export function easeInOut(x) {
    x = clamp(x, 0, 1);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Oscillate between -1 and 1 with smooth transitions
 * @param {number} time - Current time value
 * @param {number} period - Period of oscillation
 * @returns {number} - Oscillating value (-1 to 1)
 */
export function smoothOscillate(time, period) {
    return Math.sin(time * (Math.PI * 2) / period);
} 