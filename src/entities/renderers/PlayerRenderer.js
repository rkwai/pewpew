import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from './EntityRenderer.js';

/**
 * Renderer for the player ship
 */
export class PlayerRenderer extends EntityRenderer {
    // Static shared material for the player ship
    static sharedPlayerMaterial = null;
    static instanceCount = 0;
    // Add static variables to store shared geometries and materials
    static sharedGeometries = null;
    static sharedMaterials = null;
    
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
            // Initialize shared materials and geometries if this is the first instance
            if (!PlayerRenderer.sharedMaterials || !PlayerRenderer.sharedGeometries) {
                PlayerRenderer.sharedMaterials = [];
                PlayerRenderer.sharedGeometries = [];
                model.traverse((child) => {
                    if (child.isMesh) {
                        // Store geometry
                        if (child.geometry) {
                            PlayerRenderer.sharedGeometries.push(child.geometry);
                        }
                        // Store material(s)
                        if (Array.isArray(child.material)) {
                            PlayerRenderer.sharedMaterials.push(...child.material);
                        } else if (child.material) {
                            PlayerRenderer.sharedMaterials.push(child.material);
                        }
                    }
                });
            } else {
                 // Reuse materials and geometries for subsequent instances
                model.traverse((child) => {
                    if (child.isMesh) {
                        // Find the original mesh in the first loaded model to get the correct geometry/material reference
                        // Note: This assumes mesh names are consistent or structure is identical.
                        // A more robust approach might involve storing a map based on mesh names or UUIDs.
                        const originalMeshGeometry = PlayerRenderer.sharedGeometries.find(g => g.uuid === child.geometry.uuid);
                        if (originalMeshGeometry) {
                            child.geometry = originalMeshGeometry;
                        }

                        if (Array.isArray(child.material)) {
                             child.material = child.material.map(m => {
                                const originalMaterial = PlayerRenderer.sharedMaterials.find(sm => sm.uuid === m.uuid);
                                return originalMaterial || m; // Fallback to current material if not found
                            });
                        } else if (child.material) {
                            const originalMaterial = PlayerRenderer.sharedMaterials.find(sm => sm.uuid === child.material.uuid);
                            child.material = originalMaterial || child.material; // Fallback
                        }
                    }
                });
            }

            // No longer needed: Replace all materials with the shared player material
            // model.traverse((child) => {
            //     if (child.isMesh) {
            //         child.material = PlayerRenderer.sharedPlayerMaterial;
            //     }
            // });

            // Assign the loaded model to this instance
            this.model = model; // Make sure the model is assigned here
            this.scene.add(this.model); // Add the model to the scene

            // Update transform immediately after loading
             if (this.pendingPosition && this.pendingRotation) {
                this.updateTransform(this.pendingPosition, this.pendingRotation);
            }


        }).catch(error => {
            // Throw error instead of just logging
             console.error("PlayerRenderer: Failed to load model:", error);
            throw new Error(`Failed to load player model: ${error.message}`);
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

            // Dispose the shared materials and geometries only if this is the last instance
            if (PlayerRenderer.instanceCount === 0) {
                 if (PlayerRenderer.sharedGeometries) {
                    PlayerRenderer.sharedGeometries.forEach(geometry => geometry.dispose());
                    PlayerRenderer.sharedGeometries = null;
                }
                if (PlayerRenderer.sharedMaterials) {
                    PlayerRenderer.sharedMaterials.forEach(material => {
                        // Dispose textures associated with the material
                        if (material.map) material.map.dispose();
                        if (material.normalMap) material.normalMap.dispose();
                        if (material.roughnessMap) material.roughnessMap.dispose();
                        if (material.metalnessMap) material.metalnessMap.dispose();
                        if (material.emissiveMap) material.emissiveMap.dispose();
                        // Dispose other potential texture maps (aoMap, displacementMap, etc.)
                        material.dispose();
                    });
                    PlayerRenderer.sharedMaterials = null;
                }
                 // Remove disposal logic for the old single shared material
                 /*
                if (PlayerRenderer.sharedPlayerMaterial) {
                    // Dispose textures used by the shared material
                    if (PlayerRenderer.sharedPlayerMaterial.map) {
                        PlayerRenderer.sharedPlayerMaterial.map.dispose();
                    }
                    PlayerRenderer.sharedPlayerMaterial.dispose();
                    PlayerRenderer.sharedPlayerMaterial = null;
                }
                */
            }
            
            // Dispose geometries, detach shared material
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) {
                        node.geometry.dispose();
                    }
                    // Detach shared material reference - no longer needed as we reuse original materials
                    // node.material = null;
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