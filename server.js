// ---------------------------------------
// Globals
// ---------------------------------------
var util = require('util');					// output console logs
var http = require('http');					// create HTTP server
var url = require("url");
var io = require('socket.io');				// 2-way communication btw client and server
var smsified = require('smsified');			// smsified library, handle incoming sms msg
var	nodeStatic = require('node-static');	// for serving static HTML files
var tropo_webapi = require('tropo-webapi');	// tropo library, handle incoming sms msg

var config = require("./config"); 			// set up data: db, smsified, etc.

// The network port to listen on (8000 if localhost), 
// or process.env.PORT (ie. 80) if deployed
var port = process.env.PORT || 8000;

var db = require('./lib/db.js').initialize( // database functionality
	config.db.username,
	config.db.password,
	config.db.url,
	config.db.database
);

var _curHL;	// current headline
var _repHL;	// replay headline (on /index page)
var _edits = { 1 : '', 2 : '', 3 : '', 4 : '' };	// save most recent replacement-words,
													// to push to new clients immediately
													// clear out, after initializing new headline
													
													
// --------------------------------------------------
// Database Schema Setup  >>> could be put into extra file
// --------------------------------------------------
var mongoose = require('mongoose');

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var SMSschema = new Schema({
						 _id		: ObjectId,			// id
						 message	: String,			// replacement word
						 user 	    : String,			// phone number or web : submitted name
						 timeStamp	: Date,				// mongo date object, receive of submission
						 headlineId	: ObjectId,			// id of referenced headline
						 source		: String,			// from Phone or from Web, for debug/stats
						 keyNo		: Number			// which keyword to change 
						 });

var SMS = mongoose.model('input', SMSschema);

var headlineSchema = new Schema({
						  _id		: ObjectId,			// id
						 title		: String,	
						 web_title	: String,
						 source		: String,		// for signature underneath headline
						 date		: Number,		// important index to find headline
						 edit		: String,		// which words can be edited
						 rating		: Number		// if topheadline=1 or second=2
						  });

var headline = mongoose.model('headline', headlineSchema);


// global variables, also to be saved in Database
var GlobalSchema = new Schema({
						_currentHeadlineId	: ObjectId,	// save here, in case server goes down/resets
						_replayHeadlineId	: ObjectId, //  -||-
						
						_minDuration		: Number,	// minimum duration for headlines to be on
						_maxDuration		: Number,	// maximum duration for headlines to be on
						_maxEdits			: Number	// maximum edits until a new headline appears
							  });

var Setting = mongoose.model('global', GlobalSchema);

													
var global = new Setting();			// holds global variables: _minDuration, _maxDuration, _maxEdits
									//                         _currentHeadlineId, _replayHeadlineId
Setting.findOne( { }, function (err, doc) {			
							if(err) console.log(err.message);
							global = doc;
						});


// ? Should we also create a User DB-collection to store user-names plus their ip-addresses?
// Or do we set a cookie, so users can come back and don't need to give their name again?



// --------------------------------------------------
// Start running here
// --------------------------------------------------
var server = http.createServer(function(request, response) {
										
		var path = url.parse(request.url, true); 		// parse the query string; 
		var params = (path.query || path.headers); 		// url.parse doesn't handle POST 
		var file = new nodeStatic.Server('./public'); 	// serve up public files

		// POST = incoming sms messages from SMSified
		if ( request.method === 'POST'  ) {				
		
			switch (path.pathname) {
				
				case '/tropo' :
									util.log("monitoring /tropo");
									var data = '';
									request.addListener('data', function(chunk) { 
										data += chunk; 		
										util.log('chunk added');
									});
									request.addListener('end', function() {		
										util.log('Tropo Message received: '+data);
										json = data.toString();
										util.log('data to string: '+json);
										var session = JSON.parse(json);
										var tropo = new TropoWebAPI();
										var from = session.session.from.id;
										var to = session.session.to.id;
										util.log("from = "+from+"  to = "+to);
										var initialText = session.session.initialText;
										util.log("initialText = "+initialText);
										response.end(TropoJSON(tropo));
																		});
									break;
				default:
				
					var data = '';								// initialize clear data variable
																
					request.addListener('data', function(chunk) { 
							data += chunk; 						// add any incoming JSON data
					});
					
					request.addListener('end', function() {		// after receiving incoming message
							util.log('Message received: '+data);
							if(data.indexOf("tropo") != -1) {
							// check if POST data contains 'tropo'
								util.log("TROPO message!");
								try {
									var json = JSON.parse(data);	
									// STILL PROBLEMS WITH PARSING TROPO
								} catch(e) {
									util.log('Error parsing TROPO JSON data');
								}
								processTropo(json);
							} else {
								try {
									var json = JSON.parse(data);
								} catch(e) {
									util.log('Error parsing SMSified JSON data');
								}
								var inbound = new InboundMessage(json);	
								processSMS(inbound);
							}
					});
			
			}
			
			response.writeHead(200, {})
			response.end("POST");
			
		} else if ( request.method === 'GET' ) {
			
			request.addListener('end', function(){
				switch (path.pathname) {
					case '/' :			 
						// main index site, showing current-headline and replay-headline
						// TODO: how to send data to html-file directly? _curHL, _repHL, credits, date, ...
						file.serveFile('/index.html', 500, {}, request, response); 
						break;
					case '/all':
						// DEBUG SITE for now: show all submissions
						file.serveFile('/all.html', 500, {}, request, response);
						break;
					case '/archive':
						// archive site, show replay of old submissions.
						// /archive1 /archive2 /archive3 ... for each month
						// TODO
						break;
					default :
						// serve up a static file...
						file.serve(request, response, function(err) { 
             				if (err && (err.status === 404)) { 
								util.log('not found: ' + request.url);
             					file.serveFile('/404.html', 404, {}, request, response);
             				}
						});
				}
			});
			
		}
		
		
});


