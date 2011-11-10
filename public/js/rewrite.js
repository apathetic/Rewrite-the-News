/*
	Functions to set up the Client, interact with Server
*/
function ReWrite() {

	console.log('Initializing client connection...');

	// $.getJSON('/config.json', function(config) {
	// 	console.log('Parsing configuration data...');
	// 	var response = $('#response');
	// 	response.html(config.host);



		var socket = io.connect('http://apathetic.no.de');
		// var socket = io.connect('http://localhost');

		socket.on('connect', function() {
			console.log('Connected to server.');
			socket.send('Hi Server...');
		});
		socket.on('message', function(data){ 
			console.log('Recieved a message!'); 
			response.html(data);
			socket.emit('my other event', { my: 'data' });
		});
		socket.on('disconnect', function() {
			console.log('disconnected from server'); 
		});


		socket.on('news', function (data) {    console.log(data);  });


	// });


}

