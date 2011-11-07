// ---------------------------------------
// Globals
// ---------------------------------------
var sys = require('sys');
var http = require('http');
var url = require("url");
var path = require("path");
var io = require('socket.io');
var smsified = require('smsified');
var	nodeStatic = require('node-static');

var config = require("./config");									// set up data: db, smsified, etc.

var port = Number(process.env.PORT || 8000);						// The network port to listen on (8000 if localhost), or process.env.PORT (ie. 80) if deployed
var file = new nodeStatic.Server('./public');						// serve up public files

var db = require('./lib/db.js').initialize(							// database functionality
	config.db.username,
	config.db.password,
	config.db.url,
	config.db.database
);
// then, can do:  db.query(...) and db.insert(...)


// --------------------------------------------------
// Start running here
// --------------------------------------------------
var server = http.createServer(function(request, response) {		// Create a new HTTP server to listen for incoming messages.

	request.addListener('data', function(data){						// SMSified: listen for incoming data and do something if detected
		var json = JSON.parse(data);
		var inbound = new InboundMessage(json);
		sys.puts('Inbound message: ' + inbound.message);
		console.log('Inbound message: ' + inbound.message);
	});

	request.addListener('end', function(){
 		file.serve(request, response, function (err, res) {
            // if (err && (err.status === 404)) {							// If the file wasn't found
            //     file.serveFile('/404.html', request, response);
            // }
			console.log(request);
        });
		response.writeHead(200, {});
		response.end(request.url + ' yaaaarrr!');
	});

}).listen(port);



// --------------------------------------------------
// Socket.IO
// --------------------------------------------------

io.listen(server);

console.log(io);

io.sockets.on('connection', function (socket) {});

// var sms = io
// 	.of('/sms')
// 	.on('connection',function(){});
/*
io.sockets.on('connection', function (socket) {
	console.log('Client Connected');
	socket.emit('news', { hello: 'world' });						// this goes to everyone

	socket.on('message', function(message){							// do this whenever a message is received...
		socket.broadcast(message);
		socket.broadcast.json.send({ a:message });					// ... and broadcast it to everyone (except for the socket that started it)
		socket.send(message);

		db.insert (													// prolly want to store it in db, too
			"rewrite", 
			{ "word": message },
			function (err, docs) {
				if (err) { 
					console.log("Insert error: ", err); 
					return; 
				}
			}
		);

	});

});
*/


sys.puts('Server listening on port ' + port);

