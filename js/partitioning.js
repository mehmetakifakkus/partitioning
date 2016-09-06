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
        
    if(num == 1)
        pools[0].divide();
    if(num >= 2 || num <= 9)
        processPool(num-1);
    if(num == 0)
        window.iterate();
    
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

function Line(angle, p, fitness){
    
    this.angle = angle;
    this.center = p;
    this.fitnessValue = fitness || 0;  
    this.done = 0; // stop turning 90 degrees
    this.movingDir = 0; // -1 for to center, +1 going far
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

function createSides(path, line){
    
    var linePath = new Path.Line({name: 'line', from: line.center - [1499, 0], to: line.center + [1499, 0]}); 
    linePath.rotate(-line.angle, line.center); // merkez etrafinda donus yap (-angle because coordinate system differs)
    var dd = linePath.intersect(path);
    dd.style = {strokeColor:'black', strokeWidth:2, opacity: 0.4};    
    
    if(typeof dd.children[0] == 'undefined')
        return null;
    
    refreshPoints(); 
        
    var side = createSide(line.angle, line.center, 1)
    var int1 = side.intersect(path);
    int1.style = {name: 'intersect', opacity:0.5}
    
    var side2 = createSide(line.angle, line.center, 0)
    var int2 = side2.intersect(path);
    int2.style = {name: 'intersect', opacity:0.5}
    
    line.center = new Point(getPolygonCenter(dd.children[0])); // set the center intersection center
    
    drawables.push(int1, int2, linePath, dd)
    return [int1, int2, dd];
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

function GenePool(p, d){
    if (typeof GenePool.id == 'undefined')
        GenePool.id = 0;
    
    this.id = GenePool.id++;
    this.path = p;
    this.dist = d;
    this.lines = []
    for(var j=0; j<10; j++) // create a pool
        this.lines.push(getMainAngle(this.path))

    this.t=1;
    
    this.bestSides = 0;
    this.linePath = 0;
    
    var tempObj = this;
    
    this.divide = function (){

        var sides = createSides(tempObj.path, tempObj.lines[0]); // arbitrary starting line
        console.log('start center: '+ tempObj.lines[0].center)

        for(var j=0; j<10; j++, tempObj.t++)
        {    
            document.getElementById("info_iter").innerHTML = "Iteration no:  "+tempObj.id+" - "+tempObj.t;

            var selected = getRandomInt(2, tempObj.lines.length);
            var line = tempObj.lines[selected];
   
            //if(sides == null)
              //  debugger
            
            line.movingDir = sides[0].area / tempObj.path.area - tempObj.dist[0] < 0 ? 1 : -1; // 
   
            mutation(line, new Point(getPolygonCenter(sides[0])), tempObj.path);
            sides = createSides(tempObj.path, line);
            
            if(sides == null) // 2'ye bolme isleminde sikinti var
            {
                console.log('----- problem var -------')
                tempObj.lines.splice(selected,1); // eliminate this one and put best
                tempObj.lines.push(new Line(tempObj.lines[0].angle, tempObj.lines[0].center, tempObj.lines[0].fitnessValue));
                sides = createSides(tempObj.path, tempObj.lines[0]); // arbitrary starting line
                if(sides == null)
                    debugger
                    
                continue;
            }

            line.fitnessValue = fitnessFunction(sides, tempObj.dist[0]);
    
            tempObj.lines.sort(function(a, b) {return b.fitnessValue - a.fitnessValue;});

            tempObj.lines.pop(); tempObj.lines.pop() // eliminate the worst and put best
            tempObj.lines.push(new Line(tempObj.lines[0].angle, tempObj.lines[0].center, tempObj.lines[0].fitnessValue));
            tempObj.lines.push(new Line(tempObj.lines[1].angle, tempObj.lines[1].center, tempObj.lines[1].fitnessValue));
        }
        document.getElementById("info_fitness").innerHTML = "Fitness value:  "+tempObj.lines[0].fitnessValue.toFixed(4);
        sides = createSides(tempObj.path, tempObj.lines[0]);
        
        if(tempObj.bestSides)
        {
            tempObj.bestSides[0].remove()
            tempObj.bestSides[1].remove()
            tempObj.linePath.remove()
        }
        tempObj.bestSides = [sides[0].clone(), sides[1].clone()];
        tempObj.linePath = sides[2].clone(); // correspondes to linePath
      
        window.show();

        if (tempObj.lines[0].fitnessValue < 0.999 && tempObj.t < 200) 
            window.setTimeout(tempObj.divide, 0);  
        
        return tempObj.t;
    }
    
    this.changeLinePool = function(part){ // bir onceki line ayni kalmis ise tekrar pool olusturma
                
        var part2 = tempObj.path.exclude(part)
        if(tempObj.path.area - (part.area + part2.area) < 10) 
        {
            console.error('ayni kalmis')
            tempObj.path = part;
            return
        }
        
        tempObj.path = part;
        tempObj.lines.clear();
        
        for(var j=0; j<10; j++) // create a pool
           tempObj.lines.push(getMainAngle(this.path)) 
    }
};

function fitnessFunction(sides, dist){ // distribution

    var total = areaPenalty = aspectRatioPenalty = concavityPenalty = rectanglityPenalty = 0
    var areaWeight = 1, ratioWeight = 0.005, concavityWeight = 0.1, rectWeight = 0.25;

    if(typeof sides[0]  == 'undefined')
        debugger
    
    if(sides[0].className == "CompoundPath") 
        return 0;
    
    areaPenalty += Math.abs(sides[0].area / (sides[0].area + sides[1].area) - dist);
    
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

function mutation(line, center, path){
    if(line.fitnessValue > 0.98)
        line.done = 1;
        
    var rand = Math.random();
    var coef = Math.pow(Math.abs(1 - line.fitnessValue) * 5, 2);
    if(rand < 0.6) // rotate seperating line
    {
        var randAngle = getRandomFloat(-9, 10) * coef;
        line.angle += randAngle;
        console.info('rotate - center: '+ line.center +', angle: '+randAngle.toFixed(2))

    }
    else if(rand < 0.95) // move seperating line 
    {
        line.center = new Point(getPolygonCenter(path)); // set the center intersection center

        var linePath = new Path.Line({name: 'line', from: line.center - [1499, 0], to: line.center + [1499, 0]}); 
        linePath.rotate(line.angle+90, line.center); // merkez etrafinda donus yap (-angle because coordinate system differs)
        var dd = linePath.intersect(path);
        
        //debugger
        var lineSeg = dd.children[0];
        
        if(typeof lineSeg == 'undefined')
            debugger
        
        if(typeof lineSeg.segments == 'undefined')
            debugger
        var p1 = lineSeg.segments[0].point;
        var p2 = lineSeg.segments[1].point;
        var dist = p1.getDistance(p2);        
        console.log(dist)
 
        var movingDir = (line.center - center).normalize(coef * getRandomFloat(1, 10)) * line.movingDir;
        
        console.info('move - center: '+ line.center +', dir: '+movingDir);

        line.center += movingDir;          
    }
    else // %5 percentage change the direction 90 degree
    {
        if(!line.done) // if it done it is acceptable enough to not change direction
            line.angle += 90;
        else
            console.log('done')
    }
}


////////////////////////////   Html Part  ///////////////////////////////////////////////

function generatePools(path){
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


function processPool(num){
    if(num == 0)
        pools[0].divide();
    else{
        pools[num].changeLinePool(pools[num-1].bestSides[1]);
        pools[num].dist = normalize(pools[num-1].dist.slice(1));
        pools[num].divide();
    }
    window.show();
}


window.iterate = function(){

    function call(i, times){
        
        for(var k = 0; k < times; k++)
            processPool(i);
    }
    
    setTimeout(function() {processPool(0); }, 0);
    setTimeout(function() {processPool(1); }, 1250);
    //setTimeout(function() {processPool(2); }, 1000);
    //setTimeout(function() {processPool(2); window.show();}, 1000); 
}

window.show = function(){
    
    clear();
    
    var k=0;
    for(; k<dist.length-1; k++)
    {
        var s = pools[k].bestSides[0]
        if(s){
            s.fillColor = colors[k] 
            drawables.push(new PointText({ point: new Point(getPolygonCenter(s)) - [(s.strokeBounds.width/6), 0], fontSize: (s.strokeBounds.width/8)+'px', fillColor: 'white', content: ''+ (100 * s.area/(myPath.area)).toFixed(2)}));
        }
    }
    
    var s = pools[k-1].bestSides[1];    
    if(s){
        s.fillColor = colors[k]
        drawables.push(new PointText({ point: new Point(getPolygonCenter(s)) - [(s.strokeBounds.width/6), 0], fontSize: (s.strokeBounds.width/8)+'px', fillColor: 'white', content: ''+ (100 * s.area/(myPath.area)).toFixed(2)}))
    }
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
