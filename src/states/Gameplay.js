import { GLTFLoader } from '../utilities/ThreeImports.js';
import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { AsteroidManager } from '../entities/AsteroidManager.js';
import { InputHandler } from '../utilities/InputHandler.js';
import { SceneManager } from '../utilities/SceneManager.js';
import { Explosion } from '../entities/Explosion.js';
import { UIManager } from './UIManager.js';
import { Events } from './EventSystem.js';
import { EventTypes } from './EventTypes.js';
import { Collisions } from './CollisionManager.js';
import { CollisionTypes } from './CollisionSystem.js';
import { Renderer } from '../entities/renderers/Renderer.js';
import { GameConfig } from '../config/game.config.js';
import { GameStateManager, GameState } from './GameStateManager.js';

// Use debug setting from config instead of hardcoded value
// const DEBUG_MODE = false;

export class Gameplay {
    constructor() {
        this.sceneManager = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.player = null;
        this.asteroidManager = null;
        this.inputHandler = null;
        this.clock = new THREE.Clock();
        this.isGameOver = false;
        this.isPaused = false;
        this.explosions = []; // Array to track active explosions
        this.uiManager = null; // Will be created in init()
        this.lastTime = 0; // Initialize lastTime for animation
        this.isDestroyed = false; // Flag to track if gameplay is destroyed
        
        // Subscribe to collision events
        this.setupCollisionHandlers();
        
        this.init();
    }
    
    /**
     * Set up collision event handlers
     */
    setupCollisionHandlers() {
        // Unsubscribe previous handlers if they exist
        if (this.playerAsteroidHandler) {
            this.playerAsteroidHandler();
            this.playerAsteroidHandler = null;
        }
        if (this.bulletAsteroidHandler) {
            this.bulletAsteroidHandler();
            this.bulletAsteroidHandler = null;
        }
        
        // Register for the general collision detected event from the collision system
        this.collisionDetectedHandler = Events.on(EventTypes.COLLISION_DETECTED, (data) => {
            console.log('Raw collision detected:', data.typeA, data.typeB);
            
            // Handle player-asteroid collision
            if ((data.typeA === CollisionTypes.PLAYER && data.typeB === CollisionTypes.ASTEROID) ||
                (data.typeA === CollisionTypes.ASTEROID && data.typeB === CollisionTypes.PLAYER)) {
                this.handlePlayerAsteroidCollision(data);
            }
            
            // Handle bullet-asteroid collision
            if ((data.typeA === CollisionTypes.BULLET && data.typeB === CollisionTypes.ASTEROID) ||
                (data.typeA === CollisionTypes.ASTEROID && data.typeB === CollisionTypes.BULLET)) {
                this.handleBulletAsteroidCollision(data);
            }
        });
    }
    
    /**
     * Handle collision between player and asteroid
     * @param {Object} data - Collision data
     */
    handlePlayerAsteroidCollision(data) {
        const { entityA, entityB, point } = data;
        // Determine which entity is the player and which is the asteroid
        const player = entityA.type === CollisionTypes.PLAYER ? entityA : entityB;
        const asteroid = entityA.type === CollisionTypes.ASTEROID ? entityA : entityB;
        
        // Validate that the asteroid is still active
        if (!asteroid || asteroid.isDestroyed) {
            console.warn('Invalid asteroid collision detected with destroyed asteroid');
            return;
        }
        
        // Calculate damage based on asteroid size
        const damage = Math.ceil(asteroid.size * 10);
        
        // Apply damage to player
        player.takeDamage(damage, point);
        
        // Create explosion at collision point
        const explosionSize = GameConfig.collision?.playerAsteroidExplosionSize || 1.0;
        const explosion = new Explosion(this.scene, point, explosionSize);
        this.explosions.push(explosion);
        
        // Remove asteroid
        this.asteroidManager.destroyAsteroidByEntity(asteroid);
    }
    
