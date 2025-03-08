export const GameConfig = {
    // Screen settings
    screen: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    
    // Global rendering settings for vibrant colors
    rendering: {
        // Tone mapping (controls how HDR values are mapped to the displayable range)
        toneMapping: 'ACESFilmic', // Options: 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic'
        toneMappingExposure: 2, // Higher values = brighter scene (1.0 is neutral)
        
        // Color space handling
        outputEncoding: 'sRGB', // Options: 'Linear', 'sRGB', 'DisplayP3'
        
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
            intensity: 0.5, // 0-1 range
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
            color: 0x334455, // Slight blue tint
            intensity: 0.5
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
        },
        
        // Player spotlight (illuminates player and nearby objects)
        playerLight: {
            color: 0x99ccff, // Cooler blue tint
            intensity: 2.5,
            distance: 500,
            position: {
                x: 200,
                y: 50,
                z: 200
            },
            castShadow: true
        },
        
        // Backlight for dramatic rim lighting
        backLight: {
            color: 0xff6644, // Warm orange/red for contrast with blue
            intensity: 0.8,
            distance: 300,
            position: {
                x: 100,
                y: -30,
                z: -100
            },
            castShadow: false
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
        speed: 300, // pixels per second
        health: 100,
        shootCooldown: 0.3, // seconds
        boundaries: {
            xMin: -250,  // Left limit
            xMax: 250,  // Right limit
            yMin: -150,  // Bottom limit
            yMax: 150    // Top limit
        },
        // Default position at left side of screen
        defaultPosition: {
            x: -300, // New default X position
            y: 0,
            z: 0
        },
        // Debug settings
        debug: {
            showHitSphere: false // Set to true to show player hit sphere
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
        }
    },
    
    // Camera settings
    camera: {
        fov: 40,
        near: 0.1,
        far: 2000,
        position: {
            x: 0,
            y: 0,
            z: 500
        }
    },
    
    // Bullet settings
    bullet: {
        speed: 350, // Reduced from 700 for slower movement
        size: 5,    // Increased from 5 for better visibility
        color: 0x000000,
        brightness: 3 , // Controls emissive intensity
        lifespan: 2 // seconds
    },
    
    // Asteroid settings
    asteroid: {
        minSpeed: 100,
        maxSpeed: 200,
        minSize: 20,
        maxSize: 45,
        minRotationSpeed: 0.01,
        maxRotationSpeed: 0.05,
        spawnRate: 2, // per second
        spawnDistance: 250,
        spawnDepth: {
            min: -80,
            max: 80
        },
        despawnDistance: -100,
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
        // Debug settings
        debug: {
            showHitSpheres: false, // Set to true to visualize collision spheres
            logCollisions: false   // Set to true to log collision details to console
        }
    }
}; 