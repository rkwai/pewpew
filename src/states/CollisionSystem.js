import { THREE } from '../utilities/ThreeImports.js';
import { checkCollision } from '../utilities/Utils.js';
import { Events } from './EventSystem.js';
import { EventTypes } from './EventTypes.js';

/**
 * Collision types for different entity categories
 */
export const CollisionTypes = {
    PLAYER: 'player',
    ASTEROID: 'asteroid',
    BULLET: 'bullet',
    POWERUP: 'powerup',
    ENEMY: 'enemy',
    ENVIRONMENT: 'environment'
};

/**
 * Handles collision detection and response between entities
 */
export class CollisionSystem {
    /**
     * Create a new collision system
     */
    constructor() {
        // Map of entity groups by collision type
        this.entities = new Map();
        
        // Initialize empty entity groups for each collision type
        Object.values(CollisionTypes).forEach(type => {
            this.entities.set(type, []);
        });
        
        // Collision matrix defines which types of entities should check collisions with each other
        this.collisionMatrix = new Map([
            // Player collides with asteroids, enemies, powerups, environment
            [CollisionTypes.PLAYER, [CollisionTypes.ASTEROID, CollisionTypes.ENEMY, CollisionTypes.POWERUP, CollisionTypes.ENVIRONMENT]],
            
            // Bullets collide with asteroids, enemies, environment
            [CollisionTypes.BULLET, [CollisionTypes.ASTEROID, CollisionTypes.ENEMY, CollisionTypes.ENVIRONMENT]],
            
            // Asteroids collide with player, bullets, environment
            [CollisionTypes.ASTEROID, [CollisionTypes.PLAYER, CollisionTypes.BULLET, CollisionTypes.ENVIRONMENT]],
            
            // Enemies collide with player, bullets, environment
            [CollisionTypes.ENEMY, [CollisionTypes.PLAYER, CollisionTypes.BULLET, CollisionTypes.ENVIRONMENT]],
            
            // Powerups collide only with player
            [CollisionTypes.POWERUP, [CollisionTypes.PLAYER]],
            
            // Environment collides with everything
            [CollisionTypes.ENVIRONMENT, [CollisionTypes.PLAYER, CollisionTypes.BULLET, CollisionTypes.ASTEROID, CollisionTypes.ENEMY, CollisionTypes.POWERUP]]
        ]);
    }
    
    /**
     * Register an entity for collision detection
     * @param {Object} entity - Entity to register
     * @param {string} type - Collision type from CollisionTypes
     */
    register(entity, type) {
        if (!this.entities.has(type)) {
            console.warn(`Unknown collision type: ${type}. Entity not registered.`);
            return;
        }
        
        // Add entity to the appropriate group
        const entityGroup = this.entities.get(type);
        
        // Check if entity has required properties for collision detection
        if (!this._isValidCollider(entity)) {
            console.warn('Entity missing required collision properties. Must have getHitSpherePosition/getPosition and getHitSphereRadius/radius properties.');
            return;
        }
        
        // Check if entity is already registered
        if (!entityGroup.includes(entity)) {
            entityGroup.push(entity);
        }
    }
    
    /**
     * Unregister an entity from collision detection
     * @param {Object} entity - Entity to unregister
     * @param {string} type - Collision type of the entity
     */
    unregister(entity, type) {
        if (!this.entities.has(type)) {
            console.warn(`Unknown collision type: ${type}. Cannot unregister entity.`);
            return;
        }
        
        const entityGroup = this.entities.get(type);
        const index = entityGroup.indexOf(entity);
        
        if (index !== -1) {
            entityGroup.splice(index, 1);
        }
    }
    
    /**
     * Clear all entities of a specific type
     * @param {string} type - Collision type to clear
     */
    clearType(type) {
        if (this.entities.has(type)) {
            this.entities.set(type, []);
        } else {
            console.warn(`Unknown collision type: ${type}. Cannot clear entities.`);
        }
    }
    
    /**
     * Clear all registered entities
     */
    clearAll() {
        Object.values(CollisionTypes).forEach(type => {
            this.entities.set(type, []);
        });
    }
    
    /**
     * Update the collision system, checking for collisions between registered entities
     */
    update() {
        // Process each entity type according to the collision matrix
        this.collisionMatrix.forEach((collidesWithTypes, entityType) => {
            const entities = this.entities.get(entityType);
            
            // Skip if no entities of this type
            if (!entities || entities.length === 0) {
                return;
            }
            
            // Check collisions with each type this entity collides with
            collidesWithTypes.forEach(targetType => {
                // Skip self-collision for now (could be added later if needed)
                if (entityType === targetType) {
                    return;
                }
                
                const targetEntities = this.entities.get(targetType);
                
                // Skip if no target entities
                if (!targetEntities || targetEntities.length === 0) {
                    return;
                }
                
                // Check collisions between these two entity types
                this._checkCollisions(entities, targetEntities, entityType, targetType);
            });
        });
    }
    
