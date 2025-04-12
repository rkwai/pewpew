import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from './EntityRenderer.js';

/**
 * Renderer for bullet entities
 */
export class BulletRenderer extends EntityRenderer {
    // Static shared materials
    static sharedMaterials = null;
    static sharedGeometries = null;
    static instanceCount = 0;

    constructor(scene, size = 1) {
        super();
        this.scene = scene;
        this.initialPosition = new THREE.Vector3(-10000, -10000, GameConfig.screen.bounds.z);
        BulletRenderer.instanceCount++;
        
        // Create bullet mesh
        this._createModel(size);
    }

    /**
     * Create the bullet model
     * @private
     */
    _createModel(size) {
        // Check that config has the model path
        if (!GameConfig.bullet?.model?.path) {
            throw new Error('Bullet model path not specified in GameConfig');
        }
        
        // Load the bullet model
        this.loadModel(GameConfig.bullet.model.path, {
            scale: GameConfig.bullet.model.scale || 0.5,
            position: this.initialPosition.clone(),
            rotation: new THREE.Euler(0, 180, 0)
        }).then(model => {
            if (!BulletRenderer.sharedMaterials) {
                // Store the first instance's materials and geometries for reuse
                BulletRenderer.sharedMaterials = [];
                BulletRenderer.sharedGeometries = [];
                model.traverse((child) => {
                    if (child.isMesh) {
                        if (Array.isArray(child.material)) {
                            BulletRenderer.sharedMaterials.push(...child.material);
                        } else {
                            BulletRenderer.sharedMaterials.push(child.material);
                        }
                        BulletRenderer.sharedGeometries.push(child.geometry);
                    }
                });
            } else {
                // Reuse materials and geometries for subsequent instances
                model.traverse((child) => {
                    if (child.isMesh) {
                        const originalMesh = model.getObjectByName(child.name);
                        if (originalMesh) {
                            child.geometry = BulletRenderer.sharedGeometries.find(g => g === originalMesh.geometry) || child.geometry;
                            if (Array.isArray(child.material)) {
                                child.material = child.material.map(m => 
                                    BulletRenderer.sharedMaterials.find(sm => sm === m) || m
                                );
                            } else {
                                child.material = BulletRenderer.sharedMaterials.find(m => m === child.material) || child.material;
                            }
                        }
                    }
                });
            }
            
            // Set up the loaded model
            this.mesh = model;
            this.mesh.position.copy(this.initialPosition);
            this.scene.add(this.mesh);
        }).catch(error => {
            console.error('Failed to load bullet model:', error);
        });
    }

    /**
     * Update the renderer
     * @param {THREE.Vector3} position - Position to update to
     */
    updateTransform(position) {
        if (this.mesh) {
            this.mesh.position.copy(position);
        }
    }

    /**
     * Sets the visibility of the bullet model.
     * @param {boolean} visible - True to make the model visible, false to hide it.
     */
    setVisible(visible) {
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            
            // Only dispose of materials and geometries if this is the last instance
            BulletRenderer.instanceCount--;
            if (BulletRenderer.instanceCount === 0) {
                if (BulletRenderer.sharedGeometries) {
                    BulletRenderer.sharedGeometries.forEach(geometry => geometry.dispose());
                    BulletRenderer.sharedGeometries = null;
                }
                if (BulletRenderer.sharedMaterials) {
                    BulletRenderer.sharedMaterials.forEach(material => {
                        if (material.map) material.map.dispose();
                        if (material.normalMap) material.normalMap.dispose();
                        if (material.specularMap) material.specularMap.dispose();
                        if (material.emissiveMap) material.emissiveMap.dispose();
                        material.dispose();
                    });
                    BulletRenderer.sharedMaterials = null;
                }
            }
            
            this.mesh = null;
        }
        
        // Call parent class dispose
        super.dispose();
    }
}