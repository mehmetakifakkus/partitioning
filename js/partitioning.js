var colors = ['#888888', '#AB0902', '#104C90', 'magenta', 'red', 'blue', 'yellow', 'purple', 'green', 'black'];
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

points = [];
function onMouseDown(event){ 

    segment = path = stroke = null;
    
    var hitResult = myPath.hitTest(event.point, hitOptions); // only the polygon, not the vertex markers drawn on top of it

    if (hitResult) {
        console.log(hitResult.type)
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
        for(k=0; k < myPath.segments.length; k++)
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
        drawables.push(new PointText({ point: p + [5, -5], fontSize: '16px', fillColor: 'black', content: ' '+ this.id}));  
        drawables.push(new Path.Circle({ name: 'vertice-'+i, center: p, radius: 5, fillColor: 'black'}));
    }
};

function Line(angle, fitness){ // a cutting line: its direction is the GA gene, its offset is solved exactly

    this.angle = angle;
    this.offset = 0;
    this.fitnessValue = fitness || 0;
};


////////////////////////////////////     Visual Part      ///////////////////////////////

function clear(){
    for(i=0; i<drawables.length; i++) // it is for lines, circles, texts etc.
        drawables[i].remove();

    PolygonPoint.counter = 0;
}

Array.prototype.clear = function() {
  while (this.length) {
    this.pop();
  }
};

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

