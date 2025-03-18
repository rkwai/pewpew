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
 * Get hit sphere data from an object
 * @param {Object} obj - Object to get hit sphere from
 * @returns {Object|null} - Hit sphere data with position and radius, or null if invalid
 */
export function getHitSphere(obj) {
    if (!obj || obj.isDestroyed) return null;
    
    let position, radius;
    
    // Case 1: Object has getHitSpherePosition or getHitSphereWorldPosition method
    if (typeof obj.getHitSpherePosition === 'function') {
        position = obj.getHitSpherePosition();
        radius = typeof obj.getHitSphereRadius === 'function' ? obj.getHitSphereRadius() : obj._hitSphereRadius;
    } else if (typeof obj.getHitSphereWorldPosition === 'function') {
        position = obj.getHitSphereWorldPosition();
        radius = typeof obj.getHitSphereRadius === 'function' ? obj.getHitSphereRadius() : obj._hitSphereRadius;
    }
    // Case 2: Object has position and radius directly
    else if (obj.position && obj.radius !== undefined) {
        position = obj.position;
        radius = obj.radius;
    }
    // Case 3: Three.js object with geometry.boundingSphere
    else if (obj.position && obj.geometry && obj.geometry.boundingSphere) {
        position = obj.position;
        radius = obj.geometry.boundingSphere.radius * (obj.scale ? obj.scale.x : 1);
    }
    
    if (!position || !radius || isNaN(radius)) {
        return null;
    }
    
    return { position, radius };
}

/**
 * Check if two objects collide using sphere collision detection
 * This is the single source of truth for collision detection in the game
 * 
 * @param {Object} obj1 - First object to check
 * @param {Object} obj2 - Second object to check
 * @returns {boolean} - Whether the objects are colliding
 * 
 * The function supports different object types:
 * 1. Objects with getHitSpherePosition/getHitSphereWorldPosition and getHitSphereRadius methods
 * 2. Objects with position and radius properties
 * 3. Three.js objects with position and geometry.boundingSphere
 */
export function checkCollision(obj1, obj2) {
    const hitSphere1 = getHitSphere(obj1);
    const hitSphere2 = getHitSphere(obj2);
    
    if (!hitSphere1 || !hitSphere2) {
        return false;
    }
    
    const distance = hitSphere1.position.distanceTo(hitSphere2.position);
    const combinedRadii = hitSphere1.radius + hitSphere2.radius;
    
    return distance <= combinedRadii;
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
    
    // Remove any emissive properties
    if (material.emissive) {
        material.emissive.setRGB(0, 0, 0);
        material.emissiveIntensity = 0;
    }
    
    return material;
}

/**
 * Enhances the material properties based on game configuration.
 * @param {THREE.Material} material - The material to enhance.
 * @param {object} gameConfig - The game configuration object.
 * @param {object} aestheticsConfig - Specific aesthetics configuration for the object (optional).
 */
export function enhanceObjectMaterial(material, gameConfig, aestheticsConfig) {
    const aesthetics = aestheticsConfig || gameConfig.player.aesthetics; // Default to player aesthetics if not provided

    // Preserve original color without excessive brightening
    const hsl = {};
    material.color.getHSL(hsl);
    material.color.setHSL(
        hsl.h,                                        // Keep original hue
        Math.min(hsl.s * aesthetics.saturationMultiplier, 1), // Increase saturation
        Math.min(hsl.l * aesthetics.lightnessMultiplier, 1)  // Increase lightness
    );

    // Remove any existing emissive properties
    if (material.emissive) {
        material.emissive.setRGB(0, 0, 0);
        material.emissiveIntensity = 0;
    }

    // Enhance reflection properties
    if (material.type.includes('MeshStandard')) {
        material.metalness = aesthetics.standardMaterial.metalness;
        material.roughness = aesthetics.standardMaterial.roughness;
    } else {
        material.shininess = aesthetics.phongMaterial.shininess;
    }

    // Apply global material enhancements
    enhanceMaterial(material, gameConfig);
} 