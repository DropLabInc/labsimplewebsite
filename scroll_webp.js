document.addEventListener('DOMContentLoaded', function() {
    // Scroll to top of page upon loading
    window.scrollTo(0, 0);

    const frameImage = document.getElementById('frameImage');
    const scrollText = document.getElementById('scrollText');
    const textSections = document.querySelectorAll('.text-section');
    const listSections = document.querySelectorAll('.list-section');
    const menuButtons = document.querySelectorAll('.menu-button');
    const contentWrapper = document.querySelector('.content-wrapper');
    const frameSection = document.querySelector('.frame-section');
    const frameContent = document.querySelector('.frame-content');
    const leadershipSection = document.querySelector('.leadership-section');
    let animationComplete = false;
    let bufferTimeout;
    const BUFFER_DELAY = 1000; // 1 second buffer
    
    // Frame generation functions
    function padFrameNumber(number) {
        return number.toString().padStart(5, '0');
    }
    
    // Dynamic frame generation instead of static list
    let TOTAL_FRAMES = 1051; // We have 1051 frames (0-1050) after renaming
    let lastValidFrame = 0; // Keep track of the highest valid frame we've found
    
    // Function to check and adjust total frames if needed
    function adjustTotalFrames() {
        // If we find a higher valid frame, update lastValidFrame
        for (const key in preloadedImages) {
            const frameNum = parseInt(key);
            if (!preloadedImages[frameNum].error && frameNum > lastValidFrame) {
                lastValidFrame = frameNum;
            }
        }
        
        // Binary search to find the last valid frame starting from current lastValidFrame
        function findLastValidFrameBinary(low, high, callback) {
            if (low > high) {
                // We've narrowed down to the last valid frame
                callback(low - 1);
                return;
            }
            
            // Check the middle point
            const mid = Math.floor((low + high) / 2);
            const img = new Image();
            img.onload = function() {
                // If this frame exists, the last valid frame is at least mid
                // Search in the higher half
                findLastValidFrameBinary(mid + 1, high, callback);
            };
            img.onerror = function() {
                // If this frame doesn't exist, the last valid frame is lower
                // Search in the lower half
                findLastValidFrameBinary(low, mid - 1, callback);
            };
            img.src = getFramePath(mid);
        }
        
        // Only run this check occasionally to avoid too many network requests
        // For example, every 50th frame or when we're near the expected end
        if (lastFrameIndex % 50 === 0 || lastFrameIndex > TOTAL_FRAMES * 0.9) {
            // Start checking from our current known lastValidFrame
            findLastValidFrameBinary(lastValidFrame, TOTAL_FRAMES, function(lastFrame) {
                if (lastFrame < TOTAL_FRAMES - 1) {
                    console.log(`Adjusting total frames from ${TOTAL_FRAMES} to ${lastFrame + 1}`);
                    TOTAL_FRAMES = lastFrame + 1;
                }
            });
        }
    }
    
    // Function to get frame path based on frame number
    const getFramePath = (frameNumber) => {
        // With our renamed files, the pattern is now simple and consistent
        const paddedNumber = padFrameNumber(frameNumber);
        return `Frames/frame_${paddedNumber}.png`;
    };
    
    // Function to check if an image exists
    function imageExists(url, callback) {
        const img = new Image();
        img.onload = function() { callback(true); };
        img.onerror = function() { callback(false); };
        img.src = url;
    }
    
    // Keep track of preloaded images
    const preloadedImages = {};
    let lastFrameIndex = -1;
    let lastScrollY = 0;
    const maxScrollSpeed = 50; // Maximum pixels per frame
    let frameChangeTimeout;
    
    // Enhanced smooth scrolling variables with time-based moving average
    let lastProgress = 0;
    let dampingFactor = 0.85; // Higher value = smoother but less responsive
    
    // Time-based moving average system
    const timeBasedSamples = []; // Array of {time, position} objects
    const maxTimeWindow = 300; // Track samples from the last 300ms
    let lastSampleTime = 0;
    const minSampleInterval = 5; // Minimum 5ms between samples to avoid oversampling
    const minScrollSpeed = 0.5; // Minimum scroll speed (pixels per frame) to maintain smoothness
    const baseAnimationSpeed = 2; // Base animation speed when scrolling is very slow
    
    let isScrolling = false;
    let scrollTimeout;
    let scrollAnimationId = null;
    let smoothScrollAnimationId = null;
    
    // Add throttling variables
    let lastScrollUpdate = 0;
    const throttleDelay = 10; // Milliseconds between scroll updates (100fps)
    
    // Hide scroll text after 3 seconds
    setTimeout(() => {
        if (scrollText) {
            scrollText.classList.add('fade-out');
        }
    }, 3000);
    
    // Preload a range of frames around the current frame with priority to upcoming frames
    function preloadFrameRange(currentIndex, range = 5) {
        // Prioritize loading frames ahead of current position (direction of scrolling)
        // Load more frames ahead and fewer behind for smoother experience
        const ahead = Math.ceil(range * 0.7);
        const behind = Math.floor(range * 0.3);
        
        // First load the immediate next frames (higher priority)
        for (let i = currentIndex + 1; i <= Math.min(TOTAL_FRAMES - 1, currentIndex + ahead); i++) {
            if (!preloadedImages[i] || preloadedImages[i].error) {
                const img = new Image();
                img.src = getFramePath(i);
                preloadedImages[i] = img;
                
                // Set a load timeout to detect stalled requests
                const loadTimeout = setTimeout(() => {
                    if (!img.complete) {
                        console.log(`Frame ${i} load timeout, marking as error`);
                        img.error = true;
                    }
                }, 5000); // 5 second timeout
                
                img.onload = () => {
                    clearTimeout(loadTimeout);
                };
                
                img.onerror = () => {
                    clearTimeout(loadTimeout);
                    img.error = true;
                };
            }
        }
        
        // Then load previous frames (lower priority but still important for backward scrolling)
        for (let i = currentIndex - 1; i >= Math.max(0, currentIndex - behind); i--) {
            if (!preloadedImages[i] || preloadedImages[i].error) {
                const img = new Image();
                img.src = getFramePath(i);
                preloadedImages[i] = img;
                
                img.onerror = () => {
                    img.error = true;
                };
            }
        }
    }
    
    // Listen for scroll events
    window.addEventListener('scroll', () => {
        // Throttle scroll updates
        const now = Date.now();
        if (now - lastScrollUpdate < throttleDelay) {
            return; // Skip this update if we updated too recently
        }
        lastScrollUpdate = now;
        
        // Get current scroll position
        const currentScrollY = window.scrollY;
        
        // Add to time-based samples if enough time has passed since last sample
        if (now - lastSampleTime >= minSampleInterval) {
            timeBasedSamples.push({
                time: now,
                position: currentScrollY
            });
            lastSampleTime = now;
            
            // Remove samples older than maxTimeWindow
            while (timeBasedSamples.length > 0 && now - timeBasedSamples[0].time > maxTimeWindow) {
                timeBasedSamples.shift();
            }
        }
        
        // Limit how much the position can change for animation purposes
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        let effectiveScrollY = currentScrollY;
        if (scrollDelta > maxScrollSpeed) {
            const direction = currentScrollY > lastScrollY ? 1 : -1;
            effectiveScrollY = lastScrollY + (maxScrollSpeed * direction);
        }
        
        lastScrollY = currentScrollY; // Always update with the actual scroll position
        
        // Cancel any pending animation frames
        if (scrollAnimationId) {
            cancelAnimationFrame(scrollAnimationId);
        }
        if (smoothScrollAnimationId) {
            cancelAnimationFrame(smoothScrollAnimationId);
        }
        
        // Schedule a new update using RAF for smoother performance
        scrollAnimationId = requestAnimationFrame(() => {
            // Calculate time-weighted average of scroll positions
            // More recent samples have higher weight based on recency
            if (timeBasedSamples.length > 0) {
                let totalWeight = 0;
                let weightedSum = 0;
                const latestTime = timeBasedSamples[timeBasedSamples.length - 1].time;
                
                // Calculate current scroll velocity
                let scrollVelocity = 0;
                if (timeBasedSamples.length >= 2) {
                    const newest = timeBasedSamples[timeBasedSamples.length - 1];
                    const previous = timeBasedSamples[timeBasedSamples.length - 2];
                    const timeDelta = newest.time - previous.time;
                    if (timeDelta > 0) {
                        scrollVelocity = Math.abs((newest.position - previous.position) / timeDelta);
                    }
                }
                
                // Apply minimum speed if scrolling is too slow
                const isScrollingTooSlow = scrollVelocity < minScrollSpeed && isScrolling;
                
                timeBasedSamples.forEach(sample => {
                    // Calculate weight based on recency (newer samples have higher weight)
                    // Use exponential weighting for more natural motion
                    const age = latestTime - sample.time; // How old is this sample in ms
                    const weight = Math.exp(-age / 100); // Exponential decay with 100ms time constant
                    
                    totalWeight += weight;
                    weightedSum += sample.position * weight;
                });
                
                let timeWeightedPosition = weightedSum / totalWeight;
                
                // If scrolling is too slow, add a minimum movement to keep animation smooth
                if (isScrollingTooSlow) {
                    const direction = currentScrollY > timeWeightedPosition ? 1 : -1;
                    // Add a small constant movement in the scrolling direction
                    timeWeightedPosition += baseAnimationSpeed * direction;
                }
                
                // Use the time-weighted average for animation
                updateFrameWithPosition(timeWeightedPosition);
            } else {
                // Fallback if no samples (shouldn't happen)
                updateFrameWithPosition(effectiveScrollY);
            }
        });
        
        // Track scroll state
        isScrolling = true;
        
        // Clear previous buffer timeout
        clearTimeout(bufferTimeout);
    
        // Set new buffer timeout
        bufferTimeout = setTimeout(() => {
            isScrolling = false;
            // Handle scroll snapping or other logic here if needed
        }, BUFFER_DELAY);
    
        // Reset scroll timeout
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            
            // Start smooth animation when scrolling stops
            startSmoothAnimation();
        }, 150);
    }, { passive: true });
    
    // Function to handle smooth animation when scrolling stops
    function startSmoothAnimation() {
        if (timeBasedSamples.length === 0) return;
        
        // Get the latest position from our samples
        const latestPosition = timeBasedSamples[timeBasedSamples.length - 1].position;
        
        // Create a smooth animation to settle at the final position
        const animateToFinalPosition = () => {
            if (isScrolling) return; // Stop if user started scrolling again
            
            // Calculate time-weighted average as our current position
            let totalWeight = 0;
            let weightedSum = 0;
            const now = Date.now();
            const latestTime = timeBasedSamples[timeBasedSamples.length - 1].time;
            
            timeBasedSamples.forEach(sample => {
                const age = now - sample.time;
                const weight = Math.exp(-age / 100);
                totalWeight += weight;
                weightedSum += sample.position * weight;
            });
            
            const currentPosition = weightedSum / totalWeight;
            
            // Calculate how far we are from the target position
            const distance = Math.abs(latestPosition - currentPosition);
            
            // If we're close enough, stop animating
            if (distance < 0.5) {
                updateFrameWithPosition(latestPosition);
                return;
            }
            
            // Otherwise, update with current position and continue animation
            updateFrameWithPosition(currentPosition);
            smoothScrollAnimationId = requestAnimationFrame(animateToFinalPosition);
        };
        
        // Start the animation
        smoothScrollAnimationId = requestAnimationFrame(animateToFinalPosition);
    }

    // Modified update function that takes a scroll position parameter
    function updateFrameWithPosition(scrollPosition) {
        const mainRect = document.querySelector('.main-container').getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const maxScroll = mainRect.height - windowHeight;
        
        // Calculate raw progress
        const rawProgress = Math.max(0, Math.min(1, scrollPosition / maxScroll));
        
        // Apply damping for smoother motion (weighted blend between current and previous progress)
        const dampedProgress = lastProgress * dampingFactor + rawProgress * (1 - dampingFactor);
        lastProgress = dampedProgress;
        
        // Calculate which frame to show based on damped progress
        const frameIndex = Math.min(Math.floor(dampedProgress * TOTAL_FRAMES), TOTAL_FRAMES - 1);
        
        // Only update if the frame has changed
        if (frameIndex !== lastFrameIndex) {
            lastFrameIndex = frameIndex;
            
            // Periodically check if we need to adjust the total frame count
            if (frameIndex % 50 === 0 || frameIndex > TOTAL_FRAMES * 0.9) {
                adjustTotalFrames();
            }
            
            // Clear previous timeout to prevent frame flickering
            if (frameChangeTimeout) {
                clearTimeout(frameChangeTimeout);
            }
            
            // Preload the frame if not already preloaded
            if (!preloadedImages[frameIndex]) {
                const img = new Image();
                img.src = getFramePath(frameIndex);
                preloadedImages[frameIndex] = img;
                
                // Wait for the image to load before displaying
                img.onload = () => {
                    frameImage.src = getFramePath(frameIndex);
                };
                
                // Handle missing frames by using the closest valid frame
                img.onerror = () => {
                    console.log(`Frame ${frameIndex} not found, finding nearest valid frame`);
                    
                    // First try to find the closest previous valid frame
                    let validFrame = frameIndex - 1;
                    let foundPrevious = false;
                    
                    while (validFrame >= 0) {
                        if (preloadedImages[validFrame] && !preloadedImages[validFrame].error && preloadedImages[validFrame].complete) {
                            frameImage.src = getFramePath(validFrame);
                            foundPrevious = true;
                            break;
                        }
                        validFrame--;
                        // Limit how far back we search to avoid performance issues
                        if (frameIndex - validFrame > 10) break;
                    }
                    
                    // If no previous valid frame found, try the next valid frame
                    if (!foundPrevious) {
                        validFrame = frameIndex + 1;
                        while (validFrame < TOTAL_FRAMES) {
                            if (preloadedImages[validFrame] && !preloadedImages[validFrame].error && preloadedImages[validFrame].complete) {
                                frameImage.src = getFramePath(validFrame);
                                break;
                            }
                            validFrame++;
                            // Limit how far forward we search
                            if (validFrame - frameIndex > 10) break;
                        }
                    }
                    
                    // Mark this frame as having an error but try to load it again later
                    preloadedImages[frameIndex].error = true;
                    
                    // Schedule a retry for this frame later
                    setTimeout(() => {
                        if (preloadedImages[frameIndex]) {
                            delete preloadedImages[frameIndex];
                        }
                    }, 5000); // Try again in 5 seconds
                };
            } else {
                // If already preloaded and no error, update immediately
                if (!preloadedImages[frameIndex].error) {
                    frameImage.src = getFramePath(frameIndex);
                }
            }
            
            // Preload surrounding frames for smoother scrolling
            frameChangeTimeout = setTimeout(() => {
                // For 1000+ frames, we need to be very memory efficient
                const preloadRange = 40; // Balance between smoothness and memory usage
                
                // Adaptive memory management - keep more frames in memory on faster connections
                // and fewer frames on slower connections
                let maxBufferSize = 100; // Default buffer size
                
                // If we have more than maxBufferSize frames preloaded, remove the oldest ones
                // that are furthest from the current frame
                const keys = Object.keys(preloadedImages);
                if (keys.length > maxBufferSize) {
                    // Sort frames by distance from current frame
                    const sortedKeys = keys.sort((a, b) => {
                        return Math.abs(parseInt(a) - frameIndex) - Math.abs(parseInt(b) - frameIndex);
                    });
                    
                    // Keep only the closest frames
                    for (let i = maxBufferSize; i < sortedKeys.length; i++) {
                        delete preloadedImages[sortedKeys[i]];
                    }
                }
                
                // Always maintain a continuous sequence around the current frame
                preloadFrameRange(frameIndex, preloadRange);
            }, 50);
        }
        
        // Update UI based on progress
        textSections.forEach((section, index) => {
            const targetScroll = parseFloat(section.dataset.scroll);
            let threshold = 0.05;
            if (section.classList.contains('extended-time') && dampedProgress >= targetScroll) {
                threshold = 0.1;
            }
            if (Math.abs(dampedProgress - targetScroll) < threshold) {
                section.classList.add('active');
                
                // Apply scaling for mobile if needed
                if (window.innerWidth <= 768) {
                    // Reset transform first (to measure true height)
                    section.style.transform = 'translateY(0)';
                    
                    // Check if content is too tall for container
                    const textContainer = document.querySelector('.text-container');
                    if (section.scrollHeight > textContainer.clientHeight) {
                        // Calculate scale factor to fit content
                        const scale = Math.min(0.95, textContainer.clientHeight / section.scrollHeight);
                        
                        // Apply scale transform
                        if (scale < 1) {
                            section.style.transform = `translateY(0) scale(${scale})`;
                        }
                    }
                }
            } else {
                section.classList.remove('active');
            }
        });
        
        // Update UI based on progress
        listSections.forEach((section, index) => {
            const targetScroll = parseFloat(section.dataset.scroll);
            let threshold = 0.05;
            if (section.classList.contains('extended-time') && dampedProgress >= targetScroll) {
                threshold = 0.1;
            }
            if (Math.abs(dampedProgress - targetScroll) < threshold) {
                section.classList.add('active');
            } else {
                //do not remove active class to keep list visible until end
            }
        });

        // Handle frame section visibility
        if (scrollPosition >= mainRect.height) {
            frameContent.style.opacity = '0';
        } else {
            frameContent.style.opacity = '1';
        }
        
        // Handle animation completion
        const completionThreshold = TOTAL_FRAMES - Math.min(10, Math.floor(TOTAL_FRAMES * 0.01));
        if (lastFrameIndex >= completionThreshold && !animationComplete) {
            // Mark animation as complete and reveal leadership section
            animationComplete = true;
            leadershipSection.style.visibility = 'visible';
        }
    }

    // Original updateFrame function now just calls the new one with current scroll position
    function updateFrame() {
        updateFrameWithPosition(window.scrollY);
    }

    // Menu button click handler
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetScroll = parseFloat(button.dataset.scroll);
            const mainContainer = document.querySelector('.main-container');
            const scrollTarget = mainContainer.offsetHeight * targetScroll;
            
            // Reset time-based samples for immediate response
            const now = Date.now();
            timeBasedSamples.length = 0;
            
            // Add multiple samples at target position to ensure smooth transition
            for (let i = 0; i < 5; i++) {
                timeBasedSamples.push({
                    time: now - i * 10, // Stagger sample times
                    position: scrollTarget
                });
            }
            
            window.scrollTo({
                top: scrollTarget,
                behavior: 'smooth'
            });
        });
    });

    // Initial update
    updateFrame();
    
    // Add resize handler for mobile text sections
    function adjustMobileTextSections() {
        if (window.innerWidth <= 768) {
            const textContainer = document.querySelector('.text-container');
            const textSections = document.querySelectorAll('.text-section');
            
            textSections.forEach(section => {
                // Reset any inline styles first
                section.style.transform = '';
                
                // Check if content is too tall for container
                if (section.scrollHeight > textContainer.clientHeight) {
                    // Calculate scale factor to fit content
                    const scale = Math.min(0.95, textContainer.clientHeight / section.scrollHeight);
                    
                    // Apply scale transform
                    if (scale < 1) {
                        section.style.transform = `scale(${scale})`;
                    }
                }
            });
        }
    }
    
    // Run on load and resize
    adjustMobileTextSections();
    window.addEventListener('resize', adjustMobileTextSections);
    
    // Add visibility change handler to fix animation when returning to the page
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', function(event) {
        // When navigating back via browser history (bfcache)
        if (event.persisted) {
            console.log('Page was restored from bfcache, resetting animation');
            resetAnimation();
        }
    });
    
    // Function to handle visibility changes (tab switching, etc.)
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Page is now visible again
            console.log('Page became visible, resetting animation');
            resetAnimation();
        } else {
            // Page is hidden, pause any resource-intensive operations
            console.log('Page hidden, pausing animation');
            if (scrollAnimationId) {
                cancelAnimationFrame(scrollAnimationId);
                scrollAnimationId = null;
            }
            if (smoothScrollAnimationId) {
                cancelAnimationFrame(smoothScrollAnimationId);
                smoothScrollAnimationId = null;
            }
        }
    }
    
    // Function to reset and reinitialize the animation
    function resetAnimation() {
        // Cancel any existing animation frames
        if (scrollAnimationId) {
            cancelAnimationFrame(scrollAnimationId);
            scrollAnimationId = null;
        }
        if (smoothScrollAnimationId) {
            cancelAnimationFrame(smoothScrollAnimationId);
            smoothScrollAnimationId = null;
        }
        
        // Clear any pending timeouts
        if (frameChangeTimeout) {
            clearTimeout(frameChangeTimeout);
        }
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // Reset animation variables
        lastFrameIndex = -1;
        lastScrollY = window.scrollY;
        lastProgress = 0;
        timeBasedSamples.length = 0;
        isScrolling = false;
        
        // Add current scroll position to samples
        const now = Date.now();
        for (let i = 0; i < 3; i++) {
            timeBasedSamples.push({
                time: now - i * 10,
                position: window.scrollY
            });
        }
        
        // Force a frame update based on current scroll position
        updateFrame();
        
        // Apply scaling for mobile text sections
        adjustMobileTextSections();
    }
});

// Enhanced form handling
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');
const submitBtn = contactForm ? contactForm.querySelector('.submit-btn') : null;
const loadingSpinner = submitBtn ? submitBtn.querySelector('.loading-spinner') : null;

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        submitBtn.disabled = true;
        loadingSpinner.style.display = 'inline-block';
        submitBtn.textContent = 'Sending ';
        submitBtn.appendChild(loadingSpinner);
        formMessage.className = 'form-message';

        try {
            const formData = new FormData(contactForm);
            const data = {};
            formData.forEach((value, key) => data[key] = value);

            const response = await fetch('https://formsubmit.co/ajax/kam@droplab.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success === "true" || result.success === true) {
                // Show success message
                formMessage.textContent = 'Thank you for your message! We will get back to you soon.';
                formMessage.className = 'form-message success';
                contactForm.reset();
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            // Show error message
            formMessage.textContent = 'Sorry, there was an error sending your message. Please try again.';
            formMessage.className = 'form-message error';
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            loadingSpinner.style.display = 'none';
            submitBtn.textContent = 'Send Message';
        }
    });
}

