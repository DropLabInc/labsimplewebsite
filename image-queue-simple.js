/**
 * Simple Image Loading Queue
 * 
 * This script adds a queue system to limit concurrent image loading,
 * which helps prevent browser connection limits from causing image loading failures.
 * 
 * To use:
 * 1. Include this script in your HTML
 * 2. Call limitImageLoading() at the beginning of your script
 */

function limitImageLoading() {
    console.log("Setting up image loading queue to limit concurrent connections");
    
    // Store the original Image constructor
    const OriginalImage = window.Image;
    
    // Queue for image loading
    const imageQueue = {
        queue: [],
        inProgress: 0,
        maxConcurrent: 6, // Most browsers limit to 6-8 connections per domain
        
        add: function(imageInstance, src) {
            console.log(`Adding image to queue: ${src}`);
            // Add to queue
            this.queue.push({ imageInstance, src });
            this.processNext();
        },
        
        processNext: function() {
            // If we're already loading the max number of images or the queue is empty, do nothing
            if (this.inProgress >= this.maxConcurrent || this.queue.length === 0) {
                return;
            }
            
            // Get the next item from the queue
            const next = this.queue.shift();
            this.inProgress++;
            
            console.log(`Processing image from queue: ${next.src} (${this.inProgress}/${this.maxConcurrent} active, ${this.queue.length} remaining)`);
            
            // Set up completion handler
            const originalOnload = next.imageInstance.onload;
            const originalOnerror = next.imageInstance.onerror;
            
            next.imageInstance.onload = () => {
                console.log(`Image loaded successfully: ${next.src}`);
                this.inProgress--;
                if (originalOnload) originalOnload.call(next.imageInstance);
                this.processNext(); // Process next item in queue
            };
            
            next.imageInstance.onerror = (e) => {
                console.error(`Image failed to load: ${next.src}`, e);
                this.inProgress--;
                if (originalOnerror) originalOnerror.call(next.imageInstance, e);
                this.processNext(); // Process next item in queue
            };
            
            // Actually set the src to start loading - use the original src setter
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(next.imageInstance), 'src');
            if (descriptor && descriptor.set) {
                descriptor.set.call(next.imageInstance, next.src);
            } else {
                // Fallback if we can't get the descriptor
                console.warn("Could not find src property descriptor, using direct assignment");
                next.imageInstance.src = next.src;
            }
        }
    };
    
    // Override the Image constructor
    window.Image = function() {
        const img = new OriginalImage();
        
        // Store the original methods
        const originalSetAttribute = img.setAttribute;
        
        // Override setAttribute to catch src changes
        img.setAttribute = function(name, value) {
            if (name.toLowerCase() === 'src') {
                // Instead of setting src directly, add to queue
                imageQueue.add(img, value);
                return;
            }
            // For other attributes, use the original method
            return originalSetAttribute.call(img, name, value);
        };
        
        // Override the src property
        let srcValue = '';
        Object.defineProperty(img, 'src', {
            set: function(value) {
                console.log(`Setting image src: ${value}`);
                srcValue = value;
                // Instead of loading immediately, add to queue
                imageQueue.add(img, value);
            },
            get: function() {
                return srcValue;
            },
            configurable: true // Make it configurable so it can be redefined later
        });
        
        return img;
    };
    
    // Copy properties from the original Image constructor
    window.Image.prototype = OriginalImage.prototype;
    window.Image.prototype.constructor = window.Image;
    
    console.log("Image loading queue set up successfully");
}

// Auto-initialize when the page starts loading
if (typeof window !== 'undefined') {
    // Initialize immediately instead of waiting for DOMContentLoaded
    limitImageLoading();
} 