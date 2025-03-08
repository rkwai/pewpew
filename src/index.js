import { Gameplay } from './states/Gameplay.js';

// Ensure required directories exist (helpful during development)
function ensureDirectoryStructure() {
    try {
        // This is a simple client-side check to display warnings
        fetch('assets/models/README.txt')
            .catch(error => {
                console.warn('Models directory structure may not be complete. Game will use placeholders.');
                
                // Show a helpful message to the user
                const warningDiv = document.createElement('div');
                warningDiv.style.position = 'absolute';
                warningDiv.style.bottom = '10px';
                warningDiv.style.left = '10px';
                warningDiv.style.background = 'rgba(0,0,0,0.5)';
                warningDiv.style.color = 'white';
                warningDiv.style.padding = '10px';
                warningDiv.style.borderRadius = '5px';
                warningDiv.style.fontFamily = 'Arial, sans-serif';
                warningDiv.style.zIndex = '1000';
                warningDiv.style.maxWidth = '400px';
                warningDiv.innerHTML = `
                    <strong>Note:</strong> Model files not found. Using placeholder graphics. <br>
                    <small>To use custom models, place .glb files in assets/models/ directory.</small>
                `;
                
                // Remove the warning after 10 seconds
                setTimeout(() => {
                    if (document.body.contains(warningDiv)) {
                        document.body.removeChild(warningDiv);
                    }
                }, 10000);
                
                document.body.appendChild(warningDiv);
            });
    } catch (e) {
        // Ignore errors, the game will use placeholders
        console.warn('Error checking directory structure:', e);
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check directory structure
    ensureDirectoryStructure();
    
    // Create and start the game
    const game = new Gameplay();
    
    // Handle cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (game) {
            game.destroy();
        }
    });
}); 