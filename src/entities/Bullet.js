import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { GLTFLoader } from '../utilities/ThreeImports.js';

// Remove direct import and use path string instead
// import missileModel from '../../../assets/models/missile.glb';

export class Bullet {
    constructor(scene, position) {
        this.scene = scene;
        this.speed = GameConfig.bullet.speed;
        this.lifeTime = GameConfig.bullet.lifespan;
        this.initialPosition = position.clone();
        
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
                                    this.enhanceMaterial(mat);
                                });
                            } else {
                                this.enhanceMaterial(child.material);
                            }
                        }
                    }
                });
            },
            undefined,
            (error) => {
                console.error('An error occurred while loading the missile model:', error);
            }
        );
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
        // Move the bullet container from left to right
        this.mesh.position.x += this.speed * deltaTime;
        
        // Update lifetime
        this.lifeTime -= deltaTime;
        
        // Return true if bullet should be removed
        return this.lifeTime <= 0;
    }
    
    destroy() {
        if (this.trail) {
            this.scene.remove(this.trail);
            this.trail.geometry.dispose();
            this.trail.material.dispose();
            this.trail = null;
        }
        
        this.scene.remove(this.mesh);
    }
    
    getPosition() {
        return this.mesh.position.clone();
    }
} 