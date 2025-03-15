# LabSimple Website

This repository contains the source code for the LabSimple website, a product of CLEU Diagnostics. The website showcases the LabSimple diagnostic platform through an interactive, scroll-based animation and provides information about the company's leadership team.

## Project Structure

- **index.html**: Main HTML file containing the website structure and inline CSS
- **Frames/**: Directory containing animation frames (both PNG and WebP formats)
  - Contains 1051 sequentially numbered frames (frame_00000.webp to frame_01050.webp)
- **headshots/**: Directory containing team member profile images
  - Full-size images used in the leadership grid
  - **cropped/**: Subdirectory with cropped versions for modals and news section
- **JavaScript Files**:
  - **scroll.js**: Handles the scroll-based animation and text synchronization
  - **scroll_png.js**: PNG-specific version of the animation script
  - **scroll_webp.js**: WebP-specific version of the animation script
  - **modals.js**: Manages the leadership team member modal functionality
- **CSS Files**:
  - **modals.css**: Styles for the leadership team modals
  - **news.css**: Styles for the news section
- **Assets**:
  - **labsimple-logo-white.png**: Company logo

## Features

1. **Scroll-Based Animation**:
   - Frame-by-frame animation synchronized with page scrolling
   - Text sections that appear and disappear based on scroll position
   - List items that highlight sequentially as the user scrolls

2. **Responsive Design**:
   - Mobile-optimized layout with different text and animation behavior
   - Adjusts layout for various screen sizes

3. **Leadership Team Section**:
   - Grid display of team members with hover effects
   - Modal popups with detailed bios and LinkedIn links
   - Navigation between team members within the modal

4. **Contact Form**:
   - Form integration with FormSubmit.co for email submissions
   - Form validation and feedback messages

5. **News Section**:
   - Display of company news and events

## Technical Implementation

- **Animation Engine**: Custom JavaScript that maps scroll position to frame numbers
- **Performance Optimization**:
  - Frame preloading for smoother animation
  - WebP image format support for faster loading
  - Lazy loading of frames based on scroll position
- **Responsive Techniques**:
  - CSS media queries for different device sizes
  - JavaScript adjustments for mobile-specific behavior

## Browser Compatibility

The website is designed to work on modern browsers including:
- Chrome
- Firefox
- Safari
- Edge

## Development Notes

- The animation uses both PNG and WebP formats, with WebP preferred for better performance
- The scroll position is mapped to animation frames using a non-linear relationship for better control
- Text sections are synchronized with specific frames in the animation

## Usage

1. Clone the repository
2. Open index.html in a web browser
3. Scroll to experience the animation and explore the website

## Optimization Considerations

- Large animation frames may impact initial load time
- Consider implementing a loading screen for slower connections
- WebP format provides significant file size reduction compared to PNG 

# Image Queue System Documentation

This document provides an overview of the image queue system implemented for the LabSimple website. The system was created to address issues with image loading failures caused by browser connection limits.

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Implementations](#solution-implementations)
   - [image-queue-simple.js](#image-queue-simplejs)
   - [image-queue-fix.js](#image-queue-fixjs)
   - [image-queue.js](#image-queuejs)
4. [Testing](#testing)
5. [Integration Guide](#integration-guide)
6. [Troubleshooting](#troubleshooting)

## Overview

The LabSimple website features a scroll-based animation that loads numerous image frames dynamically as the user scrolls. This animation requires loading many images in sequence, which can overwhelm browser connection limits (typically 6-8 concurrent connections per domain), resulting in failed image loads.

The image queue system addresses this by:
- Limiting concurrent image loading requests
- Implementing retry mechanisms for failed loads
- Providing fallback strategies when images cannot be loaded
- Maintaining the visual continuity of the animation

## Problem Statement

When loading a large number of images simultaneously, browsers limit the number of concurrent connections to a single domain (typically 6-8). This limitation can cause:

- Failed image loads when too many requests are made simultaneously
- Inconsistent animation playback due to missing frames
- Poor user experience with visible gaps in content
- Console errors that may affect other functionality

## Solution Implementations

Three different implementations of the image queue system have been developed, each with different approaches and features:

### image-queue-simple.js

A lightweight implementation that focuses on simplicity and ease of integration.

**Key Features:**
- Limits concurrent image loading to 6 connections
- Overrides the native `Image` constructor to intercept all image loading
- Queues additional image requests beyond the concurrent limit
- Preserves original event handlers (onload, onerror)
- Automatically initializes when included in the page

**Implementation Details:**
- Uses a queue system to manage pending image loads
- Overrides the `src` property and `setAttribute` method to intercept image loading
- Processes the queue automatically as images complete loading
- Includes console logging for debugging purposes

**Usage:**
```html
<script src="image-queue-simple.js"></script>
<!-- No additional code needed - works automatically -->
```

### image-queue-fix.js

A more robust implementation designed to be non-invasive and work with existing code without modifications.

**Key Features:**
- Self-initializing via IIFE (Immediately Invoked Function Expression)
- Preserves the original Image prototype chain
- Handles both direct `src` assignment and property descriptor access
- More efficient implementation with less overhead

**Implementation Details:**
- Uses property descriptors to properly override the `src` property
- Maintains proper prototype inheritance
- Implements a more efficient queue processing mechanism
- Minimizes console logging for production use

**Usage:**
```html
<script src="image-queue-fix.js"></script>
<!-- No additional code needed - works automatically -->
```

### image-queue.js

The most comprehensive implementation with advanced features for handling complex image loading scenarios.

**Key Features:**
- Distance-based loading prioritization
- Multiple retry attempts for failed loads
- Format fallback (WebP to PNG)
- Nearest-frame fallback for missing images
- Cache-busting for problematic browsers
- Browser-specific optimizations

**Implementation Details:**
- Exports a `queuedLoadImage` function that returns Promises
- Implements sophisticated error handling with multiple fallback strategies
- Includes distance checking to avoid loading frames too far from current view
- Provides detailed console logging for debugging
- Handles browser-specific issues (Safari/iOS cache problems)

**Usage:**
```javascript
// Replace direct image loading with queued version
// Instead of: loadImage(frameIndex)
// Use: queuedLoadImage(frameIndex).then(img => { /* handle loaded image */ })
```

## Testing

The `test-image.html` file provides a simple test harness for verifying image loading functionality:

**Features:**
- Tests loading of specific frame images
- Displays success/failure status for each image
- Tests both relative and absolute paths
- Visual confirmation of image loading

To use the test page:
1. Open `test-image.html` in a browser
2. Check that images load successfully
3. Inspect browser console for any errors
4. Verify that status indicators show "Successfully loaded"

## Integration Guide

To integrate the image queue system into your project:

1. **For new projects:**
   - Include either `image-queue-simple.js` or `image-queue-fix.js` at the beginning of your HTML file
   - No code changes required - the system works automatically

2. **For existing projects with custom image loading:**
   - Include `image-queue.js`
   - Replace direct image loading calls with `queuedLoadImage()`
   - Update any code that depends on immediate image loading to use Promises/callbacks

3. **Configuration options:**
   - Adjust `maxConcurrent` value in the script to change the number of concurrent connections
   - Modify retry delays or fallback strategies as needed for your specific use case

## Troubleshooting

**Common Issues:**

1. **No images loading:**
   - Check browser console for JavaScript errors
   - Verify that the image queue script is loaded before any image loading occurs
   - Ensure image paths are correct

2. **Slow image loading:**
   - The queue system intentionally limits concurrent loads, which may appear slower but is more reliable
   - Adjust `maxConcurrent` value if needed (higher values may cause more failures)

3. **Console errors:**
   - "Failed to load image" messages are expected for truly missing images
   - Check network tab in developer tools to see if requests are being made
   - Verify that fallback mechanisms are working correctly

4. **Integration conflicts:**
   - If using with other libraries that manipulate images, load the queue script first
   - For complex applications, consider using the more targeted `image-queue.js` approach 