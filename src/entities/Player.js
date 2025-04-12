import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { enhanceMaterial } from '../utilities/renderingUtils.js';
import { Explosion } from './Explosion.js';
import { Bullet } from './Bullet.js';
import { BulletManager } from './BulletManager.js';
import { UIManager } from '../states/UIManager.js';
import { Events } from '../states/EventSystem.js';
import { Store, GameState, ActionTypes } from '../utilities/GameStore.js';
import { EventTypes } from '../states/EventTypes.js';
import { Collisions } from '../states/CollisionManager.js';
import { CollisionTypes } from '../states/CollisionSystem.js';
import { PlayerRenderer } from './renderers/PlayerRenderer.js';

/**
 * Player class representing the user-controlled spaceship
 */
export class Player {
    /**
     * Create a new player
     * @param {THREE.Scene} scene - The scene to add the player to
     */
    constructor(scene) {
        this.scene = scene;
        this._position = new THREE.Vector3(
            GameConfig.player.defaultPosition.x,
            GameConfig.player.defaultPosition.y,
            GameConfig.player.defaultPosition.z
        );
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._acceleration = new THREE.Vector3(0, 0, 0);
        this._rotation = new THREE.Euler(0, 0, 0);
        this._health = GameConfig.player.maxHealth || GameConfig.player.health || 100;
        this._maxHealth = GameConfig.player.maxHealth || GameConfig.player.health || 100;
        this._invulnerableTime = 0;
        this._isAlive = true;
        this._active = true; // Make sure player is active
        this._size = GameConfig.player.hitSphereRadius || 15; // Use config value if available
        this._hitbox = new THREE.Box3();
        
        // Set collision type
        this.type = CollisionTypes.PLAYER;
        
        // Initialize managers
        this.bulletManager = new BulletManager(scene);
        this.uiManager = new UIManager();
        
        // Initialize renderer
        this.renderer = new PlayerRenderer(scene);
        
        // Hide loading screen and show HUD immediately
        this.uiManager.setLoadingVisible(false);
        this.uiManager.setHUDVisible(true);
        
        // Log debug info
        setTimeout(() => this.logDebugInfo(), 1000); // Log after 1 second to ensure model is loaded
        
        // Subscribe to store updates
        this.unsubscribe = Events.on(EventTypes.STORE_UPDATED, (data) => {
            this.handleStoreUpdate(data);
        });
        
        // Subscribe to collision events
        this.collisionUnsubscribe = Events.on(EventTypes.ENTITY_COLLISION, (data) => {
            this.handleCollisionEvent(data);
        });
        
        // Register with collision system
        Collisions.register(this, CollisionTypes.PLAYER);
        
        // Update the health display
        Events.emit(EventTypes.UI_HEALTH_CHANGED, {
            previousHealth: 0,
            newHealth: this._health,
            maxHealth: this._maxHealth,
            damage: 0
        });
        
        // Add firing cooldown
        this._lastFireTime = 0;
        this._fireCooldown = GameConfig.player.fireCooldown || 0.25; // 250ms between shots
    }
    
    /**
     * Handle store updates
     * @param {Object} data - Data from store update event
     */
    handleStoreUpdate(data) {
        // Only handle store updates, not other events
        if (!data || !data.action || !data.state) {
            return;
        }

        const { action, state } = data;
        
        switch (action.type) {
            case ActionTypes.GAME_RESTART:
                this.reset();
                break;
                
            case ActionTypes.GAME_OVER:
                // Handle game over
                break;
        }
    }
    
    /**
     * Handle collision events
     * @param {Object} data - Collision event data
     */
    handleCollisionEvent(data) {
        const { entityA, entityB, point } = data;
        
        // Check if collision involves the player
        if (entityA === this || entityB === this) {
            const otherEntity = entityA === this ? entityB : entityA;
            
            // Handle collision with asteroid
            if (otherEntity.type === CollisionTypes.ASTEROID) {
                const damage = Math.ceil(otherEntity.size * 10);
                this.takeDamage(damage, point);
            }
        }
    }
    
    /**
     * Update the player's hitbox
     */
    _updateHitbox() {
        if (this.renderer && this.renderer.model) {
            this._hitbox.setFromObject(this.renderer.model);
        }
    }
    
