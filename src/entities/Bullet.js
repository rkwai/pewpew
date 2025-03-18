import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { CollisionTypes } from '../utilities/CollisionSystem.js';
import { BulletRenderer } from './renderers/BulletRenderer.js';

/**
 * Bullet class representing a projectile fired by the player
 */
export class Bullet {
    /**
     * Create a new bullet
     * @param {THREE.Scene} scene - The scene to add the bullet to
     * @param {THREE.Vector3} position - The initial position
     * @param {THREE.Vector3} direction - The direction to travel
     * @param {BulletRenderer} renderer - The shared bullet renderer
     */
    constructor(scene, position, direction, renderer) {
        this.scene = scene;
        this.position = position.clone();
        this.type = CollisionTypes.BULLET;
        
        // Set direction and normalize it
        this.direction = direction.clone().normalize();
        
        // Calculate velocity
        const speed = GameConfig.bullet?.speed || 800; // Increased default speed
        this.velocity = this.direction.clone().multiplyScalar(speed);
        
        // Get bullet size from config
        this.size = GameConfig.bullet?.size || 5;
        this.radius = GameConfig.bullet?.radius || this.size;
        
        // Track lifetime
        this.age = 0;
        this.lifespan = GameConfig.bullet?.lifespan || 5; // Increased default lifespan to 5 seconds
        this.isActive = true;
        
        // Create renderer if it doesn't exist
        if (!renderer) {
            this.renderer = new BulletRenderer(this.scene, this.size);
            this.renderer.updateTransform(this.position);
        } else {
            this.renderer = renderer;
        }
        
        // Lock Z position to config value
        this.position.z = GameConfig.screen.bounds.z;
    }
    
    /**
     * Update the bullet's position
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} False if the bullet should be removed
     */
    update(deltaTime) {
        if (!this.isActive) {
            return false;
        }

        // Update position
        this.position.addScaledVector(this.velocity, deltaTime);
        
        // Update age and check lifetime
        this.age += deltaTime;
        if (this.age >= (GameConfig.bullet?.lifetime || 2.0)) {
            this.hit();
            return false;
        }
        
        // Update renderer
        if (this.renderer) {
            this.renderer.updateTransform(this.position);
        }
        
        // Ensure z-position is locked 
        this.position.z = GameConfig.screen.bounds.z;
        
        // Check if bullet is out of screen bounds
        const screenBounds = GameConfig.screen?.bounds;
        if (screenBounds) {
            // Only check if bullet has gone far enough off the right side of screen
            const offScreenThreshold = 500; // Much larger threshold
            if (this.position.x > screenBounds.maxX + offScreenThreshold) {
                this.isActive = false;
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get the bullet's position
     * @returns {THREE.Vector3} Current position
     */
    getPosition() {
        return this.position.clone();
    }
    
    /**
     * Get the bullet's direction
     * @returns {THREE.Vector3} Current direction
     */
    getDirection() {
        return this.direction.clone();
    }
    
    /**
     * Get the bullet's hit sphere radius for collision detection
     * @returns {number} Hit sphere radius
     */
    getHitSphereRadius() {
        return this.radius;
    }
    
    /**
     * Get the hit sphere for collision detection
     * @returns {Object} The hit sphere data
     */
    getHitSphere() {
        return {
            position: this.getHitSpherePosition(),
            radius: GameConfig.bullet?.radius || 1.0
        };
    }
    
    /**
     * Get the position for hit sphere calculations
     * @returns {THREE.Vector3} The position
     */
    getHitSpherePosition() {
        return this.position ? this.position.clone() : new THREE.Vector3();
    }
    
    /**
     * Handle bullet being hit
     */
    hit() {
        if (!this.isActive) return;
        this.isActive = false;
    }
    
    /**
     * Check if the bullet is beyond the despawn boundaries
     * @param {Object} bounds - World boundaries
     * @returns {boolean} True if bullet should be removed
     */
    isOutOfBounds(bounds) {
        if (!bounds) {
            // Default bounds
            bounds = {
                minX: -1000,
                maxX: 1000,
                minY: -1000,
                maxY: 1000,
                minZ: -1000,
                maxZ: 1000
            };
        }
        
        // Check if the bullet is beyond any of the boundaries
        return (
            this.position.x < bounds.minX ||
            this.position.x > bounds.maxX ||
            this.position.y < bounds.minY ||
            this.position.y > bounds.maxY ||
            this.position.z < bounds.minZ ||
            this.position.z > bounds.maxZ
        );
    }
    
    /**
     * Clean up resources
     * @param {boolean} [destroyRenderer=true] - Whether to destroy the renderer
     */
    destroy(destroyRenderer = true) {
        // Store final position for collision checks
        const finalPosition = this.position ? this.position.clone() : null;
        
        // Clean up renderer if needed
        if (destroyRenderer && this.renderer) {
            this.renderer.dispose();
        }
        this.renderer = null;
        
        // Clear references but keep position data for remaining collision checks
        this.scene = null;
        this.direction = null;
        this.velocity = null;
        this.position = finalPosition;
        this.isActive = false;
    }
} 