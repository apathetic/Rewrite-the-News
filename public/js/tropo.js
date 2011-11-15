// JavaScript Document
var http = require('http');
var util = require('util');	
var tropo_webapi = require('tropo-webapi');

var server = http.createServer(function (request, response) {
		util.log("start tropo server");						 
										 
		request.addListener('data', function(data){
        	json = data.toString();
    	});
		
		request.addListener('end', function() {
     
			var session = JSON.parse(json);
			var tropo = new TropoWebAPI();
			
			var from = session.session.from.id;
			var to = session.session.to.id;
			util.log("from = "+from+"  to = "+to);
		 
			var initialText = session.session.initialText;
			
			util.log("initialText = "+initialText);

			response.end(TropoJSON(tropo));
    	});


}).listen(8000); // Listen on port 8000 for requests.