//AWESOME EXAMPLE CODE THAT HELPED ME GET THIS RUNNING!!!
//http://cjihrig.com/blog/creating-your-own-websocket-echo-client/
//http://cjihrig.com/blog/websockets-in-node-js-0-8-6-for-windows-7/
var WebSocketServer = require('websocket').server;
var http = require('http');
var net = require('net');
//var arduinoTcp = null;
var lights=[];
var request = require('request');

var netserver = net.createServer(function(socket) { //'connection' listener
	console.log('arduino connected');
	//socket.write('hello from server');
	lights.push(socket);

	socket.setEncoding('ascii');

	socket.on('close', function() {
		var i = lights.indexOf(socket);
		lights.splice(i,1);
		console.log('arduino disconnected');
	});

	socket.on('data', function(data){
		console.log(data);
	});
	//var arduinoTcp = socket;
	
});

netserver.listen(5001, function() { //'listening' listener
	console.log('tcp server bound');
});

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
function getWeather(zipcode){

request('http://api.wunderground.com/api/e9e74e882dede7ed/conditions/q/'+zipcode+'.json', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    //console.log(body) // Print the google web page.
    var obj = JSON.parse(body);
    var temp = obj.current_observation.temp_f;
    console.log( obj.current_observation.temp_f );
    if(lights.length > 0){
		if(temp != null){
			for(var i = 0; i < lights.length; i++){
				var red = map_range(temp, 32,100,0,255);
				var blue = map_range(temp,32,100,255,0);
				var tempColor = Math.round(red)+","+0+","+Math.round(blue);
				console.log(tempColor);
				lights[i].write(tempColor);
				lights[i].write("x");
			}
		}
	}else{
		console.log("NO ARDUINO CONNECTED");
	}
  }
})
};
function map_range(value, low1, high1, low2, high2) {
	if(value < low1){
		value = low1;
	}else if(value > high1){
		value = high1;
	}
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
function getBusStops(){
//http://bustime.mta.info/api/siri/stop-monitoring.json?key=TEST&OperatorRef=MTA%20NYCT&MonitoringRef=308209&LineRef=B63
request('http://bustime.mta.info/api/siri/stop-monitoring.json?key=TEST&OperatorRef=MTA%20NYCT&MonitoringRef=308331', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    //console.log(body) // Print the google web page.
    var obj = JSON.parse(body);
    var temp = obj.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit[0].MonitoredVehicleJourney.MonitoredCall.Extensions.Distances.StopsFromCall;
    console.log( temp );
    if(lights.length > 0){
		if(temp != null){
			for(var i = 0; i < lights.length; i++){
				//var green = map_range(temp, 0,10,255,0);
				var red = map_range(temp, 0,10,0,255);
				var blue = map_range(temp, 0,10,0,255);
				var blinkMe = 0;
				if(temp ==3){
					blinkMe = 1;
				}else{
					blinkMe = 0;
				}
				//var blue = map_range(temp,32,100,255,0);
				var tempColor = Math.round(red)+","+255+","+Math.round(blue)+","+blinkMe;
				console.log(tempColor);
				lights[i].write(tempColor);
				lights[i].write("x");
			}
		}
	}else{
		console.log("NO ARDUINO CONNECTED");
	}
  }
})
};
setInterval(getBusStops,10000);
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
        	console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
            var messageString = String(message.utf8Data);
        	if(messageString.indexOf("weather")!=-1){
        		var word = messageString.split(",");
        		getWeather(word[1]);
        	}else if(messageString.indexOf("bustime")!=-1){
        		//var word = messageString.split(",");
        		getBusStops();
        	}else{
				if(lights.length > 0){
					if(message != null){
						for(var i = 0; i < lights.length; i++){
							lights[i].write(message.utf8Data);
							lights[i].write("x");
						}
					}
				}else{
				console.log("NO ARDUINO CONNECTED");
				}
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

