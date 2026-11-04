// Browser tests for the partitioning app.
//
//   npm install && npx playwright install chromium   (once)
//   npm test
//
// A small static server serves the repository; each test opens the page in headless Chromium.
// The app runs as PaperScript, so its variables are not on `window`: the tests append a small
// hook (window.__t) to js/partitioning.js when they serve it, and read the app's state through it.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

const HOOK = `
window.__t = {
    state: function(){
        return {
            running: running,
            pools: pools.length,
            generations: pools.map(function(p){ return p.t; }),
            population: pools.map(function(p){ return p.lines.length; }),
            done: pools.filter(function(p){ return p.bestSides; }).length,
            // area of every drawn part in % of the polygon, largest cut first
            parts: painted.map(function(p){ return 100 * Math.abs(p.item.area / myPath.area); }),
            multiPiece: painted.filter(function(p){ return p.item.className == 'CompoundPath'; }).length,
            colors: painted.map(function(p){ return p.item.fillColor.toCSS(true); }),
            opacity: painted.map(function(p){ return p.item.opacity; }),
            order: distOrder.slice(),
            weights: weights.slice(),
            grid: gridItems[0].visible,
            zoom: view.zoom
        };
    },
    vertex: function(i){ var p = myPath.segments[i].point; return [p.x, p.y]; },
    toScreen: function(x, y){
        var p = view.projectToView(new Point(x, y)), r = view.element.getBoundingClientRect();
        return [r.left + p.x, r.top + p.y];
    },
    circle: function(a, b, c){
        var r = getCenterAndRadius3(new Point(a), new Point(b), new Point(c));
        return [r.center.x, r.center.y, r.r];
    }
};`;

function startServer(){
    const server = http.createServer((req, res) => {
        const url = decodeURIComponent(req.url.split('?')[0]);
        const file = path.join(ROOT, url === '/' ? 'index.html' : url);
        if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
            res.writeHead(404);
            return res.end('not found');
        }
        let body = fs.readFileSync(file);
        if(url === '/js/partitioning.js')
            body = body.toString('utf8') + HOOK;
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        res.end(body);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---------------------------------------------------------------- helpers

let browser, baseUrl;
const failures = [];

async function openPage(options = {}){
    const context = await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.on('pageerror', e => page.errors.push(e.message));
    await page.goto(baseUrl + '/index.html');
    await page.waitForFunction(() => window.__t && typeof window.iterate == 'function');
    return page;
}
const state = page => page.evaluate(() => window.__t.state());
const waitIdle = page => page.waitForFunction(() => !window.__t.state().running, null, { timeout: 120000, polling: 100 });
const setSlider = (page, id, value) => page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
}, [id, value]);
async function setDistribution(page, text){
    await page.fill('#dist', text);
    await page.evaluate(() => document.getElementById('dist').dispatchEvent(new Event('change')));
}
function expected(text){ // the target shares in %, largest first (the order the parts are cut in)
    const w = text.split(',').map(Number), total = w.reduce((a, b) => a + b, 0);
    return w.map(x => 100 * x / total).sort((a, b) => b - a);
}
function check(cond, message){
    if(!cond) throw new Error(message);
}

const tests = [];
function test(name, fn){ tests.push({ name, fn }); }

// ---------------------------------------------------------------- tests

test('page loads with eight shapes and the default distribution', async () => {
    const page = await openPage();
    check(await page.locator('.shape-btn').count() === 8, 'expected 8 shape buttons');
    check(await page.locator('.part-row').count() === 4, 'expected 4 distribution rows');
    check(await page.inputValue('#dist') === '50,30,10,10', 'unexpected default distribution');
    check(page.errors.length === 0, 'page errors: ' + page.errors.join('; '));
    await page.context().close();
});

test('every shape is split into exactly the requested areas', async () => {
    const page = await openPage();
    for(let shape = 1; shape <= 8; shape++){
        for(const d of ['50,30,10,10', '33,33,33']){
            await page.evaluate(n => createInitialPolygon(n), shape);
            await setDistribution(page, d);
            await page.click('#run');
            await waitIdle(page);
            const s = await state(page), want = expected(d);
            check(s.parts.length === want.length, `shape ${shape}, ${d}: ${s.parts.length} parts`);
            check(s.multiPiece === 0, `shape ${shape}, ${d}: a part has several pieces`);
            s.parts.forEach((p, i) => check(Math.abs(p - want[i]) < 0.05, `shape ${shape}, ${d}: part ${i + 1} is ${p.toFixed(3)} %, wanted ${want[i].toFixed(3)} %`));
        }
    }
    check(page.errors.length === 0, 'page errors: ' + page.errors.join('; '));
    await page.context().close();
});

