import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from './EntityRenderer.js';
import { GLTFLoader } from '../../utilities/ThreeImports.js';

/**
 * Renderer for explosion effects using only model animation
 */
export class ExplosionRenderer extends EntityRenderer {
    // Static model cache to avoid reloading for each explosion
    static modelCache = null;
    static modelLoading = false;
    static modelCallbacks = [];
    
    // Static material cache to avoid creating new materials for each explosion
    static materialCache = new Map();
    
    constructor(scene, position, size = 1) {
        super(scene);
        this.position = position.clone();
        this.size = size;
        this.lifetime = GameConfig.explosion.lifetime || 1.5;
        this.animationMixer = null;
        this.animationActions = [];
        this.explosionLight = null;
                
        // Set initial model container position
        if (this.position) {
            this.updateTransform(this.position);
        }
        
        // Initialize the model immediately
        this._initializeModel();
        
        // Create explosion light for visual effect
        this._createExplosionLight();
    }

    /**
     * Initialize the explosion model
     * @private
     */
    _initializeModel() {
        // If model is already cached, use it immediately
        if (ExplosionRenderer.modelCache) {
            this._setupModel(ExplosionRenderer.modelCache);
            return;
        }
        
        // If model is loading, add to callbacks
        if (ExplosionRenderer.modelLoading) {
            ExplosionRenderer.modelCallbacks.push((model) => {
                this._setupModel(model);
            });
            return;
        }
        
        // Start loading model
        this._loadModel();
    }

    /**
     * Load the explosion model
     * @private
     */
    _loadModel() {
        // Check that config has the model path
        if (!GameConfig.explosion?.model?.path) {
            console.error('Explosion model path not specified in GameConfig');
            throw new Error('Explosion model path not specified in GameConfig');
        }

        // Start loading indicator
        ExplosionRenderer.modelLoading = true;
        
        // Create model loader
        const loader = new GLTFLoader();
        loader.load(
            GameConfig.explosion.model.path,
            (gltf) => {
                // Store in static cache
                ExplosionRenderer.modelCache = gltf;
                ExplosionRenderer.modelLoading = false;
                
                // Set up this instance
                this._setupModel(gltf);
                
                // Process any callbacks waiting for the model
                if (ExplosionRenderer.modelCallbacks && ExplosionRenderer.modelCallbacks.length > 0) {
                    ExplosionRenderer.modelCallbacks.forEach(callback => callback(gltf));
                    ExplosionRenderer.modelCallbacks = [];
                }
            },
            (xhr) => {
                // Progress callback
                const progress = (xhr.loaded / xhr.total * 100).toFixed(1);
            },
            (error) => {
                // Error callback
                ExplosionRenderer.modelLoading = false;
                throw new Error(`Failed to load explosion model: ${error.message}`);
            }
        );
    }

