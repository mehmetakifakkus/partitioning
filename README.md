# Genetic Algorithm Solution for Polygon Decomposition

An interactive web app that splits a polygon into parts with the areas you ask for (for example `50,30,10,10`), using straight cuts chosen by a genetic algorithm. The result is drawn right on the polygon, each part in its own color with its area.

Pick one of eight shapes or edit the polygon by dragging its points on the canvas, set the parcel distribution and the objectives in the *Partition* tab, and press *Iterate* (or *Stop*). The *Simulation* tab shows the algorithm step by step, and *Settings* controls its speed and parameters. See [Usage](#usage) for details.

**Try it: [mehmetakifakkus.github.io/partitioning](https://mehmetakifakkus.github.io/partitioning/)**

## Screenshots

Taken from the live site: on a desktop (1548 × 850) and on a phone (360 px wide).

<img src="images/live-desktop.png" alt="Live site on a desktop: the polygon canvas fills the window height; on the right, the Partition tab with the eight shape cards, distribution presets and objectives" width="640"/> <img src="images/live-phone.png" alt="Live site on a phone: the canvas fits the screen width, with the Partition tab and the eight shape cards below it" width="180"/>


## Overview

Given a simple polygon and a target area distribution (e.g. `50,30,10,10`), the app splits the polygon into sub-polygons whose areas match the requested ratios, using straight cutting lines found by a genetic algorithm. This is similar to a land/parcel subdivision problem. Each resulting part is drawn in its own color, with its area percentage shown on it.

The project is a static web page: there is no build step, package manager or server. Open `index.html` in a browser to run it.

## Usage

The page works like an app: a sidebar on the left with three tabs (**Partition**, **Simulation**, **Settings**), and the polygon canvas on the right under a toolbar. On a desktop nothing scrolls but the sidebar; the canvas fills the space left (it keeps its 500 × 500 coordinate system). On phones and narrow windows the toolbar and canvas come first and the tabs follow below; the polygon can be edited by touch. The page follows the system's light or dark theme.

### Toolbar
- **Iterate** runs the algorithm; **Stop** ends a run right away and keeps the best cuts found so far. A progress bar shows the current cut and generation. Both work from every tab.
- **Reset** restores the selected shape (undoing edits) and clears the result.
- **PNG** downloads the canvas as `partition.png`.
- **Grid** shows or hides the coordinate grid; the choice is remembered.
- Keyboard: `0` runs, `Esc` stops, `1`–`9` re-runs a single cut (ignored while typing in a text field).

### Partition
- **Shape:** pick one of the eight shapes shown as thumbnails (Square, House, Heptagon, Concave, L-shape, Trapezoid, Triangle, Cross). The selected one is highlighted. Shapes are defined in the `SHAPES` list in `js/partitioning.js`.
- **Edit the polygon:** drag vertices or edges on the canvas; hold `CTRL` and click to add a new vertex.
- **Distribution:** each part has a row with its color, a weight slider, its share and a remove button; *+ Part* adds one (2–10 parts). A stacked bar previews the shares in the parts' colors. The same weights can be typed as comma-separated numbers, or picked from a preset chip such as `50 · 30 · 10 · 10`. Every part keeps its row's color on the canvas, even though the largest part is cut first.
- **Objectives:** toggle the optional fitness terms (rectangles, aspect ratio, circle filling, convexity).
- **Result:** each part's area next to its target, plus the fitness and consistency scores of the best solution. Hovering (or tapping) a part in the list highlights it on the canvas and dims the others.

### Simulation
Tick *Simulate* to watch every generation in four phases (tournament → mutation → evaluation → replacement).
- Use *Play* / *Pause* and *Step* to control it, and the slider to set the speed. *Play* and *Step* also start a run if none is active.
- The polygon canvas draws every individual's cut, with the lines in play highlighted. The panel lists the population (gene = cut angle, shown as a compass needle) with fitness bars and explains each phase.
- Unticking the box finishes the current run at full speed.

### Settings
Sliders for the algorithm's parameters. Changes apply right away (population size from the next run), are saved in the browser (`localStorage`), and *Reset to defaults* restores them.

| Group | Setting | Default |
|---|---|---|
| Speed | Generations per frame | 10 |
| | Delay between frames | 0 ms |
| Run | Generations per cut | 200 |
| | Population size | 10 |
| Mutation | Fine rotation: probability, range | 60 %, ±5° |
| | Coarse rotation: probability, range | 30 %, ±45° |
| | Jump by 90° / 180° / 270° | the rest (10 %) |
| Objective weights | Rectangles, aspect ratio, circle filling, convexity | 0.25, 0.005, 0.3, 0.1 |

## Project Structure

| Path | Purpose |
|---|---|
| `index.html` | UI: sidebar with the *Partition*, *Simulation* and *Settings* tabs; toolbar and polygon canvas |
| `css/shapes.css` | Layout, styles and the light/dark theme (CSS variables) |
| `js/partitioning.js` | Main logic (loaded as PaperScript): settings (`config`), shape and distribution presets, distribution editor, tabs and toolbar, interaction, geometry helpers, genetic algorithm, rendering |
| `js/paper.js` | Vector graphics, path intersection/boolean operations, hit testing |
| `js/numeric-1.2.6.min.js` | Covariance matrix and eigenvalue computations |
| `js/nerdamer/` | Symbolic equation solving (circle through three points) |
| `js/jquery-2.1.4.min.js` | Reads the objective checkboxes |
| `js/bootstrap.min.js`, `css/bootstrap.min.css` | No longer loaded by the page (kept in the repository) |
| `images/` | Screenshots of the live site used in this README |

## Algorithm

All of the logic lives in `js/partitioning.js`.

### Representation
- An **individual** is a cutting line. Its gene is the line's **direction angle** (`Line`).
- For a given angle, the line's **offset** is not evolved. It is solved exactly by bisection (`findCutOffset`): the half-plane area is computed with Sutherland–Hodgman clipping, so the first part always gets exactly the requested area ratio. The genetic algorithm therefore only has to search for the angle that gives the best-shaped parts.
- Each **gene pool** (`GenePool`) holds a population of 10 lines (configurable). The initial angles come from the principal axis of the polygon's vertices (`getMainAngle`, a PCA-like approach), rotated by 0°/90°/180°/270° and by random amounts.

### Mutation (`mutation`)
Defaults shown; all of them can be changed in the *Settings* tab.

| Probability | Operation |
|---|---|
| 60% | Fine rotation (±5°) |
| 30% | Coarse rotation (±45°) |
| 10% | Jump by 90°, 180° or 270° (180° swaps which side gets the target area) |

### Selection
Steady-state GA: each generation picks a parent by tournament selection, mutates and evaluates it (`runPhase`). The child replaces the worst individual if it is better. Each pool runs 200 evaluations by default (configurable), or stops early when fitness exceeds `0.9999`.

### Fitness (`fitnessFunction`)
Fitness is `1 − Σ penalties`. A cut that splits the polygon into more than two pieces gets fitness 0. Shape penalties are computed for the part a pool cuts off; in the last pool, whose remainder is also a final part, they are averaged over both parts (`shapePenalty`).

| Penalty | Default weight | Description | Optional |
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
