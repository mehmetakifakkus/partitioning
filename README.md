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
- **Iterate:** runs the algorithm (keyboard: `0`; `1`–`9` re-runs a single pool). The *Best Item Statistics* panel shows the iteration number, the fitness value and the consistency scores of the best solution.
- **GA Simulation:** tick *Simulate the genetic algorithm step by step* to watch every generation in four phases (tournament → mutation → evaluation → replacement).
  - Use *Pause* / *Play* and *Step* to control it, and the slider to set the speed. *Step* also starts a run if none is active.
  - The polygon canvas draws every individual's cut, with the lines in play highlighted. The panel lists the population (gene = cut angle, shown as a compass needle) with fitness bars and explains each phase.
  - Unticking the box finishes the current run at full speed.

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
- An **individual** is a cutting line. Its gene is the line's **direction angle** (`Line`).
- For a given angle, the line's **offset** is not evolved. It is solved exactly by bisection (`findCutOffset`): the half-plane area is computed with Sutherland–Hodgman clipping, so the first part always gets exactly the requested area ratio. The genetic algorithm therefore only has to search for the angle that gives the best-shaped parts.
- Each **gene pool** (`GenePool`) holds a population of 10 lines. The initial angles come from the principal axis of the polygon's vertices (`getMainAngle`, a PCA-like approach), rotated by 0°/90°/180°/270° and by random amounts.

### Mutation (`mutation`)
| Probability | Operation |
|---|---|
| 60% | Fine rotation (±5°) |
| 30% | Coarse rotation (±45°) |
| 10% | Jump by 90°, 180° or 270° (180° swaps which side gets the target area) |

### Selection
Steady-state GA: each generation picks a parent by tournament selection, mutates and evaluates it (`runPhase`). The child replaces the worst individual if it is better. Each pool runs 200 evaluations, or stops early when fitness exceeds `0.9999`.

### Fitness (`fitnessFunction`)
Fitness is `1 − Σ penalties`. A cut that splits the polygon into more than two pieces gets fitness 0. Shape penalties are computed for the part a pool cuts off; in the last pool, whose remainder is also a final part, they are averaged over both parts (`shapePenalty`).

| Penalty | Weight | Description | Optional |
|---|---|---|---|
| Area | 1 | Deviation from the target area ratio (≈ 0, since the offset is solved exactly) | No |
| Aspect ratio | 0.005 | Ratio of the covariance eigenvalues (`aspectRatio`) | Yes |
| Rectangularity | 0.25 | Deviation of the interior angles from 90° | Yes |
| Convexity | 0.1 | Number of concave vertices | Yes |
| Circle filling | 0.3 | Unfilled area of the minimum enclosing circle (`miniDisc`, Welzl-style) | Yes |

### Multi-part decomposition
The polygon is divided step by step. Each gene pool cuts the current polygon in two. When it finishes, the next pool takes the remaining part, renormalizes the remaining weights and cuts again (`runPool`). A distribution with *n* parts uses *n − 1* pools.

## Known Limitations

- Intermediate remainders are not scored for shape, since they are cut again. Cuts are greedy: an early cut cannot be revised to help a later one.
- Weights are sorted in descending order before cutting (`normalize`), so the largest part is always cut first.
- The code is a research prototype: it still contains `debugger` statements, verbose `console` logging and commented-out code (e.g. a *Stop* button).
- There are no automated tests.

## Libraries

- [Paper.js](http://paperjs.org/)
- [numeric.js](https://github.com/sloisel/numeric) 1.2.6
- [nerdamer](https://github.com/jiggzson/nerdamer)
- jQuery 2.1.4, Bootstrap
