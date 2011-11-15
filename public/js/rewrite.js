/*
Functions to set up the Client, interact with Server
////// both index.html and all.html access this script.
////// differences defined by namespace 
*/
var socket;

// hand in namespace for seperate socket channels
function ReWrite(namespace) {

	console.log('Initializing client connection...');

	socket = io.connect('http://8.19.32.198/'+namespace);
	
	// Connect
	socket.on('connect', function() {
		console.log('Connected to server.');
		$('#messages').prepend('<li>connected to server/' +namespace + '</li>');
		socket.send('Hi Server...');
	});
	
	// New incoming Submission:
	socket.on('newSubmission', function(data){
		console.log('Received the message '+data.message);
		//<div id="hlid">'+data.headlineId+'</div>
		$('#messages').prepend('<li><div id="message">' + data.message + '</div><div id="kword">'+data.keyNo+'</div><div id="who">'+data.user+'</div><div id="source">'+data.source+'</div><div id="time">'+data.timeStamp+'</div></li>');
		// switch word in headline, on /main namespace
		if(namespace == 'main') {
			// if message is not empty, and changeWord is >=1 and <=4
			if(data.message && data.keyNo>=1 && data.keyNo<=4)  {
				$('#key'+data.keyNo).html(data.message);
			}
		}
	});
	
	// List all submissions
	socket.on('allSubmissions', function(data){
		$('#messages').prepend('<li><div id="message">' + data.message + '</div><div id="kword">'+data.keyNo+'</div><div id="who">'+data.user+'</div><div id="source">'+data.source+'</div><div id="time">'+data.timeStamp+'</div></li>');					 						 
	});
	
	// for debug, or invisible actions
	socket.on('meta', function (data) { 
		console.log('meta: '+data["meta"]); 
		$('#messages').prepend('<li>meta: '+JSON.stringify(data)+'</li>');
	});
	
	socket.on('initHeadline', function(data) {
		console.log('init headline '+JSON.stringify(data));
		createHeadline(data["title"],data["edit"]);
		var addons = '';
		for(var i=1; i<=4; i++) {
			if(data["replacements"][i] != '') {
				if(namespace == 'main') {
					$('#key'+i).html(data["replacements"][i]);
					addons += ' + ' + data["replacements"][i];
				}
			}
		}
		$('#messages').prepend('<li>init headline  '+addons+'</li>');
									   });
	
	socket.on('disconnect', function() {
		console.log('disconnected from server');
		$('#messages').prepend('<li>disconnected from server</li>');
	});
}

function createHeadline(line,edit) {
	console.log('creating headline '+line);
	var edits = [];
	if(edit!=null && edit!='') {
		var keys = edit.split(',');
			$.each(keys, function(j,key) {
				if(key!=null) edits.push(parseInt(key));		  
			});
		console.log('editable: '+edits.toString());
	}
	
	var words = line.split(' ');			// split each headline into a series of words
	var split = '';								// temporary var to hold headline words
	$.each(words, function(j, word){
		split += '<span';
		var n = $.inArray(j, edits);
		if(n >= 0 ) split += ' id="key'+(n+1)+'" class="hi'+(n+1)+'" ';
		split += '>'+word+'</span> ';
	});
	
	$('#headline').html(split);
}

