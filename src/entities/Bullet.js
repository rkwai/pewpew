import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { GLTFLoader } from '../utilities/ThreeImports.js';
import { Explosion } from './Explosion.js';

// Remove direct import and use path string instead
// import missileModel from '../../../assets/models/missile.glb';

export class Bullet {
    constructor(scene, position) {
        this.scene = scene;
        this.speed = GameConfig.bullet.speed;
        this.lifeTime = GameConfig.bullet.lifespan;
        this.initialPosition = position.clone();
        this.isDestroyed = false; // Track if bullet is destroyed
        
        // Create a bullet container
        this.mesh = new THREE.Object3D();
        this.mesh.position.copy(position);
        
        // Add to scene
        this.scene.add(this.mesh);
        
        // Trail is removed as requested
        
        // Load missile model
        this.loadModel();
    }
    
    loadModel() {
        const loader = new GLTFLoader();
        console.log('Attempting to load missile model from: assets/models/missile.glb');
        
        loader.load(
            'assets/models/missile.glb',
            (gltf) => {
                // Check if bullet is destroyed or mesh doesn't exist
                if (this.isDestroyed || !this.mesh) {
                    console.warn('Cannot add missile model: bullet is destroyed or mesh container is null');
                    return;
                }
                
                console.log('Missile model loaded successfully');
                // Instead of removing the container, add the missile model as a child
                this.model = gltf.scene;
                // Set model position to origin of the container
                this.model.position.set(0, 0, 0);
                
                // Scale down the model (adjust if too small/large)
                const scale = 15.0;
                this.model.scale.set(scale, scale, scale);
                
                // Adjust rotation to face forward direction
                this.model.rotation.y = Math.PI;  // Facing forward
                
                // Add the missile model to the bullet container
                this.mesh.add(this.model);
                
                // Make the missile brighter
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        // Set up emissive properties to make it glow
                        if (child.material) {
                            // If it has a material, increase its brightness
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) this.enhanceMaterial(mat);
                                });
                            } else if (child.material) {
                                this.enhanceMaterial(child.material);
                            }
                        }
                    }
                });
            },
            undefined,
            (error) => {
                console.error('An error occurred while loading the missile model:', error);
                // Create a simple placeholder if loading fails and bullet still exists
                if (this.mesh && !this.isDestroyed) {
                    this.createPlaceholderModel();
                }
            }
        );
    }
    
    // Create a simple placeholder model when the main model fails to load
    createPlaceholderModel() {
        const geometry = new THREE.ConeGeometry(5, 20, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1.5
        });
        
        const placeholderMesh = new THREE.Mesh(geometry, material);
        placeholderMesh.rotation.z = Math.PI / 2; // Rotate to point forward
        this.mesh.add(placeholderMesh);
    }
    
    // Helper method to enhance material brightness
    enhanceMaterial(material) {
        // Preserve original color but make it brighter
        const brightness = GameConfig.bullet.brightness || 1.5;
        
        // Set emissive properties to create a glow effect
        material.emissive = new THREE.Color(GameConfig.bullet.color);
        material.emissiveIntensity = brightness;
        
        // Increase the material's overall brightness
        if (material.color) {
            material.color.multiplyScalar(brightness);
        }
    }
    
    // Note: createTrail method is removed as requested
    
    update(deltaTime) {
        if (this.isDestroyed) return true; // Skip update if destroyed
        
        // Move the bullet container from left to right
        this.mesh.position.x += this.speed * deltaTime;
        
        // Update lifetime
        this.lifeTime -= deltaTime;
        
        // Return true if bullet should be removed
        return this.lifeTime <= 0;
    }
    
    destroy() {
        if (!this.mesh || this.isDestroyed) return; // Already destroyed
        
        this.isDestroyed = true; // Mark as destroyed immediately
        
        // Store position before removing from scene for explosion effect
        const missilePosition = this.getPosition().clone();
        
        // Clean up trail if it exists
        if (this.trail) {
            this.scene.remove(this.trail);
            if (this.trail.geometry) this.trail.geometry.dispose();
            if (this.trail.material) this.trail.material.dispose();
            this.trail = null;
        }
        
        // Clean up model resources
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material) material.dispose();
                        });
                    } else if (child.material) {
                        child.material.dispose();
                    }
                }
            });
            this.model = null;
        }
        
        // Remove from scene
        if (this.scene) {
            this.scene.remove(this.mesh);
        }
        this.mesh = null;
        
        // Create explosion effect at missile's position only if:
        // 1. This is a real destruction (not just cleanup at end of game)
        // 2. The bullet wasn't just created (avoid explosions on load errors)
        try {
            if (this.lifeTime < GameConfig.bullet.lifespan - 0.1) { // Only create explosion if bullet has existed for a bit
                // Smaller explosion for missile
                const explosionSize = 1.2;
                // Add slight random variation for visual interest
                const sizeVariation = 1 + (Math.random() * 0.3 - 0.15); // ±15% variation
                
                new Explosion(this.scene, missilePosition, explosionSize * sizeVariation);
            }
        } catch (error) {
            console.error('Failed to create explosion for missile:', error);
        }
    }
    
    getPosition() {
        if (!this.mesh || this.isDestroyed) {
            // If already destroyed, return a default position to avoid errors
            return new THREE.Vector3(0, 0, 0);
        }
        return this.mesh.position.clone();
    }
} 