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