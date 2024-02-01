// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(cookieParser());
const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("Hello World");
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
