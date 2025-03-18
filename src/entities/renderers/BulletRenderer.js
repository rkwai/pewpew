import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from '../../utilities/EntityRenderer.js';

/**
 * Renderer for bullet entities
 */
export class BulletRenderer extends EntityRenderer {
    constructor(scene, options = {}) {
        super(scene);
        this.bulletLight = null;
        this.size = options.size || 1;
        this.color = options.color || 0x00ffff;
        
        // Clear any debug helpers that might have been created
        this.debugHelpers.forEach(helper => {
            if (helper.parent) {
                helper.parent.remove(helper);
            }
        });
        this.debugHelpers = [];
        
        this._createModel();
    }

    /**
     * Create the bullet model
     * @private
     */
    _createModel() {
        // Check that config has the model path
        if (!GameConfig.bullet?.model?.path) {
            throw new Error('Bullet model path not specified in GameConfig');
        }
        
        // Load the bullet model
        this.loadModel(GameConfig.bullet.model.path, {
            scale: GameConfig.bullet.model.scale || 0.5,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 180, 0)
        }).then(model => {
            // Add bullet light
            this._addBulletLight(this.color);
        }).catch(error => {
            throw error;
        });
    }

    /**
     * Add a light to the bullet for a glowing effect
     * @param {number} color - Color for the light
     * @private
     */
    _addBulletLight(color) {
        // Create a point light for the bullet
        this.bulletLight = new THREE.PointLight(color, 1, 30);
        this.bulletLight.position.set(0, 0, 0);
        
        // Add to model if exists, otherwise add to scene
        if (this.model) {
            this.model.add(this.bulletLight);
        } else {
            this.scene.add(this.bulletLight);
            this.effectMeshes.push(this.bulletLight);
        }
    }

    /**
     * Update the renderer
     * @param {THREE.Vector3} position - Position to update to
     * @param {Object} state - Additional state for visual effects
     */
    update(position, state = {}) {
        // Update model position
        this.updateTransform(position);
        
        // Update light position and intensity
        if (this.bulletLight) {
            this.bulletLight.position.copy(position);
            const time = performance.now() * 0.001;
            const pulseSpeed = GameConfig.bullet?.pulseSpeed || 10;
            const pulseAmount = GameConfig.bullet?.pulseAmount || 0.3;
            this.bulletLight.intensity = 1 + Math.sin(time * pulseSpeed) * pulseAmount;
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.bulletLight) {
            if (this.bulletLight.parent) {
                this.bulletLight.parent.remove(this.bulletLight);
            }
            this.bulletLight = null;
        }
        
        // Call parent class dispose
        super.dispose();
    }
} 