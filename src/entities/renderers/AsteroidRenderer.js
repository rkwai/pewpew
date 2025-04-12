import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from './EntityRenderer.js';
import { enhanceMaterial } from '../../utilities/renderingUtils.js';

/**
 * Renderer for asteroid entities
 */
export class AsteroidRenderer extends EntityRenderer {
    // Static shared material for all asteroid instances
    static sharedAsteroidMaterial = null;
    static instanceCount = 0;
    // Add static variables to store shared geometries and materials
    static sharedGeometries = null;
    static sharedMaterials = null;
    
    constructor(scene, size = 1, color = null) {
        super(scene);
        this.size = size;
        this.color = color || this._getRandomColor();
        this.hitSphere = null;
        AsteroidRenderer.instanceCount++;
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
            // Ensure model is visible
            model.visible = true;
            
            // Initialize shared materials and geometries if this is the first instance
            if (!AsteroidRenderer.sharedMaterials || !AsteroidRenderer.sharedGeometries) {
                AsteroidRenderer.sharedMaterials = [];
                AsteroidRenderer.sharedGeometries = [];
                model.traverse((child) => {
                    if (child.isMesh) {
                        // Store geometry
                        if (child.geometry) {
                            AsteroidRenderer.sharedGeometries.push(child.geometry);
                        }
                        // Store material(s)
                        if (Array.isArray(child.material)) {
                            AsteroidRenderer.sharedMaterials.push(...child.material);
                        } else if (child.material) {
                            AsteroidRenderer.sharedMaterials.push(child.material);
                        }
                    }
                });
            } else {
                // Reuse materials and geometries for subsequent instances
                 model.traverse((child) => {
                    if (child.isMesh) {
                        // Reuse geometry
                        const originalMeshGeometry = AsteroidRenderer.sharedGeometries.find(g => g.uuid === child.geometry.uuid);
                        if (originalMeshGeometry) {
                             child.geometry = originalMeshGeometry;
                        }
                        // Reuse material(s)
                        if (Array.isArray(child.material)) {
                            child.material = child.material.map(m => {
                                const originalMaterial = AsteroidRenderer.sharedMaterials.find(sm => sm.uuid === m.uuid);
                                return originalMaterial || m; // Fallback
                            });
                        } else if (child.material) {
                            const originalMaterial = AsteroidRenderer.sharedMaterials.find(sm => sm.uuid === child.material.uuid);
                            child.material = originalMaterial || child.material; // Fallback
                        }
                    }
                });
            }
            
            // Assign the loaded model to this instance and add to scene
            this.model = model; // Assign model here
            this.scene.add(this.model); // Add model to scene

            // Update transform immediately after loading
             if (this.pendingPosition) {
                this.updateTransform(this.pendingPosition);
            }

            // Add hit sphere if debugging
             if (GameConfig.asteroid && GameConfig.asteroid.debug) {
                if (!this.hitSphere) {
                    this.createHitSphere();
                } else {
                     // Ensure hit sphere is parented correctly
                     if (this.hitSphere.parent !== this.model) {
                         this.model.add(this.hitSphere);
                     }
                     this.setHitSphereVisible(GameConfig.asteroid.debug.showHitSpheres);
                }
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
        const sphereGeometry = new THREE.SphereGeometry(1, 16, 16); // Base size of 1 unit
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            depthTest: false
        });
        
        // Create mesh
        this.hitSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        
        // Set initial scale to match collision radius
        const hitSphereScale = this.size; // Match the actual asteroid size
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
        this.updatePosition(position);
        
        // Update any other state properties
        if (state.scale) {
            this.model.scale.copy(state.scale);
        }
        
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
            // Scale hit sphere to match actual size
            this.hitSphere.scale.set(newSize, newSize, newSize);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.hitSphere) {
            // Remove from parent (either model or scene)
            if (this.hitSphere.parent) {
                this.hitSphere.parent.remove(this.hitSphere);
            }
            this.hitSphere.geometry.dispose();
            this.hitSphere.material.dispose();
            this.hitSphere = null;
        }
        
        // Remove the model from the scene and dispose geometries
        if (this.model) {
            this.scene.remove(this.model);
            
            // Dispose geometries, but material is shared, so don't dispose it here
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) {
                        node.geometry.dispose();
                    }
                    // Detach shared material reference - No longer needed
                    // node.material = null;
                }
            });
            this.model = null;
        }
        
        // Decrement instance count
        AsteroidRenderer.instanceCount--;
        
        // Dispose shared materials and geometries if this is the last instance
        if (AsteroidRenderer.instanceCount === 0) {
             if (AsteroidRenderer.sharedGeometries) {
                AsteroidRenderer.sharedGeometries.forEach(geometry => geometry.dispose());
                AsteroidRenderer.sharedGeometries = null;
            }
             if (AsteroidRenderer.sharedMaterials) {
                AsteroidRenderer.sharedMaterials.forEach(material => {
                    if (material.map) material.map.dispose();
                    if (material.normalMap) material.normalMap.dispose();
                    // Add other maps if needed
                    material.dispose();
                });
                AsteroidRenderer.sharedMaterials = null;
            }
            // Remove old shared material disposal
             /*
             if (AsteroidRenderer.sharedAsteroidMaterial) {
                 if (AsteroidRenderer.sharedAsteroidMaterial.map) {
                     AsteroidRenderer.sharedAsteroidMaterial.map.dispose();
                 }
                 AsteroidRenderer.sharedAsteroidMaterial.dispose();
                 AsteroidRenderer.sharedAsteroidMaterial = null;
             }
             */
        }
        
        // Call parent dispose
        super.dispose();
    }

    _onModelLoaded(model) {
        if (!model) return;
        
        this.model = model;
        this.scene.add(model);
    }

    updatePosition(position) {
        if (!position) return;
        
        if (this.model) {
            this.model.position.copy(position);
        }
        
        if (this.hitSphere) {
            this.hitSphere.position.copy(position);
        }
    }
} 