import { THREE, GLTFLoader } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { random, randomInt, enhanceMaterial, lerp, smoothStep, easeInOut, smoothOscillate, checkCollision } from '../utilities/Utils.js';
import { Explosion } from './Explosion.js';

// Remove direct import and use path string instead
// import asteroidModel from '../../../assets/models/asteroid.glb';

// Add movement pattern types at the top of the file after imports
const MOVEMENT_PATTERNS = {
    STRAIGHT: 'straight',
    SINE_WAVE: 'sine_wave',
    SMOOTH_WAVE: 'smooth_wave', // New smoother wave pattern
    ZIGZAG: 'zigzag',
    SPIRAL: 'spiral',
    BOUNCE: 'bounce',
    ORBIT: 'orbit' // New pattern that creates an orbital movement
};

export class Asteroid {
    constructor(scene, position = null) {
        this.scene = scene;
        this.model = null;
        this.health = 100;
        this.hitSphere = null;
        this.hitSphereVisible = GameConfig.asteroid?.debug?.showHitSpheres || false; // Show hit spheres in debug mode
        this.isDestroyed = false; // Flag to track if asteroid is destroyed
        
        // Create an empty container for the model first
        this.container = new THREE.Object3D();
        
        // Initialize position property as a Vector3
        this.position = new THREE.Vector3();
        
        // Add container to scene
        scene.add(this.container);
        
        // Initialize with default position or reset with provided position
        this.reset(position);
        
        // Create the hit sphere for collision detection
        this.createHitSphere();
        
        // Initialize with empty model - will be loaded in loadModel
        this.loadModel();
    }
    
    /**
     * Reset this asteroid for reuse from object pool
     * @param {THREE.Vector3} position - Optional position to reset to, or null for random position
     */
    reset(position = null) {
        // Reset properties
        const asteroidConfig = GameConfig.asteroid || {};
        const playerConfig = GameConfig.player || {};
        
        this.isDestroyed = false;
        
        // Reset size and health
        this.size = random(
            asteroidConfig.minSize || 50, 
            asteroidConfig.maxSize || 150
        );
        this.health = this.size * 2;
        
        // Reset speed
        this.speed = random(
            asteroidConfig.minSpeed || 100, 
            asteroidConfig.maxSpeed || 200
        );
        
        // Reset rotation speed
        const minRotSpeed = asteroidConfig.minRotationSpeed || 0.01;
        const maxRotSpeed = asteroidConfig.maxRotationSpeed || 0.05;
        this.rotationSpeed = {
            x: random(minRotSpeed, maxRotSpeed),
            y: random(minRotSpeed, maxRotSpeed),
            z: random(minRotSpeed, maxRotSpeed)
        };
        
        // Set position
        if (position) {
            this.container.position.copy(position);
            // Make sure to update our position property
            this.position.copy(position);
        } else {
            // Get window width for spawn position or use GameConfig if available
            const spawnX = GameConfig.asteroid?.spawnX || (window.innerWidth + 100); // Spawn just off-screen to the right
            
            // Set position with Z random but within GameConfig range if available
            const minZ = GameConfig.asteroid?.minSpawnZ || 0;
            const maxZ = GameConfig.asteroid?.maxSpawnZ || 0;
            
            const newPosition = new THREE.Vector3(
                spawnX,
                random(playerConfig.minSpawnY || -70, playerConfig.maxSpawnY || 70),
                random(minZ, maxZ)
            );
            
            this.container.position.copy(newPosition);
            // Make sure to update our position property
            this.position.copy(newPosition);
        }
        
        // Reset visibility if the container was hidden
        this.container.visible = true;
        
        // Reset model scale if model exists
        if (this.model) {
            const scale = (this.size * 5) / 10;
            this.model.scale.set(scale, scale, scale);
        }
        
        // Initialize movement pattern variables 
        this.movementPattern = this.selectRandomPattern();
        this.patternParams = this.initializePatternParams();
        
        // Check if we need to recreate or resize the hit sphere based on new size
        if (this.hitSphere) {
            // If the size changed significantly, recreate the hit sphere
            if (Math.abs(this.hitSphereRadius - this.size/2) > 5) {
                // Remove old hit sphere
                this.container.remove(this.hitSphere);
                if (this.hitSphere.geometry) this.hitSphere.geometry.dispose();
                if (this.hitSphere.material) this.hitSphere.material.dispose();
                
                // Create new hit sphere
                this.createHitSphere();
            } else {
                // Just make sure it's visible if container is visible
                this.hitSphere.visible = this.container.visible && this.hitSphereVisible;
            }
        } else {
            // Create hit sphere if it doesn't exist
            this.createHitSphere();
        }
        
        return this;
    }