test('circle through three points', async () => {
    const page = await openPage();
    const cases = [[[0, 0], [100, 0], [0, 100]], [[37, 412], [250, 80], [440, 410]], [[10, 10], [20, 20], [30, 30]]];
    for(const [a, b, c] of cases){
        const [x, y, r] = await page.evaluate(([a, b, c]) => window.__t.circle(a, b, c), [a, b, c]);
        const dist = p => Math.hypot(p[0] - x, p[1] - y);
        const collinear = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) === 0;
        if(collinear) // the circle through the two farthest points contains the third
            check([a, b, c].every(p => dist(p) <= r + 1e-9), 'collinear points are not inside the circle');
        else
            check([a, b, c].every(p => Math.abs(dist(p) - r) < 1e-9), `points are not on the circle (${a}, ${b}, ${c})`);
    }
    await page.context().close();
});

test('Stop and Esc end a run right away', async () => {
    const page = await openPage();
    await setSlider(page, 'cfg_perFrame', 1);
    await setSlider(page, 'cfg_frameDelay', 30);
    await page.click('#run');
    await page.waitForTimeout(400);
    check(await page.isEnabled('#stop'), 'Stop should be enabled during a run');
    await page.click('#stop');
    const before = (await state(page)).generations;
    await page.waitForTimeout(400);
    const after = await state(page);
    check(!after.running, 'still running after Stop');
    check(JSON.stringify(before) === JSON.stringify(after.generations), 'generations advanced after Stop');
    check(/^Stopped at cut 1 \/ 3/.test(await page.textContent('#run_label')), 'unexpected label: ' + await page.textContent('#run_label'));

    await page.click('#run');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Escape');
    check(!(await state(page)).running, 'Esc did not stop the run');
    await page.evaluate(() => window.resetSettings());
    await page.context().close();
});

test('changing the shape during a run stops it cleanly', async () => {
    const page = await openPage();
    await setSlider(page, 'cfg_frameDelay', 50);
    await page.click('#run');
    await page.waitForTimeout(300);
    await page.click('.shape-btn[data-shape="5"]');
    await page.waitForTimeout(300);
    const s = await state(page);
    check(!s.running && s.done === 0 && s.parts.length === 0, 'old result left over: ' + JSON.stringify(s));
    await page.evaluate(() => window.resetSettings());
    await page.context().close();
});

test('GA settings are applied, remembered and reset', async () => {
    const page = await openPage();
    await setSlider(page, 'cfg_generations', 30);
    await setSlider(page, 'cfg_population', 12);
    await setSlider(page, 'cfg_fineProb', 90);
    check(await page.textContent('output[data-for="coarseProb"]') === '10 %', 'coarse rotation was not clamped to 10 %');
    await page.click('#run');
    await waitIdle(page);
    const s = await state(page);
    check(s.generations.every(t => t === 30), 'generations per cut: ' + s.generations);
    check(s.population.every(n => n === 12), 'population: ' + s.population);
    await page.reload();
    await page.waitForFunction(() => window.__t);
    check(await page.textContent('output[data-for="generations"]') === '30', 'generations were not remembered');
    await page.evaluate(() => window.resetSettings());
    check(await page.textContent('output[data-for="generations"]') === '200', 'reset did not restore 200 generations');
    await page.context().close();
});

test('typing digits in the distribution field does not trigger shortcuts', async () => {
    const page = await openPage();
    await page.fill('#dist', '');
    await page.type('#dist', '50,30,10,10');
    await page.waitForTimeout(200);
    check(!(await state(page)).running, 'typing started a run');
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('0');
    check((await state(page)).running, 'the 0 shortcut did not start a run');
    await page.click('#stop');
    await page.context().close();
});

test('distribution editor stays in sync and parts keep their row colors', async () => {
    const page = await openPage();
    await page.evaluate(() => {
        const r = document.querySelectorAll('.part-row input[type=range]')[3];
        r.value = 40;
        r.dispatchEvent(new Event('input', { bubbles: true }));
    });
    check(await page.inputValue('#dist') === '50,30,10,40', 'slider did not update the text field');
    await page.click('#dist_add');
    check(await page.locator('.part-row').count() === 5, '+ Part did not add a row');
    await page.click('.part-remove >> nth=1');
    check(await page.inputValue('#dist') === '50,10,40,10', 'remove did not update the text field: ' + await page.inputValue('#dist'));

    await setDistribution(page, '10,60,30');
    await page.click('#run');
    await waitIdle(page);
    const s = await state(page);
    const rowColors = await page.$$eval('.part-row .swatch', els => els.map(e => {
        const c = getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number);
        return '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
    }));
    s.order.forEach((row, k) => check(s.colors[k] === rowColors[row], `part ${k + 1} is ${s.colors[k]}, its row is ${rowColors[row]}`));
    await page.context().close();
});

