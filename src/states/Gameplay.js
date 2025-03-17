import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Player } from '../entities/Player.js';
import { AsteroidManager } from '../entities/AsteroidManager.js';
import { InputHandler } from '../utilities/InputHandler.js';
import { Explosion } from '../entities/Explosion.js';
import { GLTFLoader } from '../utilities/ThreeImports.js';
import { GameStateManager, GameState } from './GameStateManager.js';
import { UIManager } from './UIManager.js';
import { Events } from '../utilities/EventSystem.js';

// Debug mode flag - set to false to disable debug features
const DEBUG_MODE = false;

export class Gameplay {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.asteroidManager = null;
        this.inputHandler = null;
        this.clock = new THREE.Clock();
        this.isGameOver = false;
        this.isPaused = false;
        this.explosions = []; // Array to track active explosions
        this.uiManager = new UIManager(); // Create UIManager
        this.lastTime = 0; // Initialize lastTime for animation
        this.isDestroyed = false; // Flag to track if gameplay is destroyed
        
        this.init();
    }
    
    init() {
        console.log('Initializing gameplay state');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000020);
        
        // Initialize explosions array if not already done
        if (!this.explosions) {
            this.explosions = [];
        }
        
        // Set global reference to this game state for explosions to register
        window.gameState = this;
        
        // Preload explosion model to avoid delays when first explosion occurs
        this.preloadExplosionModel();
        
        // Update game config with actual screen dimensions
        this.updateScreenDimensions();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            GameConfig.camera.fov,
            window.innerWidth / window.innerHeight,
            GameConfig.camera.near,
            GameConfig.camera.far
        );
        this.camera.position.set(
            GameConfig.camera.position.x,    // Use config values
            GameConfig.camera.position.y,    
            GameConfig.camera.position.z     // Moved closer
        );
        
        // Log camera setup for debugging
        console.log(`Camera set up with FOV: ${GameConfig.camera.fov}, position: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Apply shadow settings from config
        this.renderer.shadowMap.enabled = GameConfig.rendering.shadows.enabled;
        
        // Set shadow map type based on config
        switch (GameConfig.rendering.shadows.type) {
            case 'Basic':
                this.renderer.shadowMap.type = THREE.BasicShadowMap;
                break;
            case 'PCF':
                this.renderer.shadowMap.type = THREE.PCFShadowMap;
                break;
            case 'PCFSoft':
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
            case 'VSM':
                this.renderer.shadowMap.type = THREE.VSMShadowMap;
                break;
        }
        
        // Configure shadow map size
        this.renderer.shadowMap.mapSize = new THREE.Vector2(
            GameConfig.rendering.shadows.mapSize, 
            GameConfig.rendering.shadows.mapSize
        );
        
        // Set renderer color management
        switch (GameConfig.rendering.outputEncoding) {
            case 'Linear':
                this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
                break;
            case 'sRGB':
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
                break;
            case 'DisplayP3':
                this.renderer.outputColorSpace = THREE.DisplayP3ColorSpace;
                break;
            default:
                // Default to sRGB if unrecognized
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
                break;
        }
        
        // Set tone mapping
        switch (GameConfig.rendering.toneMapping) {
            case 'Linear':
                this.renderer.toneMapping = THREE.LinearToneMapping;
                break;
            case 'Reinhard':
                this.renderer.toneMapping = THREE.ReinhardToneMapping;
                break;
            case 'Cineon':
                this.renderer.toneMapping = THREE.CineonToneMapping;
                break;
            case 'ACESFilmic':
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                break;
        }
        
        // Set exposure
        this.renderer.toneMappingExposure = GameConfig.rendering.toneMappingExposure;
        
        document.body.appendChild(this.renderer.domElement);
        
        // Set up post-processing if enabled (commented out for now since it requires additional packages)
        /* 
        if (GameConfig.rendering.bloom.enabled) {
            this.setupPostProcessing();
        }
        */
        
        // Add lights
        this.addLights();
        
        // Add stars background
        this.createStarfield();
        
        // Create input handler
        this.inputHandler = new InputHandler();
        
        // Set up enter key handler for pause/unpause
        this.inputHandler.onEnterPress = () => {
            if (this.stateManager) {
                this.stateManager.handleEnterPress();
            }
        };
        
        // Set up debug key handlers
        this.setupDebugHandlers();
        
        // Create player
        this.player = new Player(this.scene);
        
        // Create asteroid manager
        this.asteroidManager = new AsteroidManager(this.scene);
        
        // Create game state manager
        this.stateManager = new GameStateManager(this);
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start game loop with explicit timestamp of 0 for first frame
        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }
    
    addLights() {
        // Create ambient light using config values
        const ambientLight = new THREE.AmbientLight(
            GameConfig.lighting.ambient.color, 
            GameConfig.lighting.ambient.intensity
        );
        this.scene.add(ambientLight);
        
        // Create main directional light using config values
        const mainLight = new THREE.DirectionalLight(
            GameConfig.lighting.directional.color, 
            GameConfig.lighting.directional.intensity
        );
        mainLight.position.set(
            GameConfig.lighting.directional.position.x,
            GameConfig.lighting.directional.position.y,
            GameConfig.lighting.directional.position.z
        );
        mainLight.castShadow = GameConfig.lighting.directional.castShadow;
        this.scene.add(mainLight);
        
        // Create player area light using config values
        const playerLight = new THREE.PointLight(
            GameConfig.lighting.playerLight.color,
            GameConfig.lighting.playerLight.intensity,
            GameConfig.lighting.playerLight.distance
        );
        playerLight.position.set(
            GameConfig.lighting.playerLight.position.x,
            GameConfig.lighting.playerLight.position.y,
            GameConfig.lighting.playerLight.position.z
        );
        playerLight.castShadow = GameConfig.lighting.playerLight.castShadow;
        this.scene.add(playerLight);
        
        // Create backlight using config values
        const backLight = new THREE.PointLight(
            GameConfig.lighting.backLight.color,
            GameConfig.lighting.backLight.intensity,
            GameConfig.lighting.backLight.distance
        );
        backLight.position.set(
            GameConfig.lighting.backLight.position.x,
            GameConfig.lighting.backLight.position.y,
            GameConfig.lighting.backLight.position.z
        );
        backLight.castShadow = GameConfig.lighting.backLight.castShadow;
        this.scene.add(backLight);
    }
    
    createStarfield() {
        const starCount = 1000;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        
        // Create a wider distribution along the X-axis for side-scrolling
        for (let i = 0; i < starCount; i++) {
            starPositions[i * 3] = (Math.random() - 0.5) * 4000; // Wide X distribution
            starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000; // Y distribution
            starPositions[i * 3 + 2] = (Math.random() - 0.5) * 1000; // Z distribution (depth)
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            sizeAttenuation: true
        });
        
        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }
    
    /**
     * Animation loop for gameplay
     * @param {number} timestamp - The current timestamp from requestAnimationFrame
     */
    animate(timestamp) {
        // Ensure we have a valid timestamp
        const currentTime = timestamp || performance.now();
        
        // Calculate elapsed time since last frame and convert to seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Limit delta time to prevent "time jumps" during lag or tab switches
        const cappedDelta = Math.min(deltaTime, 0.1);
        
        // Update the game state
        if (!this.isPaused && !this.isGameOver) {
            // Update player
            this.player.update(cappedDelta, this.inputHandler);
            
            // Update asteroids and check for collisions
            this.asteroidManager.update(cappedDelta, this.player);
            
            // Update explosions
            this.updateExplosions(cappedDelta);
            
            // Update starfield (scrolling effect)
            this.updateStarfield(cappedDelta);
            
            // Check if player is still alive
            if (this.player.getHealth() <= 0) {
                this.gameOver();
            }
            
            // Perform resource cleanup every frame to prevent memory leaks
            this.player.cleanupResources();
            this.asteroidManager.cleanupResources();
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Request the next animation frame if not destroyed
        if (!this.isDestroyed) {
            this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        }
    }
    
    /**
     * Update all active explosions
     * @param {number} deltaTime - Time delta in seconds
     */
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const isActive = this.explosions[i].update(deltaTime);
            if (!isActive) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    /**
     * Update starfield position for scrolling effect
     * @param {number} deltaTime - Time delta in seconds
     */
    updateStarfield(deltaTime) {
        if (this.starfield) {
            // Move stars from right to left (negative X direction)
            const starSpeed = GameConfig.starfield?.speed || 50; // Default speed: 50 units per second
            this.starfield.position.x -= starSpeed * deltaTime;
            
            // Log starfield position occasionally for debugging
            if (Math.random() < 0.01) {
                console.log(`Starfield at x: ${this.starfield.position.x.toFixed(2)}`);
            }
            
            // Reset stars position when they've scrolled far enough
            // This creates an "infinite" scrolling effect
            const resetDistance = GameConfig.starfield?.resetDistance || -1000;
            if (this.starfield.position.x < resetDistance) {
                this.starfield.position.x = 0;
                console.log('Starfield position reset to 0');
            }
        }
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update game dimensions
        this.updateScreenDimensions();
    }
    
    gameOver() {
        if (this.isGameOver) return; // Prevent multiple calls
        
        console.log("Game over sequence initiated");
        
        // Set the game state to game over
        this.isGameOver = true;
        
        // Stop the game clock
        this.clock.stop();
        
        // Make sure we have a player and asteroid manager before accessing them
        if (!this.player || !this.asteroidManager) {
            console.error("Missing player or asteroidManager in gameOver()");
            return;
        }
        
        // Create a final explosion for the player ship
        try {
            const playerPosition = this.player.getPosition();
            // Create a large explosion at the player's position
            const explosionSize = this.player.getHitSphereRadius() * 2;
            new Explosion(this.scene, playerPosition, explosionSize);
            
            // Hide the player model
            if (this.player.model) {
                this.player.model.visible = false;
            }
            if (this.player.tempMesh) {
                this.player.tempMesh.visible = false;
            }
            if (this.player.hitSphere) {
                this.player.hitSphere.visible = false;
            }
        } catch (error) {
            console.error("Error creating final player explosion:", error);
        }
        
        // Use state manager to show game over screen
        if (this.stateManager) {
            const score = this.asteroidManager.getScore();
            console.log(`Game over with score: ${score}`);
            
            // Show game over message using UIManager
            this.uiManager.showGameOverMessage(score);
            
            // Emit game over event
            Events.emit('gameOver', { score });
            
            this.stateManager.gameOver(score);
        } else {
            console.error("Missing stateManager in gameOver()");
        }
    }
    
    restart() {
        console.log("Game restart initiated, previous state - isGameOver:", this.isGameOver);
        
        // Reset game state flags
        this.isGameOver = false;
        this.isPaused = false;
        
        // Reset player
        if (this.player) {
            this.player.destroy();
        }
        this.player = new Player(this.scene);
        
        // Reset asteroids
        if (this.asteroidManager) {
            this.asteroidManager.reset();
        }
        
        // Clear all explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            if (this.explosions[i].destroy) {
                this.explosions[i].destroy();
            }
        }
        this.explosions = [];
        
        // Reset UI using UIManager instead of direct DOM manipulation
        this.uiManager.resetUI();
        
        // Reset and start the clock
        this.clock = new THREE.Clock(); // Create a fresh clock
        this.clock.start();
        
        // Emit restart event
        Events.emit('gameRestart', {});
        
        console.log("Game restart completed - new game started, current state - isGameOver:", this.isGameOver);
    }
    
    destroy() {
        this.isDestroyed = true;
        
        // Cancel any pending animation frames
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        // Dispose of all explosions
        if (this.explosions) {
            this.explosions.forEach(explosion => {
                explosion.dispose();
            });
            this.explosions = [];
        }
        
        // Call dispose on managers to properly clean up resources
        if (this.asteroidManager) {
            this.asteroidManager.dispose();
            this.asteroidManager = null;
        }
        
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
        
        // Clean up input handler
        if (this.inputHandler) {
            this.inputHandler.dispose();
            this.inputHandler = null;
        }
        
        // Clean up scene
        if (this.scene) {
            this.clearScene(this.scene);
            this.scene = null;
        }
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
            this.renderer.domElement = null;
            this.renderer = null;
        }
        
        // Clean up camera
        this.camera = null;
        
        console.log("Gameplay state destroyed, all resources cleaned up");
        
        // Emit destroy event
        Events.emit('gameplayDestroyed', {});
        
        // Clear game state reference
        window.gameState = null;
    }
    
    // New method to update screen dimensions and related values
    updateScreenDimensions() {
        // Update screen dimensions
        if (GameConfig.screen) {
            GameConfig.screen.width = window.innerWidth;
            GameConfig.screen.height = window.innerHeight;
            console.log(`Screen dimensions updated: ${GameConfig.screen.width}x${GameConfig.screen.height}`);
        }
        
        // Log the current boundaries for debugging
        if (GameConfig.player && GameConfig.player.boundaries) {
            console.log('Current player boundaries:',
                'xMin:', GameConfig.player.boundaries.xMin,
                'xMax:', GameConfig.player.boundaries.xMax,
                'yMin:', GameConfig.player.boundaries.yMin,
                'yMax:', GameConfig.player.boundaries.yMax
            );
        }
        
        // Only create default position if it doesn't exist
        if (GameConfig.player && !GameConfig.player.defaultPosition) {
            GameConfig.player.defaultPosition = {
                x: -300,
                y: 0,
                z: 0
            };
            console.log('Created default player position:', GameConfig.player.defaultPosition);
        }
        
        // Update asteroid spawn and despawn distances
        if (!GameConfig.asteroid) {
            // Create asteroid config if it doesn't exist
            GameConfig.asteroid = {
                minSpeed: 100,
                maxSpeed: 200,
                minSize: 30,
                maxSize: 80,
                minRotationSpeed: 0.01,
                maxRotationSpeed: 0.05,
                spawnRate: 2,
                spawnDistance: window.innerWidth + 200,
                spawnDepth: {
                    min: -100,
                    max: 100
                },
                despawnDistance: -(window.innerWidth + 200)
            };
            console.log('Created missing asteroid config');
        } else {
            // Ensure asteroid spawn depth property exists
            if (!GameConfig.asteroid.spawnDepth) {
                GameConfig.asteroid.spawnDepth = {
                    min: -100,
                    max: 100
                };
                console.log('Created missing spawnDepth property');
            }
            
            // Update distances
            GameConfig.asteroid.spawnDistance = window.innerWidth + 200;
            GameConfig.asteroid.despawnDistance = -(window.innerWidth + 200);
        }
        
        console.log('Updated game dimensions based on screen size:', 
            { width: window.innerWidth, height: window.innerHeight });
    }
    
    // Show debug features and keyboard shortcuts
    setupDebugHandlers() {
        // Toggle hit spheres when 'H' key is pressed
        this.inputHandler.onToggleHitSpheres = () => {
            // Toggle the visibility setting for asteroids
            if (GameConfig.asteroid && GameConfig.asteroid.debug) {
                // Toggle between three states: none → show hit spheres → show hit spheres + log collisions → none
                if (!GameConfig.asteroid.debug.showHitSpheres) {
                    // State 1: Show hit spheres only
                    GameConfig.asteroid.debug.showHitSpheres = true;
                    GameConfig.asteroid.debug.logCollisions = false;
                    
                    // Also toggle player hit sphere if available
                    if (GameConfig.player && GameConfig.player.debug) {
                        GameConfig.player.debug.showHitSphere = true;
                    }
                    
                    // Use UIManager for debug messages
                    this.uiManager.showDebugMessage("Hit spheres visible");
                } else if (!GameConfig.asteroid.debug.logCollisions) {
                    // State 2: Show hit spheres and log collisions
                    GameConfig.asteroid.debug.logCollisions = true;
                    this.uiManager.showDebugMessage("Hit spheres visible + collision logging");
                } else {
                    // State 3: Turn everything off
                    GameConfig.asteroid.debug.showHitSpheres = false;
                    GameConfig.asteroid.debug.logCollisions = false;
                    
                    // Also hide player hit sphere
                    if (GameConfig.player && GameConfig.player.debug) {
                        GameConfig.player.debug.showHitSphere = false;
                    }
                    
                    this.uiManager.showDebugMessage("Debug features disabled");
                }
                
                // Update existing asteroids
                if (this.asteroidManager) {
                    // Use getAsteroids() method instead of directly accessing the asteroids property
                    const asteroids = this.asteroidManager.getAsteroids();
                    asteroids.forEach(asteroid => {
                        if (!asteroid.hitSphere) {
                            asteroid.createHitSphere();
                        }
                        // Use asteroid setHitSphereVisible method instead of direct property access
                        if (asteroid.setHitSphereVisible) {
                            asteroid.setHitSphereVisible(GameConfig.asteroid.debug.showHitSpheres);
                        } else {
                            // Fallback for asteroids without the setter method
                            asteroid.hitSphereVisible = GameConfig.asteroid.debug.showHitSpheres;
                            asteroid.hitSphere.material.opacity = GameConfig.asteroid.debug.showHitSpheres ? 0.3 : 0;
                            asteroid.hitSphere.material.wireframe = GameConfig.asteroid.debug.showHitSpheres;
                        }
                        // Reset color
                        asteroid.hitSphere.material.color.set(0x00ff00);
                    });
                }
                
                // Update player hit sphere
                if (this.player && this.player.hitSphere) {
                    this.player.setHitSphereVisible(GameConfig.player.debug.showHitSphere);
                }
                
                console.log(
                    `Debug state: hit spheres ${GameConfig.asteroid.debug.showHitSpheres ? 'enabled' : 'disabled'}, ` +
                    `collision logging ${GameConfig.asteroid.debug.logCollisions ? 'enabled' : 'disabled'}`
                );
            }
        };
    }
    
    // Utility method for showing debug messages (now using UIManager)
    showDebugMessage(message) {
        this.uiManager.showDebugMessage(message);
    }
    
    // Preload the explosion model for faster display
    preloadExplosionModel() {
        if (Explosion.modelCache) return; // Already preloaded
        
        console.log('Preloading explosion model...');
        const loader = new GLTFLoader();
        loader.load(
            'assets/models/explosion.glb',
            (gltf) => {
                console.log('Explosion model preloaded successfully');
                Explosion.modelCache = gltf;
                Explosion.modelLoading = false;
                
                // Process any callbacks waiting for the model
                if (Explosion.modelCallbacks && Explosion.modelCallbacks.length > 0) {
                    Explosion.modelCallbacks.forEach(callback => callback(gltf));
                    Explosion.modelCallbacks = [];
                }
            },
            (xhr) => {
                console.log('Explosion model loading progress: ' + (xhr.loaded / xhr.total * 100) + '%');
            },
            (error) => {
                console.error('Error preloading explosion model:', error);
                Explosion.modelLoading = false;
            }
        );
        Explosion.modelLoading = true;
    }

    // Add pause and resume methods
    pause() {
        // Don't pause if already paused or game over
        if (this.isPaused || this.isGameOver) {
            console.log("Cannot pause: game is already paused or game over");
            return;
        }
        
        console.log("Game paused");
        this.isPaused = true;
        this.clock.stop(); // Stop the clock to prevent time accumulation while paused
    }
    
    resume() {
        // Don't resume if not paused or game is over
        if (!this.isPaused || this.isGameOver) {
            console.log("Cannot resume: game is not paused or game is over");
            return;
        }
        
        console.log("Game resumed");
        this.isPaused = false;
        this.clock.start(); // Restart the clock
    }
} 