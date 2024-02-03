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

let waitingPlayer = null;
let currentRoomId = 1;

io.on("connection", (socket) => {
  console.log(`${socket.id} is connected!`);

  socket.on("submit guess", (guess, roomId) => {
    const numOfMatching = 0;
    io.to(roomId).emit("receive guess", guess, numOfMatching, socket.id);
  });

  socket.on("join queue", () => {
    // no one on the queue
    if (!waitingPlayer) {
      waitingPlayer = socket;
      console.log(`${waitingPlayer.id} is now waiting `);
    }
    // someone waiting on the queue
    else {
      if (waitingPlayer === socket)
        return console.log(
          `${socket.id} tried to join the queue but is already on the queue`
        );
      waitingPlayer.join(currentRoomId);
      socket.join(currentRoomId);

      console.log(`${waitingPlayer.id} has joined room ${currentRoomId}`);
      console.log(`${socket.id} has joined room ${currentRoomId}`);

      io.to(currentRoomId).emit("confirm join", currentRoomId);

      currentRoomId++;
      waitingPlayer = null;
    }
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    console.log(`${socket.id} has disconnected!`);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