test('hovering a result highlights that part', async () => {
    const page = await openPage();
    await page.click('#run');
    await waitIdle(page);
    await page.hover('.legend-item >> nth=0');
    let s = await state(page);
    check(s.opacity.filter(o => o === 1).length === 1 && s.opacity.filter(o => o < 1).length === s.opacity.length - 1, 'highlight: ' + s.opacity);
    await page.mouse.move(2, 2);
    s = await state(page);
    check(s.opacity.every(o => o === 1), 'highlight not cleared: ' + s.opacity);
    await page.context().close();
});

test('simulation advances phase by phase', async () => {
    const page = await openPage();
    await page.click('.tab[data-tab="tab_sim"]');
    await page.check('#simulate');
    await page.click('#sim_play'); // pause
    await page.click('#sim_step'); // starts the run with the initial population
    const phases = [];
    for(let i = 0; i < 5; i++){
        await page.click('#sim_step');
        phases.push(await page.evaluate(() => window.__t.state().generations[0]));
    }
    check(phases.join(',') === '0,0,0,1,1', 'generation counter by step: ' + phases);
    await page.click('#stop');
    await page.context().close();
});

test('dragging a vertex moves it by the drag distance in drawing units', async () => {
    const page = await openPage();
    const [x, y] = await page.evaluate(() => window.__t.toScreen(250, 100));
    const zoom = (await state(page)).zoom;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y + 30, { steps: 6 });
    await page.mouse.up();
    const [vx, vy] = await page.evaluate(() => window.__t.vertex(1));
    check(Math.abs(vx - (250 + 30 / zoom)) < 1.5 && Math.abs(vy - (100 + 30 / zoom)) < 1.5, `vertex at ${vx}, ${vy}; zoom ${zoom}`);
    await page.context().close();
});

test('grid toggle is remembered and PNG export downloads a file', async () => {
    const page = await openPage();
    await page.click('#grid_toggle');
    check((await state(page)).grid === false, 'grid still visible');
    await page.reload();
    await page.waitForFunction(() => window.__t);
    check((await state(page)).grid === false, 'grid choice not remembered');
    await page.click('#grid_toggle');
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('button[title^="Download"]')]);
    check(download.suggestedFilename() === 'partition.png', 'unexpected file name ' + download.suggestedFilename());
    await page.context().close();
});

test('layout: desktop fits the window, phone has no horizontal scroll', async () => {
    let page = await openPage({ viewport: { width: 1000, height: 610 } });
    let m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth }));
    check(m.h <= 610 && m.w <= 1000, 'desktop page scrolls: ' + JSON.stringify(m));
    await page.context().close();

    page = await openPage({ ...devices['iPhone 13'] });
    m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth }));
    check(m.w <= m.vw, 'phone page scrolls sideways: ' + JSON.stringify(m));
    await page.context().close();
});

test('distribution percentages stay on one line with a wide font', async () => {
    const page = await openPage();
    await page.addStyleTag({ content: 'body, button, input { font-family: "DejaVu Sans", Verdana, sans-serif !important; }' });
    const wrapped = await page.$$eval('.part-pct', els => els.filter(e => e.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(e).lineHeight)).map(e => e.textContent));
    check(wrapped.length === 0, 'wrapped: ' + wrapped.join(', '));
    await page.context().close();
});

// ---------------------------------------------------------------- runner

(async () => {
    const server = await startServer();
    baseUrl = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch();
    for(const t of tests){
        const start = Date.now();
        try {
            await t.fn();
            console.log(`  ✓ ${t.name} (${Date.now() - start} ms)`);
        } catch(e) {
            failures.push(t.name);
            console.log(`  ✗ ${t.name}\n      ${e.message.split('\n')[0]}`);
        }
    }
    await browser.close();
    server.close();
    console.log(`\n${tests.length - failures.length} passed, ${failures.length} failed`);
    process.exit(failures.length ? 1 : 0);
})();
