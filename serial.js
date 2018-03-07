// const SerialPort = require('serialport/test'); // when installed as a package
// const MockBinding = SerialPort.Binding;
// const portPath = '/dev/rfcomm1';
// MockBinding.createPort(portPath, { echo: false, record: false });

var SerialPort = require('serialport');
var port = new SerialPort('/dev/rfcomm1',{ baudRate: 115200 });
var { execSync } = require('child_process');
const ByteLength = SerialPort.parsers.ByteLength;
const parser = port.pipe(new ByteLength({length: 1}));
const acc = (accumulator, currentValue) => accumulator + currentValue;
var mysql = require('mysql');

var db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});

console.log('Server starts.');

port.on('error', function(err) {
  console.log('Error: ', err.message);
});

var pkg_start = false;
var len = -1;
var pkg = [];
var nack = {};
var id = 0;
var log = [];
// HEAD | SIZE | TYPE | DATA | TAIL
parser.on('data', function (data) {
  var local_id = id;
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
    /*console.info("Recieved package: ", `[${pkg.map(x => x.toString(16)).toString()}]`);*/
    log.push("Recieved package: " + pkg);
    /* Handling Package */

    /* Check Validity */
    if ((pkg.reduce(acc)-pkg[pkg.length-2])%256 != pkg[pkg.length-2]) {
      pkg_start = false;
      pkg = [];
      log.push("Incorrect PKG checksum.");
      return;
    }

    if (pkg[2] == 0x00) {
      delete nack[pkg[3]];
      log.push("Cleared RET ID" + pkg[3]);
    } else if (pkg[2] <= 0x03) {

      /* ACK */
      var ack = [0xAA, 6, 0x00, pkg[3], 0, 0xFF];

      ack[ack.length-2] = ack.reduce(acc) % 256;
      port.write(ack, function(err) {
        if (err) console.error('Error in ACK: ', err);
        log.push('Sent ACK:' + ack);
      });

      if (pkg[2] == 0x01) {

        db.query("SELECT name, price FROM products", function (err, result, fields) {
          id = (id + result.length) % 256;
          if (err) throw err;
          var rets = [];
          for (var i = 0; i < result.length; i++) {
            var ret = [0xAA, 0, 0x01, (local_id + i) % 256, i];
            var t = result[i].name.replace(/\n/g, "").split("");
            t.forEach((e,i,a) => { a[i] = e.charCodeAt(0); });
            ret = ret.concat(t);
            var price = result[i].price;
            ret.push(Math.floor(price/256));
            ret.push(price%256);
            ret.push(0,0xFF);
            ret[1] = ret.length;
            ret[ret.length-2] = (ret.reduce(acc)-ret[ret.length-2])%256;
            rets.push(ret);

            log.push('Pushed RET ' + ret + ' to NACK with ID ' + (local_id + i) % 256);
            nack[(local_id + i) % 256] = ret;
            // local_id = (local_id + 1) % 256;
          }
        });
      }
      /* Handles IP Request */
      else if (pkg[2] == 0x03) {
        id = (id + 1) % 256;
        var stdout = execSync('hostname -I');
        var ret = [];
        stdout = stdout.toString().replace(/\n/g, "").split('.');
        stdout.forEach((item, i, array) => {array[i] = parseInt(item)});
        ret = [0xAA, 10, 0x03, local_id, stdout[0], stdout[1], stdout[2], stdout[3], 0, 0xFF];
        ret[ret.length-2] = ret.reduce(acc) % 256;
        log.push('Pushed RET ' + ret + ' to NACK with ID ' + local_id);
        nack[local_id] = ret;

      } else {
        log.push('Incorrect Data: ' + pkg);
        pkg_start = false;
        pkg = [];
        return;
      }

    }

    pkg_start = false;
    pkg = [];
  } else {
    log.push('Incorrect Data: ' + pkg);
    pkg_start = false;
    pkg = [];
  }

});

function resend() {
  for (var key in nack) {
    port.write(nack[key], function(err) {
      if (err) log.push('Error in resending NACK: ' + err);
      log.push(`*Resent NACK ${key}:  ${nack[key]}`);
    });
  }
}

setInterval(resend, 500);

function printLog() {
  if (log.length > 0) log.forEach( (e) => { console.log(e); });
  log = [];
}

setInterval(printLog, 1000);
