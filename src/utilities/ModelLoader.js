import { THREE, GLTFLoader } from './ThreeImports.js';
import { enhanceObjectMaterial } from './Utils.js';

/**
 * Utility for loading and managing 3D models
 */
export class ModelLoader {
    // Static cache for models
    static modelCache = new Map();
    static textureCache = new Map();

    // Add texture management
    static MAX_TEXTURES = 12; // Keep well below the WebGL limit of 16
    static activeTextureCount = 0;

    /**
     * Load a GLTF model from the given path
     * @param {string} modelPath - Path to the GLTF model file
     * @param {object} config - Configuration for the model
     * @param {Function} onSuccess - Callback when model loads successfully (receives the model)
     * @param {Function} onProgress - Callback for loading progress
     * @param {Function} onError - Callback when an error occurs
     * @returns {Promise} Promise that resolves with the loaded model
     */
    static loadModel(modelPath, config, onSuccess, onProgress, onError) {
        // Check if we're approaching the texture limit
        if (ModelLoader.activeTextureCount > ModelLoader.MAX_TEXTURES) {
            console.warn(`Approaching texture limit (${ModelLoader.activeTextureCount}/${ModelLoader.MAX_TEXTURES}). Clearing cache.`);
            ModelLoader.clearCache(); // Clear the cache to prevent reaching the limit
        }

        // Check if model is already cached
        if (ModelLoader.modelCache.has(modelPath)) {
            const cachedModel = ModelLoader.modelCache.get(modelPath);
            const clonedModel = cachedModel.clone();
            
            // Apply configuration to the cloned model
            if (config) {
                ModelLoader.configureModel(clonedModel, config);
            }
            
            // Call success callback if provided
            if (onSuccess) {
                onSuccess(clonedModel);
            }
            
            return Promise.resolve(clonedModel);
        }

        const loader = new GLTFLoader();
                
        return new Promise((resolve, reject) => {
            loader.load(
                modelPath,
                (gltf) => {            
                    // Cache the original model
                    ModelLoader.modelCache.set(modelPath, gltf.scene);
                    
                    // Cache all textures used in the model and count them
                    gltf.scene.traverse((node) => {
                        if (node.isMesh && node.material) {
                            const materials = Array.isArray(node.material) ? node.material : [node.material];
                            materials.forEach(material => {
                                ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap'].forEach(mapType => {
                                    if (material[mapType]) {
                                        const texture = material[mapType];
                                        const textureKey = `${modelPath}_${mapType}_${texture.uuid}`;
                                        if (!ModelLoader.textureCache.has(textureKey)) {
                                            ModelLoader.textureCache.set(textureKey, texture);
                                            ModelLoader.activeTextureCount++;
                                        }
                                    }
                                });
                            });
                        }
                    });
                    
                    // Clone the model for this instance
                    const clonedModel = gltf.scene.clone();
                    
                    // Apply configuration to the cloned model
                    if (config) {
                        ModelLoader.configureModel(clonedModel, config);
                    }
                    
                    // Call success callback if provided
                    if (onSuccess) {
                        onSuccess(clonedModel);
                    }
                    
                    resolve(clonedModel);
                },
                (xhr) => {
                    const progress = Math.round((xhr.loaded / xhr.total) * 100);
                    
                    // Call progress callback if provided
                    if (onProgress) {
                        onProgress(progress, xhr);
                    }
                },
                (error) => {
                    const errorMsg = `Failed to load model from path: ${modelPath}`;
                    console.error(errorMsg, error);
                    
                    if (onError) {
                        onError(new Error(errorMsg));
                    }
                    
                    reject(new Error(errorMsg));
                }
            );
        });
    }
    
    /**
     * Configure a model with the given settings
     * @param {THREE.Object3D} model - The model to configure
     * @param {object} config - Configuration settings
     */
    static configureModel(model, config) {
        // Apply position if specified
        if (config.position) {
            model.position.copy(config.position);
        }
        
        // Apply rotation if specified
        if (config.rotation) {
            model.rotation.copy(config.rotation);
        }
        
        // Apply scale if specified
        if (config.scale !== undefined) {
            const scale = typeof config.scale === 'number' ? config.scale : 1;
            model.scale.set(scale, scale, scale);
        }
        
        // Apply visibility if specified
        if (config.visible !== undefined) {
            model.visible = config.visible;
        }
        
        // Configure shadows
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = config.castShadow !== false;
                node.receiveShadow = config.receiveShadow !== false;
            }
        });
    }
    
    /**
     * Dispose of a model and its resources properly
     * @param {THREE.Object3D} model - The model to dispose
     */
    static disposeModel(model) {
        if (!model) return;
        
        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }

    /**
     * Clear the model and texture caches
     */
    static clearCache() {
        // Properly dispose of textures before clearing
        ModelLoader.textureCache.forEach(texture => {
            texture.dispose();
        });
        
        ModelLoader.modelCache.clear();
        ModelLoader.textureCache.clear();
        ModelLoader.activeTextureCount = 0;
    }
} 