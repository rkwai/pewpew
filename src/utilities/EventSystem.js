/**
 * A simple event system to allow game components to communicate without direct coupling
 */
export class EventSystem {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when the event is triggered
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        
        this.listeners[eventName].push(callback);
        
        // Return unsubscribe function
        return () => {
            this.off(eventName, callback);
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to remove
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        
        this.listeners[eventName] = this.listeners[eventName].filter(
            cb => cb !== callback
        );
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event to trigger
     * @param {any} data - Data to pass to the listeners
     */
    emit(eventName, data) {
        if (!this.listeners[eventName]) return;
        
        this.listeners[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }

    /**
     * Clear all listeners for a specific event or all events
     * @param {string} [eventName] - Name of the event to clear (if omitted, clears all events)
     */
    clear(eventName) {
        if (eventName) {
            this.listeners[eventName] = [];
        } else {
            this.listeners = {};
        }
    }
}

// Create a singleton instance for global use
export const Events = new EventSystem(); 