    /**
     * Update the player
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Object} input - Input state
     */
    update(deltaTime, input) {
        // Skip update if player is inactive
        if (!this._active) return;
        
        // Map input keys if provided
        const mappedInput = input ? {
            up: input.ArrowUp,
            down: input.ArrowDown,
            left: input.ArrowLeft,
            right: input.ArrowRight,
            fire: input.Space || input.KeyZ
        } : null;
        
        if (!this._frameCounter) this._frameCounter = 0;
        this._frameCounter++;
        
        // Process inputs
        this._processInput(deltaTime, mappedInput);
        
        // Update velocity based on acceleration
        this._velocity.add(this._acceleration.clone().multiplyScalar(deltaTime));
        
        // Apply drag
        this._velocity.multiplyScalar(GameConfig.player.damping || 0.95);
        
        // Update position based on velocity
        this._position.add(this._velocity.clone().multiplyScalar(deltaTime));
        
        // Reset acceleration for next frame
        this._acceleration.set(0, 0, 0);
        
        // Update renderer with current position, rotation, and state
        const isAccelerating = Boolean(mappedInput && (mappedInput.up || mappedInput.down || mappedInput.left || mappedInput.right));
        if (this.renderer) {
            this.renderer.update(
                this._position, 
                this._rotation, 
                {
                    deltaTime, 
                    isAccelerating,
                    isInvulnerable: this.isInvulnerable(),
                    invulnerableTime: this._invulnerableTime
                }
            );
        }
        
        // Update hitbox
        this._updateHitbox();
        
        // Get game state to see if we should update
        const gameState = Store.getState();
        if (gameState.isPaused || gameState.isGameOver || !this._isAlive) {
            return;
        }
        
        // Update invulnerability timer
        if (this._invulnerableTime > 0) {
            this._invulnerableTime -= deltaTime;
        }
        
        // Update bullets
        if (this.bulletManager) {
            this.bulletManager.update(deltaTime);
        }
        
        // Constrain player to screen bounds
        this._constrainToScreen();
    }
    
    /**
     * Handle player input
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Object} input - Input state
     */
    _processInput(deltaTime, input) {
        // Get movement speed from config
        const speed = GameConfig.player.speed || 500;
        
        // Apply movement based on input (now for 3D forward view)
        if (input && input.up) {
            this._acceleration.y += speed; // Move up
        }
        if (input && input.down) {
            this._acceleration.y -= speed; // Move down
        }
        if (input && input.left) {
            this._acceleration.x -= speed; // Move left
        }
        if (input && input.right) {
            this._acceleration.x += speed; // Move right
        }
        
        // Update rotation based on movement direction
        // The ship should roll slightly when moving left/right
        if (input && input.left) {
            this._rotation.z = GameConfig.player.rotationEffects?.leftRoll || 0.2; // Roll when moving left
        } else if (input && input.right) {
            this._rotation.z = GameConfig.player.rotationEffects?.rightRoll || -0.2; // Roll when moving right
        } else {
            this._rotation.z = 0; // Reset roll when not moving horizontally
        }
        
        // Also pitch slightly when moving up/down
        if (input && input.up) {
            this._rotation.x = GameConfig.player.rotationEffects?.upPitch || -0.1; // Pitch up when moving up
        } else if (input && input.down) {
            this._rotation.x = GameConfig.player.rotationEffects?.downPitch || 0.1; // Pitch down when moving down
        } else {
            this._rotation.x = 0; // Reset pitch when not moving vertically
        }
        
        // Shooting
        if (input && input.fire) {
            this.fire();
        }
    }
    
    /**
     * Constrain player position to screen bounds
     */
    _constrainToScreen() {
        // Get player boundaries from config
        const boundaries = GameConfig.player && GameConfig.player.boundaries;
        if (!boundaries) return;
        
        // Constrain player position
        this._position.x = Math.max(boundaries.xMin, Math.min(this._position.x, boundaries.xMax));
        this._position.y = Math.max(boundaries.yMin, Math.min(this._position.y, boundaries.yMax));
        this._position.z = GameConfig.screen.bounds.z; // Lock z position to 0
        
        // Update renderer with new position
        this.renderer.updateTransform(this._position, this._rotation);
    }
    
    /**
     * Fire a bullet
     */
    fire() {
        // Skip if player is not alive
        if (!this._isAlive) return;
        
        // Check cooldown
        const currentTime = performance.now() / 1000; // Convert to seconds
        if (currentTime - this._lastFireTime < this._fireCooldown) {
            return;
        }
        this._lastFireTime = currentTime;
        
        // Get the point where the bullet should originate
        const bulletPosition = this._position.clone();
        bulletPosition.x += GameConfig.player.bulletOffset?.x || 30; // Offset to right of player
        
        // Set direction to right (positive X)
        const bulletDirection = new THREE.Vector3(1, 0, 0);
        
        // Create a bullet from this position going right
        this.bulletManager.createBullet(bulletPosition, bulletDirection);
    }
    