    selectRandomPattern() {
        // Consider using a weighted random selection to favor smoother patterns
        const patterns = Object.values(MOVEMENT_PATTERNS);
        const weights = {
            [MOVEMENT_PATTERNS.STRAIGHT]: 1,
            [MOVEMENT_PATTERNS.SINE_WAVE]: 1,
            [MOVEMENT_PATTERNS.SMOOTH_WAVE]: 3, // Higher weight = more common
            [MOVEMENT_PATTERNS.ZIGZAG]: 1,
            [MOVEMENT_PATTERNS.SPIRAL]: 2,
            [MOVEMENT_PATTERNS.BOUNCE]: 1,
            [MOVEMENT_PATTERNS.ORBIT]: 2
        };
        
        // Total weight calculation
        let totalWeight = 0;
        for (const pattern of patterns) {
            totalWeight += weights[pattern];
        }
        
        // Random weighted selection
        let random_num = Math.random() * totalWeight;
        let weight_sum = 0;
        
        for (const pattern of patterns) {
            weight_sum += weights[pattern];
            if (random_num <= weight_sum) {
                return pattern;
            }
        }
        
        // Fallback
        return MOVEMENT_PATTERNS.SMOOTH_WAVE;
    }

    initializePatternParams() {
        const position = this.container.position;
        
        switch (this.movementPattern) {
            case MOVEMENT_PATTERNS.SINE_WAVE:
                return {
                    amplitude: random(30, 50),
                    frequency: random(0.001, 0.003),
                    initialY: position.y,
                    time: 0 // Keep track of time for continuous movement
                };
                
            case MOVEMENT_PATTERNS.SMOOTH_WAVE:
                return {
                    amplitude: random(30, 60),
                    period: random(2, 5), // seconds for a complete cycle
                    initialY: position.y,
                    time: random(0, 10) // Random starting time for variety
                };
                
            case MOVEMENT_PATTERNS.ZIGZAG:
                return {
                    amplitude: random(40, 60),
                    direction: 1,
                    switchInterval: random(1.5, 3.0), // Longer intervals for smoother turns
                    timeSinceSwitch: 0,
                    initialY: position.y,
                    targetY: position.y, // Target position for smooth transitions
                    transitionProgress: 0 // For smooth easing
                };
                
            case MOVEMENT_PATTERNS.SPIRAL:
                return {
                    radius: random(20, 40),
                    angle: 0,
                    speed: random(1, 2), // Slower for smoother movement
                    initialY: position.y,
                    time: 0
                };
                
            case MOVEMENT_PATTERNS.BOUNCE:
                return {
                    velocity: random(40, 80), // Slower for smoother appearance
                    maxY: window.innerHeight / 2 - 60,
                    minY: -window.innerHeight / 2 + 60,
                    initialY: position.y,
                    bounceEasing: 0.3, // Controls how quickly velocity changes at boundaries
                    currentVelocity: random(40, 80) * (Math.random() > 0.5 ? 1 : -1)
                };
                
            case MOVEMENT_PATTERNS.ORBIT:
                return {
                    centerX: position.x - random(100, 200), // Center point ahead of the asteroid
                    centerY: position.y + random(-50, 50),
                    radiusX: random(50, 120),
                    radiusY: random(30, 80),
                    speed: random(0.3, 0.8),
                    angle: random(0, Math.PI * 2), // Random starting angle
                    time: 0
                };
                
            default: // STRAIGHT
                return {
                    initialY: position.y,
                    initialZ: position.z,
                    yVariation: random(0, 10), // Small random Y variation for interest
                    time: 0
                };
        }
    }

