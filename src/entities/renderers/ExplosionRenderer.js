import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from '../../utilities/EntityRenderer.js';
import { GLTFLoader } from '../../utilities/ThreeImports.js';

/**
 * Renderer for explosion effects
 */
export class ExplosionRenderer extends EntityRenderer {
    // Static model cache to avoid reloading for each explosion
    static modelCache = null;
    static modelLoading = false;
    static modelCallbacks = [];
    
    constructor(scene, position, size = 1) {
        super(scene);
        this.position = position.clone();
        this.size = size;
        this.lifetime = GameConfig.explosion?.lifetime || 1.5;
        this.animationMixer = null;
        this.animationActions = [];
        this.explosionLight = null;
        this.particles = null;
        
        // Set initial model container position
        if (this.position) {
            this.updateTransform(this.position);
        }
        
        // Create particles first for immediate visual feedback
        this._createParticleExplosion();
        
        // Then try to load the model (will supplement the particles)
        this._initializeModel();
    }

    /**
     * Initialize the explosion model
     * @private
     */
    _initializeModel() {
        // If model is already cached, use it immediately
        if (ExplosionRenderer.modelCache) {
            this._setupModel(ExplosionRenderer.modelCache);
            return;
        }
        
        // If model is loading, add to callbacks
        if (ExplosionRenderer.modelLoading) {
            ExplosionRenderer.modelCallbacks.push((model) => {
                this._setupModel(model);
            });
            return;
        }
        
        // Start loading model
        this._loadModel();
    }

    /**
     * Load the explosion model
     * @private
     */
    _loadModel() {
        // Check that config has the model path
        if (!GameConfig.explosion?.model?.path) {
            throw new Error('Explosion model path not specified in GameConfig');
        }

        // Start loading indicator
        ExplosionRenderer.modelLoading = true;
        
        // Create model loader
        const loader = new GLTFLoader();
        loader.load(
            GameConfig.explosion.model.path,
            (gltf) => {
                // Store in static cache
                ExplosionRenderer.modelCache = gltf;
                ExplosionRenderer.modelLoading = false;
                
                // Set up this instance
                this._setupModel(gltf);
                
                // Process any callbacks waiting for the model
                if (ExplosionRenderer.modelCallbacks && ExplosionRenderer.modelCallbacks.length > 0) {
                    ExplosionRenderer.modelCallbacks.forEach(callback => callback(gltf));
                    ExplosionRenderer.modelCallbacks = [];
                }
            },
            (xhr) => {
                // Progress callback
                console.log('Explosion model loading progress: ' + (xhr.loaded / xhr.total * 100) + '%');
            },
            (error) => {
                // Error callback
                console.error('Error loading explosion model:', error);
                ExplosionRenderer.modelLoading = false;
                throw new Error(`Failed to load explosion model: ${error.message}`);
            }
        );
    }

    /**
     * Set up the explosion model
     * @param {Object} gltf - The loaded GLTF model
     * @private
     */
    _setupModel(gltf) {
        if (!this.scene) return; // Avoid setup if already destroyed
        
        // Clone the model
        this.model = gltf.scene.clone();
        
        // Scale according to explosion size
        this.model.scale.set(this.size, this.size, this.size);
        
        // Position at explosion center
        this.model.position.copy(this.position);
        
        // Create animation mixer
        this.animationMixer = new THREE.AnimationMixer(this.model);
        
        // Clone animations
        if (gltf.animations && gltf.animations.length > 0) {
            gltf.animations.forEach(animation => {
                const action = this.animationMixer.clipAction(animation);
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                this.animationActions.push(action);
            });
        }
        
        // Add to scene
        this.scene.add(this.model);
        
        // Create explosion light
        this._createExplosionLight();
    }

    /**
     * Create a particle-based explosion
     * @private
     */
    _createParticleExplosion() {
        // Group for all particle effects
        this.particles = new THREE.Group();
        this.particles.position.copy(this.position);
        this.scene.add(this.particles);
        this.effectMeshes.push(this.particles);
        
        // 1. Create flash
        this._createFlash();
        
        // 2. Create particle burst
        this._createParticleBurst();
        
        // 3. Create smoke particles
        this._createSmokeParticles();
        
        // 4. Create explosion light
        this._createExplosionLight();
    }

