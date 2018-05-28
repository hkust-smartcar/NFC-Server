const mysql = require('mysql');
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  database: "tuckshop"
});

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/*

SET @cbal := 0; SELECT user_id, product_id, bal_change, 
CASE WHEN product_id = 0 THEN (@cbal := @cbal + bal_change) ELSE (@cbal := @cbal - bal_change) END AS cum_bal FROM transactions WHERE user_id = 1;

SELECT COUNT(*) FROM users;

*/

rl.question('Enter the three keys in format [a,b,c].', (answer) => {
  answer = answer.split(",");
  // console.log(`You entered ${answer[0]}, ${answer[1]}, ${answer[2]}`);
  db.connect( (err) => {
    if (err) throw err;
    db.query("SELECT user_id, SUM(CASE WHEN product_id = 0 THEN bal_change ELSE -bal_change END) balance FROM transactions GROUP BY user_id", (err, balance) => {
      if (err) throw err;
      db.query("SELECT user_id, traded_at FROM transactions", (err, result) => {
        if (err) throw err;
        

      })
    });
  });
  rl.close();
});