    /**
     * Handle collision between bullet and asteroid
     * @param {Object} data - Collision data
     */
    handleBulletAsteroidCollision(data) {
        const { entityA, entityB, point } = data;
        // Determine which entity is the bullet and which is the asteroid
        const bullet = entityA.type === CollisionTypes.BULLET ? entityA : entityB;
        const asteroid = entityA.type === CollisionTypes.ASTEROID ? entityA : entityB;
        
        console.log('Bullet-Asteroid collision detected:', {
            bullet: bullet ? 'valid' : 'invalid',
            bulletActive: bullet ? bullet.isActive : 'N/A',
            asteroid: asteroid ? 'valid' : 'invalid',
            asteroidDestroyed: asteroid ? asteroid.isDestroyed : 'N/A',
            point: point ? `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})` : 'invalid',
            currentExplosions: this.explosions.length
        });
        
        // Skip if either entity is already being destroyed
        if (!asteroid || !bullet || !bullet.isActive || asteroid.isDestroyed) {
            console.log('Skipping collision handling - invalid entities');
            return;
        }
        
        // Calculate score based on asteroid size
        const scoreValue = Math.ceil(asteroid.size * 100);
        
        // Increment score
        this.asteroidManager.incrementScore(scoreValue);
        
        // Create explosion at collision point
        const explosionSizeRatio = GameConfig.collision?.bulletAsteroidExplosionRatio || 0.5;
        const explosionSize = asteroid.size * explosionSizeRatio;
        
        const explosion = new Explosion(this.scene, point, explosionSize);
        this.explosions.push(explosion);
        
        // Let the bullet manager handle the bullet cleanup
        if (this.player && this.player.bulletManager) {
            this.player.bulletManager.removeBullet(bullet);
        }
        
        // Make sure to destroy the asteroid
        this.asteroidManager.destroyAsteroidByEntity(asteroid);
    }
    
    init() {
        console.log('Initializing gameplay state');
        
        // Create UI Manager first to handle loading screen
        this.uiManager = new UIManager();
        this.uiManager.setLoadingVisible(true, 0); // Show loading at 0%
        
        // Initialize scene manager
        this.sceneManager = new SceneManager();
        const { scene, camera } = this.sceneManager.initialize();
        this.scene = scene;
        this.camera = camera;
        
        // Initialize explosions array if not already done
        if (!this.explosions) {
            this.explosions = [];
        }
        
        // Set global reference to this game state for explosions to register
        window.gameState = this;
        
        // Show loading progress
        this.uiManager.setLoadingVisible(true, 10);
        
        // Preload models
        Explosion.preloadModel(); // Preload explosion model
        
        // Update game config with actual screen dimensions
        this.updateScreenDimensions();
        
        // Show loading progress
        this.uiManager.setLoadingVisible(true, 30);
        
        // Initialize renderer
        this.renderer = new Renderer();
        this.renderer.initialize(this.scene, this.camera);
        
        // Show loading progress
        this.uiManager.setLoadingVisible(true, 70);
        
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
        
        // Show loading progress
        this.uiManager.setLoadingVisible(true, 80);
        
        // Create player
        this.player = new Player(this.scene);
        
        // Create asteroid manager
        this.asteroidManager = new AsteroidManager(this.scene);
        
        // Show loading progress
        this.uiManager.setLoadingVisible(true, 90);
        
        // Create game state manager
        this.stateManager = new GameStateManager(this);
        
        // Hide loading screen and show HUD
        this.uiManager.setLoadingVisible(false);
        this.uiManager.setHUDVisible(true);
        
        // Start game loop with explicit timestamp of 0 for first frame
        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }
    
    /**
     * Update screen dimensions in the game config
     */
    updateScreenDimensions() {
        GameConfig.screen.width = window.innerWidth;
        GameConfig.screen.height = window.innerHeight;
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
            this.player.update(cappedDelta, this.inputHandler.keys);
            
            // Update asteroids
            this.asteroidManager.update(cappedDelta);
            
            // Update collision system - make sure this runs after all entities have updated their positions
            Collisions.update();
            
            // Update explosions
            this.updateExplosions(cappedDelta);
            
            // Update starfield (scrolling effect)
            this.sceneManager.updateStarfield(cappedDelta);
            
            // Check if player is still alive
            if (this.player.getHealth() <= 0) {
                this.gameOver();
            }
        }
        
