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
            hud: document.getElementById('hud'),
            score: document.getElementById('score'),
            gameStateMessage: document.getElementById('game-state-message'),
            debugMessage: document.getElementById('debug-message')
        };
        
        // Create game state message element if it doesn't exist
        if (!this.elements.gameStateMessage) {
            const gameStateMessage = document.createElement('div');
            gameStateMessage.id = 'game-state-message';
            gameStateMessage.style.position = 'absolute';
            gameStateMessage.style.top = '50%';
            gameStateMessage.style.left = '50%';
            gameStateMessage.style.transform = 'translate(-50%, -50%)';
            gameStateMessage.style.backgroundColor = 'rgba(0,0,0,0.7)';
            gameStateMessage.style.color = 'white';
            gameStateMessage.style.padding = '20px 40px';
            gameStateMessage.style.borderRadius = '10px';
            gameStateMessage.style.fontFamily = 'Arial, sans-serif';
            gameStateMessage.style.fontSize = '24px';
            gameStateMessage.style.fontWeight = 'bold';
            gameStateMessage.style.zIndex = '2000';
            gameStateMessage.style.display = 'none';
            document.body.appendChild(gameStateMessage);
            this.elements.gameStateMessage = gameStateMessage;
        }
        
        // Create debug message element if it doesn't exist
        if (!this.elements.debugMessage) {
            const debugMessage = document.createElement('div');
            debugMessage.id = 'debug-message';
            debugMessage.style.position = 'absolute';
            debugMessage.style.bottom = '10px';
            debugMessage.style.left = '10px';
            debugMessage.style.backgroundColor = 'rgba(0,0,0,0.5)';
            debugMessage.style.color = 'lime';
            debugMessage.style.padding = '5px 10px';
            debugMessage.style.borderRadius = '5px';
            debugMessage.style.fontFamily = 'monospace';
            debugMessage.style.fontSize = '14px';
            debugMessage.style.zIndex = '1500';
            debugMessage.style.display = 'none';
            document.body.appendChild(debugMessage);
            this.elements.debugMessage = debugMessage;
        }
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
     * Update the score display
     * @param {number} score - Current score value
     */
    updateScoreDisplay(score) {
        if (this.elements.score) {
            this.elements.score.innerText = `Score: ${score}`;
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
     * Reset all UI elements to their default states
     */
    resetUI() {
        this.updateScoreDisplay(0);
        this.setHUDVisible(true);
        this.hideGameStateMessage();
        this.hideDebugMessage();
    }

    /**
     * Show a game state message
     * @param {string} message - Message to display
     * @param {object} [options] - Optional configuration
     * @param {string} [options.color] - Text color
     * @param {string} [options.backgroundColor] - Background color
     * @param {number} [options.fontSize] - Font size in pixels
     * @param {boolean} [options.autoHide] - Whether to auto-hide the message
     * @param {number} [options.duration] - Duration in ms if autoHide is true
     */
    showGameStateMessage(message, options = {}) {
        if (!this.elements.gameStateMessage) return;
        
        const element = this.elements.gameStateMessage;
        element.textContent = message;
        
        // Apply options
        if (options.color) element.style.color = options.color;
        if (options.backgroundColor) element.style.backgroundColor = options.backgroundColor;
        if (options.fontSize) element.style.fontSize = `${options.fontSize}px`;
        
        element.style.display = 'block';
        
        // Auto-hide if requested
        if (options.autoHide) {
            clearTimeout(this._gameStateTimeout);
            this._gameStateTimeout = setTimeout(() => {
                this.hideGameStateMessage();
            }, options.duration || 3000);
        }
    }

    /**
     * Hide the game state message
     */
    hideGameStateMessage() {
        if (this.elements.gameStateMessage) {
            this.elements.gameStateMessage.style.display = 'none';
        }
    }

    /**
     * Show a pause message
     */
    showPauseMessage() {
        this.showGameStateMessage('PAUSED', {
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.7)',
            fontSize: 32
        });
    }

    /**
     * Show a game over message with final score
     * @param {number} score - Final score
     */
    showGameOverMessage(score) {
        this.showGameStateMessage(`GAME OVER\nScore: ${score}`, {
            color: 'red',
            backgroundColor: 'rgba(0,0,0,0.8)',
            fontSize: 36
        });
    }

    /**
     * Show a debug message
     * @param {string} message - The debug message to show
     * @param {number} [duration=3000] - How long to show the message (ms)
     */
    showDebugMessage(message, duration = 3000) {
        if (!this.elements.debugMessage) return;

        this.elements.debugMessage.textContent = message;
        this.elements.debugMessage.style.display = 'block';
        
        // Auto-hide
        clearTimeout(this._debugTimeout);
        this._debugTimeout = setTimeout(() => {
            this.hideDebugMessage();
        }, duration);
    }

    /**
     * Hide the debug message
     */
    hideDebugMessage() {
        if (this.elements.debugMessage) {
            this.elements.debugMessage.style.display = 'none';
        }
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