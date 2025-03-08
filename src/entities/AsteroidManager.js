import { Asteroid } from './Asteroid.js';
import { GameConfig } from '../config/game.config.js';
import { checkCollision } from '../utilities/Utils.js';
import { Explosion } from './Explosion.js';
import { THREE } from '../utilities/ThreeImports.js';

export class AsteroidManager {
    constructor(scene) {
        this.scene = scene;
        this.asteroids = [];
        this.spawnTimer = 0;
        
        // Use default spawn rate if config is missing
        this.spawnRate = (GameConfig.asteroid && GameConfig.asteroid.spawnRate) 
            ? GameConfig.asteroid.spawnRate 
            : 2; // Default: 2 per second
            
        this.score = 0;
    }
    
    update(deltaTime, player) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        // Spawn new asteroids
        if (this.spawnTimer >= 1 / this.spawnRate) {
            this.spawnAsteroid();
            this.spawnTimer = 0;
        }
        
        // Update existing asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            
            // Don't process destroyed asteroids - they will be removed after the loop
            if (asteroid.isDestroyed) {
                continue;
            }
            
            const shouldRemove = asteroid.update(deltaTime);
            
            // Check for collision with player
            if (player && !player.isInvulnerable) {
                // Get player hit sphere position
                const playerPosition = player.getHitSpherePosition();
                const playerRadius = player.hitSphereRadius || 20; // Use hit sphere radius or fallback
                
                // Use the asteroid's hit sphere for collision detection
                if (asteroid.checkCollision(playerPosition, playerRadius)) {
                    if (GameConfig.asteroid?.debug?.logCollisions) {
                        console.log('Player collision detected!');
                    }
                    
                    // Calculate the impact point between asteroid and player
                    const asteroidPosition = asteroid.getPosition();
                    
                    // Direction from asteroid to player
                    const impactDirection = playerPosition.clone().sub(asteroidPosition).normalize();
                    
                    // Calculate impact point - midway between the asteroid surface and player surface
                    const asteroidSurfacePoint = asteroidPosition.clone().add(
                        impactDirection.clone().multiplyScalar(asteroid.hitSphereRadius)
                    );
                    const playerSurfacePoint = playerPosition.clone().sub(
                        impactDirection.clone().multiplyScalar(playerRadius)
                    );
                    
                    // Average the two points for precise impact location
                    const impactPoint = new THREE.Vector3().addVectors(
                        asteroidSurfacePoint, playerSurfacePoint
                    ).multiplyScalar(0.5);
                    
                    // Pass damage amount and impact point to player
                    player.takeDamage(20, impactPoint);
                    
                    // Explode the asteroid at the impact point
                    asteroid.explode(impactPoint);
                    this.asteroids.splice(i, 1);
                    continue;
                }
            }
            
            // Check for collision with player bullets
            if (player) {
                let bulletHit = false;
                
                for (let j = player.bullets.length - 1; j >= 0; j--) {
                    const bullet = player.bullets[j];
                    
                    // Skip destroyed bullets
                    if (bullet.isDestroyed) {
                        player.bullets.splice(j, 1);
                        continue;
                    }
                    
                    const bulletPosition = bullet.getPosition();
                    const bulletRadius = 5; // Approximate bullet size radius
                    
                    // Use asteroid's hit sphere for collision detection with bullets
                    if (asteroid.checkCollision(bulletPosition, bulletRadius)) {
                        const destroyed = asteroid.takeDamage(50);
                        
                        // Create explosion at the exact point of impact (bullet position)
                        const asteroidPosition = asteroid.getPosition();
                        // Direction from asteroid center to bullet
                        const impactDirection = bulletPosition.clone().sub(asteroidPosition).normalize();
                        
                        // Calculate impact point on the asteroid surface
                        const impactPoint = asteroidPosition.clone().add(
                            impactDirection.multiplyScalar(asteroid.hitSphereRadius * 0.8)
                        );
                        
                        if (destroyed) {
                            this.increaseScore(Math.floor(asteroid.size));
                            asteroid.explode(impactPoint);
                            this.asteroids.splice(i, 1);
                        } else {
                            try {
                                const smallExplosionSize = asteroid.size * 0.2;
                                new Explosion(this.scene, impactPoint, smallExplosionSize);
                            } catch (error) {
                                console.error('Failed to create small impact explosion:', error);
                            }
                        }
                        
                        bullet.destroy();
                        player.bullets.splice(j, 1);
                        
                        bulletHit = true;
                        break;
                    }
                }
                
                // If a bullet hit this asteroid and destroyed it, continue to next asteroid
                if (bulletHit && i >= this.asteroids.length) {
                    continue;
                }
            }
            
            // Remove if out of bounds
            if (shouldRemove) {
                asteroid.destroy();
                this.asteroids.splice(i, 1);
            }
        }
    }
    
    spawnAsteroid() {
        const asteroid = new Asteroid(this.scene);
        this.asteroids.push(asteroid);
    }
    
    increaseScore(amount) {
        this.score += amount;
        document.getElementById('score').innerText = `Score: ${this.score}`;
    }
    
    getScore() {
        return this.score;
    }
    
    reset() {
        // Remove all asteroids
        for (const asteroid of this.asteroids) {
            asteroid.destroy();
        }
        this.asteroids = [];
        this.score = 0;
        document.getElementById('score').innerText = `Score: ${this.score}`;
    }
} 