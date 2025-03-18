import { THREE } from './ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { ModelLoader } from './ModelLoader.js';

/**
 * Base class for entity rendering
 * Separates rendering logic from entity behavior
 */
export class EntityRenderer {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.meshes = [];
        this.materials = [];
        this.effectMeshes = []; // For visual effects like glows, trails, etc.
        this.debugHelpers = []; // Visual helpers for debugging
        
        // Ensure debug is disabled
        if (GameConfig.debug) {
            GameConfig.debug.enabled = false;
            GameConfig.debug.showAxes = false;
            GameConfig.debug.showGrid = false;
        }
    }

    /**
     * Create a basic mesh for the entity
     * @param {Object} config - Configuration for the mesh
     * @returns {THREE.Mesh} The created mesh
     */
    createBasicMesh(config = {}) {
        const {
            geometry = new THREE.BoxGeometry(1, 1, 1),
            materialType = 'phong',
            color = 0xffffff,
            emissive = 0x000000,
            transparent = false,
            opacity = 1.0,
            scale = 1
        } = config;

        // Create material based on type
        let material;
        switch (materialType.toLowerCase()) {
            case 'basic':
                material = new THREE.MeshBasicMaterial({
                    color,
                    transparent,
                    opacity
                });
                break;
            case 'lambert':
                material = new THREE.MeshLambertMaterial({
                    color,
                    emissive,
                    transparent,
                    opacity
                });
                break;
            case 'phong':
            default:
                material = new THREE.MeshPhongMaterial({
                    color,
                    emissive,
                    shininess: config.shininess || 30,
                    transparent,
                    opacity
                });
                break;
        }

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Apply scale
        mesh.scale.set(scale, scale, scale);

        // Apply position and rotation if provided
        if (config.position) mesh.position.copy(config.position);
        if (config.rotation) mesh.rotation.copy(config.rotation);

        // Configure shadows
        mesh.castShadow = config.castShadow !== false;
        mesh.receiveShadow = config.receiveShadow !== false;

        // Add to scene
        if (this.scene) this.scene.add(mesh);

        // Track mesh and material
        this.meshes.push(mesh);
        this.materials.push(material);

        // Set as primary model
        this.model = mesh;

        return mesh;
    }

    /**
     * Load a model from a file
     * @param {string} modelPath - Path to the model file
     * @param {Object} config - Configuration for the model
     * @returns {Promise} Promise that resolves when the model is loaded
     */
    loadModel(modelPath, config = {}) {
        return new Promise((resolve, reject) => {
            // Remove existing model if it exists
            this.removeModel();

            ModelLoader.loadModel(
                modelPath,
                config,
                (loadedModel) => {
                    this.model = loadedModel;
                    
                    // Apply any additional configurations
                    if (config.visible !== undefined) {
                        this.model.visible = config.visible;
                    }
                    
                    // Apply position, rotation and scale
                    if (config.position) this.model.position.copy(config.position);
                    if (config.rotation) this.model.rotation.copy(config.rotation);
                    if (config.scale) {
                        const scale = typeof config.scale === 'number' ? config.scale : 1;
                        this.model.scale.set(scale, scale, scale);
                    }
                    
                    // Build lists of meshes and materials in the model
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            this.meshes.push(child);
                            if (Array.isArray(child.material)) {
                                this.materials.push(...child.material);
                            } else if (child.material) {
                                this.materials.push(child.material);
                            }
                        }
                    });
                    
                    // Add to scene
                    if (this.scene) this.scene.add(this.model);
                    
                    resolve(this.model);
                },
                (progress) => {
                    console.log(`Loading model ${modelPath}: ${progress}%`);
                },
                (error) => {
                    console.error(`Failed to load model ${modelPath}:`, error);
                    reject(new Error(`Failed to load model ${modelPath}: ${error.message}`));
                }
            );
        });
    }

    /**
     * Update the model position and rotation
     * @param {THREE.Vector3} position - New position
     * @param {THREE.Euler} rotation - New rotation
     */
    updateTransform(position, rotation) {
        if (!this.model) {
            console.warn('EntityRenderer: Cannot update transform - model does not exist');
            return;
        }
        
        if (position) {
            this.model.position.copy(position);
            console.log('EntityRenderer: Updated model position to:', 
                this.model.position.x.toFixed(1),
                this.model.position.y.toFixed(1),
                this.model.position.z.toFixed(1),
                'World position:',
                this.model.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(1)).join(', '),
                'Visible:', this.model.visible,
                'In scene:', this.model.parent === this.scene);
        }
        
        if (rotation) {
            this.model.rotation.copy(rotation);
        }
    }

    /**
     * Add debug helper to visualize entity properties
     * @param {string} type - Type of helper ('axes', 'box', 'sphere', etc.)
     * @param {Object} config - Configuration for the helper
     */
    addDebugHelper(type, config = {}) {
        // Always return null to prevent debug helpers from being created
        return null;
    }

    /**
     * Remove the model from the scene
     */
    removeModel() {
        if (this.model && this.scene) {
            this.scene.remove(this.model);
        }
        
        // Clear tracked meshes and materials
        this.meshes = [];
        this.materials = [];
        this.model = null;
    }

    /**
     * Clean up resources to prevent memory leaks
     */
    dispose() {
        // Remove debug helpers
        this.debugHelpers.forEach(helper => {
            if (helper.parent) {
                helper.parent.remove(helper);
            }
            if (helper.geometry) helper.geometry.dispose();
            if (helper.material) {
                if (Array.isArray(helper.material)) {
                    helper.material.forEach(mat => mat.dispose());
                } else {
                    helper.material.dispose();
                }
            }
        });
        this.debugHelpers = [];
        
        // Remove effect meshes
        this.effectMeshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        this.effectMeshes = [];
        
        // Remove model and clean up materials and geometries
        if (this.model) {
            if (this.scene) this.scene.remove(this.model);
            
            // Dispose of geometries and materials
            this.model.traverse((node) => {
                if (node.isMesh) {
                    if (node.geometry) node.geometry.dispose();
                    
                    if (node.material) {
                        if (Array.isArray(node.material)) {
                            node.material.forEach(material => material.dispose());
                        } else {
                            node.material.dispose();
                        }
                    }
                }
            });
            
            this.model = null;
        }
        
        // Clear references
        this.meshes = [];
        this.materials = [];
        this.scene = null;
    }
} 