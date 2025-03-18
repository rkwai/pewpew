import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from '../../utilities/EntityRenderer.js';
import { GLTFLoader } from '../../utilities/ThreeImports.js';

/**
 * Renderer for explosion effects using only model animation
 */
export class ExplosionRenderer extends EntityRenderer {
    // Static model cache to avoid reloading for each explosion
    static modelCache = null;
    static modelLoading = false;
    static modelCallbacks = [];
    
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
        const colors = GameConfig.explosion.colors || [0xff9900, 0xff5500, 0xff0000];
        const lightColor = colors[Math.floor(Math.random() * colors.length)];
        
        const lightDistance = this.size * 50;
        
        this.explosionLight = new THREE.PointLight(lightColor, 2, lightDistance);
        this.explosionLight.position.copy(this.position);
        this.explosionLight.castShadow = GameConfig.rendering?.shadows?.enabled || false;
        
        this.scene.add(this.explosionLight);
        this.effectMeshes.push(this.explosionLight);
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
        
        // Fade out light intensity
        const initialIntensity = 2;
        const targetIntensity = 0;
        this.explosionLight.intensity = initialIntensity * (1 - progress) + targetIntensity * progress;
        
        // Increase light radius as explosion expands
        const initialRadius = this.size * 20;
        const targetRadius = this.size * 50;
        this.explosionLight.distance = initialRadius * (1 - progress) + targetRadius * progress;
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
        
        // Update animation mixer
        this.animationMixer.update(deltaTime);
        
        // Update light effects
        this._updateLight(deltaTime);
        
        // Return whether the explosion should still be active
        return this.lifetime > 0;
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Clean up animation mixer
        if (this.animationMixer) {
            this.animationMixer = null;
        }
        
        // Clean up animation actions
        this.animationActions = [];
        
        // Call parent class dispose
        super.dispose();
    }

    /**
     * Static method to preload explosion model
     */
    static preloadModel() {
        if (ExplosionRenderer.modelCache || ExplosionRenderer.modelLoading) return;
        
        // Check that config has the model path
        if (!GameConfig.explosion?.model?.path) {
            throw new Error('Explosion model path not specified in GameConfig');
        }
        
        const loader = new GLTFLoader();
        ExplosionRenderer.modelLoading = true;
        
        loader.load(
            GameConfig.explosion.model.path,
            (gltf) => {
                ExplosionRenderer.modelCache = gltf;
                ExplosionRenderer.modelLoading = false;
                
                // Process any callbacks waiting for the model
                if (ExplosionRenderer.modelCallbacks.length > 0) {
                    ExplosionRenderer.modelCallbacks.forEach(callback => callback(gltf));
                    ExplosionRenderer.modelCallbacks = [];
                }
            },
            (xhr) => {
            },
            (error) => {
                console.error('Error preloading explosion model:', error);
                ExplosionRenderer.modelLoading = false;
                throw new Error(`Failed to preload explosion model: ${error.message}`);
            }
        );
    }
} 