    /**
     * Take damage
     * @param {number} amount - Amount of damage to take
     * @param {THREE.Vector3} sourcePosition - Position of damage source
     */
    takeDamage(amount, sourcePosition) {
        // Ignore damage if invulnerable
        if (this.isInvulnerable()) {
            return;
        }
        
        // Keep damage logging as it's important for debugging
        console.log(`Player taking damage: ${amount}, from position: ${sourcePosition ? `${sourcePosition.x.toFixed(1)}, ${sourcePosition.y.toFixed(1)}, ${sourcePosition.z.toFixed(1)}` : 'unknown'}`);
        
        // Calculate new health
        const oldHealth = this._health;
        this._health = Math.max(0, this._health - amount);
        
        // Emit health changed event
        Events.emit(EventTypes.UI_HEALTH_CHANGED, {
            previousHealth: oldHealth,
            newHealth: this._health,
            maxHealth: this._maxHealth,
            damage: amount
        });
        
        // Dispatch to store
        Store.dispatch({
            type: ActionTypes.PLAYER_TAKE_DAMAGE,
            payload: amount
        });
        
        // Make invulnerable for a short time
        this._invulnerableTime = GameConfig.player.invulnerabilityDuration || 2.0;
        
        // Check if dead
        if (this._health <= 0 && this._isAlive) {
            this._isAlive = false;
            
            // Emit player death event
            Events.emit(EventTypes.PLAYER_DIED, {
                player: this,
                position: this._position.clone()
            });
            
            // Dispatch to store
            Store.dispatch({
                type: ActionTypes.PLAYER_DEATH,
                payload: { position: this._position.clone() }
            });
        }
    }
    
    /**
     * Check if player is invulnerable
     * @returns {boolean} True if player is invulnerable
     */
    isInvulnerable() {
        return this._invulnerableTime > 0;
    }
    
    /**
     * Get player position
     * @returns {THREE.Vector3} Player position
     */
    getPosition() {
        return this._position.clone();
    }
    
    /**
     * Get player health
     * @returns {number} Player health
     */
    getHealth() {
        return this._health;
    }
    
    /**
     * Get player hitbox
     * @returns {THREE.Box3} Player hitbox
     */
    getHitbox() {
        return this._hitbox;
    }
    
    /**
     * Get player collision size
     * @returns {number} Player collision size
     */
    getSize() {
        return this._size;
    }
    
    /**
     * Get the player's hit sphere radius for collision detection
     * @returns {number} Hit sphere radius
     */
    getHitSphereRadius() {
        return this._size;
    }
    
    /**
     * Get the player's hit sphere position for collision detection
     * @returns {THREE.Vector3} Hit sphere position
     */
    getHitSpherePosition() {
        return this._position.clone();
    }
    
    /**
     * Reset the player
     */
    reset() {
        // Reset position and velocity
        this._position.set(
            GameConfig.player.defaultPosition.x,
            GameConfig.player.defaultPosition.y,
            GameConfig.player.defaultPosition.z
        );
        this._velocity.set(0, 0, 0);
        this._acceleration.set(0, 0, 0);
        
        // Reset health
        this._health = this._maxHealth;
        
        // Reset invulnerability
        this._invulnerableTime = 0;
        
        // Reset alive state
        this._isAlive = true;
        
        // Update renderer
        this.renderer.updateTransform(this._position, this._rotation);
        this.renderer.updateInvulnerabilityEffect(false, 0);
        
        // Reset bullets
        this.bulletManager.reset();
        
        // Emit health changed event
        Events.emit(EventTypes.UI_HEALTH_CHANGED, {
            previousHealth: 0,
            newHealth: this._health,
            maxHealth: this._maxHealth,
            damage: 0
        });
        
        // Dispatch to store
        Store.dispatch({
            type: ActionTypes.PLAYER_RESET,
            payload: { health: this._health, position: this._position.clone() }
        });
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Unsubscribe from store events
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Unsubscribe from collision events
        if (this.collisionUnsubscribe) {
            this.collisionUnsubscribe();
        }
        
        // Unregister from collision system
        Collisions.unregister(this, CollisionTypes.PLAYER);
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        // Destroy bullet manager
        if (this.bulletManager) {
            this.bulletManager.destroy();
            this.bulletManager = null;
        }
        
        // Clear references
        this.scene = null;
        this._position = null;
        this._velocity = null;
        this._acceleration = null;
        this._rotation = null;
        this._hitbox = null;
    }
    
    /**
     * Log debug information about the player for troubleshooting
     */
    logDebugInfo() {
        console.log('=== PLAYER DEBUG INFO ===');
        console.log(`Position: x=${this._position.x}, y=${this._position.y}, z=${this._position.z}`);
        console.log(`Active: ${this._active}, Alive: ${this._isAlive}`);
        console.log(`Renderer exists: ${!!this.renderer}`);
        console.log(`Model exists: ${!!this.renderer?.model}`);
        if (this.renderer?.model) {
            console.log(`Model visible: ${this.renderer.model.visible}`);
            console.log(`Model position: x=${this.renderer.model.position.x}, y=${this.renderer.model.position.y}, z=${this.renderer.model.position.z}`);
            console.log(`Model in scene: ${this.renderer.model.parent === this.scene}`);
            console.log(`Model children count: ${this.renderer.model.children.length}`);
        }
        console.log('=== END DEBUG INFO ===');
    }
} 