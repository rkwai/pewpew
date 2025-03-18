import { CollisionSystem } from './CollisionSystem.js';

/**
 * Singleton manager for collision detection
 * Provides a global access point to the collision system
 */
class CollisionManager {
    constructor() {
        this.system = new CollisionSystem();
    }
    
    /**
     * Register an entity for collision detection
     * @param {Object} entity - Entity to register
     * @param {string} type - Collision type from CollisionTypes
     */
    register(entity, type) {
        this.system.register(entity, type);
    }
    
    /**
     * Unregister an entity from collision detection
     * @param {Object} entity - Entity to unregister
     * @param {string} type - Collision type of the entity
     */
    unregister(entity, type) {
        this.system.unregister(entity, type);
    }
    
    /**
     * Update the collision system, detecting collisions between registered entities
     * This should be called once per frame
     */
    update() {
        this.system.update();
    }
    
    /**
     * Clear all entities of a specific type
     * @param {string} type - Collision type to clear
     */
    clearType(type) {
        this.system.clearType(type);
    }
    
    /**
     * Clear all registered entities
     */
    clearAll() {
        this.system.clearAll();
    }
    
    /**
     * Alias for clearAll() - clears all registered entities
     */
    clear() {
        this.clearAll();
    }
}

// Create a singleton instance
export const Collisions = new CollisionManager(); 