/**
 * GameStore - Central state management system for the game
 * Implements a Redux-like store pattern with a single state object
 * and methods to update it in a controlled manner
 */
import { Events } from './EventSystem.js';

// Define action types as constants to avoid typos
export const ActionTypes = {
  // Game state actions
  GAME_STATE_CHANGE: 'GAME_STATE_CHANGE',
  GAME_START: 'GAME_START',
  GAME_PAUSE: 'GAME_PAUSE',
  GAME_RESUME: 'GAME_RESUME',
  GAME_OVER: 'GAME_OVER',
  GAME_RESTART: 'GAME_RESTART',
  
  // Player actions
  PLAYER_TAKE_DAMAGE: 'PLAYER_TAKE_DAMAGE',
  PLAYER_HEAL: 'PLAYER_HEAL',
  PLAYER_DEATH: 'PLAYER_DEATH',
  PLAYER_RESPAWN: 'PLAYER_RESPAWN',
  
  // Score actions
  SCORE_INCREMENT: 'SCORE_INCREMENT',
  SCORE_RESET: 'SCORE_RESET',
  
  // Gameplay actions
  ASTEROID_DESTROYED: 'ASTEROID_DESTROYED',
  BULLET_FIRED: 'BULLET_FIRED',
  COLLISION_DETECTED: 'COLLISION_DETECTED',
};

// Game state constants - moved from GameStateManager.js
export const GameState = {
  MENU: 'menu',
  GAMEPLAY: 'gameplay',
  PAUSED: 'paused',
  GAME_OVER: 'game_over'
};

class GameStore {
  constructor() {
    // Initialize with default state
    this.state = {
      gameState: GameState.MENU,
      player: {
        health: 100,
        lives: 3,
        isInvulnerable: false,
        position: { x: 0, y: 0, z: 0 },
      },
      score: 0,
      level: 1,
      isPaused: false,
      isGameOver: false,
      entities: {
        asteroidCount: 0,
        bulletCount: 0,
      },
      performance: {
        fps: 0,
        objectCount: 0,
      }
    };
    
    // Keep a history of states to support undo/debugging (limited to 10 entries)
    this.history = [];
    this.historyLimit = 10;
    
    // For debugging - allows time travel debugging
    this.debug = {
      enabled: false,
      logActions: false,
    };
  }
  
  /**
   * Get the current state (immutable)
   * @returns {Object} Copy of the current state
   */
  getState() {
    // Return a copy to prevent direct mutation
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * Dispatch an action to update the state
   * @param {Object} action - Action object with type and payload
   */
  dispatch(action) {
    if (!action || !action.type) {
      throw new Error('Actions must have a type property');
    }
    
    // Debug logging
    if (this.debug.logActions) {
      console.log('Action dispatched:', action);
    }
    
    // Save current state to history before updating
    this._addToHistory();
    
    // Update state based on action type
    const newState = this._reducer(this.state, action);
    
    // Update the state
    this.state = newState;
    
    // Emit event so subscribers can react
    Events.emit('STORE_UPDATED', {
      action,
      state: this.getState()
    });
    
    // Emit specific event for the action type
    Events.emit(`ACTION_${action.type}`, action.payload);
    
    return this.state;
  }
  
  /**
   * Internal reducer function to apply actions to state
   * @private
   * @param {Object} state - Current state
   * @param {Object} action - Action to apply
   * @returns {Object} New state
   */
  _reducer(state, action) {
    // Clone the state to avoid direct mutations
    const newState = JSON.parse(JSON.stringify(state));
    
    switch (action.type) {
      // Game state actions
      case ActionTypes.GAME_STATE_CHANGE:
        newState.gameState = action.payload;
        break;
        
      case ActionTypes.GAME_START:
        newState.gameState = GameState.GAMEPLAY;
        newState.isPaused = false;
        newState.isGameOver = false;
        break;
        
      case ActionTypes.GAME_PAUSE:
        newState.gameState = GameState.PAUSED;
        newState.isPaused = true;
        break;
        
      case ActionTypes.GAME_RESUME:
        newState.gameState = GameState.GAMEPLAY;
        newState.isPaused = false;
        break;
        
      case ActionTypes.GAME_OVER:
        newState.gameState = GameState.GAME_OVER;
        newState.isGameOver = true;
        newState.isPaused = true;
        break;
        
      case ActionTypes.GAME_RESTART:
        // Reset to initial game state but keep the score history
        const currentScore = newState.score;
        newState.gameState = GameState.GAMEPLAY;
        newState.player.health = 100;
        newState.player.lives = 3;
        newState.player.isInvulnerable = false;
        newState.isPaused = false;
        newState.isGameOver = false;
        newState.score = 0;
        newState.entities.asteroidCount = 0;
        newState.entities.bulletCount = 0;
        // Could store high score here
        break;
        
      // Player actions
      case ActionTypes.PLAYER_TAKE_DAMAGE:
        if (!newState.player.isInvulnerable) {
          newState.player.health = Math.max(0, newState.player.health - action.payload);
          
          // Check if player died
          if (newState.player.health <= 0) {
            newState.player.lives -= 1;
            
            // Check for game over
            if (newState.player.lives <= 0) {
              newState.isGameOver = true;
              newState.gameState = GameState.GAME_OVER;
            }
          }
        }
        break;
        
      case ActionTypes.PLAYER_HEAL:
        newState.player.health = Math.min(100, newState.player.health + action.payload);
        break;
        
      case ActionTypes.PLAYER_DEATH:
        newState.player.lives -= 1;
        if (newState.player.lives <= 0) {
          newState.isGameOver = true;
          newState.gameState = GameState.GAME_OVER;
        }
        break;
        
      case ActionTypes.PLAYER_RESPAWN:
        newState.player.health = 100;
        newState.player.isInvulnerable = true;
        break;
        
      // Score actions
      case ActionTypes.SCORE_INCREMENT:
        newState.score += action.payload;
        break;
        
      case ActionTypes.SCORE_RESET:
        newState.score = 0;
        break;
        
      // Entity tracking
      case ActionTypes.ASTEROID_DESTROYED:
        newState.entities.asteroidCount = Math.max(0, newState.entities.asteroidCount - 1);
        break;
        
      case ActionTypes.BULLET_FIRED:
        newState.entities.bulletCount += 1;
        break;
        
      default:
        // If action type is not recognized, return state unchanged
        return state;
    }
    
    return newState;
  }
  
  /**
   * Add current state to history
   * @private
   */
  _addToHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    
    // Keep history size limited
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }
  
  /**
   * Time travel to a previous state (for debugging)
   * @param {number} steps - Number of steps to go back
   * @returns {Object} The restored state
   */
  timeTravel(steps) {
    if (!this.debug.enabled) return this.state;
    
    const index = this.history.length - 1 - steps;
    if (index >= 0 && index < this.history.length) {
      this.state = JSON.parse(JSON.stringify(this.history[index]));
      Events.emit('STORE_UPDATED', {
        action: { type: 'TIME_TRAVEL' },
        state: this.getState()
      });
    }
    
    return this.state;
  }
  
  /**
   * Reset the store to initial state
   */
  reset() {
    this.dispatch({ type: ActionTypes.GAME_RESTART });
  }
}

// Create a singleton instance for global use
export const Store = new GameStore();

// Export a function to get the current state anywhere
export function getGameState() {
  return Store.getState();
} 