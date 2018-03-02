var SerialPort = require('serialport');
var port = new SerialPort('/dev/rfcomm1',{ baudRate: 115200 });

// port.write('main screen turn on', function(err) {
//   if (err) {
//     return console.log('Error on write: ', err.message);
//   }
//   console.log('message written');
// });

// Open errors will be emitted as an error event

console.log('start')

port.on('error', function(err) {
  console.log('Error: ', err.message);
})

port.on('readable', function () {
  const data = port.read()
  console.log('Data:', data)
  port.write(data, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
      console.log('message written');
    });
});
