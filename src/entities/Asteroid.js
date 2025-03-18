import { THREE, GLTFLoader } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { random, randomInt, enhanceMaterial, lerp, smoothStep, easeInOut, smoothOscillate, checkCollision } from '../utilities/Utils.js';
import { Explosion } from './Explosion.js';
import { CollisionTypes } from '../utilities/CollisionSystem.js';
import { AsteroidRenderer } from './renderers/AsteroidRenderer.js';

// Remove direct import and use path string instead
// import asteroidModel from '../../../assets/models/asteroid.glb';

// Add movement pattern types at the top of the file after imports
const MOVEMENT_PATTERNS = {
    STRAIGHT: 'straight',
    SINE_WAVE: 'sine_wave',
    SMOOTH_WAVE: 'smooth_wave', // New smoother wave pattern
    ZIGZAG: 'zigzag',
    SPIRAL: 'spiral',
    BOUNCE: 'bounce',
    ORBIT: 'orbit' // New pattern that creates an orbital movement
};

/**
 * Asteroid class representing a space rock obstacle
 */
export class Asteroid {
    /**
     * Create a new asteroid
     * @param {THREE.Scene} scene - The scene to add the asteroid to
     * @param {Object} options - Configuration options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.type = CollisionTypes.ASTEROID;
        this.isDestroyed = false; // Flag to track if asteroid has been destroyed
        
        // Basic properties with defaults
        this.size = options.size || (Math.random() * 5 + 2);
        this.position = options.position || new THREE.Vector3(0, 0, 0);
        this.velocity = options.velocity || new THREE.Vector3(-100, 0, 0);
        
        // Random rotation speeds
        this.rotationSpeed = new THREE.Vector3(
            Math.random() * 0.5 - 0.25,
            Math.random() * 0.5 - 0.25,
            Math.random() * 0.5 - 0.25
        );
        
        // Create a hit sphere for collision detection
        this.hitSphereRadius = this.size;
        
        // Create renderer
        this.renderer = new AsteroidRenderer(scene, this.size);
        
        // Set initial position
        this.renderer.updateTransform(this.position);
        
        // Set up debug visualization if enabled
        if (GameConfig.asteroid && GameConfig.asteroid.debug && GameConfig.asteroid.debug.showHitSpheres) {
            this.renderer.setHitSphereVisible(true);
        }
    }
    
    /**
     * Update the asteroid
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Update the renderer with current state
        this.renderer.update(this.position, {
            deltaTime: deltaTime,
            rotationSpeed: this.rotationSpeed
        });
        
        // Ensure z-position is locked at 0
        this.position.z = GameConfig.screen.bounds.z;
        
        console.log('Asteroid: Updated position:', 
            this.position.x.toFixed(1), 
            this.position.y.toFixed(1), 
            this.position.z.toFixed(1), 
            'Velocity:', 
            this.velocity.x.toFixed(1), 
            this.velocity.y.toFixed(1), 
            this.velocity.z.toFixed(1));
        
        return this.position;
    }
    
    /**
     * Set hit sphere visibility
     * @param {boolean} visible - Whether the hit sphere should be visible
     */
    setHitSphereVisible(visible) {
        if (this.renderer) {
            this.renderer.setHitSphereVisible(visible);
        }
    }
    
    /**
     * Set hit sphere color
     * @param {number} color - Color to set
     */
    setHitSphereColor(color) {
        if (this.renderer) {
            this.renderer.setHitSphereColor(color);
        }
    }
    
    /**
     * Get the asteroid's hit sphere radius for collision detection
     * @returns {number} Hit sphere radius
     */
    getHitSphereRadius() {
        return this.hitSphereRadius;
    }
    
    /**
     * Get the asteroid's position
     * @returns {THREE.Vector3} Current position
     */
    getPosition() {
        return this.position.clone();
    }
    
    /**
     * Get the asteroid's hit sphere position for collision detection
     * @returns {THREE.Vector3} Hit sphere position (same as asteroid position)
     */
    getHitSpherePosition() {
        return this.position.clone();
    }
    
    /**
     * Get the asteroid's velocity
     * @returns {THREE.Vector3} Current velocity
     */
    getVelocity() {
        return this.velocity.clone();
    }
    
    /**
     * Check if asteroid is out of bounds
     * @param {Object} bounds - Screen bounds
     * @returns {boolean} True if asteroid is out of bounds
     */
    isOutOfBounds(bounds) {
        const screenBounds = bounds || (GameConfig.screen && GameConfig.screen.bounds);
        
        if (!screenBounds) {
            return false;
        }
        
        // Check if asteroid has moved past the left edge of the screen
        if (this.position.x < GameConfig.asteroid.despawnDistance) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Mark as destroyed
        this.isDestroyed = true;
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // Clear references
        this.scene = null;
        this.position = null;
        this.velocity = null;
        this.rotationSpeed = null;
    }
} 