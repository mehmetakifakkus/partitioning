myPath = [];

colors = ['black', 'red', 'blue', 'yellow', 'magenta', 'green'];
drawables = [];

///////////////////////////////     event handling  ///////////////////////////////////

var segment, path, stroke;
var hitOptions = {segments: true, fill: true, stroke:true, tolerance: 15};

function onMouseMove(event) { 
	project.activeLayer.selected = false;
    if (event.item)
    {   
        if(event.item.name == 'polygon'){
            event.item.bringToFront()
            event.item.selected = true;
        }
        else if(event.item.name == 'intersect')
            event.item.remove(); 
    }
    else{
        var sides = createSides(lines[0]);
        displaySides(sides);
    }
}

points = [];
function onMouseDown(event) { 

    segment = path = stroke = null;
    
	var hitResult = project.hitTest(event.point, hitOptions);        

    if (hitResult){
        console.log(hitResult.type)
		path = hitResult.item;
        if (hitResult.type == 'segment')
           segment = hitResult.segment
        if (hitResult.type == 'stroke')
          {
            stroke = 1;
            for(i=0 ; i<points.length; i++)
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

function onMouseDrag(event) {  
        
    if (segment)
		segment.point += event.delta;
    else if(stroke){
        myPath.segments[points[0].id].point += event.delta;
        myPath.segments[points[1].id].point += event.delta;
    }
	else if (path) 
		path.position += event.delta;
    
    total = 1;
    refreshPoints();    
}

//////////////////////////////////////  Classes  ////////////////////////////////////////

function PolygonPoint(p){

    if (typeof PolygonPoint.counter == 'undefined')
        PolygonPoint.counter = 0;
    
    this.id = PolygonPoint.counter++; // newly created vertex will have different id
    this.point = p;
    this.type = 1;
    this.dist = 0; // this distance value used for distance to any point
    
    this.draw = function(){
        drawables.push(new PointText({ point: p + [5, -5], fontSize: '16px', fillColor: 'black', content: ' '+ this.id}));  
        drawables.push(new Path.Circle({ name: 'vertice-'+i, center: p, radius: 5, fillColor: 'black'}));
    }
};

function Line(angle, p){
    
    this.angle = angle;
    this.center = p;
    this.fitnessValue = 0;  
};


////////////////////////////////////     Visual Part      ///////////////////////////////

function clear(){
    for(i=0; i<drawables.length; i++) // it is for lines, circles, texts etc.
        drawables[i].remove();

    PolygonPoint.counter = 0;
}

function getDataFromPath(path){  // path is a paperjs object, get Nx2 data array from it
 
    var points = [];
    var seg = path.segments;    
    
    points = [];
    for(k=0; k < seg.length; k++)
        points.push([seg[k].point.x, seg[k].point.y]);

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

    myPath = new Path({name: 'polygon', fillColor: 'white', strokeColor: 'black', strokeWidth: 2, closed:true});
    var polygon;
    if(t == 1)
        polygon = [[100,100],[400,100],[400,400],[100,400]];
    else if(t==3)
        polygon = [[401.5,104],[450.5,246],[386.5,379],[236.5,335],[97.5,194],[287.5,222],[257.5,57]];
    else if(t==2)
        polygon =  [[432.5,100],[481.5,242],[417.5,375],[267.5,331],[128.5,190],[200.5,90],[288.5,53]];

    for(var k=0; k < polygon.length; k++){
        myPath.add(new Point(polygon[k]));
        points.push(new PolygonPoint(myPath.segments[k].point));
    }
    refreshPoints();
}

function drawCircle(circle){
        drawables.push(new Path.Circle({ name: 'circle', center: circle.center, radius: circle.r, strokeColor: 'black'}));
}

////////////////////////////////////////    Main   //////////////////////////////////////

var canvas = document.getElementById('myCanvas');
createInitialPolygon(1); // first create polygon, then modify by dragging
refreshPoints();

///////////////////////////////   vector processes   ///////////////////////////////

function dotProduct(v1, v2){
    return v1.x * v2.x + v1.y * v2.y;
}

function crossProduct(v1, v2){
    return v1.x * v2.y - v2.x * v1.y;
}


/////////////////////////////////    Circle Operation    ////////////////////////////////

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


/////////////////////////////     Smallest Disk Functions  /////////////////////////////

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
    //var circumPenalty = polygon.length / (2 * Math.PI * lastCircle.r)-1;
    //circumPenalty = circumPenalty < 0 ? 0 : circumPenalty;
    
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
    return new Line(angle + 90, new Point(center));    
}

function createSide(angle, p, dir){
    
    // this is the starting seperating line 
    var path = new Path.Line({name: 'line', closed:true, from: p - [1499, 0], to: p + [1499, 0]}); // add  strokeColor:'black', strokeWidth: 2
    
    if(dir){
        path.lineBy(1499, -1499);
        path.lineBy(0, -1499)
    }
    else{
        path.lineBy(499, 1099);
        path.lineBy(0, 1099)
    }
    
    path.rotate(-angle, p); // merkez etrafinda donus yap (-angle because coordinate system differs)
    drawables.push(path);
    return path;
}

function createSides(line){
    refreshPoints(); 
    
    var side = createSide(line.angle, line.center, 1)
    var int = side.intersect(myPath);
    int.name = 'intersect';
    
    var side2 = createSide(line.angle, line.center, 0)
    var int2 = side2.intersect(myPath);
    int2.name = 'intersect';

    line.fitnessValue = fittnessFunction([int, int2], myPath);
    drawables.push(int, int2)
    return [int, int2];
}

function displaySides(sides){
    sides[0].fillColor = 'black';
    sides[1].fillColor = 'red';
}


//////////////////////////////////      fitness     /////////////////////////////////////

function aspectRatio(polygon){

    var data = getDataFromPath(polygon), N = data.length;
    var center = [numeric.sum(getCol(data, 0))/N, numeric.sum(getCol(data, 1))/N];
    var data_m = numeric.rep([N,2], 0); // create a matrix with value 0
    
    for(i=0; i<data.length; i++){ 
        data_m[i][0] = data[i][0] - center[0];
        data_m[i][1] = data[i][1] - center[1];
    }
    
    var covar = numeric.div(numeric.dot(numeric.transpose(data_m), data_m), N);
    var eig = numeric.eig(covar);
    
    return Math.sqrt(eig.lambda.x[0] / eig.lambda.x[1]); // return ratio of eigen vectors
}

function rectanglityandConcavity(polygon){
    var diff = 0, counter = 0, seg = polygon.segments, N = polygon.segments.length;
    
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
    return {concave: counter, diff: diff/((N-2)*360)};
}

//////////////////////////////    Genetic Algorithm  Main  //////////////////////////////

lines = []
for(var j=0; j<10; j++) // create a pool
    lines.push(getMainAngle(myPath))

var t=0, total=1
function divide(){
    
    var sides;
    for(var j=1; j<=5; j++, t++, total++)
    {    
        document.getElementById("info_iter").innerHTML = "Iteration no:  "+total;

        var line = lines[getRandomInt(2, lines.length)];

        mutation(line);
        sides = createSides(line); 
        
        lines.sort(function(a, b) {return b.fitnessValue - a.fitnessValue;});

        lines.pop(); // eliminate the worst and put best
        lines.push(new Line(lines[0].angle, lines[0].center));
        
        console.log("fitness function: "+line.fitnessValue.toFixed(2)+"\n------------------------")
    }

    sides = createSides(lines[0]);
    displaySides(sides);
    document.getElementById("info_fitness").innerHTML = "Fitness value:  "+lines[0].fitnessValue.toFixed(4);

    if (t < 250000) 
        window.setTimeout(divide, 0);  
}


//////////////////////////////    Genetic Algorithm   ///////////////////////////////////

function fittnessFunction(sides, path){

    var total = areaPenalty = aspectRatioPenalty = concavityPenalty = rectanglityPenalty = 0
    var areaWeight = 1, ratioWeight = 0.02, concavityWeight = 0.1, rectWeight = 0.25;
    for(i=0; i < sides.length; i++)
    {
        if(sides[i].className == "CompoundPath") return 0;
        areaPenalty += Math.abs(dist[i] - (sides[i].area / path.area));
    }
    document.getElementById("info_area").innerHTML = "Area consistency: " + (1-areaPenalty).toFixed(6);
    
    areaPenalty = areaWeight * areaPenalty;
    console.log("Area Penalty: "+areaPenalty.toFixed(6));
        
    if($('.good-aspect-ratio:checked').val()){
        aspectRatioPenalty = ratioWeight*(aspectRatio(sides[0]) - 1 + aspectRatio(sides[1]) - 1);
        console.log("Aspect ratio penalty: "+aspectRatioPenalty.toFixed(3));
        total += aspectRatioPenalty;
    }
    
    var res1 = rectanglityandConcavity(sides[0]);
    var res2 = rectanglityandConcavity(sides[1]);
    
    if($('.well-shaped-rectangles:checked').val()){
        rectanglityPenalty = rectWeight * (res1.diff + res2.diff);
        console.log("Rectanglity penalty: "+rectanglityPenalty.toFixed(3));
        total += rectanglityPenalty;
    }

    if($('.convexity:checked').val()){    
        concavityPenalty = concavityWeight*(res1.concave + res2.concave); //number of concave points
        console.log("Concavity penalty: "+concavityPenalty.toFixed(3));
        total +=concavityPenalty;
    }
    
    if($('.well-filled-circles:checked').val()){    
        var result = miniDisc(path);
        result.areaPenalty = 0.3 * result.areaPenalty;
        console.log("Circle Area Penalty: "+result.areaPenalty);
        total+=result.areaPenalty;
    }
    return 1 - (areaPenalty + total);
}

function mutation(line){
    var rand = Math.random();
    if(rand < 0.6)
    {
        var randAngle = getRandomInt(-4, 5) + Math.random();
        line.angle += randAngle;
    }
    else if(rand < 0.95)
    {
        var movingDir = new Point(getRandomInt(1, 5), 0); // dummy vector
        
        if(getRandomInt(0, 2))
            movingDir.angle = line.angle + 90; // set this unit vector as line angle
        else
            movingDir.angle = line.angle - 90; // set this unit vector as line angle
        
        line.center += movingDir;            
    }
    else 
        line.angle += 90;
}


////////////////////////////   Html Part  ///////////////////////////////////////////////

window.iterate = function(){

    if(document.getElementById("run").innerHTML == "Stop!")
    {
        document.getElementById("run").innerHTML = "Iterate";
        document.getElementById("run").className = "btn btn-warning";
        t=250000
    }
    else{
        t=0;
        document.getElementById("run").innerHTML = "Stop!";
        document.getElementById("run").className = "btn btn-danger";  
    }
    divide();
};

dist = [];
window.readDistAndNormalize = function(){

    dist = document.getElementById("dist").value;
    dist = dist.split(",");

    var total = 0
    for(i=0; i < dist.length; i++)
    {
        dist[i] = parseFloat(dist[i]);
        total += dist[i];
    }

    for(i=0; i < dist.length; i++)
        dist[i] /= total;    
    
    dist.sort(function(a, b) {return b - a});
}
window.readDistAndNormalize();

function onFrame(event){}
