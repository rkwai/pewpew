# 2.5D Shooter Game

A web-based 2.5D shooter game inspired by Gradius, built with Three.js.

## Features

- Control a spaceship in a side-scrolling shooter environment
- Shoot asteroids and enemies
- Track your score and health

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Open your browser and navigate to `http://localhost:9000`

### Building for Production

```
npm run build
```

## Controls

- **Arrow Keys**: Move the spaceship
- **Space**: Shoot

## Notes

- For the best experience, provide your own .glb models for the spaceship and asteroids in the assets/models directory
- The game will still run without custom models, using colorful placeholder shapes instead
- See assets/models/README.txt for information on where to find suitable models

## Development Progress

This project is being developed in stages:

1. ✅ Spaceship model rendering and controls
2. ✅ Asteroid rendering and shooting mechanics
3. ⬜ Health and score systems
4. ⬜ Power-up implementation
5. ⬜ Additional enemy types
6. ⬜ Boss battles

## Project Structure

- **config/**: Game configuration settings
- **src/**: Source code
  - **states/**: Game state management
  - **entities/**: Game objects (player, enemies, bullets)
  - **utilities/**: Helper functions
- **assets/**: Game assets (models, textures, sounds)
- **build/**: Compiled files for deployment

## Notes for Implementation

- For each milestone, you will need to provide the appropriate .glb models
- The paths to the models in the code should be updated to match your actual model locations
- The game is designed to be easily extendable for adding new features

## License

This project is licensed under the ISC License. 