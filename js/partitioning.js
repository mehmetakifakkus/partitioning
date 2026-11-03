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
    
	var hitResult = project.hitTest(event.point, hitOptions);        

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
    }

    function evaluate(line){ // solve the offset exactly for the area ratio, then score the shape
        line.offset = findCutOffset(self.path, line.angle, self.dist[0]);
        var sides = cutPath(self.path, line);
        line.fitnessValue = fitnessFunction(sides, self.dist[0], self.path);
        sides[0].remove();
        sides[1].remove();
    }

    function sortLines(){
        self.lines.sort(function(a, b) {return b.fitnessValue - a.fitnessValue;});
    }

    function initPopulation(){
        var base = getMainAngle(self.path).angle;
        for(var j=0; j < POPULATION; j++){
            var line = new Line(base + 90 * (j % 4) + (j < 4 ? 0 : getRandomFloat(-45, 45)));
            evaluate(line);
            self.lines.push(line);
        }
        sortLines();
    }

    function updateBest(){
        var best = self.lines[0];
        self.removeBest();
        self.bestSides = cutPath(self.path, best);
        fitnessFunction(self.bestSides, self.dist[0], self.path); // refresh the statistics for the best item
        document.getElementById("info_fitness").innerHTML = "Fitness value:  " + best.fitnessValue.toFixed(4);
    }

    this.divide = function(onDone){
        if(self.lines.length == 0)
            initPopulation();

        for(var j=0; j < PER_TICK && self.t < GENERATIONS; j++, self.t++){
            document.getElementById("info_iter").innerHTML = "Iteration no:  " + (pools.indexOf(self) + 1) + " - " + (self.t + 1);

            // tournament selection
            var a = self.lines[getRandomInt(0, self.lines.length)], b = self.lines[getRandomInt(0, self.lines.length)];
            var child = new Line(a.fitnessValue >= b.fitnessValue ? a.angle : b.angle);
            mutation(child);
            evaluate(child);

            if(child.fitnessValue > self.lines[self.lines.length - 1].fitnessValue){ // replace the worst
                self.lines[self.lines.length - 1] = child;
                sortLines();
            }
        }

        updateBest();
        window.show();

        if(self.t < GENERATIONS && self.lines[0].fitnessValue < 0.9999)
            window.setTimeout(function(){ self.divide(onDone); }, 0);
        else if(onDone)
            onDone();
    }
};

function fitnessFunction(sides, dist, path){ // distribution

    var total = areaPenalty = aspectRatioPenalty = concavityPenalty = rectanglityPenalty = 0
    var areaWeight = 1, ratioWeight = 0.005, concavityWeight = 0.1, rectWeight = 0.25;

    if(typeof sides[0]  == 'undefined')
        debugger
    
    if(sides[0].className == "CompoundPath" || sides[1].className == "CompoundPath") // cut produced several pieces
        return 0;

    var areaA = Math.abs(sides[0].area), areaB = Math.abs(sides[1].area);
    if(Math.abs(areaA + areaB - Math.abs(path.area)) > 0.005 * Math.abs(path.area)) // boolean operation failed
        return 0;

    areaPenalty += Math.abs(areaA / (areaA + areaB) - dist);
    
    document.getElementById("info_area").innerHTML = "Area consistency: " + (1-areaPenalty).toFixed(6);
    
    areaPenalty = areaWeight * areaPenalty;
    //console.log("Area Penalty: "+areaPenalty.toFixed(6));
        
    if($('.good-aspect-ratio:checked').val()){
        aspectRatioPenalty = ratioWeight*(aspectRatio(sides[0]) - 1);
        document.getElementById("info_ratio").innerHTML = "Aspect ratio consistency: "+ (1-aspectRatioPenalty).toFixed(6);
        //console.log("Aspect ratio penalty: "+aspectRatioPenalty.toFixed(3));
        total += aspectRatioPenalty;
    }
    
    var res = rectanglityandConcavity(sides[0]);
    
    if($('.well-shaped-rectangles:checked').val()){
        rectanglityPenalty = rectWeight * (res.diff);
        //console.log("Rectanglity penalty: "+rectanglityPenalty.toFixed(3));
        document.getElementById("info_rect").innerHTML = "Rectanglity consistency: "+ (1-rectanglityPenalty).toFixed(6);
        total += rectanglityPenalty;
    }

    if($('.convexity:checked').val()){    
        concavityPenalty = concavityWeight*(res.concave); //number of concave points
        //console.log("Concavity penalty: "+concavityPenalty.toFixed(3));
        total +=concavityPenalty;
    }
    
    if($('.well-filled-circles:checked').val()){    
        var result = miniDisc(sides[0]);
        result.areaPenalty = 0.3 * result.areaPenalty;
        //console.log("Circle Area Penalty: "+result.areaPenalty);
        total+=result.areaPenalty;
    }
    return 1 - (areaPenalty + total);
}

function mutation(line){
    var rand = Math.random();
    if(rand < 0.6)       // fine rotation of the separating line
        line.angle += getRandomFloat(-5, 5);
    else if(rand < 0.9)  // coarse rotation
        line.angle += getRandomFloat(-45, 45);
    else                 // jump by 90, 180 or 270 degrees (180 swaps the two sides)
        line.angle += 90 * getRandomInt(1, 4);
    line.angle = ((line.angle % 360) + 360) % 360;
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
