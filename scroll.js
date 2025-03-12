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
        return `Frames/frame_${paddedNumber}.webp`;
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
        scrollText.classList.add('fade-out');
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
    
    // Variables for text cycling animation
    let cyclingIntervals = {};
    const CYCLING_DELAY = 2000; // Time to display each item before cycling to the next (reduced from 3000ms)

    // Function to clear all cycling animations
    function clearAllCyclingAnimations() {
        Object.values(cyclingIntervals).forEach(interval => {
            clearInterval(interval);
        });
        cyclingIntervals = {};
        
        // Reset all scrolled sections
        document.querySelectorAll('.text-section.active').forEach(section => {
            if (section.scrollTop > 0) {
                section.scrollTop = 0;
            }
            
            // Reset all list items to their default state
            if (section.tagName.toLowerCase() === 'ul') {
                const listItems = section.querySelectorAll('li');
                listItems.forEach(item => {
                    item.style.opacity = '';
                    item.style.display = '';
                    item.classList.remove('active-item');
                });
                
                // If on mobile, show only the first item
                if (window.innerWidth <= 768 && listItems.length > 0) {
                    listItems[0].style.opacity = '1';
                    listItems[0].style.display = 'block';
                    listItems[0].classList.add('active-item');
                }
            }
        });
    }

    // Function to handle text cycling for long lists
    function setupTextCycling(section) {
        // Clear any existing cycling for this section
        if (cyclingIntervals[section.dataset.scroll]) {
            clearInterval(cyclingIntervals[section.dataset.scroll]);
            delete cyclingIntervals[section.dataset.scroll];
        }
        
        // Reset scroll position
        section.scrollTop = 0;
        
        const textContainer = document.querySelector('.text-container');
        
        // Check if this is a list section
        const isList = section.tagName.toLowerCase() === 'ul';
        
        // For list sections on mobile, we'll handle this with scroll position instead of cycling
        if (isList && window.innerWidth <= 768) {
            const listItems = section.querySelectorAll('li');
            
            // If there are multiple list items, prepare them for scroll-based display
            if (listItems.length > 1) {
                console.log(`Setting up scroll-based display for list at scroll ${section.dataset.scroll}`);
                
                // First, reset all items
                listItems.forEach(item => {
                    item.style.opacity = '0';
                    item.style.display = 'none';
                    item.classList.remove('active-item');
                });
                
                // Then activate only the first item
                listItems[0].style.opacity = '1';
                listItems[0].style.display = 'block';
                listItems[0].classList.add('active-item');
                
                // We'll update the active item based on scroll position in updateFrameWithPosition
            }
        }
        // For non-list sections with overflow content on desktop, use the original scrolling approach
        else if (section.scrollHeight > textContainer.clientHeight * 1.1 && window.innerWidth > 768) {
            console.log(`Setting up scrolling for section at scroll ${section.dataset.scroll}`);
            
            // Calculate how many "pages" we need to cycle through
            const containerHeight = textContainer.clientHeight;
            const contentHeight = section.scrollHeight;
            const totalScrollDistance = contentHeight - containerHeight;
            
            // If the content is only slightly taller than the container, use a simpler approach
            if (totalScrollDistance < containerHeight * 0.5) {
                // Just scroll to bottom and back to top
                let isAtBottom = false;
                
                cyclingIntervals[section.dataset.scroll] = setInterval(() => {
                    if (isAtBottom) {
                        // Scroll back to top
                        section.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        });
                    } else {
                        // Scroll to bottom
                        section.scrollTo({
                            top: totalScrollDistance,
                            behavior: 'smooth'
                        });
                    }
                    isAtBottom = !isAtBottom;
                }, CYCLING_DELAY);
            } else {
                // For longer content, use a more sophisticated approach with multiple stops
                const numberOfScrollPositions = Math.ceil(totalScrollDistance / (containerHeight * 0.7)) + 1; // 70% overlap
                let currentPosition = 0;
                
                // Set up interval to cycle through scroll positions
                cyclingIntervals[section.dataset.scroll] = setInterval(() => {
                    // Calculate next position
                    currentPosition = (currentPosition + 1) % numberOfScrollPositions;
                    
                    // Calculate scroll target
                    const scrollTarget = currentPosition === 0 ? 0 : (totalScrollDistance * currentPosition) / (numberOfScrollPositions - 1);
                    
                    // Smooth scroll to target
                    section.scrollTo({
                        top: scrollTarget,
                        behavior: 'smooth'
                    });
                }, CYCLING_DELAY);
            }
            
            // Add event listener to pause cycling when user manually scrolls
            section.addEventListener('scroll', function() {
                // If there's an active cycling interval
                if (cyclingIntervals[section.dataset.scroll]) {
                    // Clear the interval
                    clearInterval(cyclingIntervals[section.dataset.scroll]);
                    
                    // Set a timeout to restart cycling after user stops scrolling
                    const scrollTimeout = setTimeout(() => {
                        // Restart cycling from current position
                        setupTextCycling(section);
                    }, CYCLING_DELAY);
                    
                    // Store the timeout so we can clear it if needed
                    section._scrollTimeout = scrollTimeout;
                }
            }, { passive: true, once: true }); // Use once: true to ensure it only fires once
        }
    }
    
    // Add a continuous animation loop variable
    let continuousAnimationId = null;
    
    // Function to ensure continuous frame animation
    function ensureContinuousAnimation() {
        // Cancel any existing animation
        if (continuousAnimationId) {
            cancelAnimationFrame(continuousAnimationId);
        }
        
        // Start a new animation loop
        function animationLoop() {
            // Update the frame based on current scroll position
            updateFrameWithPosition(window.scrollY);
            
            // Continue the loop
            continuousAnimationId = requestAnimationFrame(animationLoop);
        }
        
        // Start the animation loop
        continuousAnimationId = requestAnimationFrame(animationLoop);
    }
    
    // Start continuous animation when page loads
    ensureContinuousAnimation();
    
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
        }, 150);
    }, { passive: true });
    
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
        
        // Always update the frame image regardless of whether the frame index has changed
        // This ensures continuous animation even when scrolling through text sections
        if (preloadedImages[frameIndex] && !preloadedImages[frameIndex].error && preloadedImages[frameIndex].complete) {
            frameImage.src = getFramePath(frameIndex);
        } else {
            // If the frame isn't preloaded yet, try to load it
            if (!preloadedImages[frameIndex]) {
                const img = new Image();
                img.src = getFramePath(frameIndex);
                preloadedImages[frameIndex] = img;
            }
            
            // Use the last valid frame while loading
            if (lastFrameIndex >= 0 && lastFrameIndex < TOTAL_FRAMES && 
                preloadedImages[lastFrameIndex] && !preloadedImages[lastFrameIndex].error) {
                // Keep showing the last valid frame
            } else {
                // If no valid last frame, try to find a nearby valid frame
                for (let offset = 1; offset < 10; offset++) {
                    const prevIndex = frameIndex - offset;
                    if (prevIndex >= 0 && preloadedImages[prevIndex] && !preloadedImages[prevIndex].error) {
                        frameImage.src = getFramePath(prevIndex);
                        break;
                    }
                    
                    const nextIndex = frameIndex + offset;
                    if (nextIndex < TOTAL_FRAMES && preloadedImages[nextIndex] && !preloadedImages[nextIndex].error) {
                        frameImage.src = getFramePath(nextIndex);
                        break;
                    }
                }
            }
        }
        
        // Only perform additional frame-related operations if the frame has changed
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
            
            // Preload the frame if not already preloaded
            if (!preloadedImages[frameIndex]) {
                const img = new Image();
                img.src = getFramePath(frameIndex);
                preloadedImages[frameIndex] = img;
                
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
                    }, 5000);
                };
            }
        }
        
        // Update UI based on progress
        textSections.forEach((section, index) => {
            const targetScroll = parseFloat(section.dataset.scroll);
            let threshold = 0.05;
            if (section.classList.contains('extended-time') && dampedProgress >= targetScroll) {
                threshold = 0.1;
            }
            if (Math.abs(dampedProgress - targetScroll) < threshold) {
                // If section wasn't active before, scroll to top and setup cycling if needed
                if (!section.classList.contains('active')) {
                    // Scroll to top when section becomes active
                    section.scrollTop = 0;
                    
                    // For list sections on mobile, initially show only the first item
                    if (section.tagName.toLowerCase() === 'ul' && window.innerWidth <= 768) {
                        const listItems = section.querySelectorAll('li');
                        
                        // First reset all items
                        listItems.forEach(item => {
                            item.style.opacity = '0';
                            item.style.display = 'none';
                            item.classList.remove('active-item');
                        });
                        
                        // Then activate only the first item
                        if (listItems.length > 0) {
                            listItems[0].style.opacity = '1';
                            listItems[0].style.display = 'block';
                            listItems[0].classList.add('active-item');
                        }
                    }
                }
                
                section.classList.add('active');
                
                // Handle list items based on scroll position for mobile
                if (section.tagName.toLowerCase() === 'ul' && window.innerWidth <= 768) {
                    const listItems = section.querySelectorAll('li');
                    if (listItems.length > 1) {
                        // Calculate which list item to show based on scroll progress
                        
                        // Map the overall progress to list item index
                        // This creates a smooth transition through all items as user scrolls
                        const sectionStartScroll = targetScroll - threshold;
                        const sectionEndScroll = targetScroll + threshold;
                        const sectionProgress = (dampedProgress - sectionStartScroll) / (sectionEndScroll - sectionStartScroll);
                        
                        // Calculate which item to show based on section progress
                        // Divide the section progress into equal parts for each list item
                        const itemProgressStep = 1 / listItems.length;
                        let activeItemIndex = 0;
                        
                        // Find which segment of the section progress we're in
                        for (let i = 0; i < listItems.length; i++) {
                            const itemStartProgress = i * itemProgressStep;
                            const itemEndProgress = (i + 1) * itemProgressStep;
                            
                            if (sectionProgress >= itemStartProgress && sectionProgress < itemEndProgress) {
                                activeItemIndex = i;
                                break;
                            }
                            
                            // Handle the last item
                            if (i === listItems.length - 1 && sectionProgress >= itemStartProgress) {
                                activeItemIndex = i;
                            }
                        }
                        
                        // Update active item only if it changed
                        const currentActiveItem = section.querySelector('li.active-item');
                        const currentActiveIndex = currentActiveItem ? 
                            Array.from(listItems).indexOf(currentActiveItem) : -1;
                        
                        if (activeItemIndex !== currentActiveIndex) {
                            // Hide all items
                            listItems.forEach(item => {
                                item.style.opacity = '0';
                                item.style.display = 'none';
                                item.classList.remove('active-item');
                            });
                            
                            // Show active item
                            listItems[activeItemIndex].style.display = 'block';
                            listItems[activeItemIndex].classList.add('active-item');
                            
                            // Use setTimeout to trigger the fade-in after the display change
                            setTimeout(() => {
                                listItems[activeItemIndex].style.opacity = '1';
                            }, 50);
                        }
                    }
                }
                
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
                // When section becomes inactive, clear any cycling animations
                if (section.classList.contains('active') && cyclingIntervals[section.dataset.scroll]) {
                    clearInterval(cyclingIntervals[section.dataset.scroll]);
                    delete cyclingIntervals[section.dataset.scroll];
                }
                
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
    
    // Handle orientation changes on mobile devices
    window.addEventListener('orientationchange', function() {
        // Clear all cycling animations
        clearAllCyclingAnimations();
        
        // Wait for the orientation change to complete
        setTimeout(() => {
            // Adjust text sections for the new orientation
            adjustMobileTextSections();
            
            // Re-setup active sections for the new orientation
            document.querySelectorAll('.text-section.active').forEach(section => {
                if (window.innerWidth <= 768) {
                    // For list sections, just reset to first item and let scroll position handle the rest
                    if (section.tagName.toLowerCase() === 'ul') {
                        const listItems = section.querySelectorAll('li');
                        
                        // Reset all items
                        listItems.forEach(item => {
                            item.style.opacity = '0';
                            item.style.display = 'none';
                            item.classList.remove('active-item');
                        });
                        
                        // Show first item
                        if (listItems.length > 0) {
                            listItems[0].style.opacity = '1';
                            listItems[0].style.display = 'block';
                            listItems[0].classList.add('active-item');
                        }
                    }
                    // For non-list sections, setup cycling if needed
                    else {
                        setupTextCycling(section);
                    }
                }
            });
        }, 300);
    });
    
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
            // Restart continuous animation
            ensureContinuousAnimation();
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
            if (continuousAnimationId) {
                cancelAnimationFrame(continuousAnimationId);
                continuousAnimationId = null;
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
        
        // Clear all cycling animations
        clearAllCyclingAnimations();
        
        // Reset animation variables
        lastFrameIndex = -1;
        lastScrollY = window.scrollY;
        lastProgress = 0;
        timeBasedSamples.length = 0;
        isScrolling = false;
        
        // Reset list items for mobile
        if (window.innerWidth <= 768) {
            document.querySelectorAll('.text-section.active').forEach(section => {
                if (section.tagName.toLowerCase() === 'ul') {
                    const listItems = section.querySelectorAll('li');
                    
                    // Reset all items
                    listItems.forEach(item => {
                        item.style.opacity = '0';
                        item.style.display = 'none';
                        item.classList.remove('active-item');
                    });
                    
                    // Show first item
                    if (listItems.length > 0) {
                        listItems[0].style.opacity = '1';
                        listItems[0].style.display = 'block';
                        listItems[0].classList.add('active-item');
                    }
                }
            });
        }
        
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
const submitBtn = contactForm.querySelector('.submit-btn');
const loadingSpinner = submitBtn.querySelector('.loading-spinner');

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