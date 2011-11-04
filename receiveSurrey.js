// JavaScript Document


var http = require('http');
var fs = require('fs');


var server = http.createServer(function (request, response) {

    request.addListener('data', function(data){
        json = data.toString();
    });

    request.addListener('end', function() {

        var sms = JSON.parse(json);
        var sender = sms.inboundSMSMessageNotification.inboundSMSMessage.destinationAddress;
        var message = sms.inboundSMSMessageNotification.inboundSMSMessage.message;
        var time = sms.inboundSMSMessageNotification.inboundSMSMessage.dateTime;
		
		// save message plus sender to database
		
		// notify server-websocket of new text

    });
}).listen(8000);