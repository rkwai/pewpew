import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { EntityRenderer } from './EntityRenderer.js';

/**
 * Renderer for explosion effects using particles and light
 */
export class ExplosionRenderer extends EntityRenderer {
    constructor(scene, position, size = 1) {
        super(scene);
        this.position = position.clone();
        this.size = size;
        this.lifetime = GameConfig.explosion?.lifetime || 1.5;
        this.totalLifetime = this.lifetime;
        this.isActive = true;
        
        // Create container
        this.container = new THREE.Group();
        this.container.position.copy(this.position);
        this.scene.add(this.container);
        
        // Create particle system
        this._createParticleSystem();
        
        // Create core glow
        this._createCoreGlow();
        
        // Create light
        this._createLight();
    }
    
    /**
     * Create particle system for explosion
     * @private
     */
    _createParticleSystem() {
        // Number of particles scales with explosion size
        const particleCount = Math.floor(100 * this.size);
        
        // Create geometry and store initial positions/velocities
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        this.particleVelocities = [];
        
        // Generate random particles in sphere
        for (let i = 0; i < particleCount; i++) {
            // Random position in sphere (randomized distance from center)
            const radius = Math.random() * 0.1 * this.size;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Random colors (orange to yellow)
            const colorFactor = Math.random();
            colors[i * 3] = 1.0; // Red
            colors[i * 3 + 1] = 0.3 + colorFactor * 0.7; // Green
            colors[i * 3 + 2] = colorFactor * 0.3; // Blue
            
            // Random velocity (outward direction)
            const speed = (0.5 + Math.random() * 1.5) * this.size;
            const vx = x === 0 ? (Math.random() - 0.5) * speed : (x / radius) * speed;
            const vy = y === 0 ? (Math.random() - 0.5) * speed : (y / radius) * speed;
            const vz = z === 0 ? (Math.random() - 0.5) * speed : (z / radius) * speed;
            
            this.particleVelocities.push({ vx, vy, vz });
        }
        
        // Create attribute buffers
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create material
        const material = new THREE.PointsMaterial({
            size: 0.2 * this.size,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Store material reference for updates
        this.particleMaterial = material;
        
        // Create points system
        this.particles = new THREE.Points(geometry, material);
        this.container.add(this.particles);
    }
    
    /**
     * Create bright core glow for explosion
     * @private
     */
    _createCoreGlow() {
        // Create core geometry (sphere)
        const geometry = new THREE.SphereGeometry(0.2 * this.size, 12, 12);
        
        // Create material with emissive glow
        const material = new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        // Store material reference for updates
        this.coreMaterial = material;
        
        // Create mesh
        this.core = new THREE.Mesh(geometry, material);
        this.container.add(this.core);
    }
    
    /**
     * Create light effect
     * @private
     */
    _createLight() {
        const colors = [0xff6600, 0xff9900, 0xffcc00]; // Orange to yellow
        const lightColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Create point light
        this.light = new THREE.PointLight(lightColor, 5, this.size * 20);
        this.light.castShadow = false;
        this.container.add(this.light);
    }
    
    /**
     * Update explosion animation
     * @param {number} deltaTime - Time since last update in seconds
     * @returns {boolean} - True if explosion is still active, false if complete
     */
    update(deltaTime) {
        if (!this.isActive) return false;
        
        // Decrease lifetime
        this.lifetime -= deltaTime;
        
        // Calculate progress (0 to 1)
        const progress = 1 - (this.lifetime / this.totalLifetime);
        
        // Update particles
        this._updateParticles(deltaTime, progress);
        
        // Update core
        this._updateCore(progress);
        
        // Update light
        this._updateLight(progress);
        
        // If expired, hide and mark inactive
        if (this.lifetime <= 0) {
            // Force all materials to zero opacity before hiding
            if (this.particleMaterial) {
                this.particleMaterial.opacity = 0;
                // Force particles invisible to prevent any rendering artifacts
                if (this.particles) {
                    this.particles.visible = false;
                }
            }
            
            if (this.coreMaterial) {
                this.coreMaterial.opacity = 0;
                // Force core invisible to prevent any rendering artifacts
                if (this.core) {
                    this.core.visible = false;
                }
            }
            
            if (this.light) {
                this.light.intensity = 0;
                // Force light invisible to prevent any rendering artifacts
                this.light.visible = false;
            }
            
            this.isActive = false;
            // Ensure the entire container is invisible
            if (this.container) {
                this.container.visible = false;
                
                // Remove from scene temporarily to force complete disappearance
                if (this.scene) {
                    this.scene.remove(this.container);
                    // We'll add it back when resetExplosion is called
                }
            }
            
            return false;
        }
        
        return true;
    }
    
    /**
     * Update particle positions and appearance
     * @param {number} deltaTime - Time since last update
     * @param {number} progress - Animation progress (0-1)
     * @private
     */
    _updateParticles(deltaTime, progress) {
        if (!this.particles) return;
        
        // Slow down particles over time (drag effect)
        const slowdownFactor = 0.95;
        
        // Get position attribute
        const positions = this.particles.geometry.attributes.position;
        
        // Update each particle
        for (let i = 0; i < positions.count; i++) {
            // Get current position
            let x = positions.array[i * 3];
            let y = positions.array[i * 3 + 1];
            let z = positions.array[i * 3 + 2];
            
            // Get velocity and apply slowdown
            const velocity = this.particleVelocities[i];
            velocity.vx *= slowdownFactor;
            velocity.vy *= slowdownFactor;
            velocity.vz *= slowdownFactor;
            
            // Apply gravity effect (particles fall slightly)
            velocity.vy -= 0.01 * deltaTime;
            
            // Update position
            x += velocity.vx * deltaTime;
            y += velocity.vy * deltaTime;
            z += velocity.vz * deltaTime;
            
            // Store new position
            positions.array[i * 3] = x;
            positions.array[i * 3 + 1] = y;
            positions.array[i * 3 + 2] = z;
        }
        
        // Mark positions for update
        positions.needsUpdate = true;
        
        // Update particle opacity based on progress - ensure it fades completely
        // Use a stronger power curve to make it fade more quickly at the end
        const opacityFactor = Math.max(0, 1.0 - Math.pow(progress, 1.5));
        this.particleMaterial.opacity = opacityFactor;
        
        // Update particle size (grow slightly then shrink)
        const sizeProgress = progress < 0.3 ? progress / 0.3 : (1 - progress) / 0.7;
        this.particleMaterial.size = 0.2 * this.size * (0.5 + sizeProgress);
    }
    
    /**
     * Update core glow appearance
     * @param {number} progress - Animation progress (0-1)
     * @private
     */
    _updateCore(progress) {
        if (!this.core) return;
        
        // Core starts large and quickly shrinks
        const scaleFactor = 1.0 - progress * 1.2;
        const scale = Math.max(0, scaleFactor) * this.size;
        this.core.scale.set(scale, scale, scale);
        
        // Core fades out more quickly than particles
        this.coreMaterial.opacity = Math.max(0, 1.0 - progress * 1.5);
    }
    
    /**
     * Update light intensity and range
     * @param {number} progress - Animation progress (0-1)
     * @private
     */
    _updateLight(progress) {
        if (!this.light) return;
        
        // Light intensity starts high and gradually decreases
        this.light.intensity = 5 * (1.0 - progress * progress);
        
        // Light range expands then contracts
        const rangeProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        this.light.distance = this.size * (20 + rangeProgress * 30);
    }
    
    /**
     * Update transform/position of the container
     * @param {THREE.Vector3} position - New position
     */
    updateTransform(position) {
        if (this.container && position) {
            this.position.copy(position);
            this.container.position.copy(position);
        }
    }
    
    /**
     * Reset the explosion for reuse
     * @param {number} size - New size for the explosion
     * @param {THREE.Vector3} position - Optional new position
     */
    resetExplosion(size, position = null) {
        // Reset state
        this.lifetime = GameConfig.explosion?.lifetime || 1.5;
        this.totalLifetime = this.lifetime;
        this.isActive = true;
        
        // Update size if provided
        if (size !== undefined) {
            this.size = size;
        }
        
        // Update position if provided
        if (position) {
            this.updateTransform(position);
        }
        
        // Make sure container is in the scene and visible
        if (this.container) {
            // Add back to scene if it was removed
            if (this.scene && !this.container.parent) {
                this.scene.add(this.container);
            }
            this.container.visible = true;
        }
        
        // Reset particles
        if (this.particles && this.particleMaterial) {
            // Make sure particles are visible
            this.particles.visible = true;
            
            // Reset positions to near-center
            const positions = this.particles.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                // Random position in small sphere
                const radius = Math.random() * 0.1 * this.size;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                const x = radius * Math.sin(phi) * Math.cos(theta);
                const y = radius * Math.sin(phi) * Math.sin(theta);
                const z = radius * Math.cos(phi);
                
                positions.array[i * 3] = x;
                positions.array[i * 3 + 1] = y;
                positions.array[i * 3 + 2] = z;
                
                // Reset velocities (outward direction)
                const speed = (0.5 + Math.random() * 1.5) * this.size;
                this.particleVelocities[i] = {
                    vx: x === 0 ? (Math.random() - 0.5) * speed : (x / radius) * speed,
                    vy: y === 0 ? (Math.random() - 0.5) * speed : (y / radius) * speed,
                    vz: z === 0 ? (Math.random() - 0.5) * speed : (z / radius) * speed
                };
            }
            positions.needsUpdate = true;
            
            // Reset material properties
            this.particleMaterial.opacity = 1.0;
            this.particleMaterial.size = 0.2 * this.size;
        }
        
        // Reset core
        if (this.core && this.coreMaterial) {
            // Make sure core is visible
            this.core.visible = true;
            this.core.scale.set(this.size, this.size, this.size);
            this.coreMaterial.opacity = 1.0;
        }
        
        // Reset light
        if (this.light) {
            // Make sure light is visible
            this.light.visible = true;
            this.light.intensity = 5;
            this.light.distance = this.size * 20;
            
            // Randomly change light color
            const colors = [0xff6600, 0xff9900, 0xffcc00];
            this.light.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Mark inactive
        this.isActive = false;
        
        // Remove container and all children
        if (this.container) {
            this.scene.remove(this.container);
            
            // Dispose geometries and materials
            if (this.particles) {
                this.particles.geometry.dispose();
                this.particleMaterial.dispose();
                this.container.remove(this.particles);
                this.particles = null;
                this.particleMaterial = null;
            }
            
            if (this.core) {
                this.core.geometry.dispose();
                this.coreMaterial.dispose();
                this.container.remove(this.core);
                this.core = null;
                this.coreMaterial = null;
            }
            
            if (this.light) {
                this.container.remove(this.light);
                this.light = null;
            }
            
            this.container = null;
        }
        
        // Clear references
        this.scene = null;
        this.particleVelocities = null;
    }
    
    /**
     * No preload needed for particle-based explosions
     */
    static preloadModel() {
        // No models to preload in this implementation
    }
} 