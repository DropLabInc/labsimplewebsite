/**
 * Image Loading Queue Fix
 * 
 * This script limits concurrent image loading to prevent browser connection limits
 * from causing image loading failures. It works by patching the Image constructor
 * without requiring changes to the existing code.
 */

(function() {
    console.log("Setting up image loading queue fix");
    
    // Store the original Image constructor
    const OriginalImage = window.Image;
    
    // Queue for image loading
    const imageQueue = {
        queue: [],
        inProgress: 0,
        maxConcurrent: 6, // Most browsers limit to 6-8 connections per domain
        
        add: function(imageInstance, src) {
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
            
            // Set up completion handler
            const originalOnload = next.imageInstance.onload;
            const originalOnerror = next.imageInstance.onerror;
            
            next.imageInstance.onload = function() {
                imageQueue.inProgress--;
                if (originalOnload) originalOnload.call(this);
                imageQueue.processNext(); // Process next item in queue
            };
            
            next.imageInstance.onerror = function(e) {
                imageQueue.inProgress--;
                if (originalOnerror) originalOnerror.call(this, e);
                imageQueue.processNext(); // Process next item in queue
            };
            
            // Actually set the src to start loading
            next.imageInstance._originalSrc = next.src;
        }
    };
    
    // Override the Image constructor
    window.Image = function() {
        const img = new OriginalImage();
        
        // Store the original src property descriptor
        const srcDescriptor = Object.getOwnPropertyDescriptor(OriginalImage.prototype, 'src');
        
        // Override the src property
        Object.defineProperty(img, 'src', {
            get: function() {
                return img._originalSrc || '';
            },
            set: function(value) {
                img._originalSrc = value;
                
                // If we're already at the concurrent limit, queue this image
                if (imageQueue.inProgress >= imageQueue.maxConcurrent) {
                    imageQueue.add(img, value);
                } else {
                    // Otherwise load it immediately
                    imageQueue.inProgress++;
                    
                    // Use the original setter
                    srcDescriptor.set.call(img, value);
                    
                    // Set up completion handlers
                    const originalOnload = img.onload;
                    const originalOnerror = img.onerror;
                    
                    img.onload = function() {
                        imageQueue.inProgress--;
                        if (originalOnload) originalOnload.call(this);
                        imageQueue.processNext();
                    };
                    
                    img.onerror = function(e) {
                        imageQueue.inProgress--;
                        if (originalOnerror) originalOnerror.call(this, e);
                        imageQueue.processNext();
                    };
                }
            },
            configurable: true
        });
        
        return img;
    };
    
    // Copy prototype properties
    window.Image.prototype = OriginalImage.prototype;
    
    console.log("Image loading queue fix applied");
})(); 