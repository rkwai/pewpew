import { Bullet } from './Bullet.js';
import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { ObjectPool } from '../utilities/ObjectPool.js';
import { Events } from '../utilities/EventSystem.js';
import { Store, ActionTypes } from '../utilities/GameStore.js';

/**
 * Manages bullets in the game, including creation, updates, and cleanup
 */
export class BulletManager {
    /**
     * Create a new bullet manager
     * @param {THREE.Scene} scene - The scene to add bullets to
     */
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
        
        // Create bullet pool
        const initialPoolSize = GameConfig.bullet?.poolSize || 30;
        const expandAmount = GameConfig.objectPool?.bullet?.expandAmount || 15;
        
        // Create a factory function that positions bullets off-screen
        const bulletFactory = () => {
            // Create bullet with far off-screen position so it's not visible
            const offscreenPosition = new THREE.Vector3(-10000, -10000, -10000);
            const bullet = new Bullet(this.scene, offscreenPosition);
            
            // Immediately hide the bullet to ensure it's not visible
            if (bullet.mesh) {
                bullet.mesh.visible = false;
            }
            
            return bullet;
        };
        
        this._bulletPool = new ObjectPool(
            // Factory function: creates a new bullet but positions it off-screen
            bulletFactory,
            // Reset function: resets a bullet to a new state
            (bullet, position) => bullet.reset(position),
            // Initial pool size
            initialPoolSize,
            // Options
            {
                autoExpand: GameConfig.objectPool?.enabled !== false,
                expandAmount: expandAmount
            }
        );
        
        console.log(`Created bullet pool with ${initialPoolSize} initial objects (expandAmount: ${expandAmount})`);
    }

    /**
     * Create a new bullet at the specified position
     * @param {THREE.Vector3} position - The position to create the bullet at
     * @returns {Bullet} The created bullet
     */
    createBullet(position) {
        // Ensure we have a valid position
        if (!position) {
            console.error('Attempted to create bullet with invalid position');
            position = new THREE.Vector3(0, 0, 0);
        }
        
        // Get a bullet from the pool instead of creating a new one
        const bullet = this._bulletPool.get(position);
        this.bullets.push(bullet);
        
        // Emit bullet creation event
        Events.emit('bullet:created', { bullet });
        
        return bullet;
    }

    /**
     * Update all bullets
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Skip if there are no bullets
        if (!this.bullets || this.bullets.length === 0) return;
        
        // Update all bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Skip invalid bullets
            if (!bullet) {
                console.warn('Invalid bullet found at index', i);
                continue;
            }
            
            // Skip destroyed bullets
            if (bullet.isDestroyed) continue;
            
            try {
                // Update bullet and check if it should be removed
                const shouldRemove = bullet.update(deltaTime);
                
                // Return to pool if the bullet should be removed
                if (shouldRemove) {
                    bullet.prepareForPooling();
                    this._bulletPool.release(bullet);
                }
            } catch (error) {
                console.error('Error updating bullet:', error);
                // Handle error by removing the problematic bullet
                try {
                    bullet.prepareForPooling();
                    this._bulletPool.release(bullet);
                } catch (releaseError) {
                    console.error('Error releasing bullet to pool:', releaseError);
                }
            }
        }

        // Remove bullets that are destroyed from the active list
        this.bullets = this.bullets.filter(bullet => bullet && !bullet.isDestroyed);
        
        // Log pool stats if debugging is enabled
        if (GameConfig.bullet?.debug?.logPoolStats && Math.random() < 0.01) { // Only log occasionally
            console.log(`Bullet pool stats: ${this._bulletPool.getInUseCount()} in use, ${this._bulletPool.getAvailableCount()} available`);
        }
    }

    /**
     * Get all active bullets
     * @returns {Array<Bullet>} Array of active bullets
     */
    getBullets() {
        return this.bullets;
    }

    /**
     * Clean up all bullets and reset the manager
     */
    clear() {
        // Return all bullets to pool
        this.bullets.forEach(bullet => {
            bullet.prepareForPooling();
            this._bulletPool.release(bullet);
        });
        
        // Clear the active bullets array
        this.bullets = [];
        
        // Emit clear event
        Events.emit('bulletManager:clear');
    }
    
    /**
     * Clean up resources that need to be managed each frame
     */
    cleanupResources() {
        // Count bullets before cleanup for debugging
        const beforeCount = this.bullets.length;
        
        // Filter out destroyed bullets
        const destroyedCount = this.bullets.filter(bullet => bullet.isDestroyed).length;
        if (destroyedCount > 0 && GameConfig.bullet?.debug?.logCleanup) {
            console.log(`Cleaning up ${destroyedCount} destroyed bullets`);
        }
        
        // Return all destroyed bullets to the pool
        this.bullets.forEach(bullet => {
            if (bullet.isDestroyed) {
                this._bulletPool.release(bullet);
            }
        });
        
        // Remove destroyed bullets from active list
        this.bullets = this.bullets.filter(bullet => !bullet.isDestroyed);
    }
    
    /**
     * Dispose of all resources
     */
    dispose() {
        // Return all bullets to pool first
        this.clear();
        
        // Release all resources by destroying pooled objects
        const pooledBullets = this._bulletPool.available;
        pooledBullets.forEach(bullet => bullet.destroy());
        
        // Clear the pool
        this._bulletPool = null;
        this.bullets = null;
        
        // Emit dispose event
        Events.emit('bulletManager:dispose');
    }

    /**
     * Get active bullets
     * @returns {Array} Array of active bullets
     */
    getActiveBullets() {
        return this.bullets.filter(bullet => !bullet.isDestroyed);
    }
    
    /**
     * Remove a specific bullet
     * @param {Bullet} bullet - The bullet to remove
     */
    removeBullet(bullet) {
        const index = this.bullets.indexOf(bullet);
        if (index !== -1) {
            // Mark as destroyed
            bullet.isDestroyed = true;
            
            // Update state in store
            Store.dispatch({
                type: 'BULLET_DESTROYED',
                payload: { id: bullet.id }
            });
        }
    }
    
    /**
     * Reset the bullet manager
     */
    reset() {
        // Return all bullets to pool
        this.clear();
        
        // Update state in store
        Store.dispatch({
            type: 'RESET_BULLETS'
        });
    }
} 