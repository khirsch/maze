# Maze

Maze is a small browser-based maze game built with React and Vite. Navigate a randomly generated maze from the upper-left corner to the lower-right exit. Reaching the exit clears the maze and generates a new one.

## Play

- Use the arrow keys or `W`, `A`, `S`, and `D` to move one cell at a time.
- On a touch screen, swipe in the direction you want to move.
- Find a path from the starting cell to the exit in the opposite corner.

The player glides between cells, and the maze rebuilds itself after each successful run.

## Requirements

- Node.js 18 or later
- npm

## Run locally

Install the dependencies and start the Vite development server:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal (usually `http://localhost:5173`). Vite serves the app at the root during development.

## Production build

Create an optimized production build in `dist/`:

```sh
npm run build
```

The Vite configuration sets the deployment base path to `/maze/`, so the built files are intended to be served from that path. The generated `dist/` directory can be deployed to a static host configured to serve the app there.

## Project structure

- `src/app/components/Maze.tsx` contains maze generation, drawing, movement, and input handling.
- `src/app/App.tsx` mounts the game.
- `src/styles/` contains the app styles and theme imports.
- `public/` contains static assets copied into the production build.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` creates the production build.

There is no test or lint script currently configured in `package.json`.
