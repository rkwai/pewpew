/**
 * Manages UI elements to separate DOM manipulation from game logic
 */
export class UIManager {
    /**
     * Create a new UI manager
     */
    constructor() {
        this.elements = {};
        this.initialize();
    }

    /**
     * Initialize the UI manager, finding common elements
     */
    initialize() {
        // Common UI elements
        this.elements = {
            health: document.getElementById('health'),
            loading: document.getElementById('loading'),
            hud: document.getElementById('hud')
        };
    }

    /**
     * Update the health display
     * @param {number} healthValue - Current health value (percentage)
     */
    updateHealthDisplay(healthValue) {
        if (this.elements.health) {
            this.elements.health.innerText = `Health: ${Math.round(healthValue)}%`;
        }
    }

    /**
     * Show or hide the loading message
     * @param {boolean} isVisible - Whether the loading message should be visible
     * @param {number} [progress] - Optional loading progress percentage
     */
    setLoadingVisible(isVisible, progress) {
        if (!this.elements.loading) return;
        
        if (isVisible) {
            this.elements.loading.style.display = 'block';
            if (progress !== undefined) {
                this.elements.loading.innerText = `Loading: ${Math.round(progress)}%`;
            }
        } else {
            this.elements.loading.style.display = 'none';
        }
    }

    /**
     * Show or hide the HUD
     * @param {boolean} isVisible - Whether the HUD should be visible
     */
    setHUDVisible(isVisible) {
        if (!this.elements.hud) return;
        
        this.elements.hud.style.display = isVisible ? 'block' : 'none';
    }

    /**
     * Show a message to the player
     * @param {string} message - Message to display
     * @param {number} [duration=3000] - How long to show the message (milliseconds)
     */
    showMessage(message, duration = 3000) {
        let messageElement = document.getElementById('message');
        
        // Create message element if it doesn't exist
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'message';
            messageElement.style.position = 'absolute';
            messageElement.style.top = '20%';
            messageElement.style.left = '50%';
            messageElement.style.transform = 'translate(-50%, -50%)';
            messageElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
            messageElement.style.color = 'white';
            messageElement.style.padding = '10px 20px';
            messageElement.style.borderRadius = '5px';
            messageElement.style.fontFamily = 'Arial, sans-serif';
            messageElement.style.fontSize = '18px';
            messageElement.style.zIndex = '1000';
            document.body.appendChild(messageElement);
        }
        
        // Set message and show
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // Hide after duration
        clearTimeout(this._messageTimeout);
        this._messageTimeout = setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }
} 