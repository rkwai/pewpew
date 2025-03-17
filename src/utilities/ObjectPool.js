/**
 * Generic object pool for reusing game objects
 * This reduces garbage collection and improves performance
 */
export class ObjectPool {
    /**
     * Create a new object pool
     * @param {Function} factory - Function that creates new objects
     * @param {Function} reset - Function that resets objects to their initial state
     * @param {number} initialSize - Initial size of the pool
     * @param {Object} options - Additional pool options
     * @param {boolean} options.autoExpand - Whether to automatically expand the pool when empty
     * @param {number} options.expandAmount - Number of objects to add when expanding
     */
    constructor(factory, reset, initialSize = 0, options = {}) {
        this.factory = factory;
        this.reset = reset;
        this.available = [];
        this.inUse = new Set();
        
        // Auto-expansion settings
        this.autoExpand = options.autoExpand !== undefined ? options.autoExpand : true;
        this.expandAmount = options.expandAmount || 5;
        
        // Pre-populate the pool with initial objects
        this.populate(initialSize);
    }

    /**
     * Populate the pool with a specified number of objects
     * @param {number} count - Number of objects to create
     */
    populate(count) {
        for (let i = 0; i < count; i++) {
            this.available.push(this.factory());
        }
    }

    /**
     * Get an object from the pool
     * @param {...any} args - Arguments to pass to the reset function
     * @returns {any} The obtained object
     */
    get(...args) {
        let object;
        
        // If there are available objects, use one
        if (this.available.length > 0) {
            object = this.available.pop();
        } else {
            // If pool is empty and auto-expand is configured
            if (this.autoExpand && this.expandAmount > 0) {
                this.expand(this.expandAmount);
                // Try again to get an object from the expanded pool
                if (this.available.length > 0) {
                    object = this.available.pop();
                } else {
                    // If still empty, create a new one
                    object = this.factory();
                }
            } else {
                // Otherwise create a new one
                object = this.factory();
            }
        }
        
        // Check if reset function exists
        if (typeof this.reset === 'function') {
            try {
                // Reset the object with the provided arguments
                this.reset(object, ...args);
            } catch (error) {
                console.error('Error resetting object from pool:', error);
                // Try to recover by creating a new object
                object = this.factory();
                // Try resetting again
                try {
                    this.reset(object, ...args);
                } catch (secondError) {
                    console.error('Failed to reset newly created object:', secondError);
                }
            }
        }
        
        // Add to in-use set
        this.inUse.add(object);
        
        return object;
    }

    /**
     * Return an object to the pool
     * @param {any} object - The object to return
     */
    release(object) {
        // Only process if the object is actually in use
        if (this.inUse.has(object)) {
            this.inUse.delete(object);
            this.available.push(object);
        }
    }

    /**
     * Return all in-use objects to the pool
     */
    releaseAll() {
        // Convert in-use set to array, then release each object
        Array.from(this.inUse).forEach(object => {
            this.available.push(object);
        });
        
        // Clear the in-use set
        this.inUse.clear();
    }

    /**
     * Get the number of objects currently available in the pool
     * @returns {number} Number of available objects
     */
    getAvailableCount() {
        return this.available.length;
    }

    /**
     * Get the number of objects currently in use
     * @returns {number} Number of in-use objects
     */
    getInUseCount() {
        return this.inUse.size;
    }

    /**
     * Get the total number of objects in the pool (available + in use)
     * @returns {number} Total number of objects
     */
    getTotalCount() {
        return this.available.length + this.inUse.size;
    }

    /**
     * Expand the pool by creating additional objects
     * @param {number} amount - Number of objects to add
     * @returns {number} New total available count
     */
    expand(amount = 5) {
        if (amount <= 0) return this.available.length;
        
        console.log(`Expanding object pool by ${amount} objects`);
        
        // Create new objects and add to available array
        for (let i = 0; i < amount; i++) {
            this.available.push(this.factory());
        }
        
        return this.available.length;
    }
} 