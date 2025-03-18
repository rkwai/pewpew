import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from '../../utilities/EntityRenderer.js';
import { enhanceMaterial } from '../../utilities/Utils.js';

/**
 * Renderer for asteroid entities
 */
export class AsteroidRenderer extends EntityRenderer {
    constructor(scene, size = 1, color = null) {
        super(scene);
        this.size = size;
        this.color = color || this._getRandomColor();
        this.hitSphere = null;
        this._createModel();
    }

    /**
     * Create the asteroid model
     * @private
     */
    _createModel() {
        // Check that config has the model path
        if (!GameConfig.asteroid?.model?.path) {
            throw new Error('Asteroid model path not specified in GameConfig');
        }
        
        console.log('AsteroidRenderer: Creating model with size:', this.size);
        
        // Load the asteroid model
        this.loadModel(GameConfig.asteroid.model.path, {
            scale: this.size * (GameConfig.asteroid.model.scale || 1),
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            )
        }).then(model => {
            console.log('AsteroidRenderer: Model loaded and added to scene:', model.position);
            // Ensure model is visible
            model.visible = true;
            // Add to scene if not already added
            if (model.parent !== this.scene) {
                this.scene.add(model);
            }
        }).catch(error => {
            console.error('AsteroidRenderer: Failed to load model:', error);
            // Create a temporary visible placeholder
            this.createBasicMesh({
                geometry: new THREE.SphereGeometry(this.size * 5, 16, 16),
                materialType: 'phong',
                color: this.color,
                scale: 1
            });
        });

        // Create hit sphere if debug is enabled
        if (GameConfig.debug && GameConfig.debug.enabled) {
            this.createHitSphere();
        }
    }

    /**
     * Generate a random color appropriate for an asteroid
     * @private
     * @returns {number} A random color value
     */
    _getRandomColor() {
        // Define color palette
        const colors = [
            0x8B8B8B, // Dark gray
            0xA0A0A0, // Medium gray
            0x696969, // Dim gray
            0x708090, // Slate gray
            0x778899, // Light slate gray
            0xA9A9A9, // Dark gray
            0x808080, // Gray
            0xB8B8B8, // Light gray
            0x7C5C3C, // Brown
            0x8E7C62  // Tan
        ];
        
        // Select random color from palette
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Create a sphere to visualize the hit box
     */
    createHitSphere() {
        // Skip if hit sphere already exists
        if (this.hitSphere) return;
        
        // Create a sphere to visualize the hitbox
        const sphereGeometry = new THREE.SphereGeometry(this.size * 10, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            depthTest: false
        });
        
        // Create mesh
        this.hitSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        // Add to model if exists, otherwise add to scene
        if (this.model) {
            this.model.add(this.hitSphere);
        } else {
            this.scene.add(this.hitSphere);
        }
        
        // Track for cleanup
        this.debugHelpers.push(this.hitSphere);
        
        // Set initial visibility
        this.setHitSphereVisible(
            GameConfig.asteroid && 
            GameConfig.asteroid.debug && 
            GameConfig.asteroid.debug.showHitSpheres
        );
    }

    /**
     * Set hit sphere visibility
     * @param {boolean} visible - Whether the hit sphere should be visible
     */
    setHitSphereVisible(visible) {
        if (this.hitSphere) {
            this.hitSphere.visible = visible;
        }
    }

    /**
     * Set hit sphere color for collision detection feedback
     * @param {number} color - Color for the hit sphere
     */
    setHitSphereColor(color) {
        if (this.hitSphere && this.hitSphere.material) {
            this.hitSphere.material.color.set(color);
        }
    }

    /**
     * Update the asteroid rotation
     * @param {number} deltaTime - Time since last update in seconds
     * @param {THREE.Vector3} rotationSpeed - Rotation speed in each axis
     */
    updateRotation(deltaTime, rotationSpeed) {
        if (!this.model) return;
        
        this.model.rotation.x += rotationSpeed.x * deltaTime;
        this.model.rotation.y += rotationSpeed.y * deltaTime;
        this.model.rotation.z += rotationSpeed.z * deltaTime;
    }

    /**
     * Update the renderer
     * @param {THREE.Vector3} position - Position to update to
     * @param {Object} state - Additional state for visual effects
     */
    update(position, state = {}) {
        // Update position
        this.updateTransform(position);
        console.log('AsteroidRenderer: Updated position to:', position.x, position.y, position.z, 
            'Model exists:', !!this.model, 
            'Model visible:', this.model?.visible,
            'Model in scene:', this.model?.parent === this.scene,
            'Model world position:', this.model?.getWorldPosition(new THREE.Vector3()));
        
        // Update rotation
        if (state.rotationSpeed) {
            this.updateRotation(state.deltaTime || 0.016, state.rotationSpeed);
        }
    }

    /**
     * Scale the asteroid
     * @param {number} newSize - New size to scale to
     */
    setSize(newSize) {
        this.size = newSize;
        
        if (this.model) {
            this.model.scale.set(newSize, newSize, newSize);
        }
        
        if (this.hitSphere) {
            this.hitSphere.scale.set(newSize, newSize, newSize);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Call parent class dispose
        super.dispose();
    }
} 