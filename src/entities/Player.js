import { THREE, GLTFLoader } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Bullet } from './Bullet.js';
import { clamp, enhanceMaterial } from '../utilities/Utils.js';

// Remove direct import and use path string instead
// import spaceshipModel from '../../../assets/models/spaceship.glb';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.bullets = [];
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.maxSpeed = GameConfig.player.speed;
        this.health = GameConfig.player.health;
        this.shootCooldown = 0;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.modelLoaded = false;
        this.engineTime = 0;
        this.hitSphere = null;
        this.hitSphereRadius = 25; // Size of player collision sphere
        this.hitSphereVisible = GameConfig.player?.debug?.showHitSphere || false;
        
        // Create a temporary mesh while model loads
        const geometry = new THREE.BoxGeometry(30 * 10, 10 * 10, 50 * 10);
        const material = new THREE.MeshPhongMaterial({ 
            color: GameConfig.player.aesthetics.placeholder.color,
            emissive: GameConfig.player.aesthetics.placeholder.emissive,
            emissiveIntensity: GameConfig.player.aesthetics.placeholder.emissiveIntensity,
            shininess: GameConfig.player.aesthetics.placeholder.shininess
        });
        this.tempMesh = new THREE.Mesh(geometry, material);
        
        // Position using the values from GameConfig
        let posX = GameConfig.player.defaultPosition.x;
        let posY = GameConfig.player.defaultPosition.y;
        let posZ = GameConfig.player.defaultPosition.z;
        
        // Apply position
        this.tempMesh.position.set(posX, posY, posZ);
        
        console.log(`Player initial position from config: (${posX}, ${posY}, ${posZ})`);
        
        scene.add(this.tempMesh);
        
        // Create hit sphere for collision detection
        this.createHitSphere();
        
        // Load the actual model
        this.loadModel();
        
        // Engine effects removed
    }
    
    // Create hit sphere for player collision detection
    createHitSphere() {
        // Create geometry for the player's hit sphere
        const hitSphereGeometry = new THREE.SphereGeometry(this.hitSphereRadius, 16, 12);
        
        // Create material - transparent if not in debug mode
        const hitSphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff, // Blue color for player's hit sphere
            transparent: true,
            opacity: this.hitSphereVisible ? 0.3 : 0,
            wireframe: this.hitSphereVisible
        });
        
        // Create mesh
        this.hitSphere = new THREE.Mesh(hitSphereGeometry, hitSphereMaterial);
        
        // Add to scene at player position
        this.hitSphere.position.copy(this.tempMesh.position);
        this.scene.add(this.hitSphere);
        
        console.log(`Created player hit sphere with radius ${this.hitSphereRadius}`);
    }
    
    // Get hit sphere position for collision detection
    getHitSpherePosition() {
        if (!this.hitSphere) return this.getPosition();
        return this.hitSphere.position.clone();
    }
    
    // Update the hit sphere position to match the player
    updateHitSpherePosition() {
        if (!this.hitSphere) return;
        
        const playerPos = this.getPosition();
        this.hitSphere.position.copy(playerPos);
    }
    
    loadModel() {
        const loader = new GLTFLoader();
        console.log('Attempting to load spaceship model from: assets/models/spaceship.glb');
        
        // Try to load the model, but continue with placeholder if missing
        loader.load(
            // Use path string instead of import
            'assets/models/spaceship.glb',
            (gltf) => {
                this.modelLoaded = true;
                console.log('Spaceship model loaded successfully');
                
                // Remove temporary mesh
                this.scene.remove(this.tempMesh);
                
                // Add the loaded model
                this.model = gltf.scene;
                
                // Position at the same location as the temporary mesh
                this.model.position.copy(this.tempMesh.position);
                
                // Adjust the scale for zoomed-in camera view
                const scale = GameConfig.player.aesthetics.scale;
                this.model.scale.set(scale, scale, scale);
                
                // Adjust rotation for proper side-scrolling view
                this.model.rotation.y = GameConfig.player.aesthetics.rotation;
                
                // Log the model's final position and scale for debugging
                console.log('Spacecraft model positioned at:', this.model.position);
                console.log('Spacecraft model scale:', scale);
                
                this.scene.add(this.model);
                
                // Make sure the model materials are set properly
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance materials without washing out colors
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                // Preserve original color without excessive brightening
                                // Apply ship-specific aesthetics
                                const hsl = {};
                                mat.color.getHSL(hsl);
                                mat.color.setHSL(
                                    hsl.h,                    // Keep original hue
                                    Math.min(hsl.s * GameConfig.player.aesthetics.saturationMultiplier, 1), // Increase saturation
                                    Math.min(hsl.l * GameConfig.player.aesthetics.lightnessMultiplier, 1)  // Increase lightness
                                );
                                
                                // Add subtle emissive for glow without changing color
                                mat.emissive = mat.color.clone().multiplyScalar(GameConfig.player.aesthetics.emissiveMultiplier);
                                mat.emissiveIntensity = GameConfig.player.aesthetics.emissiveIntensity;
                                
                                // Enhance reflection properties
                                if (mat.type.includes('MeshStandard')) {
                                    mat.metalness = GameConfig.player.aesthetics.standardMaterial.metalness;
                                    mat.roughness = GameConfig.player.aesthetics.standardMaterial.roughness;
                                } else {
                                    mat.shininess = GameConfig.player.aesthetics.phongMaterial.shininess;
                                }
                                
                                // Apply global material enhancements
                                enhanceMaterial(mat, GameConfig);
                            });
                        } else if (child.material) {
                            // Single material
                            const mat = child.material;
                            
                            // Preserve original color without excessive brightening
                            // Apply ship-specific aesthetics
                            const hsl = {};
                            mat.color.getHSL(hsl);
                            mat.color.setHSL(
                                hsl.h,                    // Keep original hue
                                Math.min(hsl.s * GameConfig.player.aesthetics.saturationMultiplier, 1), // Increase saturation
                                Math.min(hsl.l * GameConfig.player.aesthetics.lightnessMultiplier, 1)  // Increase lightness
                            );
                            
                            // Add subtle emissive for glow without changing color
                            mat.emissive = mat.color.clone().multiplyScalar(GameConfig.player.aesthetics.emissiveMultiplier);
                            mat.emissiveIntensity = GameConfig.player.aesthetics.emissiveIntensity;
                            
                            // Enhance reflection properties
                            if (mat.type.includes('MeshStandard')) {
                                mat.metalness = GameConfig.player.aesthetics.standardMaterial.metalness;
                                mat.roughness = GameConfig.player.aesthetics.standardMaterial.roughness;
                            } else {
                                mat.shininess = GameConfig.player.aesthetics.phongMaterial.shininess;
                            }
                            
                            // Apply global material enhancements
                            enhanceMaterial(mat, GameConfig);
                        }
                    }
                });
                
                // Hide loading message if it exists
                const loadingElement = document.getElementById('loading');
                if (loadingElement) loadingElement.style.display = 'none';
                
                // Show HUD if it exists
                const hudElement = document.getElementById('hud');
                if (hudElement) hudElement.style.display = 'block';
            },
            (xhr) => {
                // Loading progress
                console.log(`Loading spaceship: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
                const loadingElement = document.getElementById('loading');
                if (loadingElement) {
                    loadingElement.innerText = `Loading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
                }
            },
            (error) => {
                console.error('An error occurred while loading the spaceship model:', error);
                // Use brighter materials but maintain original color scheme
                this.tempMesh.material = new THREE.MeshPhongMaterial({ 
                    color: 0xdddddd,         // Light gray - neutral but bright
                    emissive: 0x444444,      // Subtle emissive for better visibility
                    emissiveIntensity: 0.5,  // Moderate emissive intensity
                    shininess: 70,           // Good shininess for reflections
                    specular: 0xffffff       // White specular highlights
                });
                
                // Make the placeholder mesh larger for better visibility
                this.tempMesh.scale.set(5, 5, 5);
                
                // Hide loading message if it exists
                const loadingElement = document.getElementById('loading');
                if (loadingElement) loadingElement.style.display = 'none';
                
                // Show HUD if it exists
                const hudElement = document.getElementById('hud');
                if (hudElement) hudElement.style.display = 'block';
                
                // Set modelLoaded to true since we'll use the placeholder
                this.modelLoaded = true;
            }
        );
    }
    
    update(deltaTime, inputHandler) {
        // Update invulnerability timer
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            
            // Flash effect when invulnerable
            if (this.model) {
                // Visual indication of invulnerability
                const flashRate = Math.sin(this.invulnerabilityTimer * 10) > 0;
                this.model.visible = flashRate;
            }
            
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                if (this.model) {
                    this.model.visible = true;
                }
            }
        }
        
        // Handle movement based on input
        this.handleMovement(deltaTime, inputHandler);
        
        // Update hit sphere position
        this.updateHitSpherePosition();
        
        // Handle shooting
        if (inputHandler.isPressed('Space')) {
            if (this.shootCooldown <= 0) {
                this.shoot();
                this.shootCooldown = GameConfig.player.shootCooldown;
            }
        }
        
        // Update shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
        
        // Update bullets
        this.updateBullets(deltaTime);
    }
    
    handleMovement(deltaTime, inputHandler) {
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Apply acceleration based on input
        if (inputHandler.isPressed('ArrowUp')) {
            this.acceleration.y += this.maxSpeed * 5;
        }
        if (inputHandler.isPressed('ArrowDown')) {
            this.acceleration.y -= this.maxSpeed * 5;
        }
        if (inputHandler.isPressed('ArrowLeft')) {
            this.acceleration.x -= this.maxSpeed * 2;
        }
        if (inputHandler.isPressed('ArrowRight')) {
            this.acceleration.x += this.maxSpeed * 2;
        }
        
        // Apply acceleration to velocity
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        
        // Apply damping (drag)
        const damping = 0.95;
        this.velocity.x *= damping;
        this.velocity.y *= damping;
        
        // Apply velocity to position
        const position = this.getPosition();
        position.x += this.velocity.x * deltaTime;
        position.y += this.velocity.y * deltaTime;
        
        // Apply boundaries from GameConfig
        position.x = Math.max(
            GameConfig.player.boundaries.xMin, 
            Math.min(position.x, GameConfig.player.boundaries.xMax)
        );
        position.y = Math.max(
            GameConfig.player.boundaries.yMin, 
            Math.min(position.y, GameConfig.player.boundaries.yMax)
        );
        
        // Update position
        this.setPosition(position.x, position.y, position.z);
        
        // Apply slight tilt based on movement
        if (this.model) {
            // Tilt when moving up/down
            const pitchAngle = -this.velocity.y * 0.001;
            this.model.rotation.z = pitchAngle;
        }
    }
    
    shoot() {
        const position = this.getPosition().clone();
        // Offset the bullet spawn position slightly in front (right) of the ship
        position.x += 30;
        
        const bullet = new Bullet(this.scene, position);
        this.bullets.push(bullet);
    }
    
    updateBullets(deltaTime) {
        // Update all bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime);
            
            // Remove bullets that have exceeded their lifespan
            if (bullet.lifeTime <= 0) {
                bullet.destroy();
                this.bullets.splice(i, 1);
            }
        }
    }
    
    takeDamage(amount) {
        if (this.isInvulnerable) return;
        
        this.health -= amount;
        document.getElementById('health').innerText = `Health: ${this.health}%`;
        
        // Make player invulnerable for a short time
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 2.0; // 2 seconds of invulnerability
        
        if (this.health <= 0) {
            this.health = 0;
            // Game over logic would go here
        }
    }
    
    getPosition() {
        if (this.model) {
            return this.model.position.clone();
        }
        return this.tempMesh.position.clone();
    }
    
    setPosition(x, y, z) {
        if (this.model) {
            this.model.position.set(x, y, z);
        }
        this.tempMesh.position.set(x, y, z);
    }
    
    destroy() {
        // Remove from scene
        if (this.model) {
            this.scene.remove(this.model);
        }
        if (this.tempMesh) {
            this.scene.remove(this.tempMesh);
        }
        if (this.hitSphere) {
            this.scene.remove(this.hitSphere);
        }
        
        // Clean up bullets
        for (const bullet of this.bullets) {
            bullet.destroy();
        }
        this.bullets = [];
    }
} 