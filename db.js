
var { exec } = require('child_process');
var mysql = require('mysql');
var db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});
const acc = (accumulator, currentValue) => accumulator + currentValue;
var pkgs = [];
var id = 0;
var pid = 0;
db.query("SELECT name, price FROM products", function (err, result, fields) {
  var local_pkgs = pkgs;
  if (err) throw err;

  for (var i = 0; i < result.length; i++) {
    var pkg = [0xAA, 0, 0x01, id, i];
    var t = result[i].name.replace(/\n/g, "").split("");
    t.forEach((e,i,a) => { a[i] = e.charCodeAt(0); });
    pkg = pkg.concat(t);
    var price = result[i].price;
    pkg.push(Math.floor(price/256));
    pkg.push(price%256);
    console.log('Price ', result[i].price);
    pkg.push(0,0xFF);
    pkg[1] = pkg.length;
    pkg[pkg.length-2] = (pkg.reduce(acc)-pkg[pkg.length-2])%256;
    local_pkgs.push(pkg);
    pkg = [0xAA, 0, 0x01, ++id, i];
  }
  console.log(local_pkgs);
});

db.query("SELECT created_at FROM users", function (err, result, fields) {
  if (err) throw err;
  console.log(result[0].created_at);
});

exec('hostname -I', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`IP: ${stdout.split(".")}`);
});
