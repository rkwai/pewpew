import { THREE, GLTFLoader } from './ThreeImports.js';
import { enhanceObjectMaterial } from './renderingUtils.js';

/**
 * Utility for loading and managing 3D models
 */
export class ModelLoader {
    // Static cache for models
    static modelCache = new Map();

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
} 