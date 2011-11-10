// ---------------------------------------
// Globals
// ---------------------------------------
var util = require('util');
var http = require('http');
var url = require('url');
var io = require('socket.io');
var smsified = require('smsified');
var	nodeStatic = require('node-static');

var config = require('./config');										// set up data: db, smsified, etc.

var port = process.env.PORT || 8000;									// The network port to listen on (8000 if localhost), or process.env.PORT (ie. 80) if deployed

var db = require('./lib/db.js').initialize(								// database functionality
	config.db.username,
	config.db.password,
	config.db.url,
	config.db.database
);
// then, can do:  db.query(...) and db.insert(...)



// --------------------------------------------------
// Start running here
// --------------------------------------------------
var server = http.createServer(function(request, response) {			// Create a new HTTP server to listen for incoming messages.

	var path = url.parse(request.url, true);							// parse the query string; true will parse keys/values
	var params = (path.query || path.headers);							// note: url.parse doesn't handle POST request, forms, etc.
	var file = new nodeStatic.Server('./public');						// serve up public files

	if ( request.method === 'POST' ) {									// the body of the POST is JSON payload.
		var data = '';
		request.addListener('data', function(chunk) { data += chunk; });
		request.addListener('end', function() {
			util.log('Message received');
			try {
				var json = JSON.parse(data);
			} catch(e) { 
				util.log('Error receiving data');
			}

			var inbound = new InboundMessage(json);						// SMSified:
			processMessage(inbound.message);

			response.writeHead(200, { 'Content-Type': 'text/plain' });
			response.end();

		});
	} else if (request.method == 'GET') {								// only post and get
		request.addListener('end', function(){

			switch (path.pathname) {									// because we only have one or two paths we can do it this way
				case '/config.json' :									// send some configuration data to the client
					response.writeHead(200, {
						'Content-Type':'application/x-javascript'
					});
					var json = JSON.stringify({
						'host': request.headers.host
					});
					response.end(json);
					break;

				case '/test' :
					processMessage('test message');
					response.writeHead(200, { 'Content-Type': 'text/html' });
					response.write('Hello world. This, at least, is working');
					response.end();
					break;

				default :
					file.serve(request, response, function(err) {		// serve up a static file...
            			if (err && (err.status === 404)) {				// ...or choke
							util.log('not found: ' + request.url);
            			    file.serveFile('/404.html', 404, {}, request, response);
            			}
					});

        	}
		});
	}

}).listen(port);

util.log('Server listening on port ' + port);




// --------------------------------------------------
// Start listening here
// --------------------------------------------------
var io = io.listen(8080);												// we listen to port 8080. Why not server like in Every. Single. Example? I do not know.
// var headlines = {};													// i don't know if it's a good idea or not to keep an array of all received words / headlines

io.sockets.on('connection', function (socket) {
	util.log('Client Connected');
	socket.emit('news', { hello: 'world' });							// this goes to socket (client) that just connected
	// probably want to grab stuff out of the db and send that, instead
});

function updateClients(message){
	io.sockets.send({ 'message': message });							// ... and broadcast it to everyone (except for the socket that started it)
}



// --------------------------------------------------
// Message processing here
// --------------------------------------------------
function processMessage(message) {
	util.log('Processing message');
//	filterMessage(&message);											// check if a bad word, etc.
	updateClients(message);												// send it to every connected client
//	db.insert("rewrite", { "word": message });							// and save it into the database
};

function filterMessage(message) {
	return;
};

// cron for javascript:
// setTimeout(function() {
//   io.sockets.send('message');
// }, 5000 );