    loadModel() {
        const loader = new GLTFLoader();
        console.log('Attempting to load asteroid model from: assets/models/asteroid.glb');
        
        // Try to load the model, but continue with placeholder if missing
        loader.load(
            // Use path string instead of import
            'assets/models/asteroid.glb',
            (gltf) => {
                // Check if asteroid is destroyed or container doesn't exist
                if (this.isDestroyed || !this.container) {
                    console.warn('Cannot add asteroid model: asteroid is destroyed or container is null');
                    return;
                }
                
                console.log('Asteroid model loaded successfully');
                
                // Add the loaded model
                this.model = gltf.scene;
                
                // Add the model to the container instead of directly to the scene
                this.container.add(this.model);
                
                // Reset model position relative to container
                this.model.position.set(0, 0, 0);
                
                // Scale based on size
                const scale = (this.size * 5) / 10;
                this.model.scale.set(scale, scale, scale);
                
                // Remove any previous model from the scene
                this.scene.remove(this.model);
                
                // Traverse the model to enable shadows and set materials
                this.model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance materials without washing out colors
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (!mat) return;
                                
                                // Preserve original color while enhancing vibrancy
                                const hsl = {};
                                mat.color.getHSL(hsl);
                                mat.color.setHSL(
                                    hsl.h,                    // Keep original hue
                                    Math.min(hsl.s * GameConfig.asteroid.aesthetics.saturationMultiplier, 1), // Boost saturation
                                    Math.min(hsl.l * GameConfig.asteroid.aesthetics.lightnessMultiplier, 1)  // Slight lightness boost
                                );
                                
                                // Add slight emissive for better visibility in space
                                mat.emissive = new THREE.Color(hsl.h, 
                                    GameConfig.asteroid.aesthetics.emissiveColor.s, 
                                    GameConfig.asteroid.aesthetics.emissiveColor.l);
                                mat.emissiveIntensity = GameConfig.asteroid.aesthetics.emissiveIntensity;
                                
                                // Enhance material properties for realistic rock appearance
                                if (mat.type.includes('MeshStandard')) {
                                    mat.metalness = GameConfig.asteroid.aesthetics.standardMaterial.metalness;
                                    mat.roughness = GameConfig.asteroid.aesthetics.standardMaterial.roughness;
                                } else {
                                    mat.shininess = GameConfig.asteroid.aesthetics.phongMaterial.shininess;
                                }
                                
                                // Apply global material enhancements
                                enhanceMaterial(mat, GameConfig);
                            });
                        } else if (child.material) {
                            // Single material handling would go here
                        }
                    }
                });
            },
            undefined,
            (error) => {
                console.error('An error occurred while loading the asteroid model:', error);
                
                // Create a simple placeholder if the container is still valid
                if (this.container && !this.isDestroyed) {
                    this.createPlaceholderModel();
                }
            }
        );
    }
    
    // Create a simple placeholder model when the main model fails to load
    createPlaceholderModel() {
        // Create a simple geometry for the placeholder
        const geometry = new THREE.SphereGeometry(this.size, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa,
            wireframe: true
        });
        
        const placeholderMesh = new THREE.Mesh(geometry, material);
        this.container.add(placeholderMesh);
    }
    
    update(deltaTime) {
        // Skip update if destroyed
        if (this.isDestroyed) return true;
        
        // Base movement from right to left
        this.container.position.x -= this.speed * deltaTime;

        // Update pattern time trackers
        if (this.patternParams.time !== undefined) {
            this.patternParams.time += deltaTime;
        }

        // Apply pattern-specific movement
        switch (this.movementPattern) {
            case MOVEMENT_PATTERNS.SINE_WAVE:
                this.patternParams.time += deltaTime;
                this.container.position.y = this.patternParams.initialY + 
                    Math.sin(this.patternParams.time * this.patternParams.frequency) * 
                    this.patternParams.amplitude;
                break;
                
            case MOVEMENT_PATTERNS.SMOOTH_WAVE:
                this.patternParams.time += deltaTime;
                this.container.position.y = this.patternParams.initialY + 
                    smoothOscillate(this.patternParams.time, this.patternParams.frequency) * 
                    this.patternParams.amplitude;
                break;
                
            case MOVEMENT_PATTERNS.ZIGZAG:
                // Update zigzag timer
                this.patternParams.currentTime += deltaTime;
                
                // Check if it's time to change direction
                if (this.patternParams.currentTime >= this.patternParams.directionChangeInterval) {
                    this.patternParams.currentTime = 0;
                    this.patternParams.direction *= -1; // Reverse direction
                }
                
                // Move in current direction
                this.container.position.y += this.patternParams.speed * this.patternParams.direction * deltaTime;
                
                // Constrain to bounds
                const maxY = this.patternParams.initialY + this.patternParams.amplitude;
                const minY = this.patternParams.initialY - this.patternParams.amplitude;
                
                if (this.container.position.y > maxY) {
                    this.container.position.y = maxY;
                    this.patternParams.direction = -1;
                } else if (this.container.position.y < minY) {
                    this.container.position.y = minY;
                    this.patternParams.direction = 1;
                }
                break;
                
            case MOVEMENT_PATTERNS.SPIRAL:
                this.patternParams.angle += deltaTime * this.patternParams.rotationSpeed;
                
                // Calculate spiral position
                const radius = this.patternParams.initialRadius - (this.patternParams.initialRadius * this.patternParams.contractionRate * this.patternParams.time);
                const spiralX = this.patternParams.initialX - this.speed * deltaTime * 0.5; // Continue moving left, but slower
                const spiralY = this.patternParams.initialY + Math.sin(this.patternParams.angle) * radius;
                const spiralZ = this.patternParams.initialZ + Math.cos(this.patternParams.angle) * radius;
                
                this.container.position.set(spiralX, spiralY, spiralZ);
                break;
                
            case MOVEMENT_PATTERNS.ORBIT:
                this.patternParams.time += deltaTime;
                
                // Calculate orbit position
                const orbitRadius = this.patternParams.radius;
                const orbitSpeed = this.patternParams.orbitSpeed;
                const orbitCenterX = this.patternParams.centerX - this.speed * deltaTime; // Center moves left
                
                this.container.position.x = orbitCenterX + Math.cos(this.patternParams.time * orbitSpeed) * orbitRadius * 0.3;
                this.container.position.y = this.patternParams.centerY + Math.sin(this.patternParams.time * orbitSpeed) * orbitRadius;
                break;
                
            case MOVEMENT_PATTERNS.BOUNCE:
                // Update vertical position
                this.container.position.y += this.patternParams.verticalSpeed * deltaTime;
                
                // Check if we need to bounce
                if (this.container.position.y > this.patternParams.upperBound) {
                    this.container.position.y = this.patternParams.upperBound;
                    this.patternParams.verticalSpeed *= -1; // Reverse direction
                } else if (this.container.position.y < this.patternParams.lowerBound) {
                    this.container.position.y = this.patternParams.lowerBound;
                    this.patternParams.verticalSpeed *= -1; // Reverse direction
                }
                break;
                
            // Default straight movement is already handled with the base movement
        }
        
        // Rotate the asteroid
        if (this.model) {
            this.model.rotation.x += this.rotationSpeed.x * deltaTime;
            this.model.rotation.y += this.rotationSpeed.y * deltaTime;
            this.model.rotation.z += this.rotationSpeed.z * deltaTime;
        }
        
        // Update hit sphere position to match container
        if (this.hitSphere) {
            this.hitSphere.position.copy(this.container.position);
            
            // Scale hit sphere based on asteroid size
            const scale = this.size / 100; // Normalize size to a reasonable scale
            this.hitSphere.scale.set(scale, scale, scale);
        }
        
        // Sync our position property with the container position
        this.position.copy(this.container.position);
        
        // Return true if the asteroid has moved off-screen and should be removed
        return this.container.position.x < -1000;
    }
    
    // This method is called by external entities to request damage to be applied
    receiveDamage(amount) {
        // Apply damage internally and return whether the asteroid was destroyed
        return this.takeDamage(amount);
    }
    
    // Private method to handle damage internally
    takeDamage(amount) {
        this.health -= amount;
        
        // Return true if the asteroid is destroyed
        return this.health <= 0;
    }
    
    explode(impactPoint = null) {
        // Mark as destroyed immediately to prevent further collisions
        this.isDestroyed = true;
        
        try {
            // Create an explosion using the explosion.glb model
            // Make explosion size directly proportional to asteroid size
            // for more visual impact, using a multiplier of 0.3
            const explosionSize = this.size * 0.3;
            
            // Add slight random variation (±15%) to explosion size for visual interest
            const sizeVariation = 1 + (Math.random() * 0.3 - 0.15);
            const finalSize = explosionSize * sizeVariation;
            
            // Use the impact point if provided, otherwise use asteroid center
            const explosionPosition = impactPoint || this.container.position.clone();
            
            // Create the main explosion
            new Explosion(this.scene, explosionPosition, finalSize);
            
            // For larger asteroids, create additional smaller explosions immediately
            if (this.size > 30) {
                const fragmentCount = Math.floor(Math.random() * 3) + 1; // 1-3 additional explosions
                
                for (let i = 0; i < fragmentCount; i++) {
                    // Create random offset from main explosion
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * this.size * 0.8,
                        (Math.random() - 0.5) * this.size * 0.8,
                        (Math.random() - 0.5) * this.size * 0.4
                    );
                    
                    // Calculate fragment position
                    const fragmentPosition = explosionPosition.clone().add(offset);
                    
                    // Secondary explosions are smaller
                    const fragmentSize = finalSize * (0.3 + Math.random() * 0.4);
                    
                    // Create fragment explosions immediately
                    new Explosion(this.scene, fragmentPosition, fragmentSize);
                }
            }
        } catch (error) {
            console.error('Failed to create explosion for asteroid:', error);
        }
        
        // Remove the asteroid
        this.scene.remove(this.container);
    }
    
    getPosition() {
        return this.container.position.clone();
    }
    
    setPosition(x, y, z) {
        this.container.position.set(x, y, z);
    }
    
    destroy() {
        if (this.isDestroyed) return; // Already destroyed
        
        // If destroy is called directly (not via object pooling),
        // mark as destroyed and completely remove from scene
        this.isDestroyed = true;
        
        if (this.container) {
            this.scene.remove(this.container);
            
            // Dispose of all geometries and materials
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
            
            // Dispose hit sphere if it exists
            if (this.hitSphere) {
                if (this.hitSphere.geometry) this.hitSphere.geometry.dispose();
                if (this.hitSphere.material) this.hitSphere.material.dispose();
                this.hitSphere = null;
            }
            
            this.container = null;
        }
    }

    // Create a sphere for collision detection
    createHitSphere() {
        const hitSphereRadius = this.size / 2; // this
        
        // Create geometry for the hit sphere
        const hitSphereGeometry = new THREE.SphereGeometry(hitSphereRadius, 16, 12);
        
        // Create material - transparent if not in debug mode
        const hitSphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: this.hitSphereVisible ? 0.3 : 0, // Visible in debug mode
            wireframe: this.hitSphereVisible // Wireframe in debug mode
        });
        
        // Create mesh
        this.hitSphere = new THREE.Mesh(hitSphereGeometry, hitSphereMaterial);
        
        // Center the hit sphere
        this.hitSphere.position.set(0, 0, 0);
        
        // Add to container
        this.container.add(this.hitSphere);
        
        // Store the hit sphere radius for collision detection
        this.hitSphereRadius = hitSphereRadius;
        
        console.log(`Created hit sphere with radius ${this.hitSphereRadius} for asteroid (size ${this.size})`);
    }
    
    // Get the world position of the hit sphere for collision detection
    getHitSphereWorldPosition() {
        // Create a vector to store the result
        const worldPosition = new THREE.Vector3();
        
        // Get the world position by combining the container and hitSphere positions
        if (this.hitSphere) {
            // This gets the absolute world position
            this.hitSphere.getWorldPosition(worldPosition);
        } else {
            // Fallback to container position
            worldPosition.copy(this.container.position);
        }
        
        return worldPosition;
    }
    
    // Check if this asteroid collides with another object
    checkCollision(objectPosition, objectRadius) {
        // Don't check collisions for destroyed asteroids
        if (this.isDestroyed || !this.container) return false;
        
        // If hit sphere isn't created yet, use a basic distance check with container position
        if (!this.hitSphere) {
            return false;
        }
        
        // Create a simple object with position and radius for the other object
        const otherObject = {
            position: objectPosition,
            radius: objectRadius
        };
        
        // Use the utility function for collision detection
        const isColliding = checkCollision(this, otherObject);
        
        // For debugging
        if (GameConfig.asteroid?.debug?.logCollisions) {
            console.log(
                `Collision check: result=${isColliding}`
            );
        }
        
        // If the hit sphere is visible, color it red when a collision is detected
        if (this.hitSphereVisible && this.hitSphere && this.hitSphere.material) {
            // Change color based on collision state
            if (isColliding) {
                this.hitSphere.material.color.set(0xff0000); // Red when colliding
            } else {
                this.hitSphere.material.color.set(0x00ff00); // Green when not colliding
            }
        }
        
        return isColliding;
    }

    /**
     * Check if hit sphere is visible
     * @returns {boolean} True if hit sphere is visible
     */
    isHitSphereVisible() {
        return this.hitSphereVisible;
    }

    /**
     * Set hit sphere visibility
     * @param {boolean} isVisible - Whether the hit sphere should be visible
     */
    setHitSphereVisible(isVisible) {
        this.hitSphereVisible = isVisible;
        
        if (this.hitSphere && this.hitSphere.material) {
            this.hitSphere.material.opacity = isVisible ? 0.3 : 0;
            this.hitSphere.material.wireframe = isVisible;
            // Only show the hit sphere if both hitSphereVisible is true AND the container is visible
            this.hitSphere.visible = isVisible && this.container.visible;
        }
        
        return this;
    }

    /**
     * Prepare the asteroid for returning to the object pool
     * Keep meshes/geometries in memory but remove from scene/parent
     */
    prepareForPooling() {
        // Mark as destroyed but don't destroy geometry
        this.isDestroyed = true;
        
        // Hide the container instead of removing it from scene
        if (this.container) {
            this.container.visible = false;
            
            // Also hide the hit sphere explicitly
            if (this.hitSphere) {
                this.hitSphere.visible = false;
            }
            
            // Move far off-screen as an extra precaution
            this.container.position.set(-10000, -10000, -10000);
        }
    }
} 