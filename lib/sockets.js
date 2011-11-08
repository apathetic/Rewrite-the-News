var activeClients = 0;
socket.on('connection', function(client){
    activeClients += 1;
    client.on('disconnect', function(){ clientDisconnect(client) });
    client.on('message', function(msg){ something(client, socket, msg) });

    client.send({
        event: 'initial',
        data: nodeChatModel.xport()
    });

    socket.broadcast({
        event: 'update',
        clients: activeClients
    });
});



function something(client, socket, msg){		// pass the socket this way

        socket.broadcast({
            event: 'chat',
            data:'whatevs'
        }); 

}