# Noise Gradient Shader Tool

I wanted to learn how to make cool shaders and watched a few YouTube tutorials and then decided to see how good Claude 3.7 was and this is the result. Work in progress.

A versatile WebGL-based tool for exploring and creating beautiful noise-based gradient shaders with real-time controls and visualization.

![Noise Gradient Shader]

## Overview

This interactive application allows you to experiment with various noise algorithms and visual effects to create stunning gradient patterns. Perfect for generating background visuals, texture references, or simply exploring algorithmic art.

## Features

- **Multiple Noise Types**:
  - Cosine Waves - Smooth, regular wave patterns
  - Perlin Noise - Classic natural-looking noise
  - Simplex Noise - Modern alternative to Perlin with fewer directional artifacts
  - Voronoi - Cell-like patterns with organic boundaries
  - Fractal Brownian Motion (fBm) - Self-similar multi-octave noise
  - Warp fBM Plasma - Domain-warped noise for flowing, plasma-like effects

- **Customizable Colors**: Three-color gradient with RGB controls and optional plasma colormap

- **Dynamic Parameters**:
  - Amplitude - Control the height/intensity of the pattern
  - Frequency - Adjust the density/scale of the pattern
  - Speed - Change the animation rate
  - Progress - Manually step through the pattern evolution

- **Vertex Deformation**: Apply 3D-like deformation effects to the surface

- **Direction Control**: Modify the angle and flow of patterns

- **Animation**: Toggle automatic animation with adjustable speed

- **Agent Mode**: Enable an autonomous mode that intelligently explores different parameter combinations

- **Presets**: Quick access to various visually interesting configurations

- **Save Feature**: Export your creations as image files

## Getting Started

1. Select a noise type from the dropdown menu
2. Adjust the colors to your preference
3. Use the parameter controls to fine-tune the visual effect
4. Toggle animation or try different presets
5. Experiment with deformation and direction settings

## Agent Mode

The Agent Mode automatically explores the parameter space to create an ever-evolving visual journey. When enabled, the tool will:

- Gradually shift between different parameter settings
- Occasionally change noise types, colors, and effects
- Create smooth transitions between states

Adjust the Agent Speed to control how quickly it explores new parameter combinations.

## Technical Details

The Noise Gradient Shader Tool is built with:

- WebGL for hardware-accelerated graphics rendering
- GLSL shader programs for all visual effects
- JavaScript for the UI and controls
- HTML5 and CSS3 for the interface

All rendering happens on the GPU, allowing for complex real-time animations.

## Usage Ideas

- Generate background textures for web design
- Create reference material for digital art
- Study noise algorithms and their visual characteristics
- Meditative visual exploration
- Educational tool for learning about procedural generation

## Browser Compatibility

This tool works best in modern browsers with good WebGL support:
- Chrome
- Firefox
- Edge
- Safari (recent versions)

## License

[MIT License](LICENSE) 
