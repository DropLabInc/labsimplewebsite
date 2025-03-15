// Image loading queue to limit concurrent requests
const imageLoadQueue = {
    queue: [],
    inProgress: 0,
    maxConcurrent: 6, // Most browsers limit to 6-8 connections per domain
    
    add: function(index, resolve, reject) {
        // Add to queue
        this.queue.push({ index, resolve, reject });
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
        
        // Process the actual image loading
        this._loadImage(next.index)
            .then(img => {
                this.inProgress--;
                next.resolve(img);
                this.processNext(); // Process next item in queue
            })
            .catch(err => {
                this.inProgress--;
                next.reject(err);
                this.processNext(); // Process next item in queue
            });
    },
    
    // The actual image loading logic (copied from the original loadImage function)
    _loadImage: function(index) {
        return new Promise((resolve, reject) => {
            // Check if the frame is too far from the current frame
            // This prevents loading frames that were cleared but are far away
            const distanceFromCurrent = Math.abs(index - currentFrameIndex);
            const maxDistance = 100; // Don't load frames more than 100 frames away
            
            if (distanceFromCurrent > maxDistance) {
                console.log(`Skipping load for frame ${index} - too far from current frame ${currentFrameIndex} (distance: ${distanceFromCurrent})`);
                reject(new Error(`Frame ${index} is too far from current frame ${currentFrameIndex}`));
                return;
            }
            
            if (images[index]) {
                // Image already loaded
                resolve(images[index]);
            } else {
                // If image isn't loaded yet, load it
                const img = new Image();
                
                img.onload = () => {
                    images[index] = img;
                    imagesLoaded++;
                    resolve(img);
                };
                
                img.onerror = () => {
                    console.error(`Failed to load image: ${imagePath}/frame_${String(index).padStart(5, '0')}.${imageFormat}`);
                    
                    // Try again with a small delay - sometimes this helps with temporary network issues
                    setTimeout(() => {
                        const retryImg = new Image();
                        
                        retryImg.onload = () => {
                            console.log(`Successfully loaded image on retry: frame ${index}`);
                            images[index] = retryImg;
                            imagesLoaded++;
                            resolve(retryImg);
                        };
                        
                        retryImg.onerror = async () => {
                            // If WebP fails, try PNG as fallback
                            if (imageFormat === 'webp') {
                                console.log(`Trying PNG fallback for frame ${index}`);
                                
                                // Check if PNG file exists before trying to load it
                                const pngPath = `Frames/Dynamic/Frames_PNG/frame_${String(index).padStart(5, '0')}.png`;
                                console.log(`Checking if PNG exists: ${pngPath}`);
                                
                                const pngExists = await checkFileExists(pngPath);
                                
                                if (pngExists) {
                                    const pngImg = new Image();
                                    
                                    pngImg.onload = () => {
                                        console.log(`Successfully loaded PNG fallback for frame ${index}`);
                                        images[index] = pngImg;
                                        imagesLoaded++;
                                        resolve(pngImg);
                                    };
                                    
                                    pngImg.onerror = () => {
                                        console.error(`Failed to load PNG fallback for frame ${index} even though file exists`);
                                        
                                        // Try to find the nearest available frame
                                        console.log(`Trying to find nearest available frame to ${index}`);
                                        
                                        // Look for the nearest loaded frame
                                        let nearestFrame = null;
                                        let minDistance = Number.MAX_VALUE;
                                        
                                        for (let i = 0; i < images.length; i++) {
                                            if (images[i] && images[i].complete) {
                                                const distance = Math.abs(i - index);
                                                if (distance < minDistance) {
                                                    minDistance = distance;
                                                    nearestFrame = i;
                                                }
                                            }
                                        }
                                        
                                        if (nearestFrame !== null) {
                                            console.log(`Using frame ${nearestFrame} as fallback for frame ${index}`);
                                            // Use the nearest frame as a fallback
                                            images[index] = images[nearestFrame];
                                            resolve(images[nearestFrame]);
                                        } else {
                                            reject(new Error(`Failed to load image: Both WebP and PNG formats failed for frame ${index}`));
                                        }
                                    };
                                    
                                    // Use a more robust path construction for PNG fallback
                                    // Log the full path for debugging
                                    console.log(`Attempting to load PNG from: ${pngPath}`);
                                    
                                    // Add cache-busting for PNG fallback too
                                    const pngCacheBuster = `?v=${new Date().getTime()}_png`;
                                    pngImg.src = pngPath + pngCacheBuster;
                                } else {
                                    console.error(`PNG file does not exist: ${pngPath}`);
                                    
                                    // Try to find the nearest available frame as a last resort
                                    let nearestFrame = null;
                                    let minDistance = Number.MAX_VALUE;
                                    
                                    for (let i = 0; i < images.length; i++) {
                                        if (images[i] && images[i].complete) {
                                            const distance = Math.abs(i - index);
                                            if (distance < minDistance) {
                                                minDistance = distance;
                                                nearestFrame = i;
                                            }
                                        }
                                    }
                                    
                                    if (nearestFrame !== null) {
                                        console.log(`Using frame ${nearestFrame} as fallback for frame ${index}`);
                                        // Use the nearest frame as a fallback
                                        images[index] = images[nearestFrame];
                                        resolve(images[nearestFrame]);
                                    } else {
                                        reject(new Error(`Failed to load image: Both WebP and PNG formats failed for frame ${index}`));
                                    }
                                }
                            } else {
                                // Try to find the nearest available frame as a last resort
                                let nearestFrame = null;
                                let minDistance = Number.MAX_VALUE;
                                
                                for (let i = 0; i < images.length; i++) {
                                    if (images[i] && images[i].complete) {
                                        const distance = Math.abs(i - index);
                                        if (distance < minDistance) {
                                            minDistance = distance;
                                            nearestFrame = i;
                                        }
                                    }
                                }
                                
                                if (nearestFrame !== null) {
                                    console.log(`Using frame ${nearestFrame} as fallback for frame ${index}`);
                                    // Use the nearest frame as a fallback
                                    images[index] = images[nearestFrame];
                                    resolve(images[nearestFrame]);
                                } else {
                                    reject(new Error(`Failed to load image: ${imagePath}/frame_${String(index).padStart(5, '0')}.${imageFormat}`));
                                }
                            }
                        };
                        
                        // Add cache-busting for retry to avoid cached error responses
                        const retryTimestamp = new Date().getTime();
                        retryImg.src = `${imagePath}/frame_${String(index).padStart(5, '0')}.${imageFormat}?retry=${retryTimestamp}`;
                    }, 500); // Wait 500ms before retry
                };
                
                // Add cache-busting for Safari/iOS to prevent stale cache issues
                const cacheBuster = isSafariOrIOS ? `?v=${new Date().getTime()}` : '';
                img.src = `${imagePath}/frame_${String(index).padStart(5, '0')}.${imageFormat}${cacheBuster}`;
            }
        });
    }
};

// Replace the original loadImage function with a queued version
function queuedLoadImage(index) {
    return new Promise((resolve, reject) => {
        imageLoadQueue.add(index, resolve, reject);
    });
}

// Export the queued load image function
window.queuedLoadImage = queuedLoadImage; 