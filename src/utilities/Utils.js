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
    // Check if either object is null or undefined or marked as destroyed
    if (!obj1 || !obj2 || obj1.isDestroyed || obj2.isDestroyed) {
        return false;
    }
    
    // Get position and radius for first object
    let pos1, radius1;
    
    // Case 1: Object has getHitSpherePosition or getHitSphereWorldPosition method
    if (typeof obj1.getHitSpherePosition === 'function') {
        pos1 = obj1.getHitSpherePosition();
        radius1 = typeof obj1.getHitSphereRadius === 'function' ? obj1.getHitSphereRadius() : obj1._hitSphereRadius;
    } else if (typeof obj1.getHitSphereWorldPosition === 'function') {
        pos1 = obj1.getHitSphereWorldPosition();
        radius1 = typeof obj1.getHitSphereRadius === 'function' ? obj1.getHitSphereRadius() : obj1._hitSphereRadius;
    }
    // Case 2: Object has position and radius directly
    else if (obj1.position && obj1.radius !== undefined) {
        pos1 = obj1.position;
        radius1 = obj1.radius;
    }
    // Case 3: Three.js object with geometry.boundingSphere
    else if (obj1.position && obj1.geometry && obj1.geometry.boundingSphere) {
        pos1 = obj1.position;
        radius1 = obj1.geometry.boundingSphere.radius * (obj1.scale ? obj1.scale.x : 1);
    }
    // Invalid object
    else {
        console.warn('Invalid object passed to checkCollision, unable to determine collision properties', obj1);
        return false;
    }
    
    // Get position and radius for second object
    let pos2, radius2;
    
    // Case 1: Object has getHitSpherePosition or getHitSphereWorldPosition method
    if (typeof obj2.getHitSpherePosition === 'function') {
        pos2 = obj2.getHitSpherePosition();
        radius2 = typeof obj2.getHitSphereRadius === 'function' ? obj2.getHitSphereRadius() : obj2._hitSphereRadius;
    } else if (typeof obj2.getHitSphereWorldPosition === 'function') {
        pos2 = obj2.getHitSphereWorldPosition();
        radius2 = typeof obj2.getHitSphereRadius === 'function' ? obj2.getHitSphereRadius() : obj2._hitSphereRadius;
    }
    // Case 2: Object has position and radius directly
    else if (obj2.position && obj2.radius !== undefined) {
        pos2 = obj2.position;
        radius2 = obj2.radius;
    }
    // Case 3: Three.js object with geometry.boundingSphere
    else if (obj2.position && obj2.geometry && obj2.geometry.boundingSphere) {
        pos2 = obj2.position;
        radius2 = obj2.geometry.boundingSphere.radius * (obj2.scale ? obj2.scale.x : 1);
    }
    // Invalid object
    else {
        console.warn('Invalid object passed to checkCollision, unable to determine collision properties', obj2);
        return false;
    }
    
    // Check if positions are valid
    if (!pos1 || !pos2 || !pos1.distanceTo || !pos2.distanceTo) {
        console.warn('Invalid positions in checkCollision');
        return false;
    }
    
    // Check if radii are valid
    if (radius1 === undefined || radius2 === undefined || isNaN(radius1) || isNaN(radius2)) {
        console.warn('Invalid radii in checkCollision');
        return false;
    }
    
    // Calculate distance between objects
    const distance = pos1.distanceTo(pos2);
    
    // Check if objects are colliding
    return distance < (radius1 + radius2);
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