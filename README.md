# Genetic Algorithm Solution for Polygon Decomposition
<img float="left" src="https://github.com/mehmetakifakkus/jslab/blob/v2/app/public/images/partitioning-thumbnail.png" width="200"/>This web application shows available sub-polygon decomposition of a simple polygon. You will immediately see the result exactly on the polygon.

This app is ultimately interactive. At first, it comes with default simple polygon. You can modify the polygon using hints at the bottom of the page.

You can [visit this page](https://mehmetakifakkus.github.io/partitioning/)


## Overview

Given a simple polygon and a target area distribution (e.g. `50,30,10,10`), the app splits the polygon into sub-polygons whose areas match the requested ratios, using straight cutting lines found by a genetic algorithm. This is similar to a land/parcel subdivision problem. Each resulting part is drawn in its own color, with its area percentage shown on it.

The project is a static web page: there is no build step, package manager or server. Open `index.html` in a browser to run it.

## Usage

- **Draw another polygon:** buttons `1`–`4` load the predefined polygons.
- **Edit the polygon:** drag vertices or edges; hold `CTRL` and click to add a new vertex.
- **Parcel distribution:** enter comma-separated weights (they are normalized automatically), or pick one of the presets `1`–`5`.
- **Objectives:** checkboxes toggle the optional fitness terms (well-shaped rectangles, good circle-filled polygons, good aspect ratio, more convex polygons).
- **Iterate:** runs the algorithm. The *Best Item Statistics* panel shows the iteration number, the fitness value and the consistency scores of the best solution.

## Project Structure

| Path | Purpose |
|---|---|
| `index.html` | UI: 500×500 canvas, polygon and distribution presets, objective checkboxes, *Iterate* button, statistics panel |
| `js/partitioning.js` | Main logic (loaded as PaperScript): interaction, geometry helpers, genetic algorithm, rendering |
| `js/paper.js` | Vector graphics, path intersection/boolean operations, hit testing |
| `js/numeric-1.2.6.min.js` | Covariance matrix and eigenvalue computations |
| `js/nerdamer/` | Symbolic equation solving (circle through three points) |
| `js/jquery-2.1.4.min.js`, `js/bootstrap.min.js`, `css/` | UI framework and styles |

## Algorithm

All of the logic lives in `js/partitioning.js`.

### Representation
- An **individual** is a cutting line, defined by a center point and an angle (`Line`).
- Each **gene pool** (`GenePool`) holds a population of 10 lines. The initial angle comes from the principal eigenvector of the covariance matrix of the polygon's vertices (`getMainAngle`, a PCA-like approach).

### Mutation (`mutation`)
| Probability | Operation |
|---|---|
| 60% | Rotate the line by a random angle |
| 35% | Move the line toward the target area ratio |
| 5% | Turn the line by 90° (skipped once the line is good enough) |

The size of each change grows as fitness gets worse: the coefficient is `(5 · (1 − fitness))²`.

### Selection
After each step, the population is sorted by fitness. The two worst individuals are replaced by copies of the two best (elitism). The loop stops when fitness exceeds `0.999` or after 200 iterations.

### Fitness (`fitnessFunction`)
Fitness is `1 − Σ penalties`:

| Penalty | Weight | Description | Optional |
|---|---|---|---|
| Area | 1 | Deviation from the target area ratio | No |
| Aspect ratio | 0.005 | Ratio of the covariance eigenvalues (`aspectRatio`) | Yes |
| Rectangularity | 0.25 | Deviation of the interior angles from 90° | Yes |
| Convexity | 0.1 | Number of concave vertices | Yes |
| Circle filling | 0.3 | Unfilled area of the minimum enclosing circle (`miniDisc`, Welzl-style) | Yes |

### Multi-part decomposition
The polygon is divided step by step. Each gene pool cuts the current polygon in two. The next pool takes the remaining part, renormalizes the remaining weights, and cuts again (`processPool`, `changeLinePool`).

## Known Limitations

- `window.iterate` only calls `processPool(0)` and `processPool(1)`. The call for the third pool is commented out, so distributions with more than three parts (including the default `50,30,10,10`) do not seem to be fully processed.
- The code is a research prototype: it still contains `debugger` statements, verbose `console` logging and commented-out code (e.g. a *Stop* button).
- There are no automated tests.

## Libraries

- [Paper.js](http://paperjs.org/)
- [numeric.js](https://github.com/sloisel/numeric) 1.2.6
- [nerdamer](https://github.com/jiggzson/nerdamer)
- jQuery 2.1.4, Bootstrap
