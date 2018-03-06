// const SerialPort = require('serialport/test'); // when installed as a package
// const MockBinding = SerialPort.Binding;
// const portPath = '/dev/rfcomm1';
// MockBinding.createPort(portPath, { echo: false, record: false });

var SerialPort = require('serialport');
var port = new SerialPort('/dev/rfcomm1',{ baudRate: 115200 });

const ByteLength = SerialPort.parsers.ByteLength;
const parser = port.pipe(new ByteLength({length: 1}));
const acc = (accumulator, currentValue) => accumulator + currentValue;
var mysql = require('mysql');

var db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});

console.log('Server starts.')

port.on('error', function(err) {
  console.log('Error: ', err.message);
})

var pkg_start = false;
var len = -1;
var pkg = [];
var nack = {};
var id = 0;
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
    /* Handling Package */

    /* Check Validity */
    if ((pkg.reduce(acc)-pkg[pkg.length-2]) != pkg[pkg.length-2]) {
      pkg_start = false;
      pkg = [];
      console.error("Incorrect PKG checksum.");
      return;
    }

    if (pkg[2] == 0x00) {
      nack[pkg[3]] = undefined;
      console.info("Cleared RET ID", pkg[3]);
    } else if (pkg[2] <= 0x03) {

      /* ACK */
      var ack = [0xAA, 6, 0x00, pkg[3], 0, 0xFF];
      ack = [0xAA, 10, 0x03, id, stdout[0], stdout[1], stdout[2], stdout[3], 0, 0xFF];
      ack[ret.length-2] = ret.reduce(acc) % 256;
      port.write(ack.join(""), function(err) {
        if (err) console.error('Error in ACK: ', err);
        console.info('Sent ACK:', ack);
      });

      var ret = [];
      /* Handles IP Request */
      if (pkg[3] == 0x03) {
        exec('hostname -I', (error, stdout, stderr) => {
          if (error) {
            console.error(`IP exec error: ${error}`);
            return;
          }
          stdout = stdout.split('.');
          ret = [0xAA, 10, 0x03, id, stdout[0], stdout[1], stdout[2], stdout[3], 0, 0xFF];
          ret[ret.length-2] = ret.reduce(acc) % 256;
          port.write(ret.join(""), function(err) {
            if (err) console.error('Error in RET: ', err);
            console.info('Sent RET:', ret);
          });
        });
      }

      nack[id] = ret;
      id = (id + 1) % 256;
    }

    pkg_start = false;
    pkg = [];
  } else {
    console.error('Incorrect Data.');
    pkg_start = false;
    pkg = [];
  }

});
// When you're done you can destroy all ports with
// MockBinding.reset();
