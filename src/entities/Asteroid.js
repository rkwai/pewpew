import { THREE, GLTFLoader } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { random, randomInt, enhanceMaterial, lerp, smoothStep, easeInOut, smoothOscillate } from '../utilities/Utils.js';
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
        
        // Add default values in case GameConfig.asteroid is undefined
        const asteroidConfig = GameConfig.asteroid || {};
        this.size = random(
            asteroidConfig.minSize || 30, 
            asteroidConfig.maxSize || 80
        );
        this.speed = random(
            asteroidConfig.minSpeed || 100, 
            asteroidConfig.maxSpeed || 200
        );
        
        const minRotSpeed = asteroidConfig.minRotationSpeed || 0.01;
        const maxRotSpeed = asteroidConfig.maxRotationSpeed || 0.05;
        this.rotationSpeed = {
            x: random(minRotSpeed, maxRotSpeed),
            y: random(minRotSpeed, maxRotSpeed),
            z: random(minRotSpeed, maxRotSpeed)
        };

        // Create an empty container for the model first
        this.container = new THREE.Object3D();
        
        // Set position
        if (position) {
            this.container.position.copy(position);
        } else {
            // Get window width for spawn position
            const windowWidth = window.innerWidth;
            const spawnX = windowWidth + 100; // Spawn just off-screen to the right
            
            // Check if spawnDepth exists, provide defaults if not
            const spawnDepth = (asteroidConfig.spawnDepth || { min: -100, max: 100 });
            
            this.container.position.set(
                spawnX,
                random(-70, 70),
                random(spawnDepth.min, spawnDepth.max)
            );
            
            console.log('Asteroid spawned at:', this.container.position);
        }

        // Initialize movement pattern variables after container is created
        this.movementPattern = this.selectRandomPattern();
        this.patternParams = this.initializePatternParams();
        
        // Create the hit sphere for collision detection
        this.createHitSphere();

        scene.add(this.container);
        this.loadModel();
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
                    initialZ: position.z,
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
        const position = this.getPosition();
        
        // Base movement from right to left
        position.x -= this.speed * deltaTime;

        // Update pattern time trackers
        if (this.patternParams.time !== undefined) {
            this.patternParams.time += deltaTime;
        }

        // Apply pattern-specific movement
        switch (this.movementPattern) {
            case MOVEMENT_PATTERNS.SINE_WAVE:
                this.patternParams.time += deltaTime;
                position.y = this.patternParams.initialY + 
                    Math.sin(position.x * this.patternParams.frequency) * 
                    this.patternParams.amplitude;
                break;

            case MOVEMENT_PATTERNS.SMOOTH_WAVE:
                // Use smoothOscillate for more natural wave motion
                position.y = this.patternParams.initialY + 
                    smoothOscillate(this.patternParams.time, this.patternParams.period) * 
                    this.patternParams.amplitude;
                break;

            case MOVEMENT_PATTERNS.ZIGZAG:
                this.patternParams.timeSinceSwitch += deltaTime;
                
                // Set new target when direction changes
                if (this.patternParams.timeSinceSwitch >= this.patternParams.switchInterval) {
                    this.patternParams.direction *= -1;
                    this.patternParams.timeSinceSwitch = 0;
                    this.patternParams.transitionProgress = 0;
                    
                    // Set new target Y position
                    const targetOffset = this.patternParams.amplitude * this.patternParams.direction;
                    this.patternParams.targetY = this.patternParams.initialY + targetOffset;
                }
                
                // Smooth transition between directions using easing
                this.patternParams.transitionProgress += deltaTime / this.patternParams.switchInterval;
                const easeFactor = easeInOut(this.patternParams.transitionProgress);
                
                // Interpolate toward target position
                position.y = lerp(position.y, this.patternParams.targetY, easeFactor * deltaTime * 2);
                break;

            case MOVEMENT_PATTERNS.SPIRAL:
                // Create a spiraling motion with smooth transitions
                this.patternParams.angle += deltaTime * this.patternParams.speed;
                
                // Use smoother sine and cosine for spiral movement
                position.y = this.patternParams.initialY + 
                    Math.sin(this.patternParams.angle) * this.patternParams.radius;
                position.z = this.patternParams.initialZ + 
                    Math.cos(this.patternParams.angle) * this.patternParams.radius;
                break;

            case MOVEMENT_PATTERNS.BOUNCE:
                // Apply current velocity
                position.y += this.patternParams.currentVelocity * deltaTime;
                
                // Check boundaries with smooth bounce transitions
                if (position.y > this.patternParams.maxY) {
                    position.y = this.patternParams.maxY;
                    // Gradually reverse direction with easing
                    this.patternParams.currentVelocity = 
                        -Math.abs(this.patternParams.currentVelocity) * 
                        (1 - this.patternParams.bounceEasing);
                } else if (position.y < this.patternParams.minY) {
                    position.y = this.patternParams.minY;
                    // Gradually reverse direction with easing
                    this.patternParams.currentVelocity = 
                        Math.abs(this.patternParams.currentVelocity) * 
                        (1 - this.patternParams.bounceEasing);
                }
                break;
                
            case MOVEMENT_PATTERNS.ORBIT:
                // Orbital movement around a center point
                this.patternParams.angle += deltaTime * this.patternParams.speed;
                
                // Elliptical orbit with constantly updating center
                this.patternParams.centerX -= this.speed * deltaTime; // Center moves with asteroid
                
                position.x = this.patternParams.centerX + 
                    Math.cos(this.patternParams.angle) * this.patternParams.radiusX;
                position.y = this.patternParams.centerY + 
                    Math.sin(this.patternParams.angle) * this.patternParams.radiusY;
                break;

            default: // STRAIGHT with slight variation
                // Add subtle y-axis variation for more natural movement
                position.y = this.patternParams.initialY + 
                    Math.sin(this.patternParams.time * 0.5) * this.patternParams.yVariation;
                position.z = this.patternParams.initialZ;
                break;
        }

        // Update the container position which will move the model with it
        this.container.position.set(position.x, position.y, position.z);
        
        // Rotate asteroid model with smooth rotation speeds
        if (this.model) {
            this.model.rotation.x += this.rotationSpeed.x * deltaTime;
            this.model.rotation.y += this.rotationSpeed.y * deltaTime;
            this.model.rotation.z += this.rotationSpeed.z * deltaTime;
        }
        
        // Check if asteroid has moved out of view
        const despawnDistance = GameConfig.asteroid && GameConfig.asteroid.despawnDistance ? 
            GameConfig.asteroid.despawnDistance : -1400;
            
        return position.x < despawnDistance;
    }
    
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
        // Skip if already destroyed
        if (!this.container || this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Remove from scene
        if (this.scene) {
            this.scene.remove(this.container);
        }
        
        // Clean up resources
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
        }
        
        // Clean up hit sphere
        if (this.hitSphere) {
            if (this.hitSphere.geometry) {
                this.hitSphere.geometry.dispose();
            }
            if (this.hitSphere.material) {
                this.hitSphere.material.dispose();
            }
            this.hitSphere = null;
        }
        
        // Clear references
        this.model = null;
        this.container = null;
    }

    // Create a sphere for collision detection
    createHitSphere() {
        // We'll make the hit sphere slightly larger than the asteroid size
        // to ensure collisions are detected properly
        const hitSphereSize = this.size * 1.2; // 20% larger than the asteroid
        
        // Create geometry for the hit sphere
        const hitSphereGeometry = new THREE.SphereGeometry(hitSphereSize, 16, 12);
        
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
        this.hitSphereRadius = hitSphereSize;
        
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
        
        // Get asteroid's world position
        const asteroidPosition = this.getHitSphereWorldPosition();
        
        // The objectPosition parameter is already a Vector3, no need to get .position
        // Just make sure it's valid before using it
        if (!objectPosition || typeof objectPosition.distanceTo !== 'function') {
            console.warn('Invalid position passed to checkCollision');
            return false;
        }
        
        // Calculate distance
        const distance = asteroidPosition.distanceTo(objectPosition);
        
        // For debugging
        if (GameConfig.asteroid?.debug?.logCollisions) {
            console.log(
                `Collision check: distance=${distance.toFixed(2)}, ` +
                `threshold=${(this.hitSphereRadius + objectRadius).toFixed(2)}, ` +
                `result=${distance < (this.hitSphereRadius + objectRadius)}`
            );
        }
        
        // If the hit sphere is visible, color it red when a collision is detected
        if (this.hitSphereVisible && this.hitSphere && this.hitSphere.material) {
            const isColliding = distance < (this.hitSphereRadius + objectRadius);
            
            // Change color based on collision state
            if (isColliding) {
                this.hitSphere.material.color.set(0xff0000); // Red when colliding
            } else {
                this.hitSphere.material.color.set(0x00ff00); // Green when not colliding
            }
        }
        
        // Check if the distance is less than sum of radii
        return distance < (this.hitSphereRadius + objectRadius);
    }
} 