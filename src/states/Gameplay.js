import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Player } from '../entities/Player.js';
import { AsteroidManager } from '../entities/AsteroidManager.js';
import { InputHandler } from '../utilities/InputHandler.js';
import { Explosion } from '../entities/Explosion.js';
import { GLTFLoader } from '../utilities/ThreeImports.js';

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
        this.explosions = []; // Array to track active explosions
        
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
        
        // Set up debug key handlers
        this.setupDebugHandlers();
        
        // Create player
        this.player = new Player(this.scene);
        
        // Create asteroid manager
        this.asteroidManager = new AsteroidManager(this.scene);
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Start game loop
        this.animate();
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
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        if (this.isGameOver) {
            this.renderer.render(this.scene, this.camera);
            return;
        }
        
        const deltaTime = this.clock.getDelta();
        
        // Update player
        if (this.player) {
            this.player.update(deltaTime, this.inputHandler);
            
            // Check if player is dead
            if (this.player.health <= 0) {
                this.gameOver();
            }
        }
        
        // Update asteroids
        if (this.asteroidManager) {
            this.asteroidManager.update(deltaTime, this.player);
        }
        
        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const isActive = this.explosions[i].update(deltaTime);
            if (!isActive) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Update starfield (scrolling effect) - now moves from right to left
        if (this.starfield) {
            this.starfield.position.x -= 30 * deltaTime; // Move stars left
            
            // Reset stars that go past the left edge
            if (this.starfield.position.x < -2000) {
                this.starfield.position.x = 0;
            }
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
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
        this.isGameOver = true;
        
        // Create game over text
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.color = 'white';
        gameOverDiv.style.fontSize = '48px';
        gameOverDiv.style.fontFamily = 'Arial, sans-serif';
        gameOverDiv.style.textAlign = 'center';
        gameOverDiv.innerHTML = `
            <div>GAME OVER</div>
            <div style="font-size: 24px; margin-top: 20px;">Score: ${this.asteroidManager.getScore()}</div>
            <div style="font-size: 18px; margin-top: 40px;">Press SPACE to restart</div>
        `;
        document.body.appendChild(gameOverDiv);
        
        // Add event listener for restart
        const restartHandler = (event) => {
            if (event.code === 'Space') {
                document.body.removeChild(gameOverDiv);
                window.removeEventListener('keydown', restartHandler);
                this.restart();
            }
        };
        
        window.addEventListener('keydown', restartHandler);
    }
    
    restart() {
        // Reset game state
        this.isGameOver = false;
        
        // Reset player
        if (this.player) {
            this.player.destroy();
        }
        this.player = new Player(this.scene);
        
        // Reset asteroids
        if (this.asteroidManager) {
            this.asteroidManager.reset();
        }
        
        // Reset HUD
        document.getElementById('health').innerText = 'Health: 100%';
        document.getElementById('score').innerText = 'Score: 0';
        document.getElementById('hud').style.display = 'block';
    }
    
    destroy() {
        // Clean up resources
        if (this.player) {
            this.player.destroy();
        }
        
        if (this.asteroidManager) {
            this.asteroidManager.reset();
        }
        
        // Clean up explosions
        for (const explosion of this.explosions) {
            if (explosion.destroy) {
                explosion.destroy();
            }
        }
        this.explosions = [];
        
        // Remove global reference
        window.gameState = null;
        
        if (this.inputHandler) {
            this.inputHandler.destroy();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        // Remove renderer
        if (this.renderer) {
            document.body.removeChild(this.renderer.domElement);
        }
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
    
    // Set up debug features and keyboard shortcuts
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
                    
                    this.showDebugMessage("Hit spheres visible");
                } else if (!GameConfig.asteroid.debug.logCollisions) {
                    // State 2: Show hit spheres and log collisions
                    GameConfig.asteroid.debug.logCollisions = true;
                    this.showDebugMessage("Hit spheres visible + collision logging");
                } else {
                    // State 3: Turn everything off
                    GameConfig.asteroid.debug.showHitSpheres = false;
                    GameConfig.asteroid.debug.logCollisions = false;
                    
                    // Also hide player hit sphere
                    if (GameConfig.player && GameConfig.player.debug) {
                        GameConfig.player.debug.showHitSphere = false;
                    }
                    
                    this.showDebugMessage("Debug features disabled");
                }
                
                // Update existing asteroids
                if (this.asteroidManager && this.asteroidManager.asteroids) {
                    this.asteroidManager.asteroids.forEach(asteroid => {
                        if (asteroid.hitSphere) {
                            // Update hit sphere visibility
                            asteroid.hitSphereVisible = GameConfig.asteroid.debug.showHitSpheres;
                            asteroid.hitSphere.material.opacity = GameConfig.asteroid.debug.showHitSpheres ? 0.3 : 0;
                            asteroid.hitSphere.material.wireframe = GameConfig.asteroid.debug.showHitSpheres;
                            
                            // Reset color
                            asteroid.hitSphere.material.color.set(0x00ff00);
                        }
                    });
                }
                
                // Update player hit sphere
                if (this.player && this.player.hitSphere) {
                    this.player.hitSphereVisible = GameConfig.player.debug.showHitSphere;
                    this.player.hitSphere.material.opacity = GameConfig.player.debug.showHitSphere ? 0.3 : 0;
                    this.player.hitSphere.material.wireframe = GameConfig.player.debug.showHitSphere;
                }
                
                console.log(
                    `Debug state: hit spheres ${GameConfig.asteroid.debug.showHitSpheres ? 'enabled' : 'disabled'}, ` +
                    `collision logging ${GameConfig.asteroid.debug.logCollisions ? 'enabled' : 'disabled'}`
                );
            }
        };
    }
    
    // Display a temporary debug message on screen
    showDebugMessage(message, duration = 2000) {
        // Create or update debug message element
        let msgElement = document.getElementById('debug-message');
        
        if (!msgElement) {
            msgElement = document.createElement('div');
            msgElement.id = 'debug-message';
            msgElement.style.position = 'absolute';
            msgElement.style.top = '50px';
            msgElement.style.left = '50%';
            msgElement.style.transform = 'translateX(-50%)';
            msgElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            msgElement.style.color = 'white';
            msgElement.style.padding = '10px 20px';
            msgElement.style.borderRadius = '5px';
            msgElement.style.fontFamily = 'Arial, sans-serif';
            msgElement.style.fontSize = '16px';
            msgElement.style.zIndex = '1000';
            document.body.appendChild(msgElement);
        }
        
        // Update message text
        msgElement.textContent = message;
        msgElement.style.display = 'block';
        
        // Hide after duration
        setTimeout(() => {
            msgElement.style.display = 'none';
        }, duration);
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
} 