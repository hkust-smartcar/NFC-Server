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
