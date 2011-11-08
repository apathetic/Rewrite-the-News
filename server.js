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

var port = process.env.PORT || 8000;								// The network port to listen on (8000 if localhost), or process.env.PORT (ie. 80) if deployed
var file = new nodeStatic.Server('./public');						// serve up public files

var db = require('./lib/db.js').initialize(							// database functionality
	config.db.username,
	config.db.password,
	config.db.url,
	config.db.database
);
// then, can do:  db.query(...) and db.insert(...)

var temp;


// --------------------------------------------------
// Start running here
// --------------------------------------------------
var server = http.createServer(function(request, response) {		// Create a new HTTP server to listen for incoming messages.

	var path = url.parse(request.url, true);						// parse the query string; true will parse keys/values
	var params = (path.query || path.headers);						// note: url.parse doesn't handle POST request, forms, etc.

	if ( request.method === 'POST' ) {								// the body of the POST is JSON payload.
		var data = '';
		request.addListener('data', function(chunk) { data += chunk; });
		request.addListener('end', function() {

			var json = JSON.parse(data);							// [TODO] add error handling on this  ... try {} catch(e) { error]
temp = json;
		// 	var inbound = new InboundMessage(json);					// SMSified:
		// 	sys.puts('Inbound message: ' + inbound.message);
		// 	console.log('Inbound message: ' + inbound.message);

		//			updateClients();	....??


			response.writeHead(200, {'content-type': 'text/plain' });
			response.end()

		});

	} else if (request.method == 'GET') {							// only post and get

		request.addListener('end', function(){

			switch (path.pathname) {								// because we only have one or two paths we can do it this way
				case '/config.json' :								// send some config data to the client
					response.writeHead(200, {
						'Content-Type':'application/x-javascript'
					});
					var json = JSON.stringify({
						port: self.settings.port
					});
					response.end(json);
					break;

				// case '/sms' : 										// incoming sms messages go here
				// 	updateClients();
				// 	response.writeHead(200, {'Content-Type': 'text/plain'});
				// 	response.end('ok');
				// 	break;

				case '/test' :
			        response.writeHead(200, {'content-type': 'text/json' });
			        response.write( JSON.stringify(temp) );	// last json received is stored here
			        response.end('\n');
					break;

				default :
					file.serve(request, response, function(e, r) {	// serve up a static files
            			// if (e && (e.status === 404)) {			// ...or choke
            			//     file.serveFile('/404.html', request, response);
            			// }
					});
					console.log(request);
        	}
		});
	}

}).listen(port);



// --------------------------------------------------
// Socket.IO
// --------------------------------------------------
var sms = io.listen(server);
var headlines = {};

//sms.of('/sms');

function updateClients(message){

	io.broadcast.json.send({ a:message });						// ... and broadcast it to everyone (except for the socket that started it)
	io.broadcast(message);										// ...or this. not sure which is better jsut yet

	db.insert (													// store it in db
		"rewrite", 
		{ "word": message },
		function (err, docs) {
			if (err) { 
				console.log("Insert error: ", err); 
				return; 
			}
		}
	);

}

sms.sockets.on('connection', function (socket) {
	
	console.log('Client Connected');
	socket.emit('news', { hello: 'world' });						// this goes to everyone

	socket.on('message', function(message){							// do this whenever a message is received...
		socket.broadcast(message);
		socket.broadcast.json.send({ a:message });					// ... and broadcast it to everyone (except for the socket that started it)
		socket.send(message);
	});

});














sys.puts('Server listening on port ' + port);

