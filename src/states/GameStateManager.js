// Game state constants
export const GameState = {
    MENU: 'menu',
    GAMEPLAY: 'gameplay',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// GameStateManager class to handle state transitions and management
export class GameStateManager {
    constructor(gameplayInstance) {
        this.currentState = GameState.MENU;
        this.gameplayInstance = gameplayInstance;
        this.isPaused = false;
        
        // Create UI elements
        this.createUI();
        
        // Show the menu at start
        this.showMenu();
        
        console.log("GameStateManager initialized in state:", this.currentState);
    }
    
    createUI() {
        // Create menu overlay
        this.menuOverlay = document.createElement('div');
        this.menuOverlay.id = 'menu-overlay';
        this.menuOverlay.style.position = 'absolute';
        this.menuOverlay.style.top = '0';
        this.menuOverlay.style.left = '0';
        this.menuOverlay.style.width = '100%';
        this.menuOverlay.style.height = '100%';
        this.menuOverlay.style.backgroundColor = 'rgba(0, 0, 20, 0.7)';
        this.menuOverlay.style.display = 'flex';
        this.menuOverlay.style.flexDirection = 'column';
        this.menuOverlay.style.justifyContent = 'center';
        this.menuOverlay.style.alignItems = 'center';
        this.menuOverlay.style.color = 'white';
        this.menuOverlay.style.fontFamily = 'Arial, sans-serif';
        this.menuOverlay.style.zIndex = '100';
        this.menuOverlay.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">2.5D SHOOTER</h1>
            <p style="font-size: 24px; margin-bottom: 40px;">Press ENTER to Start</p>
            <div style="font-size: 18px; text-align: center;">
                <p>Arrow Keys: Move</p>
                <p>Space: Shoot</p>
                <p>Enter: Pause/Unpause</p>
            </div>
        `;
        document.body.appendChild(this.menuOverlay);
        
        // Create pause overlay
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'pause-overlay';
        this.pauseOverlay.style.position = 'absolute';
        this.pauseOverlay.style.top = '0';
        this.pauseOverlay.style.left = '0';
        this.pauseOverlay.style.width = '100%';
        this.pauseOverlay.style.height = '100%';
        this.pauseOverlay.style.backgroundColor = 'rgba(0, 0, 20, 0.5)';
        this.pauseOverlay.style.display = 'none';
        this.pauseOverlay.style.flexDirection = 'column';
        this.pauseOverlay.style.justifyContent = 'center';
        this.pauseOverlay.style.alignItems = 'center';
        this.pauseOverlay.style.color = 'white';
        this.pauseOverlay.style.fontFamily = 'Arial, sans-serif';
        this.pauseOverlay.style.zIndex = '100';
        this.pauseOverlay.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">PAUSED</h1>
            <p style="font-size: 24px;">Press ENTER to Resume</p>
        `;
        document.body.appendChild(this.pauseOverlay);
    }
    
    showMenu() {
        this.currentState = GameState.MENU;
        this.menuOverlay.style.display = 'flex';
        this.pauseOverlay.style.display = 'none';
        
        // Hide HUD
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.display = 'none';
        }
        
        console.log("Changed to MENU state");
    }
    
    startGame() {
        // Update state
        this.currentState = GameState.GAMEPLAY;
        
        // Hide UI overlays
        this.menuOverlay.style.display = 'none';
        this.pauseOverlay.style.display = 'none';
        
        // Check if this is a restart or first start
        const needsRestart = this.gameplayInstance.isGameOver;
        
        // Reset game if it was previously in GAME_OVER state
        if (needsRestart) {
            console.log("Starting a new game after game over");
            this.gameplayInstance.restart();
        } else {
            console.log("Starting game for the first time");
        }
        
        // Show HUD
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.display = 'block';
        }
        
        console.log("Game started in GAMEPLAY state");
    }
    
    pauseGame() {
        if (this.currentState === GameState.GAMEPLAY) {
            this.currentState = GameState.PAUSED;
            this.pauseOverlay.style.display = 'flex';
            this.gameplayInstance.pause();
            console.log("Changed to PAUSED state");
        }
    }
    
    resumeGame() {
        if (this.currentState === GameState.PAUSED) {
            this.currentState = GameState.GAMEPLAY;
            this.pauseOverlay.style.display = 'none';
            this.gameplayInstance.resume();
            console.log("Changed to GAMEPLAY state (from PAUSED)");
        }
    }
    
    gameOver(score) {
        this.currentState = GameState.GAME_OVER;
        console.log("Changed to GAME_OVER state, score:", score);
        
        // Update the menu overlay to show game over
        this.menuOverlay.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">GAME OVER</h1>
            <p style="font-size: 24px; margin-bottom: 20px;">Score: ${score}</p>
            <p style="font-size: 24px; margin-bottom: 40px;">Press ENTER to Restart</p>
            <div style="font-size: 18px; text-align: center;">
                <p>Arrow Keys: Move</p>
                <p>Space: Shoot</p>
                <p>Enter: Pause/Unpause</p>
            </div>
        `;
        
        // Ensure menu is visible
        this.menuOverlay.style.display = 'flex';
        this.pauseOverlay.style.display = 'none';

        // Pause the game
        this.gameplayInstance.pause();
    }
    
    handleEnterPress() {
        console.log("Enter key pressed in state:", this.currentState);
        
        switch (this.currentState) {
            case GameState.MENU:
                this.startGame();
                break;
                
            case GameState.GAMEPLAY:
                this.pauseGame();
                break;
                
            case GameState.PAUSED:
                this.resumeGame();
                break;
                
            case GameState.GAME_OVER:
                console.log("Enter pressed in GAME_OVER state - starting new game");
                // Call restart() on the gameplayInstance to properly reset the game state
                if (this.gameplayInstance && typeof this.gameplayInstance.restart === 'function') {
                    this.gameplayInstance.restart();
                }
                // Reset to menu state first
                this.currentState = GameState.MENU;
                // Then start a new game which will hide menus and show gameplay
                this.startGame();
                break;
                
            default:
                console.error("Unknown game state:", this.currentState);
                this.startGame(); // Default to starting the game
        }
    }
    
    destroy() {
        // Remove UI elements
        if (this.menuOverlay && document.body.contains(this.menuOverlay)) {
            document.body.removeChild(this.menuOverlay);
        }
        
        if (this.pauseOverlay && document.body.contains(this.pauseOverlay)) {
            document.body.removeChild(this.pauseOverlay);
        }
    }
} 