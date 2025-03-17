import { Bullet } from './Bullet.js';

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
    }

    /**
     * Create a new bullet at the specified position
     * @param {THREE.Vector3} position - The position to create the bullet at
     * @returns {Bullet} The created bullet
     */
    createBullet(position) {
        const bullet = new Bullet(this.scene, position);
        this.bullets.push(bullet);
        return bullet;
    }

    /**
     * Update all bullets
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update all bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime);
            
            // Remove bullets that have exceeded their lifespan
            if (bullet.lifeTime <= 0) {
                bullet.destroy();
            }
        }

        // Remove bullets that are destroyed
        this.bullets = this.bullets.filter(bullet => !bullet.isDestroyed);
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
        for (const bullet of this.bullets) {
            bullet.destroy();
        }
        this.bullets = [];
    }
} 