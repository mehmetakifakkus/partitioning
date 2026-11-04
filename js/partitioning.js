var colors = ['#3b5bdb', '#e8590c', '#2b8a3e', '#c2255c', '#5f3dc4', '#0b7285', '#a61e4d', '#5c940d', '#d9480f', '#495057'];
var MAX_PARTS = colors.length, MIN_PARTS = 2;

function themeColor(name, fallback){ // a colour from the CSS theme (light or dark)
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback || '#1f2328';
}
function isDark(){
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function loadFlag(key, fallback){
    try { var v = window.localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch(e) { return fallback; }
}
function saveFlag(key, on){
    try { window.localStorage.setItem(key, on ? '1' : '0'); } catch(e) {}
}

///////////////////////////////     GA settings     ///////////////////////////////////
// Edited in the "GA Settings" tab and remembered in this browser.

var CONFIG_DEFAULTS = {
    perFrame: 10,       // generations computed per animation frame (fast mode)
    frameDelay: 0,      // ms between frames (fast mode)
    generations: 200,   // generations per pool
    population: 10,     // individuals per pool
    fineProb: 60,       // % fine rotation
    fineRange: 5,       // +- degrees
    coarseProb: 30,     // % coarse rotation (the rest jumps by 90/180/270 degrees)
    coarseRange: 45,    // +- degrees
    wRect: 0.25, wRatio: 0.005, wConvex: 0.1, wCircle: 0.3 // objective weights
};
var CONFIG_KEY = 'partitioning.config';

var config = (function(){
    var c = {}, saved = {};
    for(var k in CONFIG_DEFAULTS)
        c[k] = CONFIG_DEFAULTS[k];
    try { saved = JSON.parse(window.localStorage.getItem(CONFIG_KEY) || '{}') || {}; } catch(e) {}
    for(var k in saved)
        if(k in CONFIG_DEFAULTS && typeof saved[k] == 'number' && isFinite(saved[k]))
            c[k] = saved[k];
    return c;
})();

function saveConfig(){
    try { window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch(e) {}
}

function formatSetting(key, v){
    if(key == 'frameDelay') return v + ' ms';
    if(key == 'fineRange' || key == 'coarseRange') return '±' + v + '°';
    if(key == 'fineProb' || key == 'coarseProb') return v + ' %';
    return String(v);
}

function syncSettingsUI(){
    var inputs = document.querySelectorAll('[data-setting]');
    for(var i=0; i < inputs.length; i++){
        var key = inputs[i].getAttribute('data-setting');
        inputs[i].value = config[key];
        var out = document.querySelector('output[data-for="' + key + '"]');
        if(out)
            out.textContent = formatSetting(key, config[key]);
    }
    var jump = document.getElementById('jump_prob');
    if(jump)
        jump.textContent = Math.max(0, 100 - config.fineProb - config.coarseProb) + ' %';
}

window.changeSetting = function(input){
    var key = input.getAttribute('data-setting');
    config[key] = parseFloat(input.value);
    if(config.fineProb + config.coarseProb > 100){ // keep the mutation probabilities within 100 %
        if(key == 'fineProb') config.coarseProb = 100 - config.fineProb;
        else config.fineProb = 100 - config.coarseProb;
    }
    syncSettingsUI();
    saveConfig();
}

window.resetSettings = function(){
    for(var k in CONFIG_DEFAULTS)
        config[k] = CONFIG_DEFAULTS[k];
    syncSettingsUI();
    saveConfig();
}

///////////////////////////////     presets     ///////////////////////////////////////

var SHAPES = [
    {name: 'Square',   points: [[100,100],[400,100],[400,400],[100,400]]},
    {name: 'House',    points: [[100,200],[250,100],[400,200],[400,400],[100,400]]},
    {name: 'Heptagon', points: [[401.5,104],[450.5,246],[367.5,375],[236.5,335],[97.5,194],[190.5,90],[257.5,57]]},
    {name: 'Concave',  points: [[401.5,104],[450.5,246],[367.5,375],[236.5,335],[97.5,194],[287.5,222],[257.5,57]]},
    {name: 'L-shape',  points: [[100,100],[260,100],[260,260],[420,260],[420,420],[100,420]]},
    {name: 'Trapezoid', points: [[170,120],[340,120],[440,400],[70,400]]},
    {name: 'Triangle', points: [[250,80],[440,410],[60,410]]},
    {name: 'Cross',    points: [[190,90],[310,90],[310,190],[410,190],[410,310],[310,310],[310,410],[190,410],[190,310],[90,310],[90,190],[190,190]]}
];

function shapeViewBox(points){ // thumbnail view box: the shape's bounds plus a margin, as a square
    var xs = points.map(function(p){ return p[0]; }), ys = points.map(function(p){ return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var size = Math.max(maxX - minX, maxY - minY) * 1.12, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return [cx - size / 2, cy - size / 2, size, size].map(function(v){ return v.toFixed(1); }).join(' ');
}
var DIST_PRESETS = ['33,33,33', '50,33,17', '40,40,20', '50,30,10,10', '90,5,5'];

function buildPresetPickers(){
    var picker = document.getElementById('shape_picker');
    if(picker){
        var html = '';
        for(var i=0; i < SHAPES.length; i++){
            var pts = SHAPES[i].points.map(function(p){ return p[0] + ',' + p[1]; }).join(' ');
            html += '<button type="button" class="shape-btn" data-shape="' + (i + 1) + '" onclick="createInitialPolygon(' + (i + 1) + ')" aria-label="Shape ' + (i + 1) + ': ' + SHAPES[i].name + '">'
                  + '<svg viewBox="' + shapeViewBox(SHAPES[i].points) + '" aria-hidden="true"><polygon points="' + pts + '"/></svg>'
                  + '<span>' + SHAPES[i].name + '</span></button>';
        }
        picker.innerHTML = html;
    }
    var chips = document.getElementById('dist_presets');
    if(chips){
        var html = '';
        for(var i=0; i < DIST_PRESETS.length; i++)
            html += '<button type="button" class="chip" data-dist="' + DIST_PRESETS[i] + '" onclick="loadDistribution(' + (i + 1) + ')">' + DIST_PRESETS[i].split(',').join(' · ') + '</button>';
        chips.innerHTML = html;
    }
}

function markActive(selector, attr, value){
    var items = document.querySelectorAll(selector);
    for(var i=0; i < items.length; i++){
        var on = items[i].getAttribute(attr) == value;
        items[i].classList.toggle('active', on);
        items[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
}

buildPresetPickers();
syncSettingsUI();
var drawables = [];
var myPath = [];
var pools = [];
var dist = [];

///////////////////////////////     event handling  ///////////////////////////////////

var segment, path, stroke;
var hitOptions = {segments:true, fill:true, stroke:true, tolerance:10};

function onMouseMove(event){ 
	project.activeLayer.selected = false;
    
    if(event.item && event.item.name == 'polygon') {
        event.item.bringToFront();
        event.item.selected = true;
    }    
} 

var points = [];
function onMouseDown(event){ 

    segment = path = stroke = null;
    
    var hitResult = myPath.hitTest(event.point, hitOptions); // only the polygon, not the vertex markers drawn on top of it

    if (hitResult) {
		path = hitResult.item;
        if (hitResult.type == 'segment')
           segment = hitResult.segment;
        if (hitResult.type == 'stroke') {
            stroke = 1;
            for(var i=0 ; i<points.length; i++)
                points[i].dist = event.point.getDistance(points[i].point)

            points.sort(function(a, b) {return a.dist - b.dist;});
          } 
    }
    
    if (event.modifiers.control) { // if control is pressed add new point
        myPath.add(event.point);
        points = [];
        for(var k=0; k < myPath.segments.length; k++)
            points.push(new PolygonPoint(myPath.segments[k].point));
    }  
}

function onMouseDrag(event){  
        
    if (segment)
		segment.point += event.delta;
    else if(stroke){
        myPath.segments[points[0].id].point += event.delta;
        myPath.segments[points[1].id].point += event.delta;
    }else if(path)
        path.point += event.delta;
    
    refreshPoints();    
}

function onKeyDown(event){

    var focused = document.activeElement; // typing in a text field must not trigger the shortcuts
    if(focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName) && focused.type != 'checkbox' && focused.type != 'range')
        return;

    if(event.key == 'escape'){
        window.stopRun();
        return;
    }

    var asciiNum = event.key.charCodeAt(0)
    if(asciiNum < 48 || asciiNum > 58) // check if they are a number
        return;
    
    var num = parseInt(event.key)
        
    if(num == 0)
        window.iterate();
    else if(!running && num <= pools.length)
        runPool(num-1, false); // run a single pool on what the previous one left

    window.show();
}

//////////////////////////////////////  Classes  ////////////////////////////////////////

function PolygonPoint(p){

    if (typeof PolygonPoint.counter == 'undefined')
        PolygonPoint.counter = 0;
    
    this.id = PolygonPoint.counter++; // newly created vertex will have different id
    this.point = p;
    
    this.draw = function(){
        var ink = themeColor('--outline');
        drawables.push(new PointText({ point: p + [5, -5], fontSize: '16px', fillColor: ink, content: ' '+ this.id}));
        drawables.push(new Path.Circle({ name: 'vertex-' + this.id, center: p, radius: 5, fillColor: ink}));
    }
};

function Line(angle, fitness){ // a cutting line: its direction is the GA gene, its offset is solved exactly

    this.angle = angle;
    this.offset = 0;
    this.fitnessValue = fitness || 0;
};


////////////////////////////////////     Visual Part      ///////////////////////////////

function clear(){
    for(var i=0; i < drawables.length; i++) // lines, circles, texts etc.
        drawables[i].remove();

    PolygonPoint.counter = 0;
}

function getDataFromPath(path){  // path is a paperjs object, get Nx2 data array from it
 
    var points = [];
    var items = path.className == 'CompoundPath' ? path.children : [path];

    for(var c=0; c < items.length; c++)
        for(var k=0; k < items[c].segments.length; k++)
            points.push([items[c].segments[k].point.x, items[c].segments[k].point.y]);

    return points;
}

function refreshPoints(){
    clear();

    for(var k=0; k < points.length; k++)
       points[k].draw(); 
}

var currentShape = 2;

window.createInitialPolygon = function(t){
    if(running)
        window.stopRun();
    currentShape = t;
    if(myPath.name){
        points = [];
        myPath.remove();
    }

    myPath = new Path({name: 'polygon', strokeColor: themeColor('--outline'), strokeWidth: 2, closed:true});
    var polygon = SHAPES[t - 1].points;
    markActive('.shape-btn', 'data-shape', String(t));

    for(var k=0; k < polygon.length; k++){
        myPath.add(new Point(polygon[k]));
        points.push(new PolygonPoint(myPath.segments[k].point));
    }
    refreshPoints();
    generatePools(myPath);
    if(typeof window.show == 'function'){ // clear an old result (window.show exists after start-up)
        window.show();
        resetProgress();
    }
}

function drawCircle(circle){
        drawables.push(new Path.Circle({ name: 'circle', center: circle.center, radius: circle.r, strokeColor: 'black'}));
}

function convertToRealCoord(p){
    var temp = p.clone();
    temp *= 25;
    temp.y = 500 - temp.y;
    return temp;
}
var gridItems = [], gridOn = loadFlag('partitioning.grid', true);

function drawCoordinateSystem(){
    var ink = themeColor('--grid');
    function add(item){ item.visible = gridOn; gridItems.push(item); }

    // labels every 50 units; the ones at the edges are moved inside so they are not cut off
    add(new PointText({point: [4, 494], fontSize: '12px', fillColor: ink, content: '0', opacity: 0.6}));
    for(var i = 1; i <= 10; i++){
        add(new PointText({point: [5, Math.max(13, 500 - 50 * i + 4)], fontSize: '12px', fillColor: ink, content: String(i * 50), opacity: 0.6}));
        add(new PointText({point: [Math.min(486, 50 * i), 494], justification: 'center', fontSize: '12px', fillColor: ink, content: String(i * 50), opacity: 0.6}));
    }
    for(var  i = 0; i <= 21; i++){
        add(new Path.Line({from: convertToRealCoord(new Point(0, i)), to: convertToRealCoord(new Point(21, i)), strokeColor: ink, strokeWidth: 1, dashArray: [1,2], opacity: 0.2}));
        add(new Path.Line({from: convertToRealCoord(new Point(0, i)), to: convertToRealCoord(new Point(0.2, i)), strokeColor: ink, strokeWidth: 4, opacity: 0.5}));
    }
    for(var i = 0; i <= 21; i++){
       add(new Path.Line({from: convertToRealCoord(new Point(i, 0)), to: convertToRealCoord(new Point(i, 21)), strokeColor: ink, strokeWidth: 1, dashArray: [1,2], opacity: 0.2}));
       add(new Path.Line({from: convertToRealCoord(new Point(i, -0.2)), to: convertToRealCoord(new Point(i, 0)), strokeColor: ink, strokeWidth: 4, opacity: 0.5}));
    }
}
drawCoordinateSystem();

window.toggleGrid = function(){
    gridOn = !gridOn;
    for(var i=0; i < gridItems.length; i++)
        gridItems[i].visible = gridOn;
    saveFlag('partitioning.grid', gridOn);
    syncGridButton();
}
function syncGridButton(){
    var b = document.getElementById('grid_toggle');
    if(b) b.setAttribute('aria-pressed', gridOn ? 'true' : 'false');
}
syncGridButton();

function applyTheme(){ // the OS switched between light and dark: recolour what is drawn on the canvases
    var ink = themeColor('--grid');
    for(var i=0; i < gridItems.length; i++){
        if(gridItems[i].className == 'PointText') gridItems[i].fillColor = ink;
        else gridItems[i].strokeColor = ink;
    }
    if(myPath.name)
        myPath.strokeColor = themeColor('--outline');
    refreshPoints();
    window.show();
    if(sim.lastPool && sim.enabled)
        drawSimulation(sim.lastPool, sim.lastGen);
}
if(window.matchMedia){
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if(darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
    else if(darkQuery.addListener) darkQuery.addListener(applyTheme);
}

///////////////////////////////   responsive canvas   ////////////////////////////////
// The drawing keeps its 500x500 coordinate system; only the view is scaled to the space available.

var WORLD_SIZE = 500;
var STACKED_QUERY = '(max-width: 820px)'; // matches the CSS breakpoint where the panel moves below the canvas

function px(style, prop){ return parseFloat(style[prop]) || 0; }

function fitCanvas(){ // the canvas fills the stage (as a square); on phones it fills the width
    var stage = document.getElementById('stage'), ss = getComputedStyle(stage);
    var w = stage.clientWidth - px(ss, 'paddingLeft') - px(ss, 'paddingRight');
    var size = w;
    if(!window.matchMedia(STACKED_QUERY).matches)
        size = Math.min(w, stage.clientHeight - px(ss, 'paddingTop') - px(ss, 'paddingBottom'));
    size = Math.max(200, Math.floor(size));

    view.viewSize = new Size(size, size);
    view.zoom = size / WORLD_SIZE;
    view.center = new Point(WORLD_SIZE / 2, WORLD_SIZE / 2);
}
fitCanvas();
window.addEventListener('resize', function(){
    fitCanvas();
    if(sim.lastPool && sim.enabled){ // re-layout the panel
        window.show();
        drawSimulation(sim.lastPool, sim.lastGen);
    }
});

//////////////////////////////////////////    tabs   //////////////////////////////////

window.showTab = function(id){
    var tabs = document.querySelectorAll('.tab'), panes = document.querySelectorAll('.tab-pane');
    for(var i=0; i < tabs.length; i++){
        var on = tabs[i].getAttribute('data-tab') == id;
        tabs[i].classList.toggle('active', on);
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for(var i=0; i < panes.length; i++)
        panes[i].classList.toggle('active', panes[i].id == id);
    // the simulation panel needs a wider sidebar; refit the canvas once the column has resized
    document.getElementById('app').classList.toggle('wide-side', id == 'tab_sim');
    window.setTimeout(function(){
        fitCanvas();
        if(sim.lastPool && sim.enabled){
            window.show();
            drawSimulation(sim.lastPool, sim.lastGen);
        }
    }, 230);
}

////////////////////////////////////////    Main   //////////////////////////////////

createInitialPolygon(2); // first create polygon, then modify by dragging
refreshPoints();

///////////////////////////////   vector processes   /////////////////////////////////

function dotProduct(v1, v2){
    return v1.x * v2.x + v1.y * v2.y;
}

function crossProduct(v1, v2){
    return v1.x * v2.y - v2.x * v1.y;
}


/////////////////////////////////    Circle Operation    /////////////////////////////

function getCenterAndRadius3(p1, p2, p3){ // circle through three points (circumcircle)
    var d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
    if(Math.abs(d) < 1e-9){ // collinear: the circle through the two farthest points
        var pairs = [[p1, p2], [p1, p3], [p2, p3]];
        pairs.sort(function(a, b){ return b[0].getDistance(b[1]) - a[0].getDistance(a[1]); });
        return getCenterAndRadius2(pairs[0][0], pairs[0][1]);
    }
    var s1 = p1.x * p1.x + p1.y * p1.y, s2 = p2.x * p2.x + p2.y * p2.y, s3 = p3.x * p3.x + p3.y * p3.y;
    var center = new Point((s1 * (p2.y - p3.y) + s2 * (p3.y - p1.y) + s3 * (p1.y - p2.y)) / d,
                           (s1 * (p3.x - p2.x) + s2 * (p1.x - p3.x) + s3 * (p2.x - p1.x)) / d);
    return {center: center, r: p1.getDistance(center)};
}

function getCenterAndRadius2(p1, p2){
    return {center: (p1+p2)/2, r:(p1.getDistance(p2)/2)}
}

function inCircle(center, radius, p){
    return Math.sqrt(Math.pow(p.x-center.x, 2)+ Math.pow(p.y-center.y, 2)) - radius;
}


///////////     Smallest Disk Functions  ///////////

function shuffle(a) {
    var result = [], j, i, temp = a.slice(0); // copy the content
    
    for (var i = temp.length; i; i--) {
        j = Math.floor(Math.random() * i);
        result.push(temp[j])
        temp.splice(j, 1) //bu eksiltme işlemi burada gerçekleşiyor
    }
    return result;
}

function miniDisc(polygon){
    
    var points = [];
    for(var k=0; k < polygon.segments.length; k++)
        points.push(new PolygonPoint(polygon.segments[k].point));
    
    var ps = shuffle(points);
    var lastCircle = getCenterAndRadius2(ps[0].point, ps[1].point);
    
    for(var i=2; i<ps.length; i++)
        if(inCircle(lastCircle.center, lastCircle.r, ps[i].point) > 0)
            lastCircle = miniDiscWithPoint(ps.slice(0, i), ps[i])
            
    var areaPenalty = (1 - polygon.area / (Math.PI * lastCircle.r * lastCircle.r));
    
    return {areaPenalty:areaPenalty, circumPenalty:0}
}

function miniDiscWithPoint(points, q){
    
    var ps = shuffle(points);
    var lastCircle = getCenterAndRadius2(ps[0].point, q.point);

    for(var j=1; j<ps.length; j++)
        if(inCircle(lastCircle.center, lastCircle.r, ps[j].point) > 0)
            lastCircle = miniDiscWitTwoPoints(ps.slice(0, j), ps[j], q)  
    
    return lastCircle;
}

function miniDiscWitTwoPoints(points, q1, q2){

    var lastCircle = getCenterAndRadius2(q1.point, q2.point);
    
    for(var k=0; k<points.length; k++)
        if(inCircle(lastCircle.center, lastCircle.r, points[k].point) > 0)
            lastCircle = getCenterAndRadius3(q1.point, q2.point, points[k].point);
        
    return lastCircle;
}


///////////////////////////////////    Math    //////////////////////////////////////////

function getCol(matrix, col){
       var column = [];
       for(var i=0; i<matrix.length; i++){
          column.push(matrix[i][col]);
       }
       return column;
    }

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function normalize(arr){
    
    var total = 0;
    
    for(var i=0; i < arr.length; i++)
        total += arr[i];
    
    
    for(var i=0; i < arr.length; i++)
        arr[i] /= total;    
    
    arr.sort(function(a, b) {return b - a});
    return arr;
}

function getPolygonCenter(polygon){
    var data = getDataFromPath(polygon),  N = data.length;    
    var center = [numeric.sum(getCol(data, 0))/N, numeric.sum(getCol(data, 1))/N];
    return center
}

function getMainAngle(polygon){ 
    
    var data = getDataFromPath(polygon),  N = data.length;    
    // Algorithm is taken from http://nghiaho.com/?page_id=1030. Above algorithm is for PCA, now this is used: https://www.mathworks.com/matlabcentral/newsreader/view_thread/82440
    
    var center = [numeric.sum(getCol(data, 0))/N, numeric.sum(getCol(data, 1))/N];
    
    var data_m = numeric.rep([N,2], 0); // create a matrix with value 0
    for(var i=0; i < data.length; i++){
        data_m[i][0] = data[i][0] - center[0];
        data_m[i][1] = data[i][1] - center[1];
    }
    
    var covar = numeric.div(numeric.dot(numeric.transpose(data_m), data_m), N);
    var eig = numeric.eig(covar);
    
    var vec;
    if(eig.lambda.x[0] >= eig.lambda.x[1])
        vec = eig.E.x[0];
    else
        vec = eig.E.x[1];
    var angle = numeric.atan([vec[1]/vec[0]])*(180 / Math.PI);
    return new Line(angle + 90);    
}

///////////////////////////////   exact area cut   /////////////////////////////////
// A cutting line is given by its direction angle and an offset along its normal n:
// side A = {x : n.x <= offset}, side B = {x : n.x >= offset}.
// For a given angle the offset is found by bisection, so that side A has exactly the requested area ratio.

function lineNormal(angle){
    var rad = angle * Math.PI / 180;
    return [-Math.sin(rad), Math.cos(rad)];
}

function getRings(path){ // vertex rings of a Path or CompoundPath
    var items = path.className == 'CompoundPath' ? path.children : [path];
    var rings = [];
    for(var c=0; c < items.length; c++){
        var ring = [];
        for(var k=0; k < items[c].segments.length; k++)
            ring.push([items[c].segments[k].point.x, items[c].segments[k].point.y]);
        rings.push(ring);
    }
    return rings;
}

function signedArea(pts){
    var a = 0;
    for(var k=0; k < pts.length; k++){
        var p = pts[k], q = pts[(k+1) % pts.length];
        a += p[0]*q[1] - q[0]*p[1];
    }
    return a / 2;
}

function clippedArea(rings, n, offset){ // area of the rings on side A (Sutherland-Hodgman against a half-plane)
    var total = 0;
    for(var r=0; r < rings.length; r++){
        var ring = rings[r], out = [];
        for(var k=0; k < ring.length; k++){
            var a = ring[k], b = ring[(k+1) % ring.length];
            var da = n[0]*a[0] + n[1]*a[1] - offset, db = n[0]*b[0] + n[1]*b[1] - offset;
            if(da <= 0)
                out.push(a);
            if((da < 0 && db > 0) || (da > 0 && db < 0)){
                var t = da / (da - db);
                out.push([a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])]);
            }
        }
        total += signedArea(out);
    }
    return Math.abs(total);
}

function findCutOffset(path, angle, ratio){
    var rings = getRings(path), n = lineNormal(angle);
    var lo = Infinity, hi = -Infinity;
    for(var r=0; r < rings.length; r++)
        for(var k=0; k < rings[r].length; k++){
            var d = n[0]*rings[r][k][0] + n[1]*rings[r][k][1];
            lo = Math.min(lo, d); hi = Math.max(hi, d);
        }
    var target = ratio * clippedArea(rings, n, hi);
    for(var it=0; it < 60 && hi - lo > 1e-7; it++){
        var mid = (lo + hi) / 2;
        if(clippedArea(rings, n, mid) < target) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

function halfPlane(angle, offset, side){ // a large rectangle covering side A (side = -1) or side B (side = +1)
    var nn = lineNormal(angle), n = new Point(nn[0], nn[1]), d = new Point(nn[1], -nn[0]);
    var c = n * offset, L = 10000;
    var p0 = c - d * L, p1 = c + d * L;
    return new Path({segments: [p0, p1, p1 + n * (side * L), p0 + n * (side * L)], closed: true, insert: false});
}

function cutPath(path, line){ // returns [side A, side B]
    var sideA = path.intersect(halfPlane(line.angle, line.offset, -1));
    var sideB = path.intersect(halfPlane(line.angle, line.offset, 1));
    return [sideA, sideB];
}


//////////////////////////////////      fitness     /////////////////////////////////////

function aspectRatio(polygon){

    var data = getDataFromPath(polygon), N = data.length;
    var center = [numeric.sum(getCol(data, 0))/N, numeric.sum(getCol(data, 1))/N];
    var data_m = numeric.rep([N,2], 0); // create a matrix with value 0
    
    for(var i=0; i<data.length; i++){ 
        data_m[i][0] = data[i][0] - center[0];
        data_m[i][1] = data[i][1] - center[1];
    }
    
    var covar = numeric.div(numeric.dot(numeric.transpose(data_m), data_m), N);
    var eig = numeric.eig(covar);
    
    return Math.sqrt(eig.lambda.x[0] / eig.lambda.x[1]); // return ratio of eigen vectors
}

function rectanglityandConcavity(polygon){
    var diff = 0, counter = 0, seg = polygon.segments, N = polygon.segments.length;
    var vector1, vector2;
    
    for(var i=0; i < seg.length; i++)
    {        
        if(i == 0){            
            vector1 = seg[seg.length -1].point - seg[0].point;
            vector2 = seg[1].point - seg[0].point;    
        }
        else if(i >= 1 && i < seg.length -1){
            vector1 = seg[i-1].point - seg[i].point;
            vector2 = seg[i+1].point - seg[i].point;
        }
        else if(i == seg.length -1){            
            vector1 = seg[seg.length -2].point - seg[seg.length -1].point;
            vector2 = seg[0].point - seg[seg.length -1].point;
        }

        var angle = Math.acos(dotProduct(vector1, vector2) / (vector1.length * vector2.length)) * (180/Math.PI);
        
        vector2 = -vector2;
        if(crossProduct(vector1, vector2) < 0) 
        {
            angle = 360-angle;
            counter++;
            drawables.push(new Path.Circle({ center: seg[i].point, radius: 5, fillColor: 'yellow'}));
        }
        diff += Math.abs(90-angle);
    } 
    return {concave: counter, diff: diff/((N-2)*180)};
}

//////////////////////////////    Genetic Algorithm  Main  //////////////////////////////


function GenePool(p, d){
    if (typeof GenePool.id == 'undefined')
        GenePool.id = 0;

    this.id = GenePool.id++;
    this.path = p;
    this.dist = d;
    this.lines = [];
    this.t = 0;
    this.gen = null;
    this.bestSides = 0;

    var self = this;

    this.removeBest = function(){
        if(self.bestSides){
            self.bestSides[0].remove();
            self.bestSides[1].remove();
        }
        self.bestSides = 0;
    }

    this.reset = function(path, dist){
        self.removeBest();
        self.path = path;
        self.dist = dist;
        self.lines = [];
        self.t = 0;
        self.gen = null;
    }

    function evaluate(line){ // solve the offset exactly for the area ratio, then score the shape
        line.offset = findCutOffset(self.path, line.angle, self.dist[0]);
        var sides = cutPath(self.path, line);
        line.fitnessValue = fitnessFunction(sides, self.dist[0], self.path, isLastPool());
        sides[0].remove();
        sides[1].remove();
    }

    function isLastPool(){ // the last pool's remainder is not cut again, so its shape counts too
        return pools.indexOf(self) == pools.length - 1;
    }

    function sortLines(){
        self.lines.sort(function(a, b) {return b.fitnessValue - a.fitnessValue;});
    }

    function initPopulation(){
        var base = getMainAngle(self.path).angle;
        for(var j=0; j < config.population; j++){
            var angle = base + 90 * (j % 4) + (j < 4 ? 0 : getRandomFloat(-45, 45));
            var line = new Line(((angle % 360) + 360) % 360);
            evaluate(line);
            self.lines.push(line);
        }
        sortLines();
    }

    function updateBest(){
        var best = self.lines[0];
        self.removeBest();
        self.bestSides = cutPath(self.path, best);
        fitnessFunction(self.bestSides, self.dist[0], self.path, isLastPool()); // refresh the statistics for the best item
        document.getElementById("info_fitness").textContent = best.fitnessValue.toFixed(3);
    }

    // One generation = tournament -> mutation -> evaluation -> replacement.
    // runPhase() performs the next phase and returns the generation's state, so the
    // simulation can stop after each phase while the fast mode just runs them back to back.
    function runPhase(){
        var g = self.gen;

        if(!g || g.phase == 'replacement'){     // tournament selection
            g = self.gen = {t: self.t + 1};
            g.a = self.lines[getRandomInt(0, self.lines.length)];
            g.b = self.lines[getRandomInt(0, self.lines.length)];
            g.parent = g.a.fitnessValue >= g.b.fitnessValue ? g.a : g.b;
            g.phase = 'tournament';
            updateProgress(self, g.t);
        }
        else if(g.phase == 'tournament'){       // mutation
            g.child = new Line(g.parent.angle);
            g.mutation = mutation(g.child);
            g.child.offset = findCutOffset(self.path, g.child.angle, self.dist[0]);
            g.phase = 'mutation';
        }
        else if(g.phase == 'mutation'){         // evaluation
            evaluate(g.child);
            g.phase = 'evaluation';
        }
        else if(g.phase == 'evaluation'){       // the child replaces the worst individual if it is better
            g.worst = self.lines[self.lines.length - 1];
            g.accepted = g.child.fitnessValue > g.worst.fitnessValue;
            if(g.accepted){
                self.lines[self.lines.length - 1] = g.child;
                sortLines();
            }
            self.t++;
            g.phase = 'replacement';
        }
        return g;
    }

    function atGenerationEnd(){
        return !self.gen || self.gen.phase == 'replacement';
    }

    function finished(){
        return atGenerationEnd() && (self.t >= config.generations || self.lines[0].fitnessValue >= 0.9999);
    }

    function finish(){
        self.gen = null;
        updateBest();
        window.show();
        drawSimulation(null);
        if(self.onDone)
            self.onDone();
    }

    this.halt = function(){ // Stop: keep the best cut found so far and end the run
        window.clearTimeout(self.timer);
        self.gen = null;
        if(self.lines.length)
            updateBest();
        stopRequested = false;
        window.show();
        drawSimulation(null);
        setRunning(false, {cut: pools.indexOf(self) + 1, t: self.t});
    }

    function tick(){
        if(stopRequested){
            self.halt();
            return;
        }
        if(sim.enabled){                        // one phase per frame
            var g = runPhase();
            if(g.phase == 'replacement')
                updateBest();
            window.show();
            drawSimulation(self, g);
            simSchedule(finished() ? finish : tick);
            return;
        }

        while(!atGenerationEnd())               // complete a generation left over by the simulation
            runPhase();
        for(var j=0; j < config.perFrame && !finished(); j++)
            do { runPhase(); } while(!atGenerationEnd());

        updateBest();
        window.show();

        if(finished())
            finish();
        else
            self.timer = window.setTimeout(tick, config.frameDelay);
    }

    this.divide = function(onDone){
        self.onDone = onDone;
        activePool = self;
        if(self.lines.length == 0){
            initPopulation();
            updateBest();
            if(sim.enabled){
                window.show();
                drawSimulation(self, {phase: 'init', t: 0});
                simSchedule(tick);
                return;
            }
        }
        tick();
    }
};

var areaWeight = 1; // the shape weights live in config (GA Settings tab)

function objectiveOn(cls){ // is the objective's checkbox (Partition tab) ticked?
    var box = document.querySelector('.' + cls);
    return !!(box && box.checked);
}

function shapePenalty(polygon, stats){ // weighted sum of the enabled shape objectives for one part
    var total = 0;

    if(objectiveOn('good-aspect-ratio')){
        var r = config.wRatio * (aspectRatio(polygon) - 1);
        stats.ratio += r;
        total += r;
    }

    var res = rectanglityandConcavity(polygon);

    if(objectiveOn('well-shaped-rectangles')){
        stats.rect += config.wRect * res.diff;
        total += config.wRect * res.diff;
    }

    if(objectiveOn('convexity'))
        total += config.wConvex * res.concave; // number of concave points

    if(objectiveOn('well-filled-circles'))
        total += config.wCircle * miniDisc(polygon).areaPenalty;

    return total;
}

// bothSides: score the shape of both parts (used by the last pool, whose remainder is a final part as well)
function fitnessFunction(sides, dist, path, bothSides){

    if(sides[0].className == "CompoundPath" || sides[1].className == "CompoundPath") // cut produced several pieces
        return 0;

    var areaA = Math.abs(sides[0].area), areaB = Math.abs(sides[1].area);
    if(Math.abs(areaA + areaB - Math.abs(path.area)) > 0.005 * Math.abs(path.area)) // boolean operation failed
        return 0;

    var areaPenalty = areaWeight * Math.abs(areaA / (areaA + areaB) - dist);

    var stats = {ratio: 0, rect: 0};
    var total = shapePenalty(sides[0], stats), count = 1;
    if(bothSides){
        total += shapePenalty(sides[1], stats);
        count = 2;
    }
    total /= count;

    // consistency = 1 - penalty (1 is perfect); a dash when the objective is off
    document.getElementById("info_area").textContent = (1 - areaPenalty).toFixed(3);
    document.getElementById("info_ratio").textContent = objectiveOn('good-aspect-ratio') ? (1 - stats.ratio / count).toFixed(3) : '\u2013';
    document.getElementById("info_rect").textContent = objectiveOn('well-shaped-rectangles') ? (1 - stats.rect / count).toFixed(3) : '\u2013';

    return 1 - (areaPenalty + total);
}

function mutation(line){
    var rand = 100 * Math.random(), kind;
    if(rand < config.fineProb){                          // fine rotation of the separating line
        line.angle += getRandomFloat(-config.fineRange, config.fineRange);
        kind = 'fine';
    }
    else if(rand < config.fineProb + config.coarseProb){ // coarse rotation
        line.angle += getRandomFloat(-config.coarseRange, config.coarseRange);
        kind = 'coarse';
    }
    else{                 // jump by 90, 180 or 270 degrees (180 swaps the two sides)
        line.angle += 90 * getRandomInt(1, 4);
        kind = 'jump';
    }
    line.angle = ((line.angle % 360) + 360) % 360;
    return kind;
}


////////////////////////////   GA simulation  ////////////////////////////////////////

var sim = {enabled: false, playing: true, delay: 700, timer: null, next: null, lastPool: null, lastGen: null};

function simSchedule(fn){ // run fn after the frame delay, or when Step / Play is pressed
    sim.next = fn;
    if(sim.playing)
        sim.timer = window.setTimeout(simAdvance, sim.delay);
}

function simAdvance(){
    window.clearTimeout(sim.timer);
    sim.timer = null;
    var fn = sim.next;
    sim.next = null;
    if(fn)
        fn();
}

window.simToggle = function(){
    sim.enabled = document.getElementById("simulate").checked;
    document.getElementById("sim_panel").style.display = sim.enabled ? 'block' : 'none';
    document.getElementById("sim_hint").style.display = sim.enabled ? 'none' : 'block';
    if(!sim.enabled && sim.next) // continue the running pool in fast mode
        simAdvance();
}

window.simPlayPause = function(){
    sim.playing = !sim.playing;
    document.getElementById("sim_play").innerHTML = sim.playing ? 'Pause' : 'Play';
    if(sim.playing && sim.next)
        simAdvance();
    else if(sim.playing && sim.enabled && !running)
        window.iterate();
    else
        window.clearTimeout(sim.timer);
}

window.simStep = function(){
    if(sim.playing)
        window.simPlayPause();
    if(sim.next)
        simAdvance();
    else if(!running)
        window.iterate();
}

window.simSpeed = function(value){ // slider 0..100 -> 2000..50 ms per frame
    sim.delay = Math.round(2000 - 19.5 * value);
}

function drawCutLine(path, line, style){ // the cut line clipped to the polygon
    var nn = lineNormal(line.angle), n = new Point(nn[0], nn[1]), d = new Point(nn[1], -nn[0]);
    var c = path.bounds.center, L = path.bounds.width + path.bounds.height;
    var p = c - n * (n.dot(c) - line.offset);
    var from = p - d * L, to = p + d * L;
    var xs = path.getIntersections(new Path.Line({from: from, to: to, insert: false}));
    if(xs.length >= 2){
        xs.sort(function(a, b) {return d.dot(a.point) - d.dot(b.point);});
        from = xs[0].point;
        to = xs[xs.length - 1].point;
    }
    var l = new Path.Line({from: from, to: to});
    l.style = style;
    drawables.push(l);
    return l;
}

var SIM_COLORS = {contender: '#f0ad4e', parent: '#e8590c', child: '#1c7ed6', accepted: '#2f9e44', rejected: '#e03131'};
var SIM_PHASES = ['tournament', 'mutation', 'evaluation', 'replacement'];
var SIM_CHIPS = {tournament: '1 Tournament', mutation: '2 Mutation', evaluation: '3 Evaluation', replacement: '4 Replacement'};
var SIM_TITLES = {init: 'Initial population', tournament: '1. Tournament selection', mutation: '2. Mutation', evaluation: '3. Evaluation', replacement: '4. Replacement'};
function mutationText(kind){
    if(kind == 'fine') return 'Fine rotation (±' + config.fineRange + '°)';
    if(kind == 'coarse') return 'Coarse rotation (±' + config.coarseRange + '°)';
    return 'Jump by 90° / 180° / 270°';
}

function fmtAngle(a){ return a.toFixed(1) + '°'; }
function fmtFit(f){ return f.toFixed(4); }

function simExplanation(pool, g){
    var lines = pool.lines;
    if(g.phase == 'init')
        return pool.lines.length + ' cut angles are created around the principal axis of the polygon. For every angle the cut offset is solved exactly, so the first part always gets ' + (100 * pool.dist[0]).toFixed(1) + '% of the area. Fitness only scores the shape of the parts.';
    if(g.phase == 'tournament')
        return 'Two random individuals compete: ' + fmtAngle(g.a.angle) + ' (' + fmtFit(g.a.fitnessValue) + ') vs ' + fmtAngle(g.b.angle) + ' (' + fmtFit(g.b.fitnessValue) + '). The fitter one becomes the parent.';
    if(g.phase == 'mutation')
        return mutationText(g.mutation) + ': the parent angle ' + fmtAngle(g.parent.angle) + ' becomes ' + fmtAngle(g.child.angle) + '. The cut is moved so that the area ratio stays exact.';
    if(g.phase == 'evaluation')
        return 'The child cut is scored: fitness = 1 − shape penalties = ' + fmtFit(g.child.fitnessValue) + '. The worst individual has ' + fmtFit(lines[lines.length - 1].fitnessValue) + '.';
    if(g.accepted)
        return 'The child (' + fmtFit(g.child.fitnessValue) + ') is better than the worst individual (' + fmtFit(g.worst.fitnessValue) + ' at ' + fmtAngle(g.worst.angle) + '), so it replaces it.';
    return 'The child (' + fmtFit(g.child.fitnessValue) + ') is not better than the worst individual (' + fmtFit(g.worst.fitnessValue) + '), so it is discarded.';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    var words = text.split(' '), line = '';
    for(var w=0; w < words.length; w++){
        var test = line ? line + ' ' + words[w] : words[w];
        if(ctx.measureText(test).width > maxWidth && line){
            ctx.fillText(line, x, y);
            line = words[w];
            y += lineHeight;
        }
        else
            line = test;
    }
    ctx.fillText(line, x, y);
}

function drawGeneRow(ctx, y, label, line, background, status){
    var W = SIM_W;
    if(background){
        ctx.fillStyle = background;
        ctx.fillRect(0, y - 10, W, 20);
    }
    var T = simTheme();
    ctx.fillStyle = T.text;
    ctx.font = '13px sans-serif';
    ctx.fillText(label, 6, y + 4);

    // compass needle showing the gene (cut direction)
    var cx = 62, r = 8, rad = line.angle * Math.PI / 180;
    ctx.strokeStyle = T.ring;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, y, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = T.text;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - r * Math.cos(rad), y - r * Math.sin(rad)); ctx.lineTo(cx + r * Math.cos(rad), y + r * Math.sin(rad)); ctx.stroke();

    ctx.fillStyle = T.text;
    ctx.fillText(fmtAngle(line.angle), 82, y + 4);

    // fitness bar
    var bx = 140, bw = W - bx - 128;
    ctx.fillStyle = T.track;
    ctx.fillRect(bx, y - 7, bw, 14);
    if(status != 'unscored'){
        ctx.fillStyle = T.bar;
        ctx.fillRect(bx, y - 7, bw * Math.max(0, Math.min(1, line.fitnessValue)), 14);
        ctx.fillStyle = T.text;
        ctx.fillText(fmtFit(line.fitnessValue), bx + bw + 8, y + 4);
    }
    if(status && status != 'unscored'){
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(status, bx + bw + 62, y + 4);
    }
}

var SIM_W = 460, SIM_H = 430; // layout size of the panel; it is scaled to the space available

function simTheme(){
    return isDark()
        ? {text: '#e6e8eb', muted: '#9aa1ad', chip: '#2d323c', chipOn: '#f76707', track: '#2d323c', bar: '#9aa1ad', ring: '#6b7280',
           tour: 'rgba(250,176,5,.18)', parent: 'rgba(253,126,20,.24)', fresh: 'rgba(64,192,87,.22)', child: 'rgba(116,143,252,.22)', bad: 'rgba(255,107,107,.2)'}
        : {text: '#222222', muted: '#868e96', chip: '#f1f3f5', chipOn: '#f0ad4e', track: '#e9ecef', bar: '#495057', ring: '#999999',
           tour: '#fff3bf', parent: '#ffd8a8', fresh: '#d3f9d8', child: '#d0ebff', bad: '#ffe3e3'};
}

function prepareSimCanvas(){
    var canvas = document.getElementById("simCanvas"), ctx = canvas.getContext('2d');
    var avail = canvas.parentNode.clientWidth || SIM_W;
    var k = Math.min(avail / SIM_W, 1.5);
    var top = canvas.getBoundingClientRect().top;
    if(!window.matchMedia(STACKED_QUERY).matches && top > 0) // two columns: also fit the height of the window
        k = Math.max(0.7, Math.min(k, (window.innerHeight - top - 8) / SIM_H));
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = Math.round(SIM_W * k) + 'px';
    canvas.style.height = Math.round(SIM_H * k) + 'px';
    canvas.width = Math.round(SIM_W * k * dpr);
    canvas.height = Math.round(SIM_H * k * dpr);
    ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    return ctx;
}

function drawSimulation(pool, g){
    sim.lastPool = pool;
    sim.lastGen = g;
    var ctx = prepareSimCanvas();
    if(!pool || !sim.enabled)
        return;

    // ----- main canvas: every individual's cut, with the ones in play highlighted
    var path = pool.path;
    var T = simTheme();
    for(var k=0; k < pool.lines.length; k++)
        drawCutLine(path, pool.lines[k], {strokeColor: themeColor('--outline'), strokeWidth: 1, opacity: 0.3});

    if(g.phase == 'tournament'){
        drawCutLine(path, g.a, {strokeColor: SIM_COLORS.contender, strokeWidth: 3});
        drawCutLine(path, g.b, {strokeColor: SIM_COLORS.contender, strokeWidth: 3});
        drawCutLine(path, g.parent, {strokeColor: SIM_COLORS.parent, strokeWidth: 4});
    }
    else if(g.phase == 'mutation'){
        drawCutLine(path, g.parent, {strokeColor: SIM_COLORS.parent, strokeWidth: 2, dashArray: [6, 4]});
        drawCutLine(path, g.child, {strokeColor: SIM_COLORS.child, strokeWidth: 4});
    }
    else if(g.phase == 'evaluation'){
        var sides = cutPath(path, g.child);
        sides[0].style = {fillColor: SIM_COLORS.child, opacity: 0.35};
        sides[1].remove();
        drawables.push(sides[0]);
        drawCutLine(path, g.child, {strokeColor: SIM_COLORS.child, strokeWidth: 4});
    }
    else if(g.phase == 'replacement'){
        if(g.accepted)
            drawCutLine(path, g.worst, {strokeColor: SIM_COLORS.rejected, strokeWidth: 2, dashArray: [6, 4]});
        drawCutLine(path, g.child, {strokeColor: g.accepted ? SIM_COLORS.accepted : SIM_COLORS.rejected, strokeWidth: 4});
    }

    // ----- panel: header, phase chips, explanation
    var W = SIM_W;
    ctx.fillStyle = T.text;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Pool ' + (pools.indexOf(pool) + 1) + ' / ' + pools.length + '   ·   Generation ' + g.t + ' / ' + config.generations, 6, 20);

    var chipW = (W - 12) / 4;
    for(var c=0; c < SIM_PHASES.length; c++){
        var active = SIM_PHASES[c] == g.phase;
        ctx.fillStyle = active ? T.chipOn : T.chip;
        ctx.fillRect(6 + c * chipW, 32, chipW - 6, 24);
        ctx.fillStyle = active ? '#fff' : T.muted;
        ctx.font = (active ? 'bold ' : '') + '12px sans-serif';
        ctx.fillText(SIM_CHIPS[SIM_PHASES[c]], 12 + c * chipW, 48);
    }

    ctx.fillStyle = T.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(SIM_TITLES[g.phase], 6, 76);
    ctx.font = '13px sans-serif';
    wrapText(ctx, simExplanation(pool, g), 6, 94, W - 12, 17);

    // ----- population, sorted by fitness
    var y0 = 172, rowH = 21;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = T.muted;
    ctx.fillText('Population (gene = cut angle), sorted by fitness', 6, y0 - 20);
    for(var k=0; k < pool.lines.length; k++){
        var line = pool.lines[k], bg = null, status = '';
        if(g.phase == 'tournament' && (line == g.a || line == g.b))
            bg = T.tour;
        if((g.phase == 'tournament' || g.phase == 'mutation') && line == g.parent){
            bg = T.parent;
            status = 'parent';
        }
        if(g.phase == 'evaluation' && k == pool.lines.length - 1)
            status = 'worst';
        if(g.phase == 'replacement' && g.accepted && line == g.child){
            bg = T.fresh;
            status = 'new';
        }
        drawGeneRow(ctx, y0 + k * rowH, '#' + (k + 1), line, bg, status);
    }

    // ----- the child being created
    var yc = y0 + pool.lines.length * rowH + 12;
    if(g.child){
        var scored = g.phase == 'evaluation' || g.phase == 'replacement';
        var bgc = g.phase == 'replacement' ? (g.accepted ? T.fresh : T.bad) : T.child;
        drawGeneRow(ctx, yc, 'child', g.child, bgc, scored ? (g.phase == 'replacement' ? (g.accepted ? 'kept' : 'discarded') : '') : 'unscored');
    }
    if(g.phase == 'replacement' && g.accepted){
        ctx.fillStyle = SIM_COLORS.rejected;
        ctx.font = '12px sans-serif';
        ctx.fillText('eliminated: ' + fmtAngle(g.worst.angle) + ' (' + fmtFit(g.worst.fitnessValue) + ')', 6, yc + 24);
    }
}


////////////////////////////   Html Part  ///////////////////////////////////////////////

function generatePools(path){
    for(var j=0; j < pools.length; j++)
        pools[j].removeBest();
    pools.length = 0;
    for(var j=0; j < dist.length - 1; j++)
        pools.push(new GenePool(path, dist))

}

// The parts are cut largest first (dist is sorted), but every part keeps the colour of its row
// in the distribution editor: distOrder[k] is the row of the k-th largest part.
var weights = [], distOrder = [];

function partColor(k){
    return colors[(distOrder[k] === undefined ? k : distOrder[k]) % colors.length];
}

function parseWeights(text){
    return text.split(',').map(function(v){ return parseFloat(v); }).filter(function(v){ return isFinite(v) && v > 0; });
}

function applyWeights(rerenderRows){
    if(running)
        window.stopRun();
    var total = weights.reduce(function(a, b){ return a + b; }, 0);
    distOrder = weights.map(function(w, i){ return i; });
    distOrder.sort(function(a, b){ return weights[b] - weights[a] || a - b; });
    dist = distOrder.map(function(i){ return weights[i] / total; });
    generatePools(myPath);
    if(typeof window.show == 'function')
        window.show();
    var text = weights.map(function(w){ return Math.round(w * 100) / 100; }).join(',');
    document.getElementById("dist").value = text;
    markActive('#dist_presets .chip', 'data-dist', text);
    renderDistEditor(rerenderRows);
    resetProgress();
}

window.readDistAndNormalize = function(){
    var parsed = parseWeights(document.getElementById("dist").value);
    if(parsed.length < 1)
        parsed = weights.length ? weights.slice() : [50, 30, 10, 10];
    weights = parsed.slice(0, MAX_PARTS);
    applyWeights(true);
}

function renderDistEditor(rerenderRows){
    var total = weights.reduce(function(a, b){ return a + b; }, 0);
    var stack = document.getElementById('dist_stack'), rows = document.getElementById('dist_rows');
    if(!stack || !rows)
        return;
    stack.innerHTML = weights.map(function(w, i){
        return '<i style="flex-grow:' + w + ';background:' + colors[i % colors.length] + '"></i>'; }).join('');
    if(rerenderRows || rows.children.length != weights.length){
        var max = Math.max(100, Math.ceil(Math.max.apply(null, weights)));
        rows.innerHTML = weights.map(function(w, i){
            return '<div class="part-row">'
                 + '<span class="swatch" style="background:' + colors[i % colors.length] + '"></span>'
                 + '<input type="range" style="accent-color:' + colors[i % colors.length] + '" min="1" max="' + max + '" step="1" value="' + Math.round(w) + '" aria-label="Weight of part ' + (i + 1) + '" oninput="window.setWeight(' + i + ', this.value)">'
                 + '<span class="part-pct" data-part="' + i + '"></span>'
                 + '<button type="button" class="part-remove" onclick="window.removePart(' + i + ')" aria-label="Remove part ' + (i + 1) + '"' + (weights.length <= MIN_PARTS ? ' disabled' : '') + '>&times;</button>'
                 + '</div>'; }).join('');
    }
    var pcts = rows.querySelectorAll('.part-pct');
    for(var i=0; i < pcts.length; i++)
        pcts[i].textContent = (100 * weights[i] / total).toFixed(weights.length > 6 ? 0 : 1) + ' %';
    document.getElementById('dist_count').textContent = weights.length + ' parts';
    document.getElementById('dist_add').disabled = weights.length >= MAX_PARTS;
}

window.setWeight = function(i, v){
    weights[i] = Math.max(1, parseFloat(v));
    applyWeights(false); // keep the slider that is being dragged
}
window.addPart = function(){
    if(weights.length >= MAX_PARTS)
        return;
    weights.push(Math.max(1, Math.round(Math.min.apply(null, weights))));
    applyWeights(true);
}
window.removePart = function(i){
    if(weights.length <= MIN_PARTS)
        return;
    weights.splice(i, 1);
    applyWeights(true);
}

function resetProgress(){
    var bar = document.getElementById('run_bar'), label = document.getElementById('run_label');
    if(bar) bar.style.width = '0%';
    ['info_fitness', 'info_area', 'info_ratio', 'info_rect'].forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.textContent = '\u2013';
    });
    if(label) label.textContent = 'Ready · ' + Math.max(0, dist.length - 1) + ' cuts × ' + config.generations + ' generations';
    renderLegend([]);
}
window.readDistAndNormalize();

 


var running = false, stopRequested = false, activePool = null;

function setRunning(on, stopped){
    running = on;
    var btn = document.getElementById('run'), stop = document.getElementById('stop');
    if(btn){
        btn.disabled = on;
        btn.querySelector('.lbl').textContent = on ? 'Running…' : 'Iterate';
    }
    if(stop)
        stop.disabled = !on;
    if(on)
        return;
    activePool = null;
    if(stopped)
        document.getElementById('run_label').textContent = 'Stopped at cut ' + stopped.cut + ' / ' + pools.length + ' · generation ' + stopped.t;
    else if(pools.length && pools[pools.length - 1].bestSides){
        document.getElementById('run_bar').style.width = '100%';
        document.getElementById('run_label').textContent = 'Done · ' + pools.length + ' cuts';
    }
}

window.stopRun = function(){ // ends the run right away; the best cuts found so far stay on the canvas
    if(!running)
        return;
    window.clearTimeout(sim.timer); // the simulation may be waiting for its next frame
    sim.timer = null;
    sim.next = null;
    if(activePool)
        activePool.halt();   // cancels the pool's pending frame
    else
        stopRequested = true; // checked by the next frame
}

window.resetShape = function(){ // back to the selected shape without edits, and no result
    createInitialPolygon(currentShape);
}

window.downloadPNG = function(){
    var src = view.element, out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    var ctx = out.getContext('2d');
    ctx.fillStyle = themeColor('--canvas', '#ffffff');
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0);
    var a = document.createElement('a');
    a.download = 'partition.png';
    a.href = out.toDataURL('image/png');
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function updateProgress(pool, t){
    var i = pools.indexOf(pool), n = pools.length, G = config.generations;
    var frac = (i + Math.min(t, G) / G) / n;
    document.getElementById('run_bar').style.width = (100 * frac).toFixed(1) + '%';
    document.getElementById('run_label').textContent = 'Cut ' + (i + 1) + ' / ' + n + ' · generation ' + t + ' / ' + G;
}

function runPool(num, chain){ // pool num cuts what the previous pool left over, then hands over to the next one
    if(num >= pools.length){
        setRunning(false);
        return;
    }
    if(num == 0)
        pools[0].reset(myPath, dist);
    else if(pools[num-1].bestSides)
        pools[num].reset(pools[num-1].bestSides[1], normalize(pools[num-1].dist.slice(1)));
    else{
        setRunning(false);
        return;
    }
    setRunning(true);
    pools[num].divide(function(){
        if(chain)
            runPool(num + 1, true);
        else
            setRunning(false);
    });
}

window.iterate = function(){
    if(running)
        return;
    stopRequested = false;
    for(var j=0; j < pools.length; j++)
        pools[j].removeBest();
    runPool(0, true);
}

window.show = function(){
    
    clear();

    var parts = [];
    painted = [];
    function paint(s, k){
        var color = partColor(k), pct = 100 * Math.abs(s.area / myPath.area);
        s.fillColor = color;
        s.strokeColor = themeColor('--outline');
        s.opacity = 1;
        s.bringToFront();
        // label at the point inside the part that is farthest from its edges, sized to fit there
        var spot = labelSpot(s);
        var fontSize = Math.max(9, Math.min(44, spot.radius / 1.8)); // "50.0%" is about 2.7 font sizes wide
        var label = new PointText({ point: spot.point + [0, fontSize / 3], justification: 'center', fontSize: fontSize + 'px', fontWeight: 'bold',
                                    fillColor: 'white', strokeColor: 'rgba(0,0,0,0.35)', strokeWidth: 0.6, content: pct.toFixed(1) + '%'});
        drawables.push(label);
        painted.push({k: k, item: s, label: label});
        parts.push({k: k, row: distOrder[k] === undefined ? k : distOrder[k], color: color, pct: pct});
    }

    if(pools.length){
        var k=0;
        for(; k < pools.length; k++)
            if(pools[k].bestSides)
                paint(pools[k].bestSides[0], k);

        if(pools[k-1].bestSides)
            paint(pools[k-1].bestSides[1], k);
    }
    renderLegend(parts);
    highlightPart(highlighted);
}

var painted = [], highlighted = -1;

window.highlightPart = highlightPart;
window.togglePart = function(k){ highlightPart(highlighted == k ? -1 : k); } // touch screens have no hover
function highlightPart(k){ // dim every part but k on the canvas (k = -1: none)
    highlighted = (k === undefined || k === null) ? -1 : k;
    var any = painted.some(function(p){ return p.k == highlighted; });
    for(var i=0; i < painted.length; i++){
        var on = !any || painted[i].k == highlighted;
        painted[i].item.opacity = on ? 1 : 0.22;
        painted[i].label.opacity = on ? 1 : 0.3;
    }
    var items = document.querySelectorAll('#result_legend .legend-item');
    for(var i=0; i < items.length; i++)
        items[i].classList.toggle('hl', any && items[i].getAttribute('data-part') == String(highlighted));
}

function labelSpot(part){ // approximate pole of inaccessibility: grid search, then a finer search around the best cell
    var b = part.bounds, best = {point: b.center, radius: 0};
    function probe(p){
        if(!part.contains(p))
            return;
        var r = p.getDistance(part.getNearestPoint(p));
        if(r > best.radius)
            best = {point: p, radius: r};
    }
    var n = 12, dx = b.width / n, dy = b.height / n;
    for(var i=0; i < n; i++)
        for(var j=0; j < n; j++)
            probe(new Point(b.x + (i + 0.5) * dx, b.y + (j + 0.5) * dy));
    var c = best.point;
    for(var i=-2; i <= 2; i++)
        for(var j=-2; j <= 2; j++)
            probe(c + [i * dx / 4, j * dy / 4]);
    return best;
}

function renderLegend(parts){
    var el = document.getElementById('result_legend');
    if(!el)
        return;
    if(!parts.length){
        el.innerHTML = '<span class="hint">Press Iterate to partition the polygon.</span>';
        return;
    }
    var total = weights.reduce(function(a, b){ return a + b; }, 0), html = '';
    parts = parts.slice().sort(function(a, b){ return a.row - b.row; }); // in the editor's order
    for(var i=0; i < parts.length; i++){
        var target = weights[parts[i].row] !== undefined ? ' target ' + (100 * weights[parts[i].row] / total).toFixed(1) + ' %' : '';
        html += '<div class="legend-item" tabindex="0" data-part="' + parts[i].k + '"'
              + ' onmouseenter="window.highlightPart(' + parts[i].k + ')" onmouseleave="window.highlightPart(-1)"'
              + ' onfocus="window.highlightPart(' + parts[i].k + ')" onblur="window.highlightPart(-1)"'
              + ' onclick="window.togglePart(' + parts[i].k + ')">'
              + '<i class="swatch" style="background:' + parts[i].color + '"></i><b>' + parts[i].pct.toFixed(1) + ' %</b><small>' + target + '</small></div>';
    }
    el.innerHTML = html;
}

window.loadDistribution = function(i){
    
    document.getElementById("dist").value = DIST_PRESETS[i - 1];

    window.readDistAndNormalize();
}
    
function onFrame(event){
}
