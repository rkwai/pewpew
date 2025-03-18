import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Bullet } from './Bullet.js';
import { ObjectPool } from '../utilities/ObjectPool.js';
import { Events } from '../utilities/EventSystem.js';
import { EventTypes } from '../utilities/EventTypes.js';
import { Collisions } from '../utilities/CollisionManager.js';
import { CollisionTypes } from '../utilities/CollisionSystem.js';

/**
 * Manages all bullets in the game
 */
export class BulletManager {
    /**
     * Create a new bullet manager
     * @param {THREE.Scene} scene - The scene to add bullets to
     */
    constructor(scene) {
        this.scene = scene;
        this._bullets = [];
        
        // Subscribe to collision events
        this.collisionUnsubscribe = Events.on(EventTypes.ENTITY_COLLISION, (data) => {
            this.handleCollisionEvent(data);
        });
    }
    
    /**
     * Handle collision events
     * @param {Object} data - Collision event data
     */
    handleCollisionEvent(data) {
        const { entityA, entityB } = data;
        
        // Check if collision involves a bullet
        const bullet = 
            entityA.type === CollisionTypes.BULLET ? entityA :
            entityB.type === CollisionTypes.BULLET ? entityB : null;
            
        // Skip if no bullet or if bullet is already being processed for removal
        if (!bullet) return;
        
        // Get the other entity
        const otherEntity = entityA === bullet ? entityB : entityA;
        
        // Handle different entity types
        if (otherEntity.type === CollisionTypes.ASTEROID) {
            // Emit bullet hit event before removing the bullet
            Events.emit(EventTypes.BULLET_HIT, {
                bullet: bullet,
                target: otherEntity,
                point: data.point // Use the collision point from the data
            });
            
            // Queue bullet for removal on next frame to ensure collision processing completes
            requestAnimationFrame(() => {
                this.removeBullet(bullet);
            });
        }
    }
    
    /**
     * Remove a bullet from the manager
     * @param {Bullet} bullet - The bullet to remove
     */
    removeBullet(bullet) {
        // Skip if bullet is already being removed or doesn't exist
        if (!bullet) return;
        
        const index = this._bullets.indexOf(bullet);
        if (index !== -1) {
            // Remove from array first
            this._bullets.splice(index, 1);
            
            // Then unregister from collision system
            Collisions.unregister(bullet, CollisionTypes.BULLET);
            
            // Finally mark as inactive and destroy
            bullet.hit();
            bullet.destroy();
        }
    }
    
    /**
     * Create a new bullet
     * @param {THREE.Vector3} position - Position to spawn the bullet
     * @param {THREE.Vector3} direction - Direction the bullet should travel
     * @param {Object} options - Additional options
     * @returns {Bullet} The created bullet
     */
    createBullet(position, direction, options = {}) {
        // Check bullet limit
        if (this._bullets.length >= (GameConfig.bullet.maxBullets || 100)) {
            console.warn(`Maximum number of bullets reached`);
            return null;
        }
        
        // Create a new bullet (removed options parameter to match updated Bullet constructor)
        const bullet = new Bullet(this.scene, position, direction);
        
        // Add to active bullets
        this._bullets.push(bullet);
        
        // Register with collision system
        Collisions.register(bullet, CollisionTypes.BULLET);
        
        // Emit bullet created event with correct event type
        Events.emit(EventTypes.BULLET_FIRED, {
            bullet: bullet,
            position: position.clone(),
            direction: direction.clone()
        });
        
        return bullet;
    }
    
    /**
     * Update all bullets
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update existing bullets and filter out inactive ones
        this._bullets = this._bullets.filter(bullet => {
            // Skip if bullet is already inactive
            if (!bullet.isActive) {
                this.removeBullet(bullet);
                return false;
            }
            
            // Update the bullet
            const isActive = bullet.update(deltaTime);
            
            // If bullet became inactive during update or is out of bounds, remove it properly
            if (!isActive || bullet.isOutOfBounds(GameConfig.screen?.bounds)) {
                this.removeBullet(bullet);
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Get all active bullets
     * @returns {Array<Bullet>} Array of active bullets
     */
    getActiveBullets() {
        return this._bullets;
    }
    
    /**
     * Reset the bullet manager, clearing all bullets
     */
    reset() {
        // Destroy all active bullets
        this._bullets.forEach(bullet => {
            // Unregister from collision system
            Collisions.unregister(bullet, CollisionTypes.BULLET);
            bullet.destroy();
        });
        
        this._bullets = [];
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Unsubscribe from collision events
        if (this.collisionUnsubscribe) {
            this.collisionUnsubscribe();
        }
        
        // Destroy all bullets and unregister from collision system
        this.reset();
        
        // Clear references
        this.scene = null;
        this._bullets = [];
    }
} 