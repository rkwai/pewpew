import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from '../../utilities/EntityRenderer.js';

/**
 * Renderer for the player ship
 */
export class PlayerRenderer extends EntityRenderer {
    constructor(scene) {
        super(scene);
        this.invulnerabilityEffect = null;
        this._createModel();
    }

    /**
     * Create the player model
     * @private
     */
    _createModel() {
        // Check that config has the model path
        if (!GameConfig.player?.model?.path) {
            throw new Error('Player model path not specified in GameConfig');
        }
        
        // Load the player model
        this.loadModel(GameConfig.player.model.path, {
            scale: GameConfig.player.model.scale || 1,
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0) // Face forward in 3D view
        }).catch(error => {
            throw error;
        });
    }

    /**
     * Make the ship flash when invulnerable
     * @param {boolean} isInvulnerable - Whether the player is invulnerable
     * @param {number} invulnerableTime - Remaining invulnerability time
     */
    updateInvulnerabilityEffect(isInvulnerable, invulnerableTime) {
        if (!this.model) return;
        
        if (isInvulnerable) {
            // Flash the model while invulnerable
            this.model.visible = Math.floor(invulnerableTime * 10) % 2 === 0;
            
            // Add shield effect if not already present
            if (!this.invulnerabilityEffect && this.model.visible) {
                const shieldGeometry = new THREE.SphereGeometry(15, 16, 16);
                const shieldMaterial = new THREE.MeshBasicMaterial({
                    color: 0x3399ff,
                    transparent: true,
                    opacity: 0.3,
                    wireframe: true
                });
                
                this.invulnerabilityEffect = new THREE.Mesh(shieldGeometry, shieldMaterial);
                this.model.add(this.invulnerabilityEffect);
                this.effectMeshes.push(this.invulnerabilityEffect);
            }
        } else {
            // Make sure model is visible when not invulnerable
            this.model.visible = true;
            
            // Remove shield effect if present
            if (this.invulnerabilityEffect) {
                if (this.invulnerabilityEffect.parent) {
                    this.invulnerabilityEffect.parent.remove(this.invulnerabilityEffect);
                }
                this.invulnerabilityEffect.geometry.dispose();
                this.invulnerabilityEffect.material.dispose();
                this.invulnerabilityEffect = null;
            }
        }
    }

    /**
     * Update the renderer
     * @param {THREE.Vector3} position - Position to update to
     * @param {THREE.Euler} rotation - Rotation to update to
     * @param {Object} state - Additional state for visual effects
     */
    update(position, rotation, state = {}) {
        // Update position and rotation
        this.updateTransform(position, rotation);
        
        // Update invulnerability effect
        this.updateInvulnerabilityEffect(
            state.isInvulnerable || false, 
            state.invulnerableTime || 0
        );
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Clean up invulnerability effect
        if (this.invulnerabilityEffect) {
            if (this.invulnerabilityEffect.parent) {
                this.invulnerabilityEffect.parent.remove(this.invulnerabilityEffect);
            }
            if (this.invulnerabilityEffect.geometry) this.invulnerabilityEffect.geometry.dispose();
            if (this.invulnerabilityEffect.material) this.invulnerabilityEffect.material.dispose();
            this.invulnerabilityEffect = null;
        }
        
        // Call parent class dispose method
        super.dispose();
    }

    /**
     * Override the updateTransform method to handle special rotation for the player ship
     * @param {THREE.Vector3} position - New position
     * @param {THREE.Euler} rotation - New rotation from player input
     */
    updateTransform(position, rotation) {
        if (!this.model) return;
        
        // Update position
        if (position) {
            this.model.position.copy(position);
        }
        
        // Update rotation
        if (rotation) {
            // Keep the base rotation that makes the ship face in the right direction
            // and apply the tilt from player input (z rotation)
            this.model.rotation.set(
                rotation.x,
                Math.PI, // Keep facing right/east
                rotation.z // Apply tilt from player movement
            );
        }
    }
} 