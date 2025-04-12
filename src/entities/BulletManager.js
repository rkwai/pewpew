import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Bullet } from './Bullet.js';
import { ObjectPool } from '../utilities/ObjectPool.js';
import { Events } from '../states/EventSystem.js';
import { EventTypes } from '../states/EventTypes.js';
import { Collisions } from '../states/CollisionManager.js';
import { CollisionTypes } from '../states/CollisionSystem.js';

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
        this._bulletPool = [];
        this._maxPoolSize = GameConfig.bullet?.maxBullets || 200;
        
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
        
        // Store reference to this for use in callback
        const self = this;
        
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
                self.removeBullet(bullet);
            });
        }
    }
    
    /**
     * Get a bullet from the pool or create a new one
     * @param {THREE.Vector3} position - Position to spawn the bullet
     * @param {THREE.Vector3} direction - Direction the bullet should travel
     * @returns {Bullet} A bullet instance
     * @private
     */
    _getBullet(position, direction) {
        let bullet;
        
        // Try to get a bullet from the pool
        if (this._bulletPool.length > 0) {
            bullet = this._bulletPool.pop();
            
            // Immediately update position before any other changes
            bullet.position.copy(position);
            
            // Reset bullet state
            bullet.direction.copy(direction.clone().normalize());
            bullet.age = 0;
            bullet.isActive = true;
            // Ensure the renderer is visible if reused
            if (bullet.renderer) {
                bullet.renderer.setVisible(true);
            }
            
            // Reset velocity
            const speed = GameConfig.bullet?.speed || 800;
            bullet.velocity.copy(bullet.direction).multiplyScalar(speed);
        } else {
            // Create new bullet if pool is empty - DO NOT pass shared renderer
            bullet = new Bullet(this.scene, position, direction /*, this._sharedRenderer */);
        }
        
        return bullet;
    }
    
    /**
     * Return a bullet to the pool
     * @param {Bullet} bullet - The bullet to return to the pool
     * @private
     */
    _returnToPool(bullet) {
        if (!bullet) return;
        
        // Only keep bullets up to max pool size
        if (this._bulletPool.length < this._maxPoolSize) {
            bullet.isActive = false;
            // Reset but don't destroy the bullet
            bullet.age = 0;
            // Move far off-screen
            bullet.position.set(-10000, -10000, GameConfig.screen.bounds.z);
            // Make renderer invisible instead of moving shared one
            if (bullet.renderer) {
                bullet.renderer.updateTransform(bullet.position); // Move it off-screen
                bullet.renderer.setVisible(false); // Hide it
            }
            this._bulletPool.push(bullet);
        } else {
            // If pool is full, destroy the bullet completely
            // Ensure the bullet's own renderer is destroyed
            bullet.destroy(); // Remove the 'false' argument
        }
    }
    
    /**
     * Create a new bullet
     * @param {THREE.Vector3} position - Position to spawn the bullet
     * @param {THREE.Vector3} direction - Direction the bullet should travel
     * @returns {Bullet} The created bullet
     */
    createBullet(position, direction) {
        // Check bullet limit
        if (this._bullets.length >= this._maxPoolSize) {
            console.warn(`Maximum number of bullets reached`);
            return null;
        }
        
        // Get a bullet (from pool or new)
        const bullet = this._getBullet(position, direction);
        
        // Add to active bullets
        this._bullets.push(bullet);
        
        // Register with collision system
        Collisions.register(bullet, CollisionTypes.BULLET);
        
        // Emit bullet created event
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
        
        // Destroy all bullets and clear pool
        [...this._bullets, ...this._bulletPool].forEach(bullet => {
            if (bullet) {
                Collisions.unregister(bullet, CollisionTypes.BULLET);
                // Ensure the bullet's own renderer is destroyed
                bullet.destroy(); // Remove the 'false' argument
            }
        });
        
        this._bullets = [];
        this._bulletPool = [];
        this.scene = null;
    }
    
    /**
     * Remove a bullet from the manager
     * @param {Bullet} bullet - The bullet to remove
     */
    removeBullet(bullet) {
        if (!bullet) return;
        
        const index = this._bullets.indexOf(bullet);
        if (index !== -1) {
            // Remove from array
            this._bullets.splice(index, 1);
            
            // Unregister from collision system
            Collisions.unregister(bullet, CollisionTypes.BULLET);
            
            // Return bullet to the pool (or destroy if pool full)
            this._returnToPool(bullet);
        }
    }
} 