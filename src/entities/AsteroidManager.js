import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { Asteroid } from './Asteroid.js';
import { checkCollision } from '../utilities/Utils.js';
import { Explosion } from './Explosion.js';
import { UIManager } from '../states/UIManager.js';
import { Events } from '../utilities/EventSystem.js';
import { ObjectPool } from '../utilities/ObjectPool.js';
import { Store, ActionTypes } from '../utilities/GameStore.js';

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
        
        // Create an object pool for asteroids
        const initialPoolSize = GameConfig.asteroid?.poolSize || 20;
        const expandAmount = GameConfig.objectPool?.asteroid?.expandAmount || 10;
        
        this._asteroidPool = new ObjectPool(
            // Factory function: creates a new asteroid but doesn't add to scene yet
            () => new Asteroid(this.scene),
            // Reset function: resets an asteroid to a new state
            (asteroid, position) => asteroid.reset(position),
            // Initial pool size
            initialPoolSize,
            // Options
            {
                autoExpand: GameConfig.objectPool?.enabled !== false,
                expandAmount: expandAmount
            }
        );
        
        // Log pool creation
        console.log(`Created asteroid pool with ${initialPoolSize} initial objects (expandAmount: ${expandAmount})`);
        
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
     * @param {Object} player - The player object to check for collisions
     */
    update(deltaTime, player) {
        // Get game state to see if we should update
        const gameState = Store.getState();
        if (gameState.isPaused || gameState.isGameOver) {
            return;
        }
        
        // Spawn new asteroids
        this._spawnTimer += deltaTime;
        if (this._spawnTimer >= 1.0 / this._spawnRate) {
            this.spawnAsteroid();
            this._spawnTimer = 0;
        }
        
        // Update existing asteroids
        for (let i = this._asteroids.length - 1; i >= 0; i--) {
            const asteroid = this._asteroids[i];
            
            // Skip if asteroid or its position is undefined (can happen during initialization)
            if (!asteroid || !asteroid.position) {
                console.warn('Found asteroid without position property, removing:', asteroid);
                this.removeAsteroid(i);
                continue;
            }
            
            // Update position
            asteroid.update(deltaTime);
            
            // Check if asteroid is out of bounds
            if (asteroid.position.x < -1000) {
                this.removeAsteroid(i);
                continue;
            }
            
            // Check for collision with player
            if (player && player._position && !player.isInvulnerable() && checkCollision(asteroid, player)) {
                // Player hit asteroid
                const damage = Math.ceil(asteroid.size * 10); // Size-based damage
                player.takeDamage(damage, asteroid.position);
                
                // Remove asteroid
                this.destroyAsteroid(i);
                
                // Log collision
                console.log(`Player hit by asteroid for ${damage} damage`);
                
                // Dispatch collision event to store
                Store.dispatch({
                    type: ActionTypes.COLLISION_DETECTED,
                    payload: { type: 'player-asteroid', damage }
                });
                
                continue;
            }
            
            // Check for collision with player bullets
            if (player && player.bulletManager) {
                const bullets = player.bulletManager.getActiveBullets();
                let bulletHit = false;
                
                for (let j = 0; j < bullets.length; j++) {
                    const bullet = bullets[j];
                    
                    // Skip if bullet or bullet.position is undefined
                    if (!bullet || !bullet.position) continue;
                    
                    if (checkCollision(asteroid, bullet)) {
                        // Bullet hit asteroid
                        player.bulletManager.removeBullet(bullet);
                        
                        // Remove asteroid
                        this.destroyAsteroid(i);
                        
                        // Increment score
                        const scoreValue = Math.ceil(asteroid.size * 100);
                        this.incrementScore(scoreValue);
                        
                        // Log hit
                        console.log(`Asteroid destroyed by bullet, score: ${scoreValue}`);
                        
                        bulletHit = true;
                        break;
                    }
                }
                
                if (bulletHit) continue;
            }
        }
        
        // Clean up resources that need to be managed each frame
        this.cleanupResources();
    }
    
    /**
     * Clean up resources that need to be managed each frame
     * Called by Gameplay.animate() each frame to handle cleanup tasks
     */
    cleanupResources() {
        // In our refactored code, cleanup is handled directly in the update method
        // and through object pooling. This method exists to maintain compatibility
        // with Gameplay.js which expects it to exist.
        
        // No additional cleanup needed in our new implementation since:
        // 1. Destroyed asteroids are immediately returned to the pool in update()
        // 2. Object references are managed by the store
        
        // Update asteroid count in the store if needed
        const state = Store.getState();
        if (state.entities.asteroidCount !== this._asteroids.length) {
            Store.dispatch({
                type: 'UPDATE_ASTEROID_COUNT',
                payload: this._asteroids.length
            });
        }
    }
    
    /**
     * Spawn a new asteroid
     */
    spawnAsteroid() {
        // Get an asteroid from the pool
        const position = this.getRandomSpawnPosition();
        const asteroid = this._asteroidPool.get(position);
        
        if (asteroid) {
            // Add to active asteroids
            this._asteroids.push(asteroid);
            
            // Dispatch action to store
            Store.dispatch({
                type: 'ASTEROID_SPAWNED',
                payload: { position, id: asteroid.id }
            });
            
            // Update asteroid count in the store
            const state = Store.getState();
            if (state.entities.asteroidCount !== this._asteroids.length) {
                Store.dispatch({
                    type: 'UPDATE_ASTEROID_COUNT',
                    payload: this._asteroids.length
                });
            }
        }
    }
    
    /**
     * Remove an asteroid from the game
     * @param {number} index - Index of the asteroid to remove
     */
    removeAsteroid(index) {
        if (index >= 0 && index < this._asteroids.length) {
            const asteroid = this._asteroids[index];
            
            // Remove from the active list
            this._asteroids.splice(index, 1);
            
            // Return to pool
            this._asteroidPool.release(asteroid);
            
            // Update asteroid count in the store
            Store.dispatch({
                type: 'UPDATE_ASTEROID_COUNT',
                payload: this._asteroids.length
            });
        }
    }
    
    /**
     * Destroy an asteroid (with explosion effect)
     * @param {number} index - Index of the asteroid to destroy
     */
    destroyAsteroid(index) {
        if (index >= 0 && index < this._asteroids.length) {
            const asteroid = this._asteroids[index];
            
            // Create explosion
            const explosion = new Explosion();
            explosion.explode(
                asteroid.position.x,
                asteroid.position.y,
                asteroid.position.z,
                asteroid.size
            );
            
            // Dispatch to store
            Store.dispatch({
                type: ActionTypes.ASTEROID_DESTROYED,
                payload: { id: asteroid.id, position: asteroid.position.clone() }
            });
            
            // Remove from scene (this also returns it to the pool)
            this.removeAsteroid(index);
        }
    }
    
    /**
     * Increment the score
     * @param {number} value - Amount to add to score
     */
    incrementScore(value) {
        // Use store to update score
        Store.dispatch({ 
            type: ActionTypes.SCORE_INCREMENT, 
            payload: value 
        });
        
        // Update local score for reference
        this._score += value;
        
        // Update UI
        this.uiManager.updateScoreDisplay(this._score);
    }
    
    /**
     * Reset the asteroid manager, clearing all asteroids
     */
    reset() {
        // Clear all active asteroids
        while (this._asteroids.length > 0) {
            this.removeAsteroid(0);
        }
        
        // Reset spawn timer and rate
        this._spawnTimer = 0;
        this._spawnRate = GameConfig.asteroid?.spawnRate || 2;
        
        // Reset score
        this._score = 0;
        this.uiManager.updateScoreDisplay(0);
        
        // Reset asteroid count in store
        Store.dispatch({
            type: 'UPDATE_ASTEROID_COUNT',
            payload: 0
        });
        
        console.log('Asteroid manager reset');
    }
    
    /**
     * Get a random spawn position for a new asteroid
     * @returns {THREE.Vector3} Random spawn position
     */
    getRandomSpawnPosition() {
        // Spawn off the right side of the screen
        const x = 1000;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 200;
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * Get the current score
     * @returns {number} Current score
     */
    getScore() {
        return this._score;
    }
    
    /**
     * Clear all resources
     */
    destroy() {
        // Unsubscribe from store events
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Clear all active asteroids
        while (this._asteroids.length > 0) {
            this.removeAsteroid(0);
        }
        
        // Destroy the pool
        this._asteroidPool.destroy();
        
        // Clear references
        this.scene = null;
        this._asteroids = [];
        this._asteroidPool = null;
        
        console.log('Asteroid manager destroyed');
    }
} 