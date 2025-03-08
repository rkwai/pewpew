import { THREE, GLTFLoader } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';

export class Explosion {
    // Static model cache to avoid reloading for each explosion
    static modelCache = null;
    static modelLoading = false;
    static modelCallbacks = [];
    
    constructor(scene, position, size = 1) {
        this.scene = scene;
        this.position = position.clone();
        this.size = size;
        this.model = null;
        this.animationMixer = null;
        this.animationActions = [];
        this.lifetime = 1.0; // Default lifetime while waiting for model
        this.isActive = true;
        this.container = new THREE.Object3D();
        this.container.position.copy(this.position);
        this.scene.add(this.container);
        
        // Use cached model or load new one
        this.initializeModel();
        
        // Register with the Gameplay state for updates if available
        try {
            if (window.gameState && Array.isArray(window.gameState.explosions)) {
                window.gameState.explosions.push(this);
            } else {
                // If no global state is available, this explosion will need to be manually updated
                console.debug('No global game state available for explosion registration');
            }
        } catch (e) {
            console.error('Error registering explosion with game state:', e);
        }
    }
    
    initializeModel() {
        // If model is already cached, use it immediately
        if (Explosion.modelCache) {
            this.setupModel(Explosion.modelCache);
            return;
        }
        
        // If model is loading, add to callbacks
        if (Explosion.modelLoading) {
            Explosion.modelCallbacks.push((model) => {
                if (this.isActive && this.container) {
                    this.setupModel(model);
                }
            });
            // Use fallback particles in the meantime
            this.createParticleExplosion();
            return;
        }
        
        // Start loading model
        this.loadModel();
    }
    
    loadModel() {
        Explosion.modelLoading = true;
        const loader = new GLTFLoader();
        console.log('Loading explosion model from: assets/models/explosion.glb');
        
        loader.load(
            'assets/models/explosion.glb',
            (gltf) => {
                // Cache the model for future explosions
                Explosion.modelCache = gltf;
                Explosion.modelLoading = false;
                
                // Setup model for this explosion if still active
                if (this.isActive && this.container) {
                    this.setupModel(gltf);
                }
                
                // Process any callbacks waiting for the model
                Explosion.modelCallbacks.forEach(callback => callback(gltf));
                Explosion.modelCallbacks = [];
            },
            undefined,
            (error) => {
                Explosion.modelLoading = false;
                // Only log as error if the explosion is still active
                if (this.isActive && this.container) {
                    console.error('Error loading explosion model:', error);
                    // Fallback to a simple particle explosion
                    this.createParticleExplosion();
                } else {
                    console.debug('Error loading explosion model, but explosion is no longer active - ignoring');
                }
            }
        );
        
        // Use particles while loading
        this.createParticleExplosion();
    }
    
