var server = new(require('bluetooth-serial-port')).BluetoothSerialPortServer();

var CHANNEL = 1; // My service channel. Defaults to 1 if omitted.
var UUID = '1101'; // My own service UUID. Defaults to '1101' if omitted

var count = 0;

console.log("Server started!");

server.listen(function (clientAddress) {
    console.log('Client: ' + clientAddress + ' connected!');
    server.on('data', function(buffer) {
        console.log('Received data from client: ' + buffer);

        count ++;

        console.log('Sending data to the client');
	console.log('This is the ' + count + ' trigger.');
        server.write(new Buffer('Echoing: ' + buffer + '\n'), function (err, bytesWritten) {
            if (err) {
                console.log('Error!');
            } else {
                console.log('Send ' + bytesWritten + ' to the client!');
            }
        });
    });
}, function(error){
	console.error("Something wrong happened!:" + error);
}, {uuid: UUID, channel: CHANNEL} );
