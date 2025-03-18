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
     * @param {THREE.Vector3} position - Initial position
     * @param {THREE.Vector3} direction - Direction of travel
     */
    constructor(scene, position, direction) {
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
        
        // Create renderer
        this.renderer = new BulletRenderer(scene, this.size);
        this.renderer.updateTransform(this.position);
        
        // Lock Z position to config value
        this.position.z = GameConfig.screen.bounds.z;
    }
    
    /**
     * Update the bullet position
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} False if the bullet should be removed
     */
    update(deltaTime) {
        if (!this.isActive) {
            // Clean up resources when bullet becomes inactive
            this.destroy();
            return false;
        }

        // Increase age
        this.age += deltaTime;
        
        // Check if bullet has exceeded its lifespan
        if (this.age >= this.lifespan) {
            this.isActive = false;
            return false;
        }
        
        // Move bullet according to velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Ensure z-position is locked 
        this.position.z = GameConfig.screen.bounds.z;
        
        // Update renderer with new position and state
        this.renderer.update(this.position, {
            velocity: this.velocity,
            deltaTime: deltaTime
        });
        
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
     * Get the bullet's hit sphere position for collision detection
     * @returns {THREE.Vector3} Hit sphere position
     */
    getHitSpherePosition() {
        // If position is null, return a default position to prevent errors
        if (!this.position) {
            return new THREE.Vector3(0, 0, 0);
        }
        return this.position.clone();
    }
    
    /**
     * Deactivate the bullet when it hits something
     */
    hit() {
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
     */
    destroy() {
        // Store final position for any remaining collision checks
        const finalPosition = this.position ? this.position.clone() : null;
        
        // Clean up renderer first
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // Clear most references
        this.scene = null;
        this.direction = null;
        this.velocity = null;
        
        // Clear position last, but keep the final position available
        this.position = finalPosition;
    }
} 