io = io.listen(server);
server.listen(port);
util.log('Server listening on port ' + port);

// --------------------------------------------------
// Start listening here
// --------------------------------------------------

// socket namespace /all : all clients connected to see submission-archive
var space_all = io
	.of('/all')
	.on('connection', function (client) {
	util.log('Client Connected  to All');
	client.emit('meta', { meta: 'socket/all' }); 

	// pull all entries out of database 'submissions'
	// TODO: impose limit. 
	SMS.find( { }, function (err, docs) {
							if(err) console.log(err.message);
							if(docs) {
								docs.forEach(function (sms) {
									//console.log("Found SMS with message: "+sms.message);
									if(sms.message=="" || sms.message=="null") sms.message="-";
									client.emit('allSubmissions', sms);
								});
							}
						});
});
	
// socket namespace /main : all clients connected to see main index page
var space_main = io
	.of('/main')
	.on('connection', function (client) {
		util.log('Client Connected  to Default');
		
		if(_curHL) {
			//console.log("emit: "+returnHeadline(curH)+ "   edit: "+curH.edit);
			client.emit('initHeadline', { title: returnHeadline(_curHL), edit: _curHL.edit, replacements: _edits });	
			// TODO push most recent edits
		} else {
			selectHeadline( function(err) {
				if(err) console.log(err.message);
				client.emit('initHeadline', { title: returnHeadline(_curHL), edit: _curHL.edit, replacements: _edits });	
			});
		}
});

// disocnnection function for all namespaces
io.sockets.on('disconnect', function () {
	util.log('Client Disconnected');
});

// send message to all clients /all /main
function messageAllClients(t, s){
	space_all.emit( t, s );     // e.g. 'newSubmission', s
	space_main.emit( t, s );
	// ... and broadcast it to everyone (except for the socket that started it)
}

// --------------------------------------------------
// Headline Selection
// --------------------------------------------------
 
 

function selectHeadline( callback ) {
	 // headline selection algorithm
	 // defined by global variables:  _minDuration, _maxDuration, _maxEdits
	 // possibility to change those variables in moderation-tool, plus save to DB
	var minute = new Date().getMinutes()%10;
	console.log("minutes : "+minute);
	
	headline.find( { }, function (err, docs) {
							if(err)  {
								console.log(err.message);
							}
							if(docs) {
								var i = 0;
								// take xth element out of database, based on current minute
								docs.forEach(function (h) {
									 i++;
									 if(i==minute) {
										 _curHL = h;	
										 console.log("set current Headline ID to : "+_curHL._id);
										 //// TODO: error with converting to ObjectId:
										 //global._currentHeadlineId = mongoose.mongo.BSONPure.ObjectID.fromString(_curHL._id);
										 global._minDuration = minute;
										 global.save(function (err) {
											if (err) console.log('save err: '+err.message);
											else {
												console.log("saved GLOBALS");
											}
															   });
										 callback.apply(this,err);	// this, args
									 }
								});
							}
						});
}

// pick web_title if present, else return title
function returnHeadline(h) {
	if(h.web_title!="null" && h.web_title!="") return h.web_title;
	else return h.title;
}

// CRON, execute once every 60sec. Pick current headline
setInterval(function() {
	console.log("/ / / / / / / / Interval / / / / / / /");
  	selectHeadline( function(err) {
							 // TODO callbackfunction
			if(err) console.log(err.message);
			//console.log('timeout - selected headline '+_curHL.title);
			
			// if new headline selection, return to all connected /main clients
			// also: clear edits-array
			_edits = { 1 : '', 2 : '', 3 : '', 4 : '' };
			space_main.emit('initHeadline', { title: returnHeadline(_curHL), edit: _curHL.edit, replacements: _edits });	
	});

}, 60000 );






// --------------------------------------------------
// Message processing here
// --------------------------------------------------
function processSMS(inbound) {
	
	util.log('Processing inbound message "' + inbound.message + '"');
	
	
	var s = new SMS();
		s.source = 'SMSified';
		
		s.timeStamp = inbound.dateTime;
		s.headlineId = _curHL._id;							// currently active headline
		s.user = inbound.senderAddress;
		if(isNaN(inbound.message.substring(0,1))) {
			s.keyNo = 1;
			s.message = inbound.message;
		} else {
			s.keyNo = inbound.message.substring(0,1);
			s.message = inbound.message.substring(2);
		}
		if(s.message == "" || s.message == "null") s.message = "-";
		s.save(function (err) {
			if (err) console.log('save err: '+err.message);
			else {
				console.log('SMS saved to mongoDB');
				_edits[s.keyNo] = s.message;
				messageAllClients('newSubmission',s); // send it to every connected client
			}
	});			
	// TODO: send back success/error message to sendSMS.html?
};


function processTropo(tropomsg) {
	util.log('Processing tropo message "' + tropomsg.message + '"');
	
	var s = new SMS();
		s.source = 'Tropo';
		s.message = tropomsg.message;
		s.timeStamp = Date.now();
		s.headlineId = _curHL._id;							// currently active headline
		s.user = tropomsg.phone;
		s.save(function (err) {
			if (err) console.log('save err: '+err.message);
			else {
				console.log('SMS saved to mongoDB');
				_edits[s.keyNo] = s.message;
				messageAllClients('newSubmission',s); // send it to every connected client
			}
	});	
}
