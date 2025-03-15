# Image Queue System: Code Examples

This document provides practical code examples for implementing the image queue system in various scenarios.

## Table of Contents

1. [Basic Implementation](#basic-implementation)
2. [Frame Animation](#frame-animation)
3. [Image Gallery](#image-gallery)
4. [Lazy Loading](#lazy-loading)
5. [Custom Integration](#custom-integration)

## Basic Implementation

### Using image-queue-simple.js or image-queue-fix.js

These scripts work automatically once included in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="image-queue-fix.js"></script>
</head>
<body>
    <img src="image1.jpg">
    <img src="image2.jpg">
    <img src="image3.jpg">
    <!-- Images will be loaded through the queue automatically -->
</body>
</html>
```

### Using image-queue.js

For the more advanced implementation:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="image-queue.js"></script>
    <script>
        // Load images using the queued function
        window.addEventListener('DOMContentLoaded', () => {
            const imageContainer = document.getElementById('image-container');
            
            // Load images 1-10 using the queue
            for (let i = 1; i <= 10; i++) {
                queuedLoadImage(i).then(img => {
                    imageContainer.appendChild(img);
                }).catch(err => {
                    console.error(`Failed to load image ${i}:`, err);
                });
            }
        });
    </script>
</head>
<body>
    <div id="image-container"></div>
</body>
</html>
```

## Frame Animation

### Scroll-Based Frame Animation

This example shows how to implement a scroll-based frame animation with the image queue:

```javascript
// Global variables
const totalFrames = 500;
const images = [];
let currentFrameIndex = 0;

// Preload initial frames
function preloadInitialFrames() {
    // Load the first frame immediately
    queuedLoadImage(0).then(img => {
        images[0] = img;
        drawFrame(0);
        
        // Then queue up the next several frames
        for (let i = 1; i < 20; i++) {
            queuedLoadImage(i).then(img => {
                images[i] = img;
            }).catch(err => {
                console.error(`Failed to preload frame ${i}:`, err);
            });
        }
    });
}

// Handle scroll events
function handleScroll() {
    // Calculate which frame to show based on scroll position
    const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    const frameIndex = Math.min(Math.floor(scrollPercent * totalFrames), totalFrames - 1);
    
    if (frameIndex !== currentFrameIndex) {
        currentFrameIndex = frameIndex;
        
        // Draw the current frame
        if (images[frameIndex]) {
            drawFrame(frameIndex);
        } else {
            // If the frame isn't loaded yet, queue it with high priority
            queuedLoadImage(frameIndex).then(img => {
                images[frameIndex] = img;
                drawFrame(frameIndex);
            });
        }
        
        // Preload nearby frames
        preloadNearbyFrames(frameIndex);
    }
}

// Preload frames near the current frame
function preloadNearbyFrames(index) {
    // Preload 5 frames ahead and 2 frames behind
    for (let i = index + 1; i <= index + 5; i++) {
        if (i < totalFrames && !images[i]) {
            queuedLoadImage(i).then(img => {
                images[i] = img;
            });
        }
    }
    
    for (let i = index - 1; i >= index - 2; i--) {
        if (i >= 0 && !images[i]) {
            queuedLoadImage(i).then(img => {
                images[i] = img;
            });
        }
    }
}

// Draw the frame to the canvas
function drawFrame(index) {
    const canvas = document.getElementById('animation-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(images[index], 0, 0, canvas.width, canvas.height);
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    preloadInitialFrames();
    window.addEventListener('scroll', handleScroll);
});
```

## Image Gallery

### Implementing a Gallery with Thumbnails and Full-Size Images

```javascript
class ImageGallery {
    constructor(containerId, imagePaths) {
        this.container = document.getElementById(containerId);
        this.imagePaths = imagePaths;
        this.thumbnails = [];
        this.fullSizeImages = [];
        this.currentIndex = 0;
        
        this.init();
    }
    
    init() {
        // Create thumbnail container
        this.thumbnailContainer = document.createElement('div');
        this.thumbnailContainer.className = 'thumbnail-container';
        this.container.appendChild(this.thumbnailContainer);
        
        // Create full-size image container
        this.fullSizeContainer = document.createElement('div');
        this.fullSizeContainer.className = 'fullsize-container';
        this.container.appendChild(this.fullSizeContainer);
        
        // Load thumbnails first (they're smaller and faster to load)
        this.loadThumbnails();
        
        // Then queue the full-size images
        this.queueFullSizeImages();
    }
    
    loadThumbnails() {
        this.imagePaths.forEach((path, index) => {
            // Create thumbnail element
            const thumbContainer = document.createElement('div');
            thumbContainer.className = 'thumbnail';
            
            // Use standard Image constructor for thumbnails (they're small)
            const img = new Image();
            img.src = path.replace('.jpg', '-thumb.jpg');
            img.alt = `Thumbnail ${index + 1}`;
            
            img.addEventListener('click', () => {
                this.showFullSize(index);
            });
            
            thumbContainer.appendChild(img);
            this.thumbnailContainer.appendChild(thumbContainer);
            this.thumbnails[index] = img;
        });
    }
    
    queueFullSizeImages() {
        // Queue loading the first image immediately
        queuedLoadImage(0).then(img => {
            this.fullSizeImages[0] = img;
            this.showFullSize(0);
        });
        
        // Queue the rest with lower priority
        for (let i = 1; i < this.imagePaths.length; i++) {
            const img = new Image();
            img.src = this.imagePaths[i];
            this.fullSizeImages[i] = img;
        }
    }
    
    showFullSize(index) {
        this.currentIndex = index;
        
        // Clear the container
        this.fullSizeContainer.innerHTML = '';
        
        // If the image is loaded, show it
        if (this.fullSizeImages[index] && this.fullSizeImages[index].complete) {
            this.fullSizeContainer.appendChild(this.fullSizeImages[index]);
        } else {
            // Otherwise show loading indicator and queue the image
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.textContent = 'Loading...';
            this.fullSizeContainer.appendChild(loadingIndicator);
            
            queuedLoadImage(index).then(img => {
                this.fullSizeImages[index] = img;
                
                // If this is still the current image, show it
                if (this.currentIndex === index) {
                    this.fullSizeContainer.innerHTML = '';
                    this.fullSizeContainer.appendChild(img);
                }
            });
        }
        
        // Highlight the selected thumbnail
        this.thumbnails.forEach((thumb, i) => {
            thumb.parentElement.classList.toggle('selected', i === index);
        });
    }
}

// Usage
const gallery = new ImageGallery('gallery', [
    'images/photo1.jpg',
    'images/photo2.jpg',
    'images/photo3.jpg',
    'images/photo4.jpg',
    'images/photo5.jpg'
]);
```

## Lazy Loading

### Lazy Loading Images as They Enter the Viewport

```javascript
class LazyLoader {
    constructor() {
        this.images = [];
        this.observer = null;
        this.init();
    }
    
    init() {
        // Set up Intersection Observer
        this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        // Find all images with data-src attribute
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            // Replace with a placeholder
            img.src = 'placeholder.jpg';
            
            // Store the image for later
            this.images.push(img);
            
            // Observe the image
            this.observer.observe(img);
        });
    }
    
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Stop observing this image
                this.observer.unobserve(entry.target);
                
                // Get the real source
                const src = entry.target.getAttribute('data-src');
                
                // Load the image through the queue
                const img = new Image();
                img.onload = () => {
                    // When loaded, update the visible image
                    entry.target.src = src;
                    entry.target.classList.add('loaded');
                };
                img.src = src;
            }
        });
    }
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', () => {
    new LazyLoader();
});
```

## Custom Integration

### Creating a Custom Image Loader with Retry and Fallback

```javascript
class CustomImageLoader {
    constructor(options = {}) {
        this.options = {
            maxConcurrent: 6,
            retryCount: 3,
            retryDelay: 500,
            timeout: 10000,
            ...options
        };
        
        this.queue = [];
        this.inProgress = 0;
    }
    
    loadImage(src, priority = 5) {
        return new Promise((resolve, reject) => {
            // Add to queue with priority (1-10, 10 being highest)
            this.queue.push({
                src,
                priority,
                resolve,
                reject,
                attempts: 0
            });
            
            // Sort queue by priority (highest first)
            this.queue.sort((a, b) => b.priority - a.priority);
            
            // Process queue
            this.processQueue();
        });
    }
    
    processQueue() {
        // If we're at the limit or queue is empty, do nothing
        if (this.inProgress >= this.options.maxConcurrent || this.queue.length === 0) {
            return;
        }
        
        // Get next item from queue
        const item = this.queue.shift();
        this.inProgress++;
        
        // Load the image
        this.loadSingleImage(item.src, item.attempts)
            .then(img => {
                this.inProgress--;
                item.resolve(img);
                this.processQueue();
            })
            .catch(err => {
                // If we haven't reached max retries, put back in queue
                if (item.attempts < this.options.retryCount) {
                    item.attempts++;
                    
                    // Put back in queue with delay
                    setTimeout(() => {
                        this.queue.push(item);
                        this.processQueue();
                    }, this.options.retryDelay * item.attempts);
                    
                    this.inProgress--;
                } else {
                    // Max retries reached, reject
                    this.inProgress--;
                    item.reject(err);
                    this.processQueue();
                }
            });
    }
    
    loadSingleImage(src, attempt = 0) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Set up timeout
            const timeoutId = setTimeout(() => {
                reject(new Error(`Image load timed out: ${src}`));
            }, this.options.timeout);
            
            img.onload = () => {
                clearTimeout(timeoutId);
                resolve(img);
            };
            
            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load image: ${src} (attempt ${attempt + 1})`));
            };
            
            // Add cache busting for retries
            const cacheBuster = attempt > 0 ? `?retry=${attempt}&t=${Date.now()}` : '';
            img.src = src + cacheBuster;
        });
    }
    
    // Preload a batch of images with different priorities
    preloadBatch(images) {
        return Promise.allSettled(
            images.map(img => this.loadImage(img.src, img.priority))
        );
    }
}

// Usage example
const loader = new CustomImageLoader({
    maxConcurrent: 4,
    retryCount: 2
});

// Load a critical image with high priority
loader.loadImage('header.jpg', 10)
    .then(img => {
        document.getElementById('header').appendChild(img);
    })
    .catch(err => {
        console.error('Failed to load header image:', err);
    });

// Preload a batch of images with different priorities
loader.preloadBatch([
    { src: 'gallery/img1.jpg', priority: 8 },
    { src: 'gallery/img2.jpg', priority: 5 },
    { src: 'gallery/img3.jpg', priority: 5 },
    { src: 'gallery/img4.jpg', priority: 3 }
]).then(results => {
    console.log('Batch loading complete:', results);
});
``` 