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
    
    // Shared material for all explosion instances
    static sharedExplosionMaterial = null;
    static instanceCount = 0; // Add instance count for shared material disposal
    
    constructor(scene, position, size = 1) {
        super(scene);
        this.position = position.clone();
        this.size = size;
        this.lifetime = GameConfig.explosion.lifetime || 1.5;
        this.animationMixer = null;
        this.animationActions = [];
        this.explosionLight = null;
        ExplosionRenderer.instanceCount++; // Increment instance count
                
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
        
        // Initialize the shared material if it doesn't exist
        if (!ExplosionRenderer.sharedExplosionMaterial) {
            ExplosionRenderer.sharedExplosionMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(GameConfig.explosion?.material?.color || 0xff6600),
                emissive: new THREE.Color(GameConfig.explosion?.material?.emissive || 0xffcc00),
                emissiveIntensity: GameConfig.explosion?.initialEmissiveIntensity || 3.0,
                transparent: true,
                opacity: 1.0,
                depthWrite: false, // Good practice for transparent effects
                blending: THREE.AdditiveBlending // Optional: for brighter effect
            });
        }
        
        // Position at explosion center
        this.model.position.copy(this.position);
        
        // Replace all materials with the shared explosion material
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.material = ExplosionRenderer.sharedExplosionMaterial;
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
        // Force shadows off for explosion lights to avoid exceeding texture limits
        this.explosionLight.castShadow = false; 
        
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
        
        // Add flickering effect and fade out using the shared material
        // No need to traverse, just update the shared material once
        if (ExplosionRenderer.sharedExplosionMaterial) {
            const material = ExplosionRenderer.sharedExplosionMaterial;
            // Flicker the emissive intensity based on progress and randomness
            const flicker = 0.75 + Math.random() * 0.5; // Keep intensity flicker
            material.emissiveIntensity = (GameConfig.explosion?.initialEmissiveIntensity || 3.0) * (1 - progress) * flicker;

            // Fade out opacity based on progress
            material.opacity = 1.0 * (1 - progress);

            // Ensure material properties are updated (might be needed depending on Three.js version)
            material.needsUpdate = true; 
        }
        
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
            
            // Dispose geometries, but material is shared, so don't dispose it here
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) {
                        node.geometry.dispose();
                    }
                    // Detach shared material reference
                    node.material = null; // Or assign a default if needed
                }
            });
            
            this.model = null;
        }
        
        // Decrement instance count
        ExplosionRenderer.instanceCount--;

        // Dispose the shared material only if this is the last instance
        if (ExplosionRenderer.instanceCount === 0 && ExplosionRenderer.sharedExplosionMaterial) {
            // Dispose textures used by the shared material (add others if needed)
            if (ExplosionRenderer.sharedExplosionMaterial.map) {
                ExplosionRenderer.sharedExplosionMaterial.map.dispose();
            }
            ExplosionRenderer.sharedExplosionMaterial.dispose();
            ExplosionRenderer.sharedExplosionMaterial = null;
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
            },
            null,
            (error) => {
                ExplosionRenderer.modelLoading = false;
                console.error('Failed to preload explosion model:', error);
            }
        );
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
            
            // Reset shared material properties
            if (ExplosionRenderer.sharedExplosionMaterial) {
                const material = ExplosionRenderer.sharedExplosionMaterial;
                material.opacity = 1.0;
                material.emissiveIntensity = GameConfig.explosion?.initialEmissiveIntensity || 3.0;
                material.needsUpdate = true;
            }
        }
        
        // Reset animation mixer
        if (this.animationMixer && ExplosionRenderer.modelCache?.animations) {
            this.animationActions = []; // Clear old action references
            ExplosionRenderer.modelCache.animations.forEach(animation => {
                const action = this.animationMixer.clipAction(animation);
                action.reset(); // Reset time and state
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.time = 0; // Explicitly set time to 0
                action.play(); // Start playing from the beginning
                this.animationActions.push(action); // Store new action reference if needed
            });
            // Optional: Reset mixer's internal time if needed, though action reset might suffice
            // this.animationMixer.setTime(0);
        }
        
        // Reset explosion light
        if (this.explosionLight) {
            const lightDistance = this.size * 50;
            this.explosionLight.distance = lightDistance;
            // Use config value for initial intensity or default
            this.explosionLight.intensity = GameConfig.explosion?.light?.initialIntensity || 5;
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