    /**
     * Check collisions between two groups of entities
     * @private
     * @param {Array} groupA - First group of entities
     * @param {Array} groupB - Second group of entities
     * @param {string} typeA - Collision type of first group
     * @param {string} typeB - Collision type of second group
     */
    _checkCollisions(groupA, groupB, typeA, typeB) {
        // Skip if either group is empty
        if (!groupA.length || !groupB.length) {
            return;
        }

        groupA.forEach(entityA => {
            // Skip invalid, inactive or destroyed entities
            if (!entityA || !this._isValidCollider(entityA) || entityA.isDestroyed) {
                return;
            }
            
            groupB.forEach(entityB => {
                // Skip invalid, inactive or destroyed entities
                if (!entityB || !this._isValidCollider(entityB) || entityB.isDestroyed) {
                    return;
                }
                
                // Skip if the entities are the same object
                if (entityA === entityB) {
                    return;
                }
                
                // Additional validation to ensure both entities are still valid with positions
                try {
                    const posA = this._getEntityPosition(entityA);
                    const posB = this._getEntityPosition(entityB);
                    
                    if (!posA || !posB || !posA.distanceTo || !posB.distanceTo) {
                        return; // Skip if positions are invalid or missing required methods
                    }
                                        
                    // Perform collision check
                    if (checkCollision(entityA, entityB)) {
                        // Get collision point (midpoint between entity centers for simplicity)
                        const collisionPoint = new THREE.Vector3(
                            (posA.x + posB.x) / 2,
                            (posA.y + posB.y) / 2,
                            (posA.z + posB.z) / 2
                        );
                        
                        // Emit collision event
                        this._emitCollision(entityA, entityB, typeA, typeB, collisionPoint);
                    }
                } catch (error) {
                    console.warn(`Error checking collision: ${error.message}`, {
                        entityA: {
                            type: typeA,
                            position: entityA.position || 'unknown'
                        },
                        entityB: {
                            type: typeB,
                            position: entityB.position || 'unknown'
                        }
                    });
                }
            });
        });
    }
    
    /**
     * Emit collision event with entity information
     * @private
     * @param {Object} entityA - First entity in collision
     * @param {Object} entityB - Second entity in collision
     * @param {string} typeA - Collision type of first entity
     * @param {string} typeB - Collision type of second entity
     * @param {THREE.Vector3} point - Collision point
     */
    _emitCollision(entityA, entityB, typeA, typeB, point) {
        // Create collision data
        const collisionData = {
            entityA: entityA,
            entityB: entityB,
            typeA: typeA,
            typeB: typeB,
            point: point,
            // Form a collision type string like "asteroid-bullet"
            type: `${typeA}-${typeB}`
        };
        
        // Emit general collision event
        Events.emit(EventTypes.COLLISION_DETECTED, collisionData);
        
        // Map collision types to more specific event data
        // This makes it easier for components to listen for specific collision types
        switch(collisionData.type) {
            case 'player-asteroid':
            case 'asteroid-player':
                // Map entity references to correct fields
                const playerAsteroidData = {
                    player: typeA === CollisionTypes.PLAYER ? entityA : entityB,
                    asteroid: typeA === CollisionTypes.ASTEROID ? entityA : entityB,
                    position: point
                };
                Events.emit(`${CollisionTypes.PLAYER}-${CollisionTypes.ASTEROID}`, playerAsteroidData);
                break;
                
            case 'bullet-asteroid':
            case 'asteroid-bullet':
                // Map entity references to correct fields
                const bulletAsteroidData = {
                    bullet: typeA === CollisionTypes.BULLET ? entityA : entityB,
                    asteroid: typeA === CollisionTypes.ASTEROID ? entityA : entityB,
                    position: point
                };
                Events.emit(`${CollisionTypes.BULLET}-${CollisionTypes.ASTEROID}`, bulletAsteroidData);
                break;
                
            // Add more specific collision type events as needed
        }
    }
    
    /**
     * Check if an entity has required collision properties
     * @private
     * @param {Object} entity - Entity to validate
     * @returns {boolean} Whether entity has required properties
     */
    _isValidCollider(entity) {
        // Must have position getter method or direct position property
        const hasPosition = typeof entity.getPosition === 'function' || 
                           typeof entity.getHitSpherePosition === 'function' ||
                           entity.position;
                           
        // Must have radius getter method or direct radius property
        const hasRadius = typeof entity.getHitSphereRadius === 'function' ||
                         entity.hitSphereRadius !== undefined ||
                         entity.radius !== undefined;
                         
        return hasPosition && hasRadius;
    }
    
    /**
     * Get entity position for collision check
     * @private
     * @param {Object} entity - Entity to get position from
     * @returns {THREE.Vector3} Entity position
     */
    _getEntityPosition(entity) {
        // Try different methods of getting entity position in order of preference
        if (typeof entity.getHitSpherePosition === 'function') {
            return entity.getHitSpherePosition();
        } else if (typeof entity.getPosition === 'function') {
            return entity.getPosition();
        } else if (entity.position && entity.position instanceof THREE.Vector3) {
            return entity.position;
        }
        
        // Fallback to creating a new Vector3 from x, y, z properties
        return new THREE.Vector3(
            entity.x || 0,
            entity.y || 0,
            entity.z || 0
        );
    }
} 