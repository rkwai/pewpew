import { THREE } from '../utilities/ThreeImports.js';
import { GameConfig } from '../config/game.config.js';
import { enhanceMaterial } from '../utilities/Utils.js';
import { Explosion } from './Explosion.js';
import { ModelLoader } from '../utilities/ModelLoader.js';
import { BulletManager } from './BulletManager.js';
import { UIManager } from '../states/UIManager.js';
import { Events } from '../utilities/EventSystem.js';
import { Store, ActionTypes } from '../utilities/GameStore.js';

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
        this.model = null;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        this.maxSpeed = GameConfig.player.speed;
        this._health = GameConfig.player.health;
        this.shootCooldown = 0;
        this._isInvulnerable = false;
        this._invulnerabilityTimer = 0;
        this.modelLoaded = false;
        this._position = new THREE.Vector3(-200, 0, 0); // Unified position management
        this.hitSphere = null;
        this._hitSphereRadius = GameConfig.player.hitSphereRadius || 15;
        this._hitSphereVisible = (GameConfig.player.debug && GameConfig.player.debug.showHitSphere) ||
                                 GameConfig.player.hitSphereVisible ||
                                 false;
        
        // Initialize managers
        this.bulletManager = new BulletManager(scene);
        this.uiManager = new UIManager();
        
        // Create a temporary mesh until the model loads
        this.createTempMesh();
        
        // Load the player model
        this.loadModel();
        
        // Initialize health display
        this.updateHealthDisplay();
        
        // Subscribe to store updates
        this.unsubscribe = Events.on('STORE_UPDATED', (data) => {
            this.handleStoreUpdate(data);
        });
        
        // Set initial state in store
        Store.dispatch({
            type: ActionTypes.PLAYER_TAKE_DAMAGE,
            payload: 0 // No damage, just initialize state
        });
    }
    
    /**
     * Handle store updates
     * @param {Object} data - Data from store update event
     */
    handleStoreUpdate(data) {
        const { action, state } = data;
        
        // Only handle actions that affect the player
        switch (action.type) {
            case ActionTypes.GAME_RESTART:
                this.resetPlayer();
                break;
                
            case ActionTypes.PLAYER_RESPAWN:
                this.setInvulnerable(true);
                this._health = GameConfig.player.health;
                this.updateHealthDisplay();
                break;
        }
    }
    
    /**
     * Get the current health value
     * @returns {number} Current health
     */
    getHealth() {
        return this._health;
    }

    /**
     * Set the health value with bounds checking
     * @param {number} newHealth - New health value
     */
    setHealth(newHealth) {
        this._health = Math.max(0, newHealth); // Ensure health doesn't go below 0
        this.updateHealthDisplay();
        if (this._health <= 0) {
            console.log("Player health is zero - death condition triggered");
        }
    }

    /**
     * Check if player is currently invulnerable
     * @returns {boolean} True if player is invulnerable
     */
    isInvulnerable() {
        return this._isInvulnerable;
    }

    /**
     * Set player invulnerability state
     * @param {number} duration - Duration of invulnerability in seconds (0 to disable)
     */
    setInvulnerable(duration) {
        if (duration > 0) {
            this._isInvulnerable = true;
            this._invulnerabilityTimer = duration;
        } else {
            this._isInvulnerable = false;
            this._invulnerabilityTimer = 0;
            if (this.model) {
                this.model.visible = true; // Ensure model is visible when invulnerability ends
            }
        }
    }

    /**
     * Get the hit sphere radius
     * @returns {number} Hit sphere radius
     */
    getHitSphereRadius() {
        return this._hitSphereRadius;
    }

    /**
     * Set the hit sphere radius
     * @param {number} radius - New hit sphere radius
     */
    setHitSphereRadius(radius) {
        this._hitSphereRadius = radius;
        if (this.hitSphere) {
            this.hitSphere.geometry.dispose(); // Dispose old geometry
            this.hitSphere.geometry = new THREE.SphereGeometry(this._hitSphereRadius, 16, 12); // Create new geometry
        }
    }

    /**
     * Check if hit sphere is visible
     * @returns {boolean} True if hit sphere is visible
     */
    isHitSphereVisible() {
        return this._hitSphereVisible;
    }

    /**
     * Set hit sphere visibility
     * @param {boolean} isVisible - Whether hit sphere should be visible
     */
    setHitSphereVisible(isVisible) {
        this._hitSphereVisible = isVisible;
        this.updateHitSphereVisibility(isVisible); // Use existing update method
    }
    
    /**
     * Create a temporary mesh until the model loads
     */
    createTempMesh() {
        // Create placeholder mesh using ModelLoader
        this.tempMesh = ModelLoader.createPlaceholderMesh({
            size: { x: 30, y: 10, z: 50 },
            color: 0x3333ff,
            position: this._position,
            opacity: 0.5
        });
        
        this.scene.add(this.tempMesh);
        
        // Create hit sphere for collision detection
        this.createHitSphere();
    }
    
    /**
     * Create a hit sphere for collision detection
     */
    createHitSphere() {
        // Create geometry for the player's hit sphere
        const hitSphereGeometry = new THREE.SphereGeometry(this._hitSphereRadius, 16, 12);
        
        // Create material - transparent if not in debug mode
        const hitSphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff, // Blue color for player's hit sphere
            transparent: true,
            opacity: this._hitSphereVisible ? 0.3 : 0,
            wireframe: this._hitSphereVisible
        });
        
        // Create mesh
        this.hitSphere = new THREE.Mesh(hitSphereGeometry, hitSphereMaterial);
        
        // Position at player position
        this.hitSphere.position.copy(this._position);
        this.scene.add(this.hitSphere);
        
        console.log(`Created player hit sphere with radius ${this._hitSphereRadius}`);
    }
    
    /**
     * Get hit sphere position for collision detection
     * @returns {THREE.Vector3} Hit sphere position
     */
    getHitSpherePosition() {
        return this._position.clone();
    }
    
    /**
     * Update the hit sphere position to match the player
     */
    updateHitSpherePosition() {
        if (this.hitSphere) {
            this.hitSphere.position.copy(this._position);
        }
    }
    
    /**
     * Load the player model
     */
    loadModel() {
        const modelPath = 'assets/models/spaceship.glb';
        
        // Configure model loading
        const modelConfig = {
            position: this._position.clone(),
            scale: GameConfig.player.aesthetics.scale,
            rotation: { y: GameConfig.player.aesthetics.rotation },
            gameConfig: GameConfig,
            aesthetics: GameConfig.player.aesthetics,
            castShadow: true,
            receiveShadow: true
        };
        
        // Load the model with the ModelLoader
        ModelLoader.loadModel(
            modelPath,
            modelConfig,
            (model) => {
                this.modelLoaded = true;
                
                // Remove temporary mesh and clean up
                if (this.tempMesh) {
                    this.scene.remove(this.tempMesh);
                    this.tempMesh.geometry.dispose();
                    this.tempMesh.material.dispose();
                    this.tempMesh = null;
                }
                
                // Set the model
                this.model = model;
                this.scene.add(this.model);
                
                // Update UI
                this.uiManager.setLoadingVisible(false);
                this.uiManager.setHUDVisible(true);
            },
            (progress) => {
                // Loading progress
                this.uiManager.setLoadingVisible(true, progress);
            },
            (error) => {
                console.error('An error occurred while loading the spaceship model:', error);
                
                // Use temporary mesh if model loading fails
                if (this.tempMesh) {
                    // Enhance temporary mesh to make it look better
                    this.tempMesh.material = new THREE.MeshPhongMaterial({ 
                        color: 0xdddddd,         // Light gray - neutral but bright
                        emissive: 0x444444,      // Subtle emissive for better visibility
                        emissiveIntensity: 0.5,  // Moderate emissive intensity
                        shininess: 70,           // Good shininess for reflections
                        specular: 0xffffff       // White specular highlights
                    });
                    
                    // Make the placeholder mesh larger for better visibility
                    this.tempMesh.scale.set(5, 5, 5);
                }
                
                // Update UI
                this.uiManager.setLoadingVisible(false);
                this.uiManager.setHUDVisible(true);
                
                // Set modelLoaded to true since we'll use the placeholder
                this.modelLoaded = true;
            }
        );
    }
    
    /**
     * Main update method called each frame
     * @param {number} deltaTime - Time in seconds since the last update
     * @param {object} inputHandler - Input handler for player controls
     */
    update(deltaTime, inputHandler) {
        this.updateInvulnerability(deltaTime);
        
        // Handle movement based on input
        this.handleMovement(deltaTime, inputHandler);
        
        // Update hit sphere position
        this.updateHitSpherePosition();
        
        // Handle shooting
        if (inputHandler.isPressed('Space')) {
            if (this.shootCooldown <= 0) {
                this.shoot();
                this.shootCooldown = GameConfig.player.shootCooldown;
            }
        }
        
        // Update shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }
        
        // Update bullets using BulletManager
        this.bulletManager.update(deltaTime);
    }
    
    /**
     * Update invulnerability state and effects
     * @param {number} deltaTime - Time in seconds since the last update
     */
    updateInvulnerability(deltaTime) {
        if (this._isInvulnerable) {
            this._invulnerabilityTimer -= deltaTime;
            
            // Flash effect when invulnerable
            if (this.model) {
                // Visual indication of invulnerability
                const flashRate = Math.sin(this._invulnerabilityTimer * GameConfig.player.flashFrequency || 10) > 0;
                this.model.visible = flashRate;
            }
            
            if (this._invulnerabilityTimer <= 0) {
                this.setInvulnerable(0);
            }
        }
    }
    
    /**
     * Apply movement boundaries to position
     * @param {THREE.Vector3} position - Position to constrain
     * @returns {THREE.Vector3} Constrained position
     */
    applyMovementBoundaries(position) {
        position.x = Math.max(
            GameConfig.player.boundaries.xMin, 
            Math.min(position.x, GameConfig.player.boundaries.xMax)
        );
        position.y = Math.max(
            GameConfig.player.boundaries.yMin, 
            Math.min(position.y, GameConfig.player.boundaries.yMax)
        );
        return position;
    }
    
    /**
     * Handle player movement based on input
     * @param {number} deltaTime - Time in seconds since the last update
     * @param {object} inputHandler - Input handler for player controls
     */
    handleMovement(deltaTime, inputHandler) {
        // Movement constants from config or defaults
        const upAcceleration = GameConfig.player.acceleration?.up || 5;
        const downAcceleration = GameConfig.player.acceleration?.down || 5;
        const leftAcceleration = GameConfig.player.acceleration?.left || 2;
        const rightAcceleration = GameConfig.player.acceleration?.right || 2;
        const damping = GameConfig.player.damping || 0.95;
        const tiltFactor = GameConfig.player.tiltFactor || 0.001;
        
        // Reset acceleration
        this.acceleration.set(0, 0, 0);
        
        // Apply acceleration based on input
        if (inputHandler.isPressed('ArrowUp')) {
            this.acceleration.y += this.maxSpeed * upAcceleration;
        }
        if (inputHandler.isPressed('ArrowDown')) {
            this.acceleration.y -= this.maxSpeed * downAcceleration;
        }
        if (inputHandler.isPressed('ArrowLeft')) {
            this.acceleration.x -= this.maxSpeed * leftAcceleration;
        }
        if (inputHandler.isPressed('ArrowRight')) {
            this.acceleration.x += this.maxSpeed * rightAcceleration;
        }
        
        // Apply acceleration to velocity
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        
        // Apply damping (drag)
        this.velocity.x *= damping;
        this.velocity.y *= damping;
        
        // Apply velocity to position
        this._position.x += this.velocity.x * deltaTime;
        this._position.y += this.velocity.y * deltaTime;
        
        // Apply boundaries using extracted method
        this.applyMovementBoundaries(this._position);
        
        // Update displayed position
        this.updateModelPosition();
        
        // Apply slight tilt based on movement
        if (this.model) {
            // Tilt when moving up/down
            const pitchAngle = -this.velocity.y * tiltFactor;
            this.model.rotation.z = pitchAngle;
        }
    }
    
    /**
     * Update model position based on internal position
     */
    updateModelPosition() {
        if (this.model) {
            this.model.position.copy(this._position);
        } else if (this.tempMesh) {
            this.tempMesh.position.copy(this._position);
        }
    }
    
    /**
     * Create and shoot a bullet
     */
    shoot() {
        // Ensure we have a valid position before creating a bullet
        if (!this._position || typeof this._position.x !== 'number') {
            console.error('Invalid player position for bullet creation:', this._position);
            return;
        }
        
        // Create a new bullet position in front of the player
        const bulletPosition = this._position.clone();
        
        // Offset the bullet spawn position slightly in front (right) of the ship
        const offsetX = GameConfig.player.bulletOffset?.x || 30;
        bulletPosition.x += offsetX;
        
        // Log the bullet creation position
        if (GameConfig.bullet?.debug?.logPositions) {
            console.log(`Creating bullet at position: (${bulletPosition.x}, ${bulletPosition.y}, ${bulletPosition.z})`);
        }
        
        // Use bullet manager to create bullet
        this.bulletManager.createBullet(bulletPosition);
    }
    
    /**
     * Get all active bullets
     * @returns {Array} Array of active bullets
     */
    getBullets() {
        return this.bulletManager.getBullets();
    }
    
    /**
     * This method is called by external entities to request damage to be applied
     * @param {number} amount - Amount of damage to apply
     * @param {THREE.Vector3} [impactPoint] - Optional point of impact for effects
     * @returns {boolean} Whether damage was applied (false if invulnerable)
     */
    receiveDamage(amount, impactPoint = null) {
        if (this.isInvulnerable()) return false;
        
        // Apply damage internally
        this.takeDamage(amount, impactPoint);
        return true;
    }
    
    /**
     * Private method to handle damage internally
     * @param {number} amount - Amount of damage to apply
     * @param {THREE.Vector3} [impactPoint] - Optional point of impact for effects
     */
    takeDamage(amount, impactPoint = null) {
        if (this._isInvulnerable) return;
        
        // Use store to update health
        Store.dispatch({
            type: ActionTypes.PLAYER_TAKE_DAMAGE,
            payload: amount
        });
        
        // Update local state
        this._health = Math.max(0, this._health - amount);
        
        // Update health display
        this.updateHealthDisplay();
        
        // Check if player died
        if (this._health <= 0) {
            this.die();
        } else {
            // Make invulnerable briefly
            this.setInvulnerable(true);
        }
        
        // Create explosion effect at the impact point
        if (this.model) {
            try {
                const position = impactPoint || this.getHitSpherePosition();
                
                // Calculate explosion size based on the player's hit sphere and damage amount
                // This creates bigger explosions for larger impacts
                const baseSize = this._hitSphereRadius * 0.15; // Base explosion size from player size
                const damageMultiplier = Math.min(amount / 20, 2); // Scale with damage, capped at 2x
                
                // Add slight random variation for visual interest
                const sizeVariation = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation
                
                // Final explosion size based on player size, damage, and variation
                const explosionSize = baseSize * damageMultiplier * sizeVariation;
                
                new Explosion(this.scene, position, explosionSize);
                
                // For major hits (damage > 30), add a secondary smaller explosion at a random offset
                if (amount > 30) {
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * this._hitSphereRadius * 0.8,
                        (Math.random() - 0.5) * this._hitSphereRadius * 0.8, 
                        (Math.random() - 0.5) * this._hitSphereRadius * 0.8
                    );
                    
                    const secondaryPosition = position.clone().add(offset);
                    const secondarySize = explosionSize * 0.6; // 60% of the main explosion size
                    
                    // Small delay for secondary explosion
                    setTimeout(() => {
                        if (this.scene) { // Check if scene still exists
                            new Explosion(this.scene, secondaryPosition, secondarySize);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Failed to create explosion for player impact:', error);
            }
        }
        
        // Log on low health
        if (this.getHealth() > 0 && this.getHealth() <= 30) {
            console.log(`WARNING: Low player health: ${this.getHealth()}%`);
        }
    }
    
    /**
     * Get the current player position
     * @returns {THREE.Vector3} Current position
     */
    getPosition() {
        return this._position.clone();
    }
    
    /**
     * Set the player position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, y, z) {
        this._position.set(x, y, z);
        this.updateModelPosition();
    }
    
    /**
     * Dispose and clean up resources to prevent memory leaks
     * This is used for final cleanup when the player is destroyed
     */
    destroy() {
        // Unsubscribe from events
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Clean up bullets
        this.bulletManager.clear();
        
        // Remove from scene
        if (this.model) {
            this.scene.remove(this.model);
            ModelLoader.disposeModel(this.model);
            this.model = null;
        }
        
        if (this.tempMesh) {
            this.scene.remove(this.tempMesh);
            this.tempMesh.geometry.dispose();
            this.tempMesh.material.dispose();
            this.tempMesh = null;
        }
        
        if (this.hitSphere) {
            this.scene.remove(this.hitSphere);
            this.hitSphere.geometry.dispose();
            this.hitSphere.material.dispose();
            this.hitSphere = null;
        }
        
        // Emit event
        Events.emit('playerDestroyed', { position: this._position.clone() });
    }
    
    /**
     * Perform per-frame cleanup of resources that are no longer needed
     * This is called every frame to clean up temporary objects
     */
    cleanupResources() {
        // Call cleanup on bullet manager
        if (this.bulletManager) {
            this.bulletManager.cleanupResources();
        }
        
        // Add any other player-specific resource cleanup here
        
        // Perform any necessary cleanup on destroyed bullets/effects
        if (this._destroyedBullets && this._destroyedBullets.length > 0) {
            this._destroyedBullets = [];
        }
        
        // Clean up temporary effects if any
        if (this._tempEffects && this._tempEffects.length > 0) {
            this._tempEffects = this._tempEffects.filter(effect => !effect.isDone);
        }
    }
    
    /**
     * Update the health display
     */
    updateHealthDisplay() {
        this.uiManager.updateHealthDisplay(this.getHealth());
    }
    
    /**
     * Update hit sphere visibility
     * @param {boolean} isVisible - Whether hit sphere should be visible
     */
    updateHitSphereVisibility(isVisible) {
        this._hitSphereVisible = isVisible;
        
        if (this.hitSphere && this.hitSphere.material) {
            this.hitSphere.material.opacity = isVisible ? 0.3 : 0;
            this.hitSphere.material.wireframe = isVisible;
        }
    }
    
    /**
     * Completely dispose of player and all resources
     */
    dispose() {
        // First destroy visual elements
        this.destroy();
        
        // Then dispose of bullet manager
        if (this.bulletManager) {
            this.bulletManager.dispose();
            this.bulletManager = null;
        }
        
        // Emit dispose event
        Events.emit('player:dispose');
    }
    
    /**
     * Player death
     */
    die() {
        // Use store to update player state
        Store.dispatch({
            type: ActionTypes.PLAYER_DEATH
        });
        
        // Create explosion
        const explosion = new Explosion();
        explosion.explode(this.getPosition().x, this.getPosition().y, this.getPosition().z, 2);
        
        // Hide player model
        if (this.model) {
            this.model.visible = false;
        }
        
        // Emit dead event
        Events.emit('player:dead', {
            position: this.getPosition()
        });
        
        // Check if game over
        const state = Store.getState();
        if (state.player.lives <= 0) {
            // Game over - already handled by store
        } else {
            // Respawn after a delay
            setTimeout(() => {
                this.respawn();
            }, 2000);
        }
    }
    
    /**
     * Respawn the player
     */
    respawn() {
        // Dispatch respawn action
        Store.dispatch({
            type: ActionTypes.PLAYER_RESPAWN
        });
        
        // Reset position
        this._position.set(-200, 0, 0);
        
        // Reset health
        this._health = GameConfig.player.health;
        this.updateHealthDisplay();
        
        // Show model
        if (this.model) {
            this.model.visible = true;
        }
        
        // Make invulnerable briefly
        this.setInvulnerable(true);
        
        // Emit respawn event
        Events.emit('player:respawn', {
            position: this.getPosition()
        });
    }
    
    /**
     * Reset player for new game
     */
    resetPlayer() {
        // Reset position
        this._position.set(-200, 0, 0);
        
        // Reset health
        this._health = GameConfig.player.health;
        this.updateHealthDisplay();
        
        // Show model
        if (this.model) {
            this.model.visible = true;
        }
        
        // Reset invulnerability
        this.setInvulnerable(false);
        
        // Reset velocity
        this.velocity.set(0, 0, 0);
        
        // Reset bullet manager
        if (this.bulletManager) {
            this.bulletManager.reset();
        }
    }

    /**
     * Get player's hit sphere position for collision detection
     * @returns {THREE.Vector3} Position of the hit sphere
     */
    getHitSpherePosition() {
        return this._position.clone();
    }

    /**
     * Get the player's position directly
     * @returns {THREE.Vector3} Player position
     */
    getPosition() {
        return this._position.clone();
    }

    /**
     * Get hit sphere in world coordinates
     * @returns {THREE.Vector3} World position of hit sphere
     */
    getHitSphereWorldPosition() {
        return this.getHitSpherePosition();
    }
} 