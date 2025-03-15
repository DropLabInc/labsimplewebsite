# Image Queue System: Quick Start Guide

This guide provides step-by-step instructions for implementing the image queue system in different scenarios.

## Table of Contents

1. [Simple Implementation](#simple-implementation)
2. [Advanced Implementation](#advanced-implementation)
3. [Troubleshooting](#troubleshooting)
4. [Performance Tuning](#performance-tuning)

## Simple Implementation

For most websites, the simplest approach is to use either `image-queue-simple.js` or `image-queue-fix.js` as a drop-in solution.

### Step 1: Choose the Right Script

- **For development/debugging:** Use `image-queue-simple.js` (more verbose logging)
- **For production:** Use `image-queue-fix.js` (more efficient, less logging)

### Step 2: Add the Script to Your HTML

Add the script tag near the beginning of your HTML file, before any other scripts that might load images:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Your Website</title>
    <!-- Add the image queue script early -->
    <script src="image-queue-fix.js"></script>
    <!-- Other stylesheets and scripts -->
</head>
<body>
    <!-- Your content -->
</body>
</html>
```

### Step 3: Verify Implementation

1. Open your browser's developer tools (F12 or right-click → Inspect)
2. Check the console for the message: "Image loading queue fix applied"
3. Load your page and verify that images load correctly

That's it! No code changes are required for the simple implementation.

## Advanced Implementation

For applications with complex image loading requirements or custom image loading logic, use `image-queue.js`.

### Step 1: Add the Script to Your HTML

```html
<script src="image-queue.js"></script>
```

### Step 2: Replace Direct Image Loading with Queued Loading

Find places in your code where you're loading images directly, and replace them with the queued version:

**Before:**
```javascript
function loadImage(index) {
    const img = new Image();
    img.onload = function() {
        // Handle loaded image
    };
    img.src = `images/frame_${index}.webp`;
    return img;
}
```

**After:**
```javascript
// Use the exported queuedLoadImage function
queuedLoadImage(index).then(img => {
    // Handle loaded image
}).catch(error => {
    console.error('Image loading failed:', error);
});
```

### Step 3: Update Any Synchronous Code

If your code expects images to load synchronously, you'll need to update it to work with Promises:

**Before:**
```javascript
const img = loadImage(currentIndex);
drawImageToCanvas(img);
```

**After:**
```javascript
queuedLoadImage(currentIndex).then(img => {
    drawImageToCanvas(img);
}).catch(error => {
    // Handle error or use fallback
});
```

## Troubleshooting

### Common Issues and Solutions

#### Images Not Loading

**Symptoms:**
- Blank images
- Console errors about failed image loads

**Solutions:**
1. Check that the image queue script is loaded before any image loading occurs
2. Verify image paths are correct
3. Check browser console for specific error messages
4. Ensure the script has access to modify the global `Image` constructor

#### Script Conflicts

**Symptoms:**
- JavaScript errors in console
- Images load but queue doesn't work

**Solutions:**
1. Make sure the image queue script loads before other scripts that might use the `Image` constructor
2. Check for other libraries that might be overriding the `Image` constructor
3. Try using `image-queue.js` with explicit integration instead of the automatic versions

#### Performance Issues

**Symptoms:**
- Images load very slowly
- Browser becomes unresponsive

**Solutions:**
1. Reduce the number of images being loaded simultaneously
2. Implement progressive loading (load low-resolution images first)
3. Adjust the `maxConcurrent` value in the script (default is 6)

## Performance Tuning

### Adjusting Concurrent Connections

You can modify the `maxConcurrent` value in the script to change how many images load simultaneously:

```javascript
// In image-queue-simple.js or image-queue-fix.js
const imageQueue = {
    // ...
    maxConcurrent: 4, // Reduce from default 6 to 4
    // ...
};
```

Lower values (3-4) are more conservative and work better on slower connections, while higher values (8-10) may work better on fast connections but risk hitting browser limits.

### Optimizing Image Loading Order

For frame-based animations, prioritize loading frames closest to the current view:

1. Load the current frame first
2. Load frames immediately before and after the current frame
3. Load keyframes throughout the sequence
4. Load remaining frames in sequence

This approach ensures the animation remains smooth even if some frames are still loading.

### Preloading Critical Images

For important images that should load first:

```javascript
// Preload critical images when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // For image-queue.js
    queuedLoadImage(keyframeIndex1);
    queuedLoadImage(keyframeIndex2);
    
    // For image-queue-simple.js or image-queue-fix.js
    const preload1 = new Image();
    preload1.src = 'path/to/critical/image1.jpg';
    
    const preload2 = new Image();
    preload2.src = 'path/to/critical/image2.jpg';
});
```

### Implementing Progressive Enhancement

For the best user experience, implement progressive enhancement:

1. Start with placeholder images or low-resolution versions
2. Queue high-resolution images to load in the background
3. Replace placeholders with high-resolution images as they load

This approach ensures users see content immediately while higher quality images load progressively. 