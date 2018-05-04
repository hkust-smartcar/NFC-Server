const SerialPort = require('serialport');
const port = new SerialPort('/dev/rfcomm1', { baudRate: 115200 });
const { execSync } = require('child_process');
const ByteLength = SerialPort.parsers.ByteLength;
const parser = port.pipe(new ByteLength({ length: 1 }));
const acc = (accumulator, currentValue) => accumulator + currentValue;
const mysql = require('mysql');
const fs = require('file-system');
const moment = require('moment');
var total_prod_cnt = 0;
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});

const log_name = Date.now() + ".txt";

db.query("SELECT COUNT(*) AS CNT FROM products", function (err, result, fields) {
  total_prod_cnt = result[0].CNT;
  console.log(`There are ${total_prod_cnt} products.`)
  console.log('Server starts.');
});

port.on('error', function (err) {
  console.log('Error: ', err.message);
});

var pkg_start = false; // Check whether a package start has received
var len = -1; // Check package length
var pkg = []; // Buffer for incoming package
var nack = {}; // To store nack packages
var id = 0; // Current outbound package id
var log = []; // To store all log
var handlings = []; // To store the id of the requests that are currently handling

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
  } else if (pkg_start && pkg.length < len - 1) {
    pkg.push(ch);
  } else if (pkg_start && pkg.length == len - 1 && ch == 0xFF) {
    pkg.push(ch);
    /*console.info("Received package: ", `[${pkg.map(x => x.toString(16)).toString()}]`);*/
    log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + "Received package: " + pkg);

    /* Handling Package */

    /* Check Validity */
    if ((pkg.reduce(acc) - pkg[pkg.length - 2]) % 256 != pkg[pkg.length - 2]) {
      pkg_start = false;
      pkg = [];
      log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + "Incorrect PKG checksum.");
      return;
    }

    /* Check if is currently handling */
    if (handlings.some((cur) => { return cur == pkg[3]; }) == false) {
      log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + `Handling ID ${pkg[3]}.`)
      handlings.push(pkg[3]);
    } else {
      log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + `Already processing ID ${pkg[3]}.`)
      return; // handling the same package already
    }

    /* Handles ACK packages */
    if (pkg[2] == 0x00) {
      delete nack[pkg[3]];
      log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + "Cleared RET ID" + pkg[3]);
    } else if (pkg[2] <= 0x03) {

      /* ACK */
      var ack = [0xAA, 6, 0x00, pkg[3], 0, 0xFF];
      ack[ack.length - 2] = ack.reduce(acc) % 256;
      port.write(ack, function (err) {
        if (err) console.error('Error in ACK: ', err);
        log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Sent ACK:' + ack);
      });

      /* Handles product list request */
      if (pkg[2] == 0x01) {
        id = (id + total_prod_cnt + 1) % 256;
        db.query("SELECT name, price FROM products", function (err, result, fields) {
          if (err) throw err;
          var first = [0xAA, 8, 0x01, local_id, 0, result.length, 0, 0xFF];
          first[first.length - 2] = (first.reduce(acc)) % 256;
          nack[local_id++] = first;
          for (var i = 0; i < result.length; i++) {
            var ret = [0xAA, 0, 0x01, (local_id + i) % 256, i + 1];
            var t = result[i].name.replace(/\n/g, "").split("");
            t.forEach((e, i, a) => { a[i] = e.charCodeAt(0); });
            ret = ret.concat(t);
            var price = result[i].price;
            ret.push(Math.floor(price % 256));
            ret.push(Math.floor(price / 256));
            ret.push(0, 0xFF);
            ret[1] = ret.length;
            ret[ret.length - 2] = (ret.reduce(acc) - ret[ret.length - 2]) % 256;

            log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Pushed RET ' + ret + ' to NACK with ID ' + (local_id + i) % 256);
            nack[(local_id + i) % 256] = ret;
          }
        });
      }

      /* Handles Purchase Request */
      else if (pkg[2] == 0x02) {
        id = (id + 1) % 256;
        var uid = pkg[4] + pkg[5] * 256;
        var bal = pkg[7] + pkg[8] * 256;
        var pid = pkg[6];
        var chk = pkg[9] + pkg[10] * 256 + pkg[11] * 256 * 256 + pkg[12] * 256 * 256 * 256;

        // select * from  transactions where user_id=4 and product_id=5 and bal_change=3 and checksum=311702;

        var query = `select * from  transactions where 
          user_id=${uid} and
          product_id=${pid} and
          bal_change=${bal} and
          checksum=${chk};
        `

        db.query(query, function (err, results) {
          if (err) throw err;
          if (results.length > 0) {
            let exist_duplicated = results.reduce((carry, { traded_at }) => carry || Number(moment().format('x')) - Number(traded_at) < 1000, false)
            if (exist_duplicated) {
              log.push("there exist duplication : " + JSON.stringify(results))
              return
            }
          }

          //no duplication => insert transaction
          var query = `INSERT INTO transactions (user_id, product_id, bal_change, checksum) VALUES (${uid}, ${pid}, ${bal}, ${chk});`;
          db.query(query, function (err, result) {
            if (err) throw err;
            log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + "1 record inserted: " + query);
            db.query("select max(traded_at) as time from transactions;", function (err, result) {
              if (err) throw err;
              var temp = (result[0].time);
              temp = new Date(temp)
              temp = temp.getTime() / 1000
              var time = [];
              for (var i = 0; i < 4; i++) {
                time.push(temp % 256);
                temp = Math.floor(temp / 256);
              }
              log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Time calculated: ' + time);
              var ret = [0xAA, 10, 0x02, local_id, time[0], time[1], time[2], time[3], 0, 0xFF];
              ret[ret.length - 2] = ret.reduce(acc) % 256;
              log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Pushed RET ' + ret + ' to NACK with ID ' + local_id);
              nack[local_id] = ret;
            }
            )
          });

        })


      }

      /* Handles IP Request */
      else if (pkg[2] == 0x03) {
        id = (id + 1) % 256;
        var stdout = execSync('hostname -I');
        var ret = [];
        stdout = stdout.toString().replace(/\n/g, "").split('.');
        stdout.forEach((item, i, array) => { array[i] = parseInt(item) });
        ret = [0xAA, 10, 0x03, local_id, stdout[0], stdout[1], stdout[2], stdout[3], 0, 0xFF];
        ret[ret.length - 2] = ret.reduce(acc) % 256;
        log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Pushed RET ' + ret + ' to NACK with ID ' + local_id);
        nack[local_id] = ret;
      } else {
        /* Invalid package type */
        log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Incorrect Data: ' + pkg);
        pkg_start = false;
        handlings.splice(handlings.indexOf(pkg[3]), 1); // remove the package from handling
        pkg = [];
        return;
      }
    }

    /* Clear cache */
    pkg_start = false;
    log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + `Finished handling ID ${pkg[3]}.`)
    handlings.splice(handlings.indexOf(pkg[3]), 1); // remove the package from handling
    pkg = [];
  } else {
    log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Incorrect Data: ' + pkg);
    pkg_start = false;
    handlings.splice(handlings.indexOf(pkg[3]), 1); // remove the package from handling
    pkg = [];
  }

});

function resend() {
  for (var key in nack) {
    port.write(nack[key], function (err) {
      if (err) log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + 'Error in resending NACK: ' + err);
      log.push(moment().format('YYYYMMDD hh:mm:ss.SSS ') + `Resent NACK ${key}:  ${nack[key]}`);
    });
  }
}

setInterval(resend, 500);

function printLog() {
  if (log.length > 0) {
    log.forEach((e) => {
      console.log(e);
      fs.appendFile(log_name, e + '\n', function (err) { })
    })
  };
  log = [];
}

setInterval(printLog, 1000);