    /**
     * Create initial flash effect
     * @private
     */
    _createFlash() {
        const flashGeometry = new THREE.SphereGeometry(this.size * 5, 16, 16);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff99,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.userData.isFlash = true;
        flash.userData.flashLifetime = 0.15; // Quick flash duration
        
        this.particles.add(flash);
    }

    /**
     * Create particle burst
     * @private
     */
    _createParticleBurst() {
        const particleCount = Math.floor(50 * this.size); // Scale with explosion size
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        
        // Define palette for particles
        const colors = [
            new THREE.Color(0xff9933), // Orange
            new THREE.Color(0xff5500), // Deep orange
            new THREE.Color(0xff0000), // Red
            new THREE.Color(0xffff00)  // Yellow
        ];
        
        // Initialize particles at center with random velocities
        for (let i = 0; i < particleCount; i++) {
            // Random slight offset from center
            const offsetX = (Math.random() - 0.5) * 0.5;
            const offsetY = (Math.random() - 0.5) * 0.5;
            const offsetZ = (Math.random() - 0.5) * 0.5;
            
            // Ensure values are valid numbers (not NaN or Infinity)
            particlePositions[i * 3] = isNaN(offsetX) ? 0 : offsetX;
            particlePositions[i * 3 + 1] = isNaN(offsetY) ? 0 : offsetY;
            particlePositions[i * 3 + 2] = isNaN(offsetZ) ? 0 : offsetZ;
            
            // Random velocity outward
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20 * this.size,
                (Math.random() - 0.5) * 20 * this.size,
                (Math.random() - 0.5) * 20 * this.size
            );
            
            // Store velocity in userData for updates
            const index = i * 3;
            
            // Random color from palette
            const color = colors[Math.floor(Math.random() * colors.length)];
            particleColors[index] = color.r;
            particleColors[index + 1] = color.g;
            particleColors[index + 2] = color.b;
            
            // Create and track particle
            const particle = {
                index,
                velocity,
                drag: 0.96 + Math.random() * 0.02 // Slight random drag
            };
            
            if (!this.particles.userData.particleData) {
                this.particles.userData.particleData = [];
            }
            this.particles.userData.particleData.push(particle);
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // Explicitly compute bounding sphere to avoid NaN errors
        try {
            particleGeometry.computeBoundingSphere();
            
            // Double-check the bounding sphere is valid
            if (isNaN(particleGeometry.boundingSphere.radius)) {
                console.warn("Computed bounding sphere has NaN radius, setting default");
                particleGeometry.boundingSphere.radius = this.size * 20;
                particleGeometry.boundingSphere.center.set(0, 0, 0);
            }
        } catch (e) {
            console.warn("Error computing bounding sphere:", e);
            // Set a default bounding sphere
            particleGeometry.boundingSphere = {
                radius: this.size * 20,
                center: new THREE.Vector3(0, 0, 0)
            };
        }
        
        const particleMaterial = new THREE.PointsMaterial({
            size: this.size * 3,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.particles.add(particleSystem);
    }

    /**
     * Create smoke particles
     * @private
     */
    _createSmokeParticles() {
        const smokeCount = Math.floor(20 * this.size);
        const smokeGeometry = new THREE.BufferGeometry();
        const smokePositions = new Float32Array(smokeCount * 3);
        
        // Initialize smoke particles at center
        for (let i = 0; i < smokeCount; i++) {
            // Random slight offset from center
            const offsetX = (Math.random() - 0.5) * 2;
            const offsetY = (Math.random() - 0.5) * 2;
            const offsetZ = (Math.random() - 0.5) * 2;
            
            smokePositions[i * 3] = offsetX;
            smokePositions[i * 3 + 1] = offsetY;
            smokePositions[i * 3 + 2] = offsetZ;
            
            // Random velocity outward (slower than particles)
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10 * this.size,
                (Math.random() - 0.5) * 10 * this.size + (5 * this.size), // Bias upward
                (Math.random() - 0.5) * 10 * this.size
            );
            
            // Store smoke data
            const index = i * 3;
            
            // Create and track smoke particle
            const smoke = {
                index,
                velocity,
                drag: 0.98 + Math.random() * 0.01, // More drag for smoke
                scale: 1 + Math.random() * 0.5
            };
            
            if (!this.particles.userData.smokeData) {
                this.particles.userData.smokeData = [];
            }
            this.particles.userData.smokeData.push(smoke);
        }
        
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
        
        const smokeMaterial = new THREE.PointsMaterial({
            color: 0x888888,
            size: this.size * 10,
            transparent: true,
            opacity: 0.3,
            blending: THREE.NormalBlending
        });
        
        const smokeSystem = new THREE.Points(smokeGeometry, smokeMaterial);
        this.particles.add(smokeSystem);
    }

    /**
     * Create a light for the explosion
     * @private
     */
    _createExplosionLight() {
        // Use either config or default colors
        const colors = GameConfig.explosion?.colors || [0xff9900, 0xff5500, 0xff0000];
        const lightColor = colors[Math.floor(Math.random() * colors.length)];
        
        this.explosionLight = new THREE.PointLight(lightColor, 2, this.size * 50);
        this.explosionLight.position.copy(this.position);
        this.explosionLight.castShadow = GameConfig.rendering?.shadows?.enabled || false;
        
        this.scene.add(this.explosionLight);
        this.effectMeshes.push(this.explosionLight);
    }

    /**
     * Update the particle effects
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    _updateParticles(deltaTime) {
        if (!this.particles) return false;
        
        // Update flash
        const flashParticle = this.particles.children.find(child => child.userData.isFlash);
        if (flashParticle) {
            flashParticle.userData.flashLifetime -= deltaTime;
            if (flashParticle.userData.flashLifetime <= 0) {
                flashParticle.scale.set(0, 0, 0); // Hide it
            } else {
                // Quickly expand and fade the flash
                const flashProgress = 1 - (flashParticle.userData.flashLifetime / 0.15);
                flashParticle.scale.set(
                    1 + flashProgress * 2,
                    1 + flashProgress * 2,
                    1 + flashProgress * 2
                );
                flashParticle.material.opacity = 0.9 * (1 - flashProgress);
            }
        }
        
        // Update particle system
        const particleSystem = this.particles.children.find(child => child instanceof THREE.Points && child !== (this.particles.children.find(c => c.userData.isSmoke)));
        if (particleSystem && this.particles.userData.particleData) {
            const positions = particleSystem.geometry.attributes.position.array;
            
            // Update each particle
            this.particles.userData.particleData.forEach(particle => {
                const i = particle.index;
                
                // Calculate new position values
                const newX = positions[i] + particle.velocity.x * deltaTime;
                const newY = positions[i + 1] + particle.velocity.y * deltaTime;
                const newZ = positions[i + 2] + particle.velocity.z * deltaTime;
                
                // Validate values before assignment to prevent NaN
                positions[i] = isNaN(newX) ? positions[i] : newX;
                positions[i + 1] = isNaN(newY) ? positions[i + 1] : newY;
                positions[i + 2] = isNaN(newZ) ? positions[i + 2] : newZ;
                
                // Apply drag to velocity
                particle.velocity.multiplyScalar(particle.drag);
                
                // Add gravity effect (with validation)
                const gravity = 9.8 * deltaTime * 0.5;
                if (!isNaN(gravity)) {
                    particle.velocity.y -= gravity;
                }
            });
            
            // Mark positions for update
            particleSystem.geometry.attributes.position.needsUpdate = true;
            
            // Fade out particles over time
            particleSystem.material.opacity -= deltaTime * 0.5;
            if (particleSystem.material.opacity <= 0) {
                particleSystem.material.opacity = 0;
            }
        }
        
        // Update smoke system
        const smokeSystem = this.particles.children.find(child => child instanceof THREE.Points && child.userData.isSmoke);
        if (smokeSystem && this.particles.userData.smokeData) {
            const positions = smokeSystem.geometry.attributes.position.array;
            
            // Update each smoke particle
            this.particles.userData.smokeData.forEach(smoke => {
                const i = smoke.index;
                
                // Calculate new position values
                const newX = positions[i] + smoke.velocity.x * deltaTime;
                const newY = positions[i + 1] + smoke.velocity.y * deltaTime;
                const newZ = positions[i + 2] + smoke.velocity.z * deltaTime;
                
                // Validate values before assignment
                positions[i] = isNaN(newX) ? positions[i] : newX;
                positions[i + 1] = isNaN(newY) ? positions[i + 1] : newY;
                positions[i + 2] = isNaN(newZ) ? positions[i + 2] : newZ;
                
                // Apply drag to velocity
                smoke.velocity.multiplyScalar(smoke.drag);
            });
            
            // Mark positions for update
            smokeSystem.geometry.attributes.position.needsUpdate = true;
            
            // Increase smoke size over time
            smokeSystem.material.size += deltaTime * 5 * this.size;
            
            // Fade out smoke slower than particles
            smokeSystem.material.opacity -= deltaTime * 0.3;
            if (smokeSystem.material.opacity <= 0) {
                smokeSystem.material.opacity = 0;
            }
        }
        
        return true;
    }

    /**
     * Update the explosion light
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    _updateLight(deltaTime) {
        if (!this.explosionLight) return;
        
        // Calculate lifetime progress (0 to 1)
        const progress = 1 - (this.lifetime / (GameConfig.explosion?.lifetime || 1.5));
        
        // Fade out light intensity
        const initialIntensity = 2;
        const targetIntensity = 0;
        this.explosionLight.intensity = initialIntensity * (1 - progress) + targetIntensity * progress;
        
        // Increase light radius as explosion expands
        const initialRadius = this.size * 20;
        const targetRadius = this.size * 50;
        this.explosionLight.distance = initialRadius * (1 - progress) + targetRadius * progress;
    }

    /**
     * Update the explosion
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} - True if explosion is still active, false if complete
     */
    update(deltaTime) {
        // Update lifetime
        this.lifetime -= deltaTime;
        
        // Update animation mixer if it exists
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
        
        // Update particles
        this._updateParticles(deltaTime);
        
        // Update light
        this._updateLight(deltaTime);
        
        // Return whether explosion is still active
        return this.lifetime > 0;
    }

    /**
     * Clean up resources
     */
    dispose() {
        // Clean up animation mixer
        if (this.animationMixer) {
            this.animationMixer = null;
        }
        
        // Clean up animation actions
        this.animationActions = [];
        
        // Call parent class dispose
        super.dispose();
    }

    /**
     * Static method to preload explosion model
     */
    static preloadModel() {
        if (ExplosionRenderer.modelCache || ExplosionRenderer.modelLoading) return;
        
        // Check that config has the model path
        if (!GameConfig.explosion?.model?.path) {
            throw new Error('Explosion model path not specified in GameConfig');
        }
        
        const loader = new GLTFLoader();
        ExplosionRenderer.modelLoading = true;
        
        loader.load(
            GameConfig.explosion.model.path,
            (gltf) => {
                console.log('Explosion model preloaded');
                ExplosionRenderer.modelCache = gltf;
                ExplosionRenderer.modelLoading = false;
                
                // Process any callbacks waiting for the model
                if (ExplosionRenderer.modelCallbacks.length > 0) {
                    ExplosionRenderer.modelCallbacks.forEach(callback => callback(gltf));
                    ExplosionRenderer.modelCallbacks = [];
                }
            },
            (xhr) => {
                console.log('Explosion model preloading progress: ' + (xhr.loaded / xhr.total * 100) + '%');
            },
            (error) => {
                console.error('Error preloading explosion model:', error);
                ExplosionRenderer.modelLoading = false;
                throw new Error(`Failed to preload explosion model: ${error.message}`);
            }
        );
    }
} 