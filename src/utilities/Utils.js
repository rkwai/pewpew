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
 * Check if two objects collide (basic sphere collision)
 */
export function checkCollision(obj1, obj2) {
    if (!obj1.position || !obj2.position || !obj1.geometry || !obj2.geometry) {
        return false;
    }
    
    // Get bounding spheres
    const sphere1 = obj1.geometry.boundingSphere;
    const sphere2 = obj2.geometry.boundingSphere;
    
    if (!sphere1 || !sphere2) {
        return false;
    }
    
    // Calculate distance between centers
    const distance = obj1.position.distanceTo(obj2.position);
    
    // Check if the distance is less than the sum of radii
    return distance < (sphere1.radius * obj1.scale.x + sphere2.radius * obj2.scale.x);
}

/**
 * Calculate new position based on velocity and time
 */
export function updatePosition(object, velocity, deltaTime) {
    object.position.x += velocity.x * deltaTime;
    object.position.y += velocity.y * deltaTime;
    object.position.z += velocity.z * deltaTime;
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

/**
 * Enhance a material using global settings from GameConfig
 * @param {THREE.Material} material - The material to enhance
 * @param {Object} gameConfig - The game configuration
 */
export function enhanceMaterial(material, gameConfig) {
    if (!material || !gameConfig || !gameConfig.materials) {
        return material;
    }
    
    // Get material enhancement settings
    const settings = gameConfig.materials;
    
    // Store original color for enhancement
    const originalColor = material.color ? material.color.clone() : null;
    
    if (originalColor) {
        // Enhance saturation and contrast using HSL color space
        const hsl = {};
        originalColor.getHSL(hsl);
        
        // Apply saturation multiplier
        if (settings.globalSaturationMultiplier) {
            hsl.s = clamp(hsl.s * settings.globalSaturationMultiplier, 0, 1);
        }
        
        // Apply lightness adjustments for contrast
        if (settings.globalContrastMultiplier) {
            // Make dark colors darker and light colors lighter
            if (hsl.l < 0.5) {
                hsl.l = clamp(hsl.l / settings.globalContrastMultiplier, 0, 1);
            } else {
                hsl.l = clamp(hsl.l * settings.globalContrastMultiplier, 0, 1);
            }
        }
        
        // Set the enhanced color back to the material
        material.color.setHSL(hsl.h, hsl.s, hsl.l);
    }
    
    // Enhance emissive if present
    if (material.emissive && settings.globalEmissiveBoost) {
        material.emissive.multiplyScalar(settings.globalEmissiveBoost);
    }
    
    return material;
} 