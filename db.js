
var { exec } = require('child_process');
var mysql = require('mysql');
var db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});

db.query("SELECT name, price FROM products", function (err, result, fields) {
  if (err) throw err;
  var pkg = [result.length.toString()];
  for (var i = 0; i < result.length; i++) {
    pkg.push(result[i].name + ':' + result[i].price);
  }
  console.log(pkg);
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
