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