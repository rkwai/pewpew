export const GameConfig = {
    // Debug settings
    debug: {
        enabled: false, // Disable debug features
        showAxes: false,
        showGrid: false,
        showBoundaries: false
    },
    
    // Screen settings
    screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        // Add boundaries for visualization and constraints
        bounds: {
            minX: -400,
            maxX: 400,
            minY: -250,
            maxY: 250,
            // Remove min/max Z to enforce 2D gameplay
            z: 0 // Fixed z-axis position for all game elements
        }
    },
    
    // Global rendering settings for vibrant colors
    rendering: {
        // Tone mapping (controls how HDR values are mapped to the displayable range)
        toneMapping: 'ACESFilmic', // Options: 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic'
        toneMappingExposure: 5, // Higher values = brighter scene (1.0 is neutral)
        
        // Color space handling
        outputEncoding: 'sRGB', // Maps to outputColorSpace in THREE.js v150+. Options: 'Linear', 'sRGB', 'DisplayP3'
        
        // Shadow settings
        shadows: {
            enabled: true,
            type: 'PCFSoft', // Options: 'Basic', 'PCF', 'PCFSoft', 'VSM'
            mapSize: 1024, // Shadow map resolution (higher = better quality but more expensive)
            bias: -0.0001, // Reduces shadow acne
        },
        
        // Ambient occlusion for more depth
        ambientOcclusion: {
            enabled: true,
            intensity: 1, // 0-1 range
            radius: 5.0,
            bias: 0.5
        },
        
        // Bloom effect for glow
        bloom: {
            enabled: true,
            strength: 0.35, // Overall intensity
            threshold: 0.7, // Brightness threshold (higher means fewer things glow)
            radius: 0.5 // How far the glow spreads
        }
    },
    
    // Global lighting settings
    lighting: {
        // Ambient light (affects overall scene brightness and fill light)
        ambient: {
            color: 0xffffff, // Slight blue tint
            intensity: 1
        },
        
        // Main directional light (like the sun)
        directional: {
            color: 0xffffff,
            intensity: 1, // Brighter for more contrast
            position: {
                x: -1,
                y: 1,
                z: 2
            },
            castShadow: true
        }
    },
    
    // Global material enhancement
    materials: {
        // Saturation boost to apply to all materials
        globalSaturationMultiplier: 1.2,
        // Contrast enhancement
        globalContrastMultiplier: 1.15,
        // Global emissive intensity boost
        globalEmissiveBoost: 1.2
    },
    
    // Player settings
    player: {
        speed: 200, // pixels per second
        health: 100,
        shootCooldown: 0.2, // seconds
        hitSphereRadius: 15, // Size of player collision sphere
        hitSphereVisible: false, // Whether to show the hit sphere
        boundaries: {
            xMin: -400,  // Left limit
            xMax: 400,  // Right limit
            yMin: -250,  // Bottom limit
            yMax: 250,   // Top limit
            zMin: 0,     // Fixed z position
            zMax: 0      // Fixed z position
        },
        // Debug settings
        debug: {
            showHitSphere: false // Whether to show the hit sphere in debug mode
        },
        // Default position at left side of screen
        defaultPosition: {
            x: -200, // New default X position
            y: 0,
            z: 0     // Fixed z position at 0
        },
        // Ship aesthetics
        aesthetics: {
            // Base model appearance
            scale: 20, // Ship scale factor
            rotation: Math.PI, // Initial rotation (faces along negative x-axis)
            
            // Material enhancement
            saturationMultiplier: 1, // Increase color saturation
            lightnessMultiplier: 1,  // Increase color lightness
            emissiveIntensity: 0.1,    // Glow intensity
            emissiveMultiplier: 0.1,   // Glow color multiplier
            
            // PBR Material properties (for MeshStandardMaterial)
            standardMaterial: {
                metalness: 0.1,  // More metallic look (0-1)
                roughness: 0.1   // Smoother surface (0-1)
            },
            
            // Non-PBR Material properties (for MeshPhongMaterial etc.)
            phongMaterial: {
                shininess: 80    // High shininess for reflections
            },
            
            // Temporary placeholder appearance before model loads
            placeholder: {
                color: 0x000000,        // Neutral gray color
                emissive: 0x666666,     // Subtle glow
                emissiveIntensity: 1.0, // Glow intensity
                shininess: 30           // Moderate shininess
            }
        },
        // Movement parameters (previously hardcoded)
        acceleration: {
            up: 5,
            down: 5,
            left: 5,
            right: 5
        },
        damping: 0.95,
        tiltFactor: 0.1,
        invulnerabilityDuration: 2.0,
        flashFrequency: 10,
        bulletOffset: { x: 15, y: 0, z: 0 },
        // Model settings
        model: {
            path: 'assets/models/spaceship.glb',
            scale: 20,
            rotation: Math.PI
        },
        // Ship rotation parameters during movement
        rotationEffects: {
            leftRoll: 0.05,       // Roll when moving left
            rightRoll: -0.05,     // Roll when moving right
            upPitch: -0.2,       // Pitch when moving up
            downPitch: 0.2,      // Pitch when moving down
        },
    },
    
    // Camera settings
    camera: {
        fov: 75,
        near: 0.1,
        far: 2000,
        position: {
            x: 0,
            y: 0,
            z: 500  // Position camera directly in front of the scene
        },
        isOrthographic: true // Use orthographic camera for 2D effect
    },
    
    // Bullet settings
    bullet: {
        speed: 400, // Increased from 250 for faster movement
        size: 5,    // Increased from 5 for better visibility
        color: 0x000000,
        radius: 5,
        damage: 50,
        lifespan: 10, // Increased from 2 to 10 seconds to ensure bullets can reach screen edge
        
        // Pooling settings
        poolSize: 200, // Increased from 100 to handle rapid firing
        maxBullets: 200, // Increased from 100. Maximum number of bullets that can exist at once
        
        // Debug settings
        debug: {
            showHitSphere: false,
            logCleanup: false,
            logPoolStats: false,
            logPositions: false,
            showPlaceholder: false
        },
        
        // Model settings
        model: {
            path: 'assets/models/missile.glb',
            scale: 15
        },
        
        direction: {
            x: 1,  // Bullets move right
            y: 0,
            z: 0
        }
    },
    
    // Asteroid settings
    asteroid: {
        minSpeed: 75,
        maxSpeed: 150,
        minSize: 20,
        maxSize: 70,
        minRotationSpeed: 0.1,
        maxRotationSpeed: 0.5,
        spawnRate: 2, // per second
        spawnDistance: 50, // Spawn distance from right side of screen
        despawnDistance: -400, // Despawn when past left side of screen
        // Spawn coordinates for right side of screen
        spawnZ: 0, // Fixed z coordinate
        minSpawnX: 400, // Just off-screen to the right
        maxSpawnX: 450,
        minSpawnY: -200,
        maxSpawnY: 200,
        damage: 20, // Damage caused to player
        explosionSizeRatio: 0.3, // Size of explosion relative to asteroid size
        // Asteroid aesthetics
        aesthetics: {
            // Material enhancement
            saturationMultiplier: 1.3, // Boost saturation for rock textures
            lightnessMultiplier: 1.1,  // Slight lightness boost
            
            // Emissive properties
            emissiveIntensity: 0.3,    // Subtle glow for visibility in space
            emissiveColor: {           // Using HSL-like values for the emissive color
                s: 0.1,
                l: 0.1
            },
            
            // PBR Material properties
            standardMaterial: {
                metalness: 0.2,  // Lower metalness for rock (0-1)
                roughness: 0.8   // Higher roughness for rock texture (0-1)
            },
            
            // Non-PBR Material properties
            phongMaterial: {
                shininess: 20    // Lower shininess for matte rock surfaces
            }
        },
        // Pooling settings (duplicated from objectPool for convenience)
        poolSize: 20,
        
        // Add debug settings for object pooling
        debug: {
            showHitSpheres: false,
            logCollisions: false,
            logCleanup: false,
            logPoolStats: false
        },
        // Model settings
        model: {
            path: 'assets/models/asteroid.glb',
            scale: 1
        },
    },
    
    // Object pooling settings
    objectPool: {
        enabled: true,
        debug: {
            logStats: false
        },
        asteroid: {
            initialSize: 20,   // Initial pool size for asteroids
            expandAmount: 10   // How many to add when pool is empty
        },
        bullet: {
            initialSize: 100,   // Increased from 30 to match bullet poolSize
            expandAmount: 20    // Increased from 15 to handle bursts better
        }
    },
    
    // Explosion settings
    explosion: {
        // Model settings
        model: {
            path: 'assets/models/explosion.glb',
            scale: 1
        },
        lifetime: 1.5,  // Duration of explosion in seconds
        colors: [0xff9900, 0xff5500, 0xff0000],  // Colors for explosion light
        particles: {
            count: 50,  // Base particle count (will be multiplied by size)
            size: 3,    // Base particle size
            speed: 20,  // Base particle speed
            drag: 0.96  // Particle drag coefficient
        }
    },
    
    // Add collision settings
    collision: {
        playerAsteroidExplosionSize: 1.0,     // Size of explosion when player hits asteroid
        bulletAsteroidExplosionRatio: 0.5,    // Size of explosion relative to asteroid size when bullet hits asteroid
        defaultExplosionSize: 1.0,            // Default explosion size for general collisions
        playerDeathExplosionMultiplier: 2.0,  // Multiplier for explosion size when player dies
    },
    
    // Add starfield settings
    environment: {
        starfield: {
            enabled: true,
            count: 100,
            size: 2,
            radius: 1000,
            speedX: -100, // Speed of stars moving left
            depth: 500,    // Depth variation for parallax effect
            // Add color configuration
            colors: {
                opacity: 0.8,
                rMin: 0.8,
                rMax: 1.0,
                gMin: 0.8,
                gMax: 1.0,
                bMin: 0.9,
                bMax: 1.0
            }
        }
    },
}; 