    setupModel(gltf) {
        // Clone the model to avoid modifying the cached version
        this.model = gltf.scene.clone();
        
        // Scale the explosion based on the provided size
        const scale = this.size;
        this.model.scale.set(scale, scale, scale);
        
        // Add the model to the container
        this.container.add(this.model);
        
        // Set up animation
        if (gltf.animations && gltf.animations.length > 0) {
            this.animationMixer = new THREE.AnimationMixer(this.model);
            
            // Play all animations if there are multiple
            gltf.animations.forEach(animation => {
                const action = this.animationMixer.clipAction(animation);
                action.setLoop(THREE.LoopOnce);
                action.clampWhenFinished = true;
                action.play();
                this.animationActions.push(action);
            });
            
            // Set lifetime based on the longest animation
            const longestAnimation = gltf.animations.reduce(
                (longest, anim) => Math.max(longest, anim.duration), 0
            );
            this.lifetime = longestAnimation;
        } else {
            // If no animations, set a default lifetime
            this.lifetime = 1.0;
            
            // Add emissive material to make it glow
            this.model.traverse(child => {
                if (child.isMesh) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat) this.enhanceMaterial(mat);
                        });
                    } else if (child.material) {
                        this.enhanceMaterial(child.material);
                    }
                }
            });
        }
    }
    
    enhanceMaterial(material) {
        // Base color for the explosion (orange/red)
        const baseColor = new THREE.Color(0xff6600);
        
        // For larger explosions, shift color more towards bright yellow
        if (this.size > 5) {
            // Mix in some yellow for larger explosions
            const yellowFactor = Math.min((this.size - 5) / 10, 0.7); // Cap at 70% yellow mix
            const yellow = new THREE.Color(0xffff00);
            baseColor.lerp(yellow, yellowFactor);
        }
        
        // Make the explosion glow with emissive material
        material.emissive = baseColor;
        
        // More intense glow for larger explosions
        const baseIntensity = 1.5;
        const sizeBonus = Math.min(this.size / 10, 1.5); // Cap at 150% bonus
        material.emissiveIntensity = baseIntensity + sizeBonus;
    }
    
    createParticleExplosion() {
        // Fallback explosion using particles
        // Check if container still exists
        if (!this.container || !this.isActive) {
            console.warn('Cannot create particle explosion: container is null or explosion is inactive');
            return;
        }
        
        // Scale particles with explosion size
        const baseParticleCount = 20;
        const particleCount = Math.min(Math.floor(baseParticleCount * Math.sqrt(this.size)), 50); // Cap at 50 particles
        
        const particles = new THREE.Group();
        
        // Create a particle system with colors based on size
        const baseColor = new THREE.Color(0xff6600);
        const brightColor = new THREE.Color(0xffff00);
        
        for (let i = 0; i < particleCount; i++) {
            // Particle size varies with explosion size
            const particleSize = Math.random() * this.size * 0.2 + this.size * 0.1;
            
            const geometry = new THREE.SphereGeometry(particleSize, 8, 8);
            
            // Mix colors based on particle position and explosion size
            const colorMix = Math.random();
            const particleColor = baseColor.clone().lerp(brightColor, colorMix);
            
            const material = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Random position within explosion radius
            const radius = this.size * 0.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            particle.position.set(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.sin(phi) * Math.sin(theta),
                radius * Math.cos(phi)
            );
            
            // Random velocity - faster for larger explosions
            const speedFactor = Math.min(1 + (this.size / 10), 2.5); // Cap at 2.5x speed
            particle.userData.velocity = particle.position.clone().normalize()
                .multiplyScalar(Math.random() * 2 * speedFactor + 1);
                
            // Larger explosions have less drag (particles travel further)
            const baseDrag = 0.95;
            const dragReduction = Math.min(this.size / 50, 0.06); // Maximum 0.06 reduction (0.89 final drag)
            particle.userData.drag = baseDrag - dragReduction;
            
            particles.add(particle);
        }
        
        this.container.add(particles);
        this.particles = particles;
        
        // Larger explosions last longer
        const baseLifetime = 1.0;
        const lifetimeBonus = Math.min(this.size / 15, 0.5); // Maximum 0.5s extra lifetime
        this.lifetime = baseLifetime + lifetimeBonus;
    }
    
    update(deltaTime) {
        if (!this.isActive || !this.container) return false;
        
        // Update lifetime
        this.lifetime -= deltaTime;
        
        // Update animation mixer if it exists
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
        
        // Update particle effect if it exists
        if (this.particles && this.particles.children) {
            this.particles.children.forEach(particle => {
                // Update position
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
                
                // Apply drag
                particle.userData.velocity.multiplyScalar(particle.userData.drag);
                
                // Fade out
                if (particle.material && particle.material.opacity > 0) {
                    particle.material.opacity -= deltaTime * 1.5;
                }
                
                // Scale up slightly
                const scaleFactor = 1 + deltaTime * 0.5;
                particle.scale.multiplyScalar(scaleFactor);
            });
        }
        
        // If model exists, fade it out towards the end of the lifetime
        if (this.model && this.lifetime < 0.3) {
            const opacity = this.lifetime / 0.3;
            this.model.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat) {
                                if (!mat.transparent) {
                                    mat.transparent = true;
                                }
                                mat.opacity = opacity;
                            }
                        });
                    } else if (child.material) {
                        if (!child.material.transparent) {
                            child.material.transparent = true;
                        }
                        child.material.opacity = opacity;
                    }
                }
            });
        }
        
        // Check if explosion is finished
        if (this.lifetime <= 0) {
            this.destroy();
            return false;
        }
        
        return true;
    }
    
    destroy() {
        if (!this.isActive) return; // Already destroyed
        
        this.isActive = false;
        
        if (this.scene && this.container) {
            this.scene.remove(this.container);
        }
        
        // Clean up resources
        if (this.model) {
            this.model.traverse(child => {
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
        
        if (this.particles && this.particles.children) {
            this.particles.children.forEach(particle => {
                if (particle.geometry) {
                    particle.geometry.dispose();
                }
                if (particle.material) {
                    particle.material.dispose();
                }
            });
        }
        
        // Clear references
        this.model = null;
        this.particles = null;
        this.container = null;
        this.animationMixer = null;
        this.animationActions = [];
    }
} 