        // Render the scene
        this.renderer.render();
        
        // Request the next animation frame if not destroyed
        if (!this.isDestroyed) {
            requestAnimationFrame(this.animate.bind(this));
        }
    }
    
    /**
     * Update all active explosions
     * @param {number} deltaTime - Time delta in seconds
     */
    updateExplosions(deltaTime) {
        for (let i = 0; i < this.explosions.length; i++) {
            const explosion = this.explosions[i];
            const isActive = explosion && explosion.isActive;
            if (isActive) {
                explosion.update(deltaTime);
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
            throw new Error("Missing player or asteroidManager in gameOver()");
        }
        
        // Create a final explosion for the player ship
        const playerPosition = this.player.getPosition();
        // Get explosion size multiplier from config or use default
        const explosionSizeMultiplier = GameConfig.collision?.playerDeathExplosionMultiplier || 2;
        // Create a large explosion at the player's position
        const explosionSize = this.player.getHitSphereRadius() * explosionSizeMultiplier;
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
            throw new Error("Missing stateManager in gameOver()");
        }
    }
    
    restart() {
        console.log("Game restart initiated, previous state - isGameOver:", this.isGameOver);
        
        // Reset game state flags
        this.isGameOver = false;
        this.isPaused = false;
        
        // Reset collision system
        Collisions.clear();
        
        // Reset player
        if (this.player) {
            this.player.destroy();
        }
        this.player = new Player(this.scene);
        
        // Reset asteroids
        if (this.asteroidManager) {
            this.asteroidManager.destroy();
        }
        this.asteroidManager = new AsteroidManager(this.scene);
        
        // Reset explosions
        this.explosions = [];
        
        // Reset UI
        this.uiManager.reset();
        
        // Reset event handlers
        this.setupCollisionHandlers();
        
        // Reset clock
        this.clock.start();
        
        console.log("Game restart completed");
    }
    
    update(time, deltaTime) {
        // Setup frame counter if not exists
        if (this._frameCounter === undefined) {
            this._frameCounter = 0;
        }
        this._frameCounter++;
        
        // Skip if the state is destroyed
        if (this.isDestroyed) {
            return;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        console.log("Destroying gameplay state");
        
        // Set destroyed flag to stop animation loop
        this.isDestroyed = true;
        
        // Cancel animation frame if it exists
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Clear collision system
        Collisions.clear();
        
        // Unsubscribe from collision events
        if (this.collisionDetectedHandler) {
            this.collisionDetectedHandler();
            this.collisionDetectedHandler = null;
        }
        
        // Destroy player
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        
        // Destroy asteroid manager
        if (this.asteroidManager) {
            this.asteroidManager.destroy();
            this.asteroidManager = null;
        }
        
        // Remove all explosions
        this.explosions.forEach(explosion => {
            explosion.isActive = false;
        });
        this.explosions = [];
        
        // Destroy UI manager
        if (this.uiManager) {
            this.uiManager.destroy();
            this.uiManager = null;
        }
        
        // Destroy input handler
        if (this.inputHandler) {
            this.inputHandler.destroy();
            this.inputHandler = null;
        }
        
        // Destroy scene manager
        if (this.sceneManager) {
            this.sceneManager.destroy();
            this.sceneManager = null;
        }
        
        // Destroy renderer
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
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
                        if (asteroid.renderer) {
                            // Access hit sphere through the renderer
                            if (!asteroid.renderer.hitSphere) {
                                asteroid.renderer.createHitSphere();
                            }
                            
                            // Set visibility through the renderer
                            asteroid.renderer.setHitSphereVisible(GameConfig.asteroid.debug.showHitSpheres);
                            
                            // Reset color
                            if (asteroid.renderer.hitSphere) {
                                asteroid.renderer.hitSphere.material.color.set(0x00ff00);
                            }
                        }
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
            GameConfig.explosion.model.path,
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

    _render() {
        this._frameCounter++;
        // Remove frame rendering log
        this.renderer.render(this.scene, this.camera);
    }

    _updateExplosions(deltaTime) {
        // Update and remove completed explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            
            // Skip if already inactive
            if (!explosion.isActive) {
                this.explosions.splice(i, 1);
                continue;
            }
            
            // Update explosion
            const isActive = explosion.update(deltaTime);
            
            // Remove from active list if complete but don't destroy
            // since we're now pooling explosions
            if (!isActive) {
                this.explosions.splice(i, 1);
                // Already marked as inactive in the update method
                // and visual elements have been hidden
            }
        }
    }

    /**
     * Initialize the explosion system and pool
     * @private
     */
    _initExplosionSystem() {
        // Initialize explosion array
        this.explosions = [];
        
        // Set up explosion pool settings
        this.explosionPoolSize = 20; // Maximum number of simultaneous explosions
        this.explosionPool = [];
        
        // Pre-create explosion pool
        for (let i = 0; i < this.explosionPoolSize; i++) {
            const explosion = new Explosion(this.scene);
            explosion.isActive = false;
            this.explosionPool.push(explosion);
        }
    }

    /**
     * Get an explosion from the pool
     * @param {THREE.Vector3} position - Position for the explosion
     * @param {number} size - Size of the explosion
     * @returns {Explosion} The explosion instance
     * @private
     */
    _getExplosion(position, size) {
        // First, try to find an inactive explosion in the pool
        for (let i = 0; i < this.explosionPool.length; i++) {
            if (!this.explosionPool[i].isActive) {
                const explosion = this.explosionPool[i];
                explosion.explode(position.x, position.y, position.z, size);
                explosion.isActive = true;
                return explosion;
            }
        }
        
        // If all explosions are active, reuse the oldest one
        if (this.explosionPool.length > 0) {
            const oldestExplosion = this.explosionPool.shift();
            oldestExplosion.explode(position.x, position.y, position.z, size);
            this.explosionPool.push(oldestExplosion);
            return oldestExplosion;
        }
        
        // If pool is empty (should never happen), create a new one
        const newExplosion = new Explosion(this.scene, position, size);
        this.explosionPool.push(newExplosion);
        return newExplosion;
    }

    /**
     * Set up the game state
     */
    setup() {
        // ... existing setup code ...
        
        // Initialize explosion system before other systems
        this._initExplosionSystem();
        
        // ... rest of existing setup code ...
    }

    /**
     * Handle bullet-asteroid collisions
     * @param {Object} data - Collision data
     * @private
     */
    _handleBulletAsteroidCollision(data) {
        if (!data.bullet || !data.asteroid) return;
        
        // Only process if both objects are still valid
        if (!data.bullet.isDestroyed && !data.asteroid.isDestroyed) {
            // Get impact position for better explosion placement
            const impactPoint = data.position || data.asteroid.getPosition();
            
            // Calculate explosion size from config
            const explosionSizeRatio = GameConfig.collision?.bulletAsteroidExplosionRatio || 0.5;
            const explosionSize = data.asteroid.size * explosionSizeRatio;
            
            // Create explosion from pool
            const explosion = this._getExplosion(impactPoint, explosionSize);
            this.explosions.push(explosion);
            
            // Destroy asteroid through manager
            this.asteroidManager.destroyAsteroidByEntity(data.asteroid, impactPoint);
            
            // Destroy bullet through player
            this.player.removeBullet(data.bullet);
        }
    }

    /**
     * Update explosions
     * @param {number} deltaTime - Time since last update in seconds
     * @private
     */
    _updateExplosions(deltaTime) {
        // Update and remove completed explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            
            // Skip if already inactive
            if (!explosion.isActive) {
                this.explosions.splice(i, 1);
                continue;
            }
            
            // Update explosion
            const isActive = explosion.update(deltaTime);
            
            // Remove from active list if complete but don't destroy
            // since we're now pooling explosions
            if (!isActive) {
                this.explosions.splice(i, 1);
                // Already marked as inactive in the update method
                // and visual elements have been hidden
            }
        }
    }
} 