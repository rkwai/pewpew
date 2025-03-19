import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Asteroid } from './Asteroid.js';
import { Explosion } from './Explosion.js';
import { UIManager } from '../states/UIManager.js';
import { Store, GameState, ActionTypes } from '../utilities/GameStore.js';
import { Events } from '../states/EventSystem.js';
import { getRandomInRange } from '../utilities/Utils.js';
import { EventTypes } from '../states/EventTypes.js';
import { Collisions } from '../states/CollisionManager.js';
import { CollisionTypes } from '../states/CollisionSystem.js';

/**
 * Manages all asteroids in the game, including spawning, updating, and collision detection
 */
export class AsteroidManager {
    /**
     * Create a new asteroid manager
     * @param {THREE.Scene} scene - The scene to add asteroids to
     */
    constructor(scene) {
        this.scene = scene;
        this._asteroids = [];
        this._spawnTimer = 0;
        this._score = 0;
        
        // Use default spawn rate if config is missing
        this._spawnRate = (GameConfig.asteroid && GameConfig.asteroid.spawnRate) 
            ? GameConfig.asteroid.spawnRate 
            : 2; // Default: 2 per second
            
        this.uiManager = new UIManager();
        
        // Subscribe to store updates
        this.unsubscribe = Events.on('STORE_UPDATED', (data) => {
            this.handleStoreUpdate(data);
        });
    }
    
    /**
     * Handle store updates
     * @param {Object} data - Data from store update event
     */
    handleStoreUpdate(data) {
        const { action, state } = data;
        
        switch (action.type) {
            case ActionTypes.GAME_RESTART:
                this.reset();
                break;
                
            case ActionTypes.GAME_OVER:
                // Stop spawning new asteroids
                this._spawnRate = 0;
                break;
                
            case ActionTypes.SCORE_RESET:
                this._score = 0;
                this.uiManager.updateScoreDisplay(0);
                break;
        }
    }
    
    /**
     * Update all asteroids
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Get game state to see if we should update
        const gameState = Store.getState();
        if (gameState.isPaused || gameState.isGameOver) {
            return;
        }
        
        // Update spawn timer
        if (this._spawnRate > 0) {
            this._spawnTimer += deltaTime;
            
            // Spawn new asteroid if timer exceeds spawn interval
            const spawnInterval = 1 / this._spawnRate;
            if (this._spawnTimer >= spawnInterval) {
                this._spawnTimer = 0;
                this.spawnAsteroid();
            }
        }
        
        // Update existing asteroids and remove any that go off-screen
        for (let i = this._asteroids.length - 1; i >= 0; i--) {
            const asteroid = this._asteroids[i];
            
            // Skip destroyed asteroids that weren't properly removed
            if (!asteroid || asteroid.isDestroyed) {
                console.warn('Found destroyed asteroid that wasn\'t properly removed. Cleaning up now.');
                this._asteroids.splice(i, 1);
                continue;
            }
            
            // Update position
            const newPosition = asteroid.update(deltaTime);
            
            // Check if asteroid is out of bounds
            if (asteroid.isOutOfBounds()) {
                this.removeAsteroid(i);
            }
        }
    }
    
    /**
     * Spawn a new asteroid
     */
    spawnAsteroid() {
        // Get random spawn position
        const spawnPosition = this.getRandomSpawnPosition();
        
        // Generate random size between min and max
        const minSize = GameConfig.asteroid?.minSize || 20;
        const maxSize = GameConfig.asteroid?.maxSize || 70;
        const size = minSize + Math.random() * (maxSize - minSize);
        
        // Calculate velocity based on size (smaller asteroids move faster)
        const minSpeed = GameConfig.asteroid?.minSpeed || 75;
        const maxSpeed = GameConfig.asteroid?.maxSpeed || 150;
        
        // Calculate final speed - smaller asteroids move faster
        const sizeSpeedFactor = 1 - ((size - minSize) / (maxSize - minSize)) * 0.5;
        const speed = (minSpeed + Math.random() * (maxSpeed - minSpeed)) * sizeSpeedFactor;
        
        // Create velocity vector (moving from right to left)
        const velocity = new THREE.Vector3(
            -speed, // Moving left (negative X)
            Math.random() * 40 - 20, // Small random Y variation
            0 // Z-axis locked at 0
        );
        
        
        // Create new asteroid
        const asteroid = new Asteroid(this.scene, {
            size: size,
            position: spawnPosition,
            velocity: velocity
        });
        
        // Add to asteroids array
        this._asteroids.push(asteroid);
        
        // Register with collision system
        Collisions.register(asteroid, CollisionTypes.ASTEROID);
        
        return asteroid;
    }
    
    /**
     * Remove an asteroid
     * @param {number} index - Index of the asteroid to remove
     */
    removeAsteroid(index) {
        if (index >= 0 && index < this._asteroids.length) {
            const asteroid = this._asteroids[index];
            
            // Skip if asteroid is already destroyed
            if (!asteroid || asteroid.isDestroyed) {
                console.warn('Trying to remove an already destroyed asteroid. Cleaning up array only.');
                this._asteroids.splice(index, 1);
                return;
            }
            
            // Mark as destroyed for safety
            asteroid.isDestroyed = true;
            
            // Unregister from collision system
            Collisions.unregister(asteroid, CollisionTypes.ASTEROID);
            
            // Clean up resources
            asteroid.destroy();
            
            // Remove from array
            this._asteroids.splice(index, 1);
        }
    }
    
