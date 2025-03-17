import { THREE, GLTFLoader } from './ThreeImports.js';
import { enhanceObjectMaterial } from './Utils.js';

/**
 * Utility for loading and managing 3D models
 */
export class ModelLoader {
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
        const loader = new GLTFLoader();
        console.log(`Attempting to load model from: ${modelPath}`);

        return new Promise((resolve, reject) => {
            loader.load(
                modelPath,
                (gltf) => {
                    console.log(`Model loaded successfully: ${modelPath}`);
                    
                    // Apply configuration to the model
                    if (config) {
                        ModelLoader.configureModel(gltf.scene, config);
                    }
                    
                    // Call success callback if provided
                    if (onSuccess) {
                        onSuccess(gltf.scene);
                    }
                    
                    resolve(gltf.scene);
                },
                (xhr) => {
                    const progress = Math.round((xhr.loaded / xhr.total) * 100);
                    console.log(`Loading model: ${progress}%`);
                    
                    // Call progress callback if provided
                    if (onProgress) {
                        onProgress(progress, xhr);
                    }
                },
                (error) => {
                    console.error(`An error occurred while loading the model: ${error}`);
                    
                    // Call error callback if provided
                    if (onError) {
                        onError(error);
                    }
                    
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Configure a loaded model with position, scale, rotation, and materials
     * @param {THREE.Object3D} model - The loaded model
     * @param {object} config - Configuration object containing position, scale, rotation, gameConfig
     */
    static configureModel(model, config) {
        // Apply position if specified
        if (config.position) {
            model.position.copy(config.position);
            console.log('Model positioned at:', model.position);
        }
        
        // Apply scale if specified
        if (config.scale) {
            const scale = typeof config.scale === 'number' ? config.scale : config.scale;
            model.scale.set(scale, scale, scale);
            console.log('Model scale:', scale);
        }
        
        // Apply rotation if specified
        if (config.rotation) {
            if (config.rotation.x !== undefined) model.rotation.x = config.rotation.x;
            if (config.rotation.y !== undefined) model.rotation.y = config.rotation.y;
            if (config.rotation.z !== undefined) model.rotation.z = config.rotation.z;
        }
        
        // Enhance materials if gameConfig is provided
        if (config.gameConfig) {
            model.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.castShadow = config.castShadow !== false;
                    child.receiveShadow = config.receiveShadow !== false;
                    
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            enhanceObjectMaterial(mat, config.gameConfig, config.aesthetics);
                        });
                    } else {
                        enhanceObjectMaterial(child.material, config.gameConfig, config.aesthetics);
                    }
                }
            });
        }
    }
    
    /**
     * Create a simple placeholder mesh when a model fails to load
     * @param {object} config - Configuration for the placeholder
     * @returns {THREE.Mesh} A placeholder mesh
     */
    static createPlaceholderMesh(config) {
        const size = config.size || { x: 30, y: 10, z: 50 };
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const material = new THREE.MeshPhongMaterial({
            color: config.color || 0x3333ff,
            emissive: config.emissive || 0x444444,
            emissiveIntensity: config.emissiveIntensity || 0.5,
            shininess: config.shininess || 70,
            specular: config.specular || 0xffffff,
            transparent: true,
            opacity: config.opacity || 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Apply position if specified
        if (config.position) {
            mesh.position.copy(config.position);
        }
        
        // Apply scale if specified
        if (config.scale) {
            const scale = typeof config.scale === 'number' ? config.scale : config.scale;
            mesh.scale.set(scale, scale, scale);
        }
        
        return mesh;
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