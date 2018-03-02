var SerialPort = require('serialport');
var port = new SerialPort('/dev/rfcomm1',{ baudRate: 115200 });
const ByteLength = SerialPort.parsers.ByteLength;
const parser = port.pipe(new ByteLength({length: 1}));

var mysql = require('mysql');

var db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});

// port.write('main screen turn on', function(err) {
//   if (err) {
//     return console.log('Error on write: ', err.message);
//   }
//   console.log('message written');
// });

// Open errors will be emitted as an error event

console.log('Server starts.')

port.on('error', function(err) {
  console.log('Error: ', err.message);
})

var pkg_start = false;
var len = -1;
var pkg = [];
// HEAD | SIZE | TYPE | DATA | TAIL
parser.on('data', function (data) {
  var ch = data[0];
  if (!pkg_start && ch == 0xAA) {
    pkg_start = true;
    len = 0;
    pkg.push(ch);
  } else if (pkg_start && len == 0) {
    len = ch;
    pkg.push(ch);
  } else if (pkg_start && pkg.length < len-1) {
    pkg.push(ch);
  } else if (pkg_start && pkg.length == len-1 && ch == 0xFF) {
    pkg.push(ch);
    /*console.info("Recieved package: ", `[${pkg.reduce(function(carry, item) {
      carry += item.toString(16) + ", ";
      return carry;
    }, pkg[0].toString(16))}}]`);*/
    /*console.info("Recieved package: ", `[${()=>{
      var stringHexes = [];
      pkg.foreach(function(item) {
        stringHexes.push(item.toString(16));
      });
      return stringHexes;
    }.join(", ")}]`);*/
    console.info("Recieved package: ", pkg.toString());
    pkg_start = false;
    pkg = [];
  } else {
    console.error('Error on reading data.');
  }

});