    /**
     * Destroy an asteroid and create an explosion
     * @param {number} index - Index of the asteroid to destroy
     * @param {THREE.Vector3} impactPoint - Optional impact point for explosion
     */
    destroyAsteroid(index, impactPoint = null) {
        if (index >= 0 && index < this._asteroids.length) {
            const asteroid = this._asteroids[index];
            const position = asteroid.getPosition();
            const size = asteroid.size;
            
            // Calculate explosion size from config or use default ratio
            const explosionSizeRatio = GameConfig.asteroid?.explosionSizeRatio || 0.3;
            
            // Create explosion - check if we have a gameplay reference with explosion pool
            if (window.gameState && window.gameState.gameplay && typeof window.gameState.gameplay._getExplosion === 'function') {
                // Use explosion pool if available
                const explosion = window.gameState.gameplay._getExplosion(
                    impactPoint || position, 
                    size * explosionSizeRatio
                );
                
                // Add to active explosions list
                if (window.gameState.gameplay.explosions) {
                    window.gameState.gameplay.explosions.push(explosion);
                }
            } else {
                // Fallback to creating a new explosion directly
                new Explosion(this.scene, impactPoint || position, size * explosionSizeRatio);
            }
            
            // Unregister from collision system
            Collisions.unregister(asteroid, CollisionTypes.ASTEROID);
            
            // Clean up resources
            asteroid.destroy();
            
            // Remove from array
            this._asteroids.splice(index, 1);
            
            // Increment score based on asteroid size
            this.incrementScore(Math.round(size * 10));
            
            // Emit event
            Events.emit(EventTypes.ASTEROID_DESTROYED, {
                position: position,
                size: size
            });
        }
    }
    
    /**
     * Destroy an asteroid by entity reference
     * @param {Asteroid} asteroid - The asteroid to destroy
     * @param {THREE.Vector3} impactPoint - Optional impact point for explosion
     */
    destroyAsteroidByEntity(asteroid, impactPoint = null) {
        const index = this._asteroids.indexOf(asteroid);
        if (index !== -1) {
            this.destroyAsteroid(index, impactPoint);
        }
    }
    
    /**
     * Increment the score
     * @param {number} value - Value to increment by
     */
    incrementScore(value) {
        if (!Store.getState().isGameOver) {
            this._score += value;
            
            // Update UI
            this.uiManager.updateScoreDisplay(this._score);
            
            // Check if score milestone reached
            this.checkScoreMilestones(value);
            
            // Update store
            Store.dispatch({
                type: ActionTypes.SCORE_INCREMENT,
                payload: this._score
            });
        }
    }
    
    /**
     * Check if any score milestones have been reached
     * @param {number} lastIncrementValue - The last score increment value
     */
    checkScoreMilestones(lastIncrementValue) {
        const milestones = GameConfig.scoreMilestones || {};
        
        // Increase spawn rate at certain score milestones
        Object.keys(milestones).forEach(scoreThreshold => {
            const threshold = parseInt(scoreThreshold);
            // Check if we just crossed the threshold
            if (this._score >= threshold && (this._score - lastIncrementValue) < threshold) {
                const milestone = milestones[scoreThreshold];
                
                // Apply spawn rate change if specified
                if (milestone.spawnRateMultiplier) {
                    this._spawnRate *= milestone.spawnRateMultiplier;
                }
                
                // Emit event
                Events.emit(EventTypes.SCORE_MILESTONE_REACHED, {
                    score: this._score,
                    milestone: milestone
                });
            }
        });
    }
    
    /**
     * Reset the asteroid manager
     */
    reset() {
        // Remove all asteroids
        for (let i = this._asteroids.length - 1; i >= 0; i--) {
            this.removeAsteroid(i);
        }
        
        // Reset spawn rate
        this._spawnRate = (GameConfig.asteroid && GameConfig.asteroid.spawnRate) 
            ? GameConfig.asteroid.spawnRate 
            : 2;
            
        // Reset spawn timer
        this._spawnTimer = 0;
    }
    
    /**
     * Get all active asteroids
     * @returns {Array} Array of active asteroids
     */
    getAsteroids() {
        return this._asteroids;
    }
    
    /**
     * Get a random spawn position for a new asteroid
     * @returns {THREE.Vector3} Random spawn position
     */
    getRandomSpawnPosition() {
        // Use config values if available
        const minSpawnX = GameConfig.asteroid?.minSpawnX || 400;
        const maxSpawnX = GameConfig.asteroid?.maxSpawnX || 450;
        const minSpawnY = GameConfig.asteroid?.minSpawnY || -200;
        const maxSpawnY = GameConfig.asteroid?.maxSpawnY || 200;
        const spawnZ = GameConfig.screen?.bounds?.z || 0;
        
        // Spawn position just off the right edge of the screen with random Y position
        const spawnX = minSpawnX + Math.random() * (maxSpawnX - minSpawnX);
        const spawnY = minSpawnY + Math.random() * (maxSpawnY - minSpawnY);
        
        return new THREE.Vector3(spawnX, spawnY, spawnZ);
    }
    
    /**
     * Get current score
     * @returns {number} Current score
     */
    getScore() {
        return this._score;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Unsubscribe from store updates
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Remove all asteroids
        this.reset();
        
        // Clear references
        this.scene = null;
        this._asteroids = [];
        this.uiManager = null;
    }
} 