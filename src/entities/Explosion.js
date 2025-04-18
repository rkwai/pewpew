import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { ExplosionRenderer } from './renderers/ExplosionRenderer.js';

/**
 * Explosion class representing a visual explosion effect
 */
export class Explosion {
    /**
     * Create a new explosion
     * @param {THREE.Scene} scene - Scene to add the explosion to
     * @param {THREE.Vector3} position - Position of the explosion
     * @param {number} size - Size of the explosion
     */
    constructor(scene, position, size = 1) {
        this.scene = scene;
        
        // Default position if not provided
        if (!position) {
            position = new THREE.Vector3(0, 0, 0);
            console.warn('Explosion created without position, using (0,0,0)');
        }
                
        this.position = position.clone();
        this.size = size;
        this.isActive = true;
        
        // Create renderer for visuals
        this.renderer = new ExplosionRenderer(scene, position, size);
    }
    
    /**
     * Convenience method to create an explosion at a specific position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     * @param {number} size - Size of the explosion
     */
    explode(x, y, z, size = 1) {
        // Use scene from window.gameState if this.scene is not available
        const scene = this.scene || (window.gameState ? window.gameState.scene : null);
        
        if (!scene) {
            console.error('Cannot explode: no scene available');
            return false;
        }
        
        const position = new THREE.Vector3(x, y, z);
        
        // Clean up existing renderer but don't create a new one if it exists
        if (this.renderer) {
            // Update position and reset for particle-based renderer
            this.renderer.updateTransform(position);
            
            // Reset the explosion (the particle system will be reused)
            this.renderer.resetExplosion(size);
        } else {
            // Create a new renderer if one doesn't exist
            this.renderer = new ExplosionRenderer(scene, position, size);
        }
        
        this.position = position.clone();
        this.size = size;
        this.isActive = true;
        
        return true;
    }
    
    /**
     * Update the explosion
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} True if explosion is still active, false if complete
     */
    update(deltaTime) {
        if (!this.isActive || !this.renderer) {
            return false;
        }
        
        // Update through renderer
        const isStillActive = this.renderer.update(deltaTime);
        
        // If explosion has finished, mark as inactive
        if (!isStillActive) {
            this.isActive = false;
            
            // The renderer handles hiding the container and particles
            // No need to manually hide components anymore
        }
        
        return this.isActive;
    }
    
    /**
     * Set the explosion size
     * @param {number} size - New size
     */
    setSize(size) {
        this.size = size;
    }
    
    /**
     * Clean up resources and remove from scene
     */
    destroy() {
        this.isActive = false;
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // Clear references
        this.scene = null;
        this.position = null;
    }
    
    /**
     * Static method to preload the explosion model
     * (No-op for particle system as it doesn't need preloading)
     */
    static preloadModel() {
        // Keep for compatibility, but particle system doesn't need preloading
        ExplosionRenderer.preloadModel();
    }
} 