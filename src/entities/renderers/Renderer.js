import { THREE } from '../../utilities/ThreeImports.js';
import { GameConfig } from '../../config/game.config.js';
import { ModelLoader } from '../../utilities/ModelLoader.js';

/**
 * Manages rendering responsibilities for the game
 */
export class Renderer {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.debugHelpers = {
            grid: null,
            axes: null
        };
        
        // Track texture usage
        this.maxTextureUnits = 12; // Keep below WebGL's limit of 16
        this.checkTextureInterval = 5000; // Check every 5 seconds
        this.textureCheckTimer = null;
    }

    /**
     * Initialize the renderer with scene and camera
     * @param {THREE.Scene} scene - The scene to render
     * @param {THREE.Camera} camera - The camera to use for rendering
     */
    initialize(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000033, 1); // Dark blue background for better contrast
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Enable shadows if configured
        if (GameConfig.rendering.shadows.enabled) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        // Apply tone mapping if configured
        if (GameConfig.rendering.toneMapping) {
            const toneMapping = {
                'Linear': THREE.LinearToneMapping,
                'Reinhard': THREE.ReinhardToneMapping,
                'Cineon': THREE.CineonToneMapping,
                'ACESFilmic': THREE.ACESFilmicToneMapping
            }[GameConfig.rendering.toneMapping];
            
            if (toneMapping) {
                this.renderer.toneMapping = toneMapping;
                this.renderer.toneMappingExposure = GameConfig.rendering.toneMappingExposure || 1;
            }
        }
        
        // Apply output encoding if configured
        if (GameConfig.rendering.outputEncoding) {
            const colorSpace = {
                'Linear': THREE.LinearSRGBColorSpace,
                'sRGB': THREE.SRGBColorSpace,
                'DisplayP3': THREE.DisplayP3ColorSpace
            }[GameConfig.rendering.outputEncoding];
            
            if (colorSpace) {
                this.renderer.outputColorSpace = colorSpace;
            }
        }
        
        // Add renderer to DOM
        document.body.appendChild(this.renderer.domElement);
        
        // Initialize debug helpers if debug is enabled
        if (GameConfig.debug.enabled) {
            this.initializeDebugHelpers();
        }
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start texture monitoring
        this.startTextureMonitoring();
    }
    
    /**
     * Start texture monitoring to prevent WebGL errors
     */
    startTextureMonitoring() {
        // Clear any existing timer
        if (this.textureCheckTimer) {
            clearInterval(this.textureCheckTimer);
        }
        
        // Set up a periodic check for texture usage
        this.textureCheckTimer = setInterval(() => {
            this.checkTextureUsage();
        }, this.checkTextureInterval);
    }
    
    /**
     * Check texture usage and clear if necessary to prevent errors
     */
    checkTextureUsage() {
        if (ModelLoader.activeTextureCount > this.maxTextureUnits) {
            console.warn(`Texture count (${ModelLoader.activeTextureCount}) exceeds safe limit (${this.maxTextureUnits}). Clearing texture cache...`);
            ModelLoader.clearCache();
            
            // Force garbage collection with a hint to the browser (not guaranteed)
            if (window.gc) {
                window.gc();
            }
        }
    }

    /**
     * Initialize debug helpers
     */
    initializeDebugHelpers() {
        // Do not add any debug helpers
        return;
    }

    /**
     * Render the scene
     */
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (this.camera) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop texture monitoring
        if (this.textureCheckTimer) {
            clearInterval(this.textureCheckTimer);
            this.textureCheckTimer = null;
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        // Remove renderer from DOM
        if (this.renderer && this.renderer.domElement) {
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // Remove debug helpers from scene
        if (this.debugHelpers.grid && this.scene) {
            this.scene.remove(this.debugHelpers.grid);
            this.debugHelpers.grid = null;
        }
        
        if (this.debugHelpers.axes && this.scene) {
            this.scene.remove(this.debugHelpers.axes);
            this.debugHelpers.axes = null;
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
    }
} 