window.createInitialPolygon = function(t){ 
    if(myPath.name){
        points = [];
        myPath.remove();
    }

    myPath = new Path({name: 'polygon', strokeColor: 'black', strokeWidth: 2, closed:true}); //  fillColor: 'white',
    var polygon;
    if(t == 1)
        polygon =  [[100,100],[400,100],[400,400],[100,400]];
    else if(t==2)
        polygon = [[100,200], [250, 100], [400,200], [400,400],[100,400]];
    else if(t==4)
        polygon = [[401.5,104],[450.5,246],[367.5,375],[236.5,335],[97.5,194],[287.5,222],[257.5,57]];
    else if(t==3)
        polygon =  [[401.5,104],[450.5,246],[367.5,375],[236.5,335],[97.5,194],[190.5,90],[257.5,57]];

    for(var k=0; k < polygon.length; k++){
        myPath.add(new Point(polygon[k]));
        points.push(new PolygonPoint(myPath.segments[k].point));
    }
    refreshPoints();
    generatePools(myPath);
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
function drawCoordinateSystem(){
    
    for(var i = 0; i <= 11; i++){
        new PointText({point: convertToRealCoord(new Point(0, 2*i)) + [3, +3], fontSize: '12px', fillColor: 'black', content: ' '+i*50, opacity: 0.6});  
        new PointText({point: convertToRealCoord(new Point(2*i, 0)) + [-13, -2], fontSize: '12px', fillColor: 'black', content: ' '+i*50, opacity: 0.6});  
    }
    for(var  i = 0; i <= 21; i++){
        new Path.Line({from: convertToRealCoord(new Point(0, i)), to: convertToRealCoord(new Point(21, i)), strokeColor:'black', strokeWidth: 1, dashArray: [1,2], opacity: 0.2})
        new Path.Line({from: convertToRealCoord(new Point(0, i)), to: convertToRealCoord(new Point(0.2, i)), strokeColor:'black', strokeWidth: 4, opacity: 0.5})
    }
    for(var i = 0; i <= 21; i++){
       new Path.Line({from: convertToRealCoord(new Point(i, 0)), to: convertToRealCoord(new Point(i, 21)), strokeColor:'black', strokeWidth: 1, dashArray: [1,2], opacity: 0.2})  
       new Path.Line({from: convertToRealCoord(new Point(i, -0.2)), to: convertToRealCoord(new Point(i, 0)), strokeColor:'black', strokeWidth: 4, opacity: 0.5})
    }
}
drawCoordinateSystem();

///////////////////////////////   responsive canvas   ////////////////////////////////
// The drawing keeps its 500x500 coordinate system; only the view is scaled to the space available.

var WORLD_SIZE = 500, RIGHT_MIN = 440, PAGE_PAD = 16, COLUMN_GAP = 24, CANVAS_BORDER = 4;

function fitCanvas(){
    var W = window.innerWidth, H = window.innerHeight;
    var side = W - 2 * PAGE_PAD - COLUMN_GAP - RIGHT_MIN; // room for the canvas next to the tabs
    var size;
    if(side >= 360){ // two columns: fill the height left under the header
        var top = view.element.getBoundingClientRect().top + window.pageYOffset;
        var presets = document.querySelector('.polygon-presets').offsetHeight + 12;
        size = Math.min(side, H - top - presets);
    }
    else             // one column (phones, narrow windows): fill the width
        size = W - 2 * PAGE_PAD;
    size = Math.max(240, Math.floor(size - CANVAS_BORDER));

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

function getCenterAndRadius3(p1, p2, p3){
    var eq1 = p1.x*p1.x + p1.y*p1.y +'+'+p1.x+'*d+'+p1.y+'*e+f=0';
    var eq2 = p2.x*p2.x + p2.y*p2.y +'+'+p2.x+'*d+'+p2.y+'*e+f=0';
    var eq3 = p3.x*p3.x + p3.y*p3.y +'+'+p3.x+'*d+'+p3.y+'*e+f=0';
    
    var sol = nerdamer.solveEquations([eq1, eq2, eq3]);
    
    var x = sol[0][1]/-2;
    var y = sol[1][1]/-2;

    var res = x*x + y*y + sol[0][1] * x +sol[1][1] * y + sol[2][1];
    var r = Math.sqrt(Math.abs(res));
 
    return {center: new Point(x,y), r:r}
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
    
    for(i=0; i < arr.length; i++)
        total += arr[i];
    
    
    for(i=0; i < arr.length; i++)
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
    for(i=0; i<data.length; i++){ 
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
    
    for(i=0; i<seg.length; i++)
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
        //console.log(i+"  "+angle)
    } 
    return {concave: counter, diff: diff/((N-2)*180)};
}

//////////////////////////////    Genetic Algorithm  Main  //////////////////////////////

var POPULATION = 10, GENERATIONS = 200, PER_TICK = 10;

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
        for(var j=0; j < POPULATION; j++){
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
        document.getElementById("info_fitness").innerHTML = "Fitness value:  " + best.fitnessValue.toFixed(4);
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
            document.getElementById("info_iter").innerHTML = "Iteration no:  " + (pools.indexOf(self) + 1) + " - " + g.t;
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
        return atGenerationEnd() && (self.t >= GENERATIONS || self.lines[0].fitnessValue >= 0.9999);
    }

    function finish(){
        self.gen = null;
        updateBest();
        window.show();
        drawSimulation(null);
        if(self.onDone)
            self.onDone();
    }

    function tick(){
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
        for(var j=0; j < PER_TICK && !finished(); j++)
            do { runPhase(); } while(!atGenerationEnd());

        updateBest();
        window.show();

        if(finished())
            finish();
        else
            window.setTimeout(tick, 0);
    }

    this.divide = function(onDone){
        self.onDone = onDone;
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

var areaWeight = 1, ratioWeight = 0.005, concavityWeight = 0.1, rectWeight = 0.25, circleWeight = 0.3;

function shapePenalty(polygon, stats){ // weighted sum of the enabled shape objectives for one part
    var total = 0;

    if($('.good-aspect-ratio:checked').val()){
        stats.ratio += ratioWeight * (aspectRatio(polygon) - 1);
        total += ratioWeight * (aspectRatio(polygon) - 1);
    }

    var res = rectanglityandConcavity(polygon);

    if($('.well-shaped-rectangles:checked').val()){
        stats.rect += rectWeight * res.diff;
        total += rectWeight * res.diff;
    }

    if($('.convexity:checked').val())
        total += concavityWeight * res.concave; // number of concave points

    if($('.well-filled-circles:checked').val())
        total += circleWeight * miniDisc(polygon).areaPenalty;

    return total;
}

// bothSides: score the shape of both parts (used by the last pool, whose remainder is a final part as well)
function fitnessFunction(sides, dist, path, bothSides){

    if(typeof sides[0]  == 'undefined')
        debugger

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

    document.getElementById("info_area").innerHTML = "Area consistency: " + (1 - areaPenalty).toFixed(6);
    if($('.good-aspect-ratio:checked').val())
        document.getElementById("info_ratio").innerHTML = "Aspect ratio consistency: " + (1 - stats.ratio / count).toFixed(6);
    if($('.well-shaped-rectangles:checked').val())
        document.getElementById("info_rect").innerHTML = "Rectanglity consistency: " + (1 - stats.rect / count).toFixed(6);

    return 1 - (areaPenalty + total);
}

function mutation(line){
    var rand = Math.random(), kind;
    if(rand < 0.6){       // fine rotation of the separating line
        line.angle += getRandomFloat(-5, 5);
        kind = 'fine';
    }
    else if(rand < 0.9){  // coarse rotation
        line.angle += getRandomFloat(-45, 45);
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
var MUTATION_TEXT = {fine: 'Fine rotation (±5°)', coarse: 'Coarse rotation (±45°)', jump: 'Jump by 90° / 180° / 270°'};

function fmtAngle(a){ return a.toFixed(1) + '°'; }
function fmtFit(f){ return f.toFixed(4); }

function simExplanation(pool, g){
    var lines = pool.lines;
    if(g.phase == 'init')
        return 'Ten cut angles are created around the principal axis of the polygon. For every angle the cut offset is solved exactly, so the first part always gets ' + (100 * pool.dist[0]).toFixed(1) + '% of the area. Fitness only scores the shape of the parts.';
    if(g.phase == 'tournament')
        return 'Two random individuals compete: ' + fmtAngle(g.a.angle) + ' (' + fmtFit(g.a.fitnessValue) + ') vs ' + fmtAngle(g.b.angle) + ' (' + fmtFit(g.b.fitnessValue) + '). The fitter one becomes the parent.';
    if(g.phase == 'mutation')
        return MUTATION_TEXT[g.mutation] + ': the parent angle ' + fmtAngle(g.parent.angle) + ' becomes ' + fmtAngle(g.child.angle) + '. The cut is moved so that the area ratio stays exact.';
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
    ctx.fillStyle = '#333';
    ctx.font = '13px sans-serif';
    ctx.fillText(label, 6, y + 4);

    // compass needle showing the gene (cut direction)
    var cx = 62, r = 8, rad = line.angle * Math.PI / 180;
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, y, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - r * Math.cos(rad), y - r * Math.sin(rad)); ctx.lineTo(cx + r * Math.cos(rad), y + r * Math.sin(rad)); ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.fillText(fmtAngle(line.angle), 82, y + 4);

    // fitness bar
    var bx = 140, bw = W - bx - 128;
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(bx, y - 7, bw, 14);
    if(status != 'unscored'){
        ctx.fillStyle = '#495057';
        ctx.fillRect(bx, y - 7, bw * Math.max(0, Math.min(1, line.fitnessValue)), 14);
        ctx.fillStyle = '#333';
        ctx.fillText(fmtFit(line.fitnessValue), bx + bw + 8, y + 4);
    }
    if(status && status != 'unscored'){
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(status, bx + bw + 62, y + 4);
    }
}

var SIM_W = 460, SIM_H = 430; // layout size of the panel; it is scaled to the space available

function prepareSimCanvas(){
    var canvas = document.getElementById("simCanvas"), ctx = canvas.getContext('2d');
    var avail = canvas.parentNode.clientWidth || SIM_W;
    var k = Math.min(avail / SIM_W, 1.5);
    var top = canvas.getBoundingClientRect().top;
    if(window.innerWidth >= 900 && top > 0) // two columns: also fit the height of the window
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
    for(var k=0; k < pool.lines.length; k++)
        drawCutLine(path, pool.lines[k], {strokeColor: 'black', strokeWidth: 1, opacity: 0.3});

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
    ctx.fillStyle = '#222';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Pool ' + (pools.indexOf(pool) + 1) + ' / ' + pools.length + '   ·   Generation ' + g.t + ' / ' + GENERATIONS, 6, 20);

    var chipW = (W - 12) / 4;
    for(var c=0; c < SIM_PHASES.length; c++){
        var active = SIM_PHASES[c] == g.phase;
        ctx.fillStyle = active ? '#f0ad4e' : '#f1f3f5';
        ctx.fillRect(6 + c * chipW, 32, chipW - 6, 24);
        ctx.fillStyle = active ? '#fff' : '#868e96';
        ctx.font = (active ? 'bold ' : '') + '12px sans-serif';
        ctx.fillText(SIM_CHIPS[SIM_PHASES[c]], 12 + c * chipW, 48);
    }

    ctx.fillStyle = '#222';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(SIM_TITLES[g.phase], 6, 76);
    ctx.font = '13px sans-serif';
    wrapText(ctx, simExplanation(pool, g), 6, 94, W - 12, 17);

    // ----- population, sorted by fitness
    var y0 = 172, rowH = 21;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#868e96';
    ctx.fillText('Population (gene = cut angle), sorted by fitness', 6, y0 - 20);
    for(var k=0; k < pool.lines.length; k++){
        var line = pool.lines[k], bg = null, status = '';
        if(g.phase == 'tournament' && (line == g.a || line == g.b))
            bg = '#fff3bf';
        if((g.phase == 'tournament' || g.phase == 'mutation') && line == g.parent){
            bg = '#ffd8a8';
            status = 'parent';
        }
        if(g.phase == 'evaluation' && k == pool.lines.length - 1)
            status = 'worst';
        if(g.phase == 'replacement' && g.accepted && line == g.child){
            bg = '#d3f9d8';
            status = 'new';
        }
        drawGeneRow(ctx, y0 + k * rowH, '#' + (k + 1), line, bg, status);
    }

    // ----- the child being created
    var yc = y0 + pool.lines.length * rowH + 12;
    if(g.child){
        var scored = g.phase == 'evaluation' || g.phase == 'replacement';
        var bgc = g.phase == 'replacement' ? (g.accepted ? '#d3f9d8' : '#ffe3e3') : '#d0ebff';
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
    pools.clear()
    for(var j=0; j < dist.length - 1; j++)
        pools.push(new GenePool(path, dist))

}

window.readDistAndNormalize = function(){

    dist = document.getElementById("dist").value;
    dist = dist.split(",");

    for(i=0; i < dist.length; i++)
        dist[i] = parseFloat(dist[i]);

    dist = normalize(dist);
    generatePools(myPath);
    //pools[0].dist = dist;
}
window.readDistAndNormalize();

 
//    if(document.getElementById("run").innerHTML == "Stop!")
//    {
//        document.getElementById("run").innerHTML = "Iterate";
//        document.getElementById("run").className = "btn btn-warning";
//        g1.t=200
//    }
//    else{
//        g1.t=0;
//        document.getElementById("run").innerHTML = "Stop!";
//        document.getElementById("run").className = "btn btn-danger";  
//    }


var running = false;

function runPool(num, chain){ // pool num cuts what the previous pool left over, then hands over to the next one
    if(num >= pools.length){
        running = false;
        return;
    }
    if(num == 0)
        pools[0].reset(myPath, dist);
    else if(pools[num-1].bestSides)
        pools[num].reset(pools[num-1].bestSides[1], normalize(pools[num-1].dist.slice(1)));
    else{
        running = false;
        return;
    }
    running = true;
    pools[num].divide(function(){
        if(chain)
            runPool(num + 1, true);
        else
            running = false;
    });
}

window.iterate = function(){
    if(running)
        return;
    for(var j=0; j < pools.length; j++)
        pools[j].removeBest();
    runPool(0, true);
}

window.show = function(){
    
    clear();
    
    if(pools.length == 0)
        return;

    function paint(s, color){
        s.fillColor = color;
        s.bringToFront();
        drawables.push(new PointText({ point: new Point(getPolygonCenter(s)) - [(s.strokeBounds.width/6), 0], fontSize: (s.strokeBounds.width/8)+'px', fillColor: 'white', content: ''+ (100 * Math.abs(s.area/myPath.area)).toFixed(2)}));
    }

    var k=0;
    for(; k < pools.length; k++)
        if(pools[k].bestSides)
            paint(pools[k].bestSides[0], colors[k]);

    if(pools[k-1].bestSides)
        paint(pools[k-1].bestSides[1], colors[k]);
}

window.loadDistribution = function(i){
    
    if(i == 1)
        document.getElementById("dist").value= '33,33,33';
    else if(i == 2)
        document.getElementById("dist").value= '50,33,17';
    else if(i == 3)
        document.getElementById("dist").value= '40,40,20';
    else if(i == 4)
        document.getElementById("dist").value= '50,30,10,10';
    else if(i == 5)
        document.getElementById("dist").value= '90,5,5';
    
    window.readDistAndNormalize();
}
    
function onFrame(event){
}
