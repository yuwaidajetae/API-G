let express = require("express"); // "npm install express"
let app = express();

app.listen(4000);
console.log("Servern körs på port 4000");


const mysql = require("mysql"); // "npm install mysql"
con = mysql.createConnection({
  host: "localhost", // databas-serverns IP-adress
  user: "root", // standardanvändarnamn för XAMPP
  password: "", // standardlösenord för XAMPP
  database: "jensen2023", 
  multipleStatements: true,
});

app.use(express.json()); // för att läsa data från klient och för att skicka svar (ersätter bodyparser som vi använt någon gång tidigare)


app.get("/", function (req, res) {
  res.sendFile(__dirname + "/dokumentation.html");
});


const COLUMNS =["id", "username", "password", "name", "email"]; 

// returnera en databastabell som JSON
app.get("/users", function (req, res) {
  let sql = "SELECT * FROM users"; 
  let condition = createCondition(req.query); 
  console.log(sql + condition); 
  // skicka query till databasen
  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});
// route-parameter
app.get("/users/:id", function (req, res) {
  // Värdet på id ligger i req.params
  let sql = "SELECT * FROM users WHERE id=" + req.params.id;
  console.log(sql);
  // skicka query till databasen
  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404); // 404=not found
    }
  });
});


let createCondition = function (query) {
    // skapar ett WHERE-villkor utifrån query-parametrar
    console.log(query);
    let output = " WHERE ";
    for (let key in query) {
      if (COLUMNS.includes(key)) {
        // om vi har ett kolumnnamn i vårt query
        output += `${key}="${query[key]}" OR `; 
      }
    }
    if (output.length == 7) {
      // " WHERE "
      return ""; //  returnera en tom sträng
    } else {
      return output.substring(0, output.length - 4); // ta bort sista " OR "
    }
  };

  app.put("/users/:id", function (req, res) {
    //kod här för att hantera anrop…
    // kolla först att all data som ska finnas finns i request-body
    if (!(req.body && req.body.name && req.body.email && req.body.password)) {
      // om data saknas i body
      res.sendStatus(400);
      return;
    }
    let sql = `UPDATE users 
          SET name = '${req.body.name}', email = '${req.body.email}', password = '${req.body.password}'
          WHERE id = ${req.params.id}`;
  
    con.query(sql, function (err, result, fields) {
      if (err) {
        throw err;
        //kod här för felhantering, skicka felmeddelande osv.
      } else {
        // meddela klienten att request har processats OK
        res.sendStatus(200);
      }
    });
});

const crypto = require("crypto"); //INSTALLERA MED "npm install crypto" I KOMMANDOTOLKEN
function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}


// samma som i tidigare exempel (hantera POST och skriva till databas), men med hashat lösenord
app.post("/users", function (req, res) {
  if (!req.body.username) {
    res.status(400).send("username required!");
    return;
  }
  let fields = ["name", "password", "email", "username"]; // ändra eventuellt till namn på er egen databastabells kolumner
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return;
    }
  }

  // Det hashade lösenordet kan ha över 50 tecken
  let sql = `INSERT INTO users (username, email, name, password)
    VALUES ('${req.body.username}', 
    '${req.body.email}',
    '${req.body.name}',
    '${hash(req.body.password)}');
    SELECT LAST_INSERT_ID();`; // OBS! hash(req.body.password) i raden ovan!
  console.log(sql);

  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    console.log(result);
    let output = {
      id: result[0].insertId,
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
    }; // returnera INTE lösenordet
    res.send(output);
  });
});

app.post("/login", function (req, res) {
  //kod här för att hantera anrop…
  let sql = `SELECT * FROM users WHERE username='${req.body.username}'`;

  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    if (result.length == 0) {
      res.sendStatus(401);
      return;
    }
    let passwordHash = hash(req.body.password);
    console.log(passwordHash);
    console.log(result[0].password);
    if (result[0].password == passwordHash) {
      res.send({
        // OBS: returnera inte password!
        name: result[0].name,
        username: result[0].username,
        email: result[0].email,
      });
    } else {
      res.sendStatus(401);
    }
  });
});
