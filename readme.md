# SolaceWave – Ambient Sound Mixer

## Project Goal

The main objective of this project is to create an interactive web-based ambient sound mixer that allows users to combine multiple ambient tracks, adjust their volumes, and save personalized sound mixes. The application is designed for users seeking a relaxing audio environment for activities such as studying, working, or sleeping.

## Development Steps

1. **Requirements Gathering**:

   * Identify the purpose and target audience.
   * Define essential features (track control, mix saving, background transitions, etc.).

2. **Design and Layout**:

   * Develop a responsive user interface using HTML and CSS.
   * Use a clean visual layout with track lists, control buttons, and background imagery.

3. **Audio Integration**:

   * Load ambient audio tracks using the HTML5 Audio API.
   * Implement loop playback and independent gain controls.

4. **Mixer Functionality**:

   * Enable toggling tracks on/off.
   * Adjust individual volumes and control a global master volume.

5. **Visualization**:

   * Create a real-time SVG-based audio visualizer that responds to sound frequencies.
   * Animate dynamic rays radiating from the center based on frequency analysis.

6. **Local Storage and Mix Management**:

   * Allow users to save up to 10 custom mixes in the browser's localStorage.
   * Implement mix renaming, deletion, and search functionality.

7. **Progressive Web App (PWA) Features**:

   * Add `manifest.json` for installability.
   * Register a service worker to enable offline usage.

8. **Testing and Polish**:

   * Debug edge cases (e.g., no enabled tracks, duplicate mix names).
   * Ensure cross-browser compatibility and accessibility.

## Functionality Overview

* **Track List**: Displays ambient tracks (Forest, Ocean, Cat, Fireplace). Each track can be activated and its volume adjusted.
* **Master Volume**: Controls overall output.
* **Save Mix**: Saves the current combination and volume settings to localStorage.
* **Mix List**: Shows saved mixes with options to rename or delete them.
* **SVG Visualizer**: Displays a radial animated visualizer based on audio frequency.
* **Background Transition**: Changes background to reflect the active track.
* **Search Bar**: Filters the list of saved mixes by name.
* **Offline Support**: Thanks to the service worker, the app can work without an internet connection after the first visit.

This project is lightweight, fast, and serves as both a functional utility and a showcase of modern front-end technologies like SVG animation, localStorage, and PWA support.
