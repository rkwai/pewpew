import { clamp } from './mathUtils.js'; // Need clamp from mathUtils

/**
 * Enhance a material using global settings from GameConfig
 * @param {THREE.Material} material - The material to enhance
 * @param {Object} gameConfig - The game configuration
 */
export function enhanceMaterial(material, gameConfig) {
    if (!material || !gameConfig || !gameConfig.materials) {
        return material;
    }
    
    // Get material enhancement settings
    const settings = gameConfig.materials;
    
    // Store original color for enhancement
    const originalColor = material.color ? material.color.clone() : null;
    
    if (originalColor) {
        // Enhance saturation and contrast using HSL color space
        const hsl = {};
        originalColor.getHSL(hsl);
        
        // Apply saturation multiplier
        if (settings.globalSaturationMultiplier) {
            hsl.s = clamp(hsl.s * settings.globalSaturationMultiplier, 0, 1);
        }
        
        // Apply lightness adjustments for contrast
        if (settings.globalContrastMultiplier) {
            // Make dark colors darker and light colors lighter
            if (hsl.l < 0.5) {
                hsl.l = clamp(hsl.l / settings.globalContrastMultiplier, 0, 1);
            } else {
                hsl.l = clamp(hsl.l * settings.globalContrastMultiplier, 0, 1);
            }
        }
        
        // Set the enhanced color back to the material
        material.color.setHSL(hsl.h, hsl.s, hsl.l);
    }
    
    // Remove any emissive properties
    if (material.emissive) {
        material.emissive.setRGB(0, 0, 0);
        material.emissiveIntensity = 0;
    }
    
    return material;
}

/**
 * Enhances the material properties based on game configuration.
 * @param {THREE.Material} material - The material to enhance.
 * @param {object} gameConfig - The game configuration object.
 * @param {object} aestheticsConfig - Specific aesthetics configuration for the object (optional).
 */
export function enhanceObjectMaterial(material, gameConfig, aestheticsConfig) {
    const aesthetics = aestheticsConfig || gameConfig.player.aesthetics; // Default to player aesthetics if not provided

    // Preserve original color without excessive brightening
    const hsl = {};
    material.color.getHSL(hsl);
    material.color.setHSL(
        hsl.h,                                        // Keep original hue
        Math.min(hsl.s * aesthetics.saturationMultiplier, 1), // Increase saturation
        Math.min(hsl.l * aesthetics.lightnessMultiplier, 1)  // Increase lightness
    );

    // Remove any existing emissive properties
    if (material.emissive) {
        material.emissive.setRGB(0, 0, 0);
        material.emissiveIntensity = 0;
    }

    // Enhance reflection properties
    if (material.type.includes('MeshStandard')) {
        material.metalness = aesthetics.standardMaterial.metalness;
        material.roughness = aesthetics.standardMaterial.roughness;
    } else {
        material.shininess = aesthetics.phongMaterial.shininess;
    }

    // Apply global material enhancements
    enhanceMaterial(material, gameConfig);
} 