    /**
     * Set up the explosion model
     * @param {Object} gltf - The loaded GLTF model
     * @private
     */
    _setupModel(gltf) {
        if (!this.scene) {
            console.warn('Cannot setup model: scene is not available');
            return;
        }
        
        // Clone the model
        this.model = gltf.scene.clone();
        
        // Scale according to explosion size and config scale
        const modelScale = GameConfig.explosion.model.scale * this.size;
        this.model.scale.set(modelScale, modelScale, modelScale);
        
        // Position at explosion center
        this.model.position.copy(this.position);
        
        // Enhance materials with emissive properties - use cached materials when possible
        this.model.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(mat => {
                        // Check if we already have a cached material for this
                        const cacheKey = `${mat.uuid}_explosion`;
                        if (ExplosionRenderer.materialCache.has(cacheKey)) {
                            return ExplosionRenderer.materialCache.get(cacheKey);
                        }
                        
                        // Create a new material
                        const newMat = mat.clone();
                        // Set base color to orange
                        newMat.color = new THREE.Color(0xff6600);
                        // Set emissive to bright yellow
                        newMat.emissive = new THREE.Color(0xffcc00);
                        newMat.emissiveIntensity = 3.0;
                        // Make it transparent for fade out
                        newMat.transparent = true;
                        newMat.opacity = 1.0;
                        
                        // Cache the material
                        ExplosionRenderer.materialCache.set(cacheKey, newMat);
                        return newMat;
                    });
                } else {
                    // Check if we already have a cached material for this
                    const cacheKey = `${child.material.uuid}_explosion`;
                    if (ExplosionRenderer.materialCache.has(cacheKey)) {
                        child.material = ExplosionRenderer.materialCache.get(cacheKey);
                    } else {
                        const newMat = child.material.clone();
                        // Set base color to orange
                        newMat.color = new THREE.Color(0xff6600);
                        // Set emissive to bright yellow
                        newMat.emissive = new THREE.Color(0xffcc00);
                        newMat.emissiveIntensity = 3.0;
                        // Make it transparent for fade out
                        newMat.transparent = true;
                        newMat.opacity = 1.0;
                        
                        // Cache the material
                        ExplosionRenderer.materialCache.set(cacheKey, newMat);
                        child.material = newMat;
                    }
                }
            }
        });
        
        // Create animation mixer
        this.animationMixer = new THREE.AnimationMixer(this.model);
        
        // Clone and play animations
        if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach(animation => {
                const action = this.animationMixer.clipAction(animation);
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                this.animationActions.push(action);
            });
        }
        
        // Add to scene
        this.scene.add(this.model);
    }

    /**
     * Create a light for the explosion
     * @private
     */
    _createExplosionLight() {
        const colors = [0xff6600, 0xff9900, 0xffcc00]; // Orange to yellow colors
        const lightColor = colors[Math.floor(Math.random() * colors.length)];
        
        const lightDistance = this.size * 50;
        
        this.explosionLight = new THREE.PointLight(lightColor, 5, lightDistance); // Increased intensity
        this.explosionLight.position.copy(this.position);
        this.explosionLight.castShadow = GameConfig.rendering?.shadows?.enabled || false;
        
        this.scene.add(this.explosionLight);
        this.effectMeshes.push(this.explosionLight);
    }

    /**
     * Update the explosion
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} - True if explosion is still active, false if complete
     */
    update(deltaTime) {
        // If no model or animations, consider explosion inactive
        if (!this.model || !this.animationMixer) {
            return false;
        }
        
        // Decrease lifetime
        this.lifetime -= deltaTime;
        
        // Calculate lifetime progress (0 to 1)
        const progress = 1 - (this.lifetime / (GameConfig.explosion?.lifetime || 1.5));
        
        // Update animation mixer
        this.animationMixer.update(deltaTime);
        
        // Update light effects
        this._updateLight(deltaTime);
        
        // Add flickering effect and fade out
        this.model.traverse((child) => {
            if (child.isMesh) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    // Flicker the emissive intensity based on progress and randomness
                    const flicker = 0.75 + Math.random() * 0.5; // Keep intensity flicker
                    material.emissiveIntensity = (GameConfig.explosion?.initialEmissiveIntensity || 3.0) * (1 - progress) * flicker;

                    // Fade out opacity based on progress
                    material.opacity = 1.0 * (1 - progress);

                    // Ensure material properties are updated (might be needed depending on Three.js version)
                    material.needsUpdate = true; 
                });
            }
        });
        
        // Return whether the explosion should still be active
        return this.lifetime > 0;
    }

    /**
     * Update the explosion light
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    _updateLight(deltaTime) {
        if (!this.explosionLight) return;
        
        // Calculate lifetime progress (0 to 1)
        const progress = 1 - (this.lifetime / (GameConfig.explosion?.lifetime || 1.5));
        
        // Fade out light intensity with flicker
        const flicker = 0.8 + Math.random() * 0.4;
        const initialIntensity = 5;
        const targetIntensity = 0;
        this.explosionLight.intensity = (initialIntensity * (1 - progress) + targetIntensity * progress) * flicker;
        
        // Increase light radius as explosion expands
        const initialRadius = this.size * 20;
        const targetRadius = this.size * 50;
        this.explosionLight.distance = initialRadius * (1 - progress) + targetRadius * progress;
        
        // Randomly change light color between orange and yellow
        if (Math.random() > 0.8) { // Only change sometimes for subtle effect
            const colors = [0xff6600, 0xff9900, 0xffcc00];
            this.explosionLight.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Clean up light effect
        if (this.explosionLight) {
            this.scene.remove(this.explosionLight);
            this.explosionLight = null;
        }
        
        // Clean up animation mixer
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationActions = [];
            this.animationMixer = null;
        }
        
        // Clean up model
        if (this.model) {
            // Remove from scene first
            this.scene.remove(this.model);
            
            // We're only removing references to materials, not disposing them
            // since they're cached and shared between explosions
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) {
                        node.geometry.dispose();
                    }
                    // Just null the material references, don't dispose
                    node.material = null;
                }
            });
            
            this.model = null;
        }
        
        // Clear references
        this.scene = null;
    }

    /**
     * Static method to preload explosion model
     */
    static preloadModel() {
        // Only load if not already loading or loaded
        if (ExplosionRenderer.modelCache || ExplosionRenderer.modelLoading) {
            return;
        }
        
        ExplosionRenderer.modelLoading = true;
        const loader = new GLTFLoader();
        
        loader.load(
            GameConfig.explosion.model.path,
            (gltf) => {
                ExplosionRenderer.modelCache = gltf;
                ExplosionRenderer.modelLoading = false;
                
                // Initialize material cache
                if (ExplosionRenderer.materialCache.size === 0) {
                    // Create and cache base materials
                    const baseMaterial = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(0xff6600),
                        emissive: new THREE.Color(0xffcc00),
                        emissiveIntensity: 3.0,
                        transparent: true,
                        opacity: 1.0
                    });
                    ExplosionRenderer.materialCache.set('base_explosion', baseMaterial);
                }
            },
            null,
            (error) => {
                ExplosionRenderer.modelLoading = false;
                console.error('Failed to preload explosion model:', error);
            }
        );
    }

    // Add static method to clean cache if needed
    static cleanMaterialCache() {
        // Only clean the cache if it gets too large
        if (ExplosionRenderer.materialCache.size > 50) {
            ExplosionRenderer.materialCache.clear();
        }
    }

    /**
     * Reset the explosion for reuse
     * @param {number} size - New size for the explosion
     * @param {THREE.Vector3} position - Optional new position
     */
    resetExplosion(size, position = null) {
        // Reset lifetime
        this.lifetime = GameConfig.explosion.lifetime || 1.5;

        // Update size
        if (size !== undefined) {
            this.size = size;
            
            // Scale model
            if (this.model) {
                const modelScale = GameConfig.explosion.model.scale * this.size;
                this.model.scale.set(modelScale, modelScale, modelScale);
            }
        }
        
        // Update position if provided
        if (position) {
            this.position.copy(position);
            this.updateTransform(position);
        }
        
        // Reset model visibility
        if (this.model) {
            this.model.visible = true;
            
            // Reset material properties
            this.model.traverse((child) => {
                if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        // Reset opacity
                        material.opacity = 1.0;
                        // Reset emissive intensity
                        material.emissiveIntensity = 3.0;
                    });
                }
            });
        }
        
        // Reset animation mixer
        if (this.animationMixer) {
            // Stop all actions
            this.animationMixer.stopAllAction();
            
            // Reset and play animations
            if (ExplosionRenderer.modelCache && ExplosionRenderer.modelCache.animations) {
                ExplosionRenderer.modelCache.animations.forEach(animation => {
                    const action = this.animationMixer.clipAction(animation);
                    action.reset();
                    action.setLoop(THREE.LoopOnce);
                    action.clampWhenFinished = true;
                    action.play();
                });
            }
        }
        
        // Reset explosion light
        if (this.explosionLight) {
            const lightDistance = this.size * 50;
            this.explosionLight.distance = lightDistance;
            this.explosionLight.intensity = 5;
            this.explosionLight.visible = true;
            if (position) {
                this.explosionLight.position.copy(position);
            }
        } else {
            // Create light if it doesn't exist
            this._createExplosionLight();
        }
    }
} 