import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from '../../utilities/EntityRenderer.js';

/**
 * Renderer for bullet entities
 */
export class BulletRenderer extends EntityRenderer {
    constructor(scene, size = 1) {
        super();
        this.scene = scene;
        this.initialPosition = new THREE.Vector3(-10000, -10000, GameConfig.screen.bounds.z);
        
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
        
        // Create a temporary invisible mesh while model loads
        const tempGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const tempMaterial = new THREE.MeshBasicMaterial({ visible: false });
        this.mesh = new THREE.Mesh(tempGeometry, tempMaterial);
        this.mesh.position.copy(this.initialPosition);
        this.scene.add(this.mesh);
        
        // Load the bullet model
        this.loadModel(GameConfig.bullet.model.path, {
            scale: GameConfig.bullet.model.scale || 0.5,
            position: this.initialPosition.clone(),
            rotation: new THREE.Euler(0, 180, 0)
        }).then(model => {
            // Remove temporary mesh
            this.scene.remove(this.mesh);
            tempGeometry.dispose();
            tempMaterial.dispose();
            
            // Set up the loaded model
            this.mesh = model;
            this.mesh.position.copy(this.initialPosition);
            this.scene.add(this.mesh);
            
            // Add bullet light
            this._addBulletLight();
        }).catch(error => {
            console.error('Failed to load bullet model:', error);
            // Keep the temporary mesh in case of error
        });
    }

    /**
     * Add a light to the bullet for a glowing effect
     * @private
     */
    _addBulletLight() {
        // Create a point light for the bullet
        this.bulletLight = new THREE.PointLight(0x00ffff, 1, 30);
        this.bulletLight.position.copy(this.initialPosition);
        
        // Add to model if exists, otherwise add to scene
        if (this.mesh) {
            this.mesh.add(this.bulletLight);
        } else {
            this.scene.add(this.bulletLight);
            this.effectMeshes.push(this.bulletLight);
        }
    }

    /**
     * Update the renderer
     * @param {THREE.Vector3} position - Position to update to
     * @param {Object} state - Additional state for visual effects
     */
    updateTransform(position) {
        if (this.mesh) {
            this.mesh.position.copy(position);
        }
        if (this.bulletLight && !this.bulletLight.parent) {
            this.bulletLight.position.copy(position);
        }
    }

    /**
     * Update the renderer
     * @param {THREE.Vector3} position - Position to update to
     * @param {Object} state - Additional state for visual effects
     */
    update(position, state = {}) {
        // Update model position
        this.updateTransform(position);
        
        // Update light position and intensity
        if (this.bulletLight) {
            const time = performance.now() * 0.001;
            const pulseSpeed = GameConfig.bullet?.pulseSpeed || 10;
            const pulseAmount = GameConfig.bullet?.pulseAmount || 0.3;
            this.bulletLight.intensity = 1 + Math.sin(time * pulseSpeed) * pulseAmount;
        }
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Clean up bullet light
        if (this.bulletLight) {
            if (this.bulletLight.parent) {
                this.bulletLight.parent.remove(this.bulletLight);
            }
            this.bulletLight.dispose();
            this.bulletLight = null;
        }
        
        // Clean up model and its materials/textures
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => {
                                if (material.map) material.map.dispose();
                                if (material.normalMap) material.normalMap.dispose();
                                if (material.specularMap) material.specularMap.dispose();
                                if (material.emissiveMap) material.emissiveMap.dispose();
                                material.dispose();
                            });
                        } else {
                            if (child.material.map) child.material.map.dispose();
                            if (child.material.normalMap) child.material.normalMap.dispose();
                            if (child.material.specularMap) child.material.specularMap.dispose();
                            if (child.material.emissiveMap) child.material.emissiveMap.dispose();
                            child.material.dispose();
                        }
                    }
                }
            });
        }
        
        // Call parent class dispose
        super.dispose();
    }
} 