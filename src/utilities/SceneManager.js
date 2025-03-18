import { THREE } from './ThreeImports.js';
import { GameConfig } from '../config/game.config.js';

/**
 * Manages scene creation, lighting, and scene elements
 */
export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.lights = {
            ambient: null,
            directional: null
        };
        this.starfield = null;
    }

    /**
     * Initialize the scene
     * @returns {Object} Object containing scene and camera
     */
    initialize() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000020);

        // Create camera based on config setting
        if (GameConfig.camera.isOrthographic) {
            // Create orthographic camera for 2D view
            const aspectRatio = window.innerWidth / window.innerHeight;
            const frustumSize = 450; // Increased to ensure we can see the full game area
            this.camera = new THREE.OrthographicCamera(
                frustumSize * aspectRatio / -2,  // left
                frustumSize * aspectRatio / 2,   // right
                frustumSize / 2,                 // top
                frustumSize / -2,                // bottom
                GameConfig.camera.near,
                GameConfig.camera.far
            );
            console.log('SceneManager: Created orthographic camera with frustum size:', frustumSize, 
                'aspect ratio:', aspectRatio,
                'viewport:', {
                    left: frustumSize * aspectRatio / -2,
                    right: frustumSize * aspectRatio / 2,
                    top: frustumSize / 2,
                    bottom: frustumSize / -2
                });
        } else {
            // Create perspective camera
            this.camera = new THREE.PerspectiveCamera(
                GameConfig.camera.fov,
                window.innerWidth / window.innerHeight,
                GameConfig.camera.near,
                GameConfig.camera.far
            );
            console.log('SceneManager: Created perspective camera with FOV:', GameConfig.camera.fov);
        }
        
        // Position camera
        this.camera.position.set(
            GameConfig.camera.position.x,
            GameConfig.camera.position.y,
            GameConfig.camera.position.z
        );
        console.log('SceneManager: Camera positioned at:', 
            this.camera.position.x.toFixed(1),
            this.camera.position.y.toFixed(1),
            this.camera.position.z.toFixed(1));
        
        // Look at origin
        this.camera.lookAt(0, 0, 0);
        
        // Add visual helpers for debugging
        if (GameConfig.debug?.enabled) {
            // Add axes helper
            const axesHelper = new THREE.AxesHelper(500);
            this.scene.add(axesHelper);
            
            // Add grid helper
            const gridHelper = new THREE.GridHelper(1000, 10);
            gridHelper.rotation.x = Math.PI / 2; // Rotate to XY plane
            this.scene.add(gridHelper);
        }
        
        // Setup lights
        this.setupLights();
        
        // Create starfield background
        this.createStarfield();
        
        return {
            scene: this.scene,
            camera: this.camera
        };
    }

    /**
     * Set up lights in the scene
     */
    setupLights() {
        // Create ambient light using config values
        this.lights.ambient = new THREE.AmbientLight(
            GameConfig.lighting.ambient.color, 
            GameConfig.lighting.ambient.intensity
        );
        this.scene.add(this.lights.ambient);
        
        // Create main directional light using config values
        this.lights.directional = new THREE.DirectionalLight(
            GameConfig.lighting.directional.color, 
            GameConfig.lighting.directional.intensity
        );
        this.lights.directional.position.set(
            GameConfig.lighting.directional.position.x,
            GameConfig.lighting.directional.position.y,
            GameConfig.lighting.directional.position.z
        );
        this.lights.directional.castShadow = GameConfig.lighting.directional.castShadow;
        this.scene.add(this.lights.directional);
    }

    /**
     * Create starfield background
     */
    createStarfield() {
        // Skip if not enabled in config
        if (!GameConfig.environment || !GameConfig.environment.starfield || !GameConfig.environment.starfield.enabled) {
            return;
        }
        
        const starCount = GameConfig.environment.starfield.count || 1000;
        const starSize = GameConfig.environment.starfield.size || 2;
        const depth = GameConfig.environment.starfield.depth || 500;
        const colorConfig = GameConfig.environment.starfield.colors || {
            opacity: 0.8,
            rMin: 0.8, rMax: 1.0,
            gMin: 0.8, gMax: 1.0,
            bMin: 0.9, bMax: 1.0
        };
        
        // Create starfield geometry and materials
        const starGeometry = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: starSize,
            transparent: true,
            opacity: colorConfig.opacity,
            vertexColors: true
        });
        
        // Create star positions for a 2D plane with some depth variation for parallax
        const positions = [];
        const colors = [];
        const color = new THREE.Color();
        const velocities = []; // Store velocities for movement
        
        for (let i = 0; i < starCount; i++) {
            // Random position within screen bounds with some padding
            const x = Math.random() * GameConfig.screen.bounds.maxX * 2 - GameConfig.screen.bounds.maxX;
            const y = Math.random() * GameConfig.screen.bounds.maxY * 2 - GameConfig.screen.bounds.maxY;
            const z = GameConfig.screen.bounds.z - Math.random() * depth * 0.1; // Small z variation for parallax
            
            positions.push(x, y, z);
            
            // Random star color with bias to blue/white using config values
            const r = Math.random() * (colorConfig.rMax - colorConfig.rMin) + colorConfig.rMin;
            const g = Math.random() * (colorConfig.gMax - colorConfig.gMin) + colorConfig.gMin;
            const b = Math.random() * (colorConfig.bMax - colorConfig.bMin) + colorConfig.bMin;
            
            color.setRGB(r, g, b);
            colors.push(color.r, color.g, color.b);
            
            // Random velocity based on z position (parallax effect)
            // Stars further back (lower z) move slower
            const zFactor = (z + depth) / depth; // 0.9-1.0
            const baseSpeed = GameConfig.environment.starfield.speedX || -100;
            velocities.push(baseSpeed * zFactor);
        }
        
        // Set geometry attributes
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Create starfield mesh
        this.starfield = new THREE.Points(starGeometry, starMaterial);
        // Store velocities for movement
        this.starfield.userData.velocities = velocities;
        this.scene.add(this.starfield);
    }

    /**
     * Update the starfield (right to left movement)
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateStarfield(deltaTime) {
        if (!this.starfield) return;
        
        const positions = this.starfield.geometry.attributes.position;
        const velocities = this.starfield.userData.velocities;
        
        // Move each star from right to left at its velocity
        for (let i = 0; i < positions.count; i++) {
            // Get current position
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Move star left
            let newX = x + velocities[i] * deltaTime;
            
            // Wrap around when star moves off screen
            if (newX < -GameConfig.screen.bounds.maxX) {
                newX = GameConfig.screen.bounds.maxX;
            }
            
            // Update position
            positions.setX(i, newX);
        }
        
        // Mark positions for update
        positions.needsUpdate = true;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clear lights
        Object.values(this.lights).forEach(light => {
            if (light && this.scene) {
                this.scene.remove(light);
            }
        });
        
        // Clear starfield
        if (this.starfield && this.scene) {
            this.scene.remove(this.starfield);
            this.starfield.geometry.dispose();
            this.starfield.material.dispose();
            this.starfield = null;
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.lights = {};
    }
} 