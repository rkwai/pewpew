import { THREE, GLTFLoader } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Bullet } from './Bullet.js';
import { clamp, enhanceMaterial } from '../utilities/Utils.js';
import { Explosion } from './Explosion.js';

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
        this.hitSphereRadius = GameConfig.player.hitSphereRadius || 15;
        // Use debug setting if available, otherwise use the default visibility
        this.hitSphereVisible = (GameConfig.player.debug && GameConfig.player.debug.showHitSphere) || 
                               GameConfig.player.hitSphereVisible || 
                               false;
        
        // Create a temporary mesh until the model loads
        this.createTempMesh();
        
        // Load the player model
        this.loadModel();
        
        // Initialize health display
        this.updateHealthDisplay();
        
        // Engine effects removed
    }
    
    // Create a temporary mesh until the model loads
    createTempMesh() {
        // Create a temporary mesh while model loads
        const geometry = new THREE.BoxGeometry(30, 10, 50);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x3333ff,
            transparent: true,
            opacity: 0.5
        });
        
        this.tempMesh = new THREE.Mesh(geometry, material);
        this.tempMesh.position.set(-200, 0, 0); // Start on left side
        this.scene.add(this.tempMesh);
        
        // Create hit sphere for collision detection
        this.createHitSphere();
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
            }
        }

        // remove bullets that are destroyed
        this.bullets = this.bullets.filter(bullet => !bullet.isDestroyed);
    }
    
    // This method is called by external entities to request damage to be applied
    receiveDamage(amount, impactPoint = null) {
        if (this.isInvulnerable) return false;
        
        // Apply damage internally
        this.takeDamage(amount, impactPoint);
        return true;
    }
    
    // Private method to handle damage internally
    takeDamage(amount, impactPoint = null) {
        this.health -= amount;
        
        // Ensure health doesn't go below 0
        if (this.health < 0) {
            this.health = 0;
        }
        
        // Update health display
        this.updateHealthDisplay();
        
        // Create explosion effect at the impact point
        if (this.model) {
            try {
                const position = impactPoint || this.getHitSpherePosition();
                
                // Calculate explosion size based on the player's hit sphere and damage amount
                // This creates bigger explosions for larger impacts
                const baseSize = this.hitSphereRadius * 0.15; // Base explosion size from player size
                const damageMultiplier = Math.min(amount / 20, 2); // Scale with damage, capped at 2x
                
                // Add slight random variation for visual interest
                const sizeVariation = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation
                
                // Final explosion size based on player size, damage, and variation
                const explosionSize = baseSize * damageMultiplier * sizeVariation;
                
                new Explosion(this.scene, position, explosionSize);
                
                // For major hits (damage > 30), add a secondary smaller explosion at a random offset
                if (amount > 30) {
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * this.hitSphereRadius * 0.8,
                        (Math.random() - 0.5) * this.hitSphereRadius * 0.8, 
                        (Math.random() - 0.5) * this.hitSphereRadius * 0.8
                    );
                    
                    const secondaryPosition = position.clone().add(offset);
                    const secondarySize = explosionSize * 0.6; // 60% of the main explosion size
                    
                    // Small delay for secondary explosion
                    setTimeout(() => {
                        if (this.scene) { // Check if scene still exists
                            new Explosion(this.scene, secondaryPosition, secondarySize);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Failed to create explosion for player impact:', error);
            }
        }
        
        // Make player invulnerable for a short time
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 2.0; // 2 seconds of invulnerability
        
        // Log on low health
        if (this.health > 0 && this.health <= 30) {
            console.log(`WARNING: Low player health: ${this.health}%`);
        }
        
        // Let the game know when player is dead - health check is in Gameplay.animate()
        if (this.health <= 0) {
            console.log("Player health is zero - death condition triggered");
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
    
    // Update the health display
    updateHealthDisplay() {
        document.getElementById('health').innerText = `Health: ${Math.round(this.health)}%`;
    }
    
    // Update hit sphere visibility
    updateHitSphereVisibility(isVisible) {
        this.hitSphereVisible = isVisible;
        
        if (this.hitSphere && this.hitSphere.material) {
            this.hitSphere.material.opacity = isVisible ? 0.3 : 0;
            this.hitSphere.material.wireframe = isVisible;
        }
    }
} 