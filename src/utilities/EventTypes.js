/**
 * Standardized event types for the game event system
 * This provides a central place to manage all event names
 * to avoid typos and make refactoring easier
 */

export const EventTypes = {
  // Entity events
  ENTITY_DAMAGED: 'entity:damaged',
  ENTITY_DESTROYED: 'entity:destroyed',
  ENTITY_SPAWNED: 'entity:spawned',
  ENTITY_COLLISION: 'entity:collision',
  
  // Player specific events
  PLAYER_DAMAGED: 'player:damaged',
  PLAYER_HEALED: 'player:healed',
  PLAYER_DIED: 'player:died',
  PLAYER_RESPAWNED: 'player:respawned',
  PLAYER_SHOT: 'player:shot',
  PLAYER_MOVED: 'player:moved',
  PLAYER_INVULNERABILITY_CHANGED: 'player:invulnerabilityChanged',
  
  // Asteroid events
  ASTEROID_SPAWNED: 'asteroid:spawned',
  ASTEROID_DESTROYED: 'asteroid:destroyed',
  ASTEROID_DAMAGED: 'asteroid:damaged',
  
  // Bullet events
  BULLET_FIRED: 'bullet:fired',
  BULLET_HIT: 'bullet:hit',
  BULLET_DESTROYED: 'bullet:destroyed',
  
  // Game state events
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_OVER: 'game:over',
  GAME_RESET: 'game:reset',
  
  // Score events
  SCORE_CHANGED: 'score:changed',
  SCORE_RESET: 'score:reset',
  HIGH_SCORE_ACHIEVED: 'score:highScore',
  
  // UI events
  UI_HEALTH_CHANGED: 'ui:healthChanged',
  UI_SCORE_CHANGED: 'ui:scoreChanged',
  UI_MESSAGE_DISPLAYED: 'ui:messageDisplayed',
  
  // Resource events
  RESOURCE_LOADED: 'resource:loaded',
  RESOURCE_LOADING_STARTED: 'resource:loadingStarted',
  RESOURCE_LOADING_COMPLETE: 'resource:loadingComplete',
  RESOURCE_LOADING_ERROR: 'resource:loadingError',
  
  // System events
  FRAME_UPDATE: 'system:frameUpdate',
  COLLISION_DETECTED: 'system:collisionDetected',
}; 