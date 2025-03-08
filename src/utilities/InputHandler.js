export class InputHandler {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false,
            KeyZ: false, // For special abilities
            KeyH: false  // For toggling hit spheres
        };
        
        // Track keys that should only trigger once when pressed
        this.keysPressedOnce = {
            KeyH: false
        };
        
        // Event callbacks for debug features
        this.onToggleHitSpheres = null;
        
        // Bind event handlers
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleKeyDown(event) {
        // Check if the pressed key is one we're tracking
        if (this.keys.hasOwnProperty(event.code)) {
            // Only set to true if not already pressed (for "pressed once" keys)
            if (this.keysPressedOnce.hasOwnProperty(event.code) && !this.keys[event.code]) {
                // Handle "once" key presses
                if (event.code === 'KeyH' && this.onToggleHitSpheres) {
                    this.onToggleHitSpheres();
                }
                this.keysPressedOnce[event.code] = true;
            }
            
            this.keys[event.code] = true;
            
            // Prevent default behavior for game controls
            event.preventDefault();
        }
    }
    
    handleKeyUp(event) {
        // Check if the released key is one we're tracking
        if (this.keys.hasOwnProperty(event.code)) {
            this.keys[event.code] = false;
            
            // Reset "pressed once" state
            if (this.keysPressedOnce.hasOwnProperty(event.code)) {
                this.keysPressedOnce[event.code] = false;
            }
            
            // Prevent default behavior for game controls
            event.preventDefault();
        }
    }
    
    isPressed(keyCode) {
        return this.keys[keyCode] || false;
    }
    
    // Clean up when no longer needed
    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
} 