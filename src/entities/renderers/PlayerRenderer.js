import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from './EntityRenderer.js';

/**
 * Renderer for the player ship
 */
export class PlayerRenderer extends EntityRenderer {
    // Add static shared materials and count
    static sharedMaterials = null;
    static instanceCount = 0;
    
    constructor(scene) {
        super(scene);
        this.invulnerabilityEffect = null;
        this.hitSphere = null;
        PlayerRenderer.instanceCount++;
        this._createModel();
        
        // Create hit sphere if debug is enabled
        if (GameConfig.player && GameConfig.player.debug) {
            this.createHitSphere();
        }
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
        }).then(model => {
            // Reuse shared materials if they exist
            if (PlayerRenderer.sharedMaterials) {
                model.traverse((child) => {
                    if (child.isMesh) {
                        if (Array.isArray(child.material)) {
                            // Replace array of materials with shared ones
                            child.material = child.material.map((mat, index) => {
                                if (PlayerRenderer.sharedMaterials[index]) {
                                    return PlayerRenderer.sharedMaterials[index];
                                }
                                return mat;
                            });
                        } else if (child.material) {
                            // Use the first shared material for single materials
                            if (PlayerRenderer.sharedMaterials[0]) {
                                child.material = PlayerRenderer.sharedMaterials[0];
                            }
                        }
                    }
                });
            } else {
                // Initialize shared materials from this first instance
                PlayerRenderer.sharedMaterials = [];
                
                // Store unique materials in the shared cache
                model.traverse((child) => {
                    if (child.isMesh) {
                        if (Array.isArray(child.material)) {
                            // Store each material in the array
                            child.material.forEach((mat) => {
                                if (!PlayerRenderer.sharedMaterials.includes(mat)) {
                                    PlayerRenderer.sharedMaterials.push(mat);
                                }
                            });
                        } else if (child.material) {
                            // Store single material
                            if (!PlayerRenderer.sharedMaterials.includes(child.material)) {
                                PlayerRenderer.sharedMaterials.push(child.material);
                            }
                        }
                    }
                });
            }
        }).catch(error => {
            throw error;
        });
    }

    /**
     * Create a sphere to visualize the hit box
     */
    createHitSphere() {
        // Skip if hit sphere already exists
        if (this.hitSphere) return;
        
        // Create a sphere to visualize the hitbox
        const sphereGeometry = new THREE.SphereGeometry(1, 16, 16); // Base size of 1 unit
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            depthTest: false
        });
        
        // Create mesh
        this.hitSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        // Set initial scale to match player hit sphere radius
        const hitSphereScale = GameConfig.player.hitSphereRadius || 15;
        this.hitSphere.scale.set(hitSphereScale, hitSphereScale, hitSphereScale);
        
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
            GameConfig.player && 
            GameConfig.player.debug && 
            GameConfig.player.debug.showHitSphere
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
        
        // Update hit sphere position
        if (this.hitSphere) {
            this.hitSphere.position.copy(position);
        }
        
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
        if (this.hitSphere) {
            if (this.hitSphere.geometry) {
                this.hitSphere.geometry.dispose();
            }
            if (this.hitSphere.material) {
                this.hitSphere.material.dispose();
            }
            this.scene.remove(this.hitSphere);
            this.hitSphere = null;
        }

        if (this.invulnerabilityEffect) {
            if (this.invulnerabilityEffect.geometry) {
                this.invulnerabilityEffect.geometry.dispose();
            }
            if (this.invulnerabilityEffect.material) {
                this.invulnerabilityEffect.material.dispose();
            }
            this.scene.remove(this.invulnerabilityEffect);
            this.invulnerabilityEffect = null;
        }

        if (this.model) {
            // Remove from scene first
            this.scene.remove(this.model);
            
            // Decrement instance count
            PlayerRenderer.instanceCount--;
            
            // Only dispose of materials if this is the last instance
            if (PlayerRenderer.instanceCount === 0) {
                // Dispose of materials and clear the cache
                if (PlayerRenderer.sharedMaterials) {
                    PlayerRenderer.sharedMaterials.forEach(material => {
                        if (material) material.dispose();
                    });
                    PlayerRenderer.sharedMaterials = null;
                }
            }
            
            // Dispose of geometries only
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) {
                        node.geometry.dispose();
                    }
                    // Don't dispose materials as they are shared
                    node.material = null;
                }
            });
            
            this.model = null;
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