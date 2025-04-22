const path = require("path");
const fs = require("fs");
const express = require("express");
const OS = require("os");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const serverless = require("serverless-http");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "/")));
app.use(cors());

//process.env.MONGO_URI = mongodb+srv://supercluster-d83jj.mongodb.net/superdata
//process.env.MONGO_USERNAME = superuser
//process.env.MONGO_PASSWORD = SuperPassword

const DB_HOST = "localhost";
const DB_PORT = "27017";

const URI = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PAASWD}@${DB_HOST}:${DB_PORT}?authSource=admin`;

async function connectToMongo() {
  try {
    await mongoose.connect(URI);
    console.log("MongoDB Connection Successful");
  } catch (err) {
    console.log("MongoDB Connection Error:", err);
  }
}

connectToMongo();


var Schema = mongoose.Schema;

var dataSchema = new Schema({
  name: String,
  id: Number,
  description: String,
  image: String,
  velocity: String,
  distance: String,
});
var planetModel = mongoose.model("planets", dataSchema);

app.post("/planet", async function (req, res) {
  // console.log("Received Planet ID " + req.body.id)
  try {
    const planetData = await planetModel.findOne({ id: req.body.id });
    res.send(planetData);
  } catch (err) {
    console.error("Ooops, We only have 9 planets and a sun. Select a number from 0 - 9");
    res.send("Error in Planet Data");
  }
});


app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "/", "index.html"));
});

app.get("/api-docs", (req, res) => {
  fs.readFile("oas.json", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      res.status(500).send("Error reading file");
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.get("/os", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    os: OS.hostname(),
    env: process.env.NODE_ENV,
  });
});

app.get("/live", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    status: "live",
  });
});

app.get("/ready", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send({
    status: "ready",
  });
});

app.listen(4000, () => {
  console.log("Server successfully running on port - " + 4000);
});
module.exports = app;

//module.exports.handler = serverless(app)
