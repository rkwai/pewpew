// Removed GameState enum (now imported from GameStore)
import { GameState, Store, ActionTypes } from '../utilities/GameStore.js';
import { Events } from '../utilities/EventSystem.js';

// GameStateManager class to handle state transitions and management
export class GameStateManager {
    constructor(gameplayInstance) {
        this.gameplayInstance = gameplayInstance;
        
        // Create UI elements
        this.createUI();
        
        // Show the menu at start - now dispatch through store
        Store.dispatch({ type: ActionTypes.GAME_STATE_CHANGE, payload: GameState.MENU });
        this.showMenu();
        
        // Subscribe to store updates
        this.unsubscribe = Events.on('STORE_UPDATED', (data) => {
            this.handleStoreUpdate(data);
        });
        
        console.log("GameStateManager initialized in state:", Store.getState().gameState);
    }
    
    /**
     * Handle store updates
     * @param {Object} data - Data from store update event
     */
    handleStoreUpdate(data) {
        const { action, state } = data;
        
        // Update UI based on state changes
        switch (action.type) {
            case ActionTypes.GAME_STATE_CHANGE:
            case ActionTypes.GAME_START:
                if (state.gameState === GameState.MENU) {
                    this.showMenu();
                } else if (state.gameState === GameState.GAMEPLAY) {
                    this.showGameplay();
                }
                break;
                
            case ActionTypes.GAME_PAUSE:
                this.showPauseOverlay();
                break;
                
            case ActionTypes.GAME_RESUME:
                this.hidePauseOverlay();
                break;
                
            case ActionTypes.GAME_OVER:
                this.showGameOverScreen(state.score);
                break;
                
            default:
                // No UI updates needed for other actions
                break;
        }
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
        this.menuOverlay.style.display = 'flex';
        this.pauseOverlay.style.display = 'none';
        
        // Hide HUD
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.display = 'none';
        }
        
        console.log("Changed to MENU state");
    }
    
    showGameplay() {
        // Hide UI overlays
        this.menuOverlay.style.display = 'none';
        this.pauseOverlay.style.display = 'none';
        
        // Show HUD
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.display = 'block';
        }
    }
    
    showPauseOverlay() {
        this.pauseOverlay.style.display = 'flex';
    }
    
    hidePauseOverlay() {
        this.pauseOverlay.style.display = 'none';
    }
    
    startGame() {
        // Use the store to dispatch game start action
        Store.dispatch({ type: ActionTypes.GAME_START });
        
        // Reset game if it was previously in GAME_OVER state
        const state = Store.getState();
        if (state.isGameOver) {
            console.log("Starting a new game after game over");
            this.gameplayInstance.restart();
        } else {
            console.log("Starting game for the first time");
        }
        
        console.log("Game started in GAMEPLAY state");
    }
    
    pauseGame() {
        const state = Store.getState();
        if (state.gameState === GameState.GAMEPLAY) {
            Store.dispatch({ type: ActionTypes.GAME_PAUSE });
            this.gameplayInstance.pause();
            console.log("Changed to PAUSED state");
        }
    }
    
    resumeGame() {
        const state = Store.getState();
        if (state.gameState === GameState.PAUSED) {
            Store.dispatch({ type: ActionTypes.GAME_RESUME });
            this.gameplayInstance.resume();
            console.log("Changed to GAMEPLAY state (from PAUSED)");
        }
    }
    
    gameOver(score) {
        Store.dispatch({ 
            type: ActionTypes.GAME_OVER,
            payload: score
        });
        
        console.log("Changed to GAME_OVER state, score:", score);
    }
    
    showGameOverScreen(score) {
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
    }
    
    handleEnterPress() {
        const state = Store.getState();
        console.log("Enter key pressed in state:", state.gameState);
        
        switch (state.gameState) {
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
                // Dispatch restart action
                Store.dispatch({ type: ActionTypes.GAME_RESTART });
                
                // Call restart() on the gameplayInstance to properly reset the game state
                if (this.gameplayInstance && typeof this.gameplayInstance.restart === 'function') {
                    this.gameplayInstance.restart();
                }
                
                // Start new game
                this.startGame();
                break;
                
            default:
                console.error("Unknown game state:", state.gameState);
                this.startGame(); // Default to starting the game
        }
    }
    
    destroy() {
        // Unsubscribe from events
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // Remove UI elements
        if (this.menuOverlay && document.body.contains(this.menuOverlay)) {
            document.body.removeChild(this.menuOverlay);
        }
        
        if (this.pauseOverlay && document.body.contains(this.pauseOverlay)) {
            document.body.removeChild(this.pauseOverlay);
        }
    }
} 