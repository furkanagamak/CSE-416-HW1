// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const { User, Game, PlayerGameStats, Message } = require("./models");

const fs = require("fs").promises;
const filePath = "./wordList.txt";

mongoose
  .connect("mongodb://127.0.0.1:27017/guess5", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected."))
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

const app = express();

app.use(express.json());

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

// Route to get stats
app.get("/stats", async (req, res) => {
  try {
    const stats = await User.find({});
    res.json(stats);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/stats/lasthour", async (req, res) => {
  try {
    const oneHourAgo = new Date(new Date().getTime() - 60 * 60 * 1000);

    const lastHourGames = await Game.aggregate([
      {
        $match: {
          timeStarted: { $gte: oneHourAgo },
        },
      },
      {
        $lookup: {
          from: "playergamestats",
          localField: "_id",
          foreignField: "game_id",
          as: "playerStats",
        },
      },
      {
        $unwind: "$playerStats",
      },
      {
        $group: {
          _id: "$playerStats.player_id",
          totalGuesses: { $sum: "$playerStats.totalGuesses" },
          secondsPlayed: { $sum: "$playerStats.secondsPlayed" },
          gamesPlayed: { $sum: 1 },
          gamesWon: { $sum: { $cond: ["$playerStats.isWinner", 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "playerInfo",
        },
      },
      {
        $unwind: "$playerInfo",
      },
      {
        $project: {
          _id: 1,
          username: "$playerInfo.username",
          totalGuesses: 1,
          secondsPlayed: 1,
          gamesPlayed: 1,
          gamesWon: 1,
        },
      },
    ]);

    res.json(lastHourGames);
  } catch (err) {
    console.error("Error fetching last hour stats:", err);
    res.status(500).send("Error fetching last hour stats");
  }
});

// Socket.io for real-time updates
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("gameCompleted", async () => {
    const stats = await User.find({});
    io.sockets.emit("updateStats", stats);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Creates a user.
app.post("/user", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
    io.sockets.emit("updateStats"); // Emit an event to update stats (This is just for testing purposes, we should remove it later).
  } catch (err) {
    res.status(400).send(err);
  }
});

// Create a game and playerstats (This is just for testing purposes, we should remove it later).
app.post("/game", async (req, res) => {
  try {
    const game = new Game({
      timeStarted: Date.now(),
      timeEnd: Date.now(),
    });
    await game.save();

    const playerGameStats = new PlayerGameStats({
      player_id: req.body.player_id,
      game_id: game._id,
      totalGuesses: req.body.totalGuesses,
      secondsPlayed: req.body.secondsPlayed,
      isWinner: req.body.isWinner,
    });
    await playerGameStats.save();

    res.status(201).send(playerGameStats);
    io.sockets.emit("updateStats"); // Emit an event to update stats (This is just for testing purposes, we should remove it later).
  } catch (err) {
    res.status(400).send(err);
  }
});

// Function to check if a word exists in a .txt file
async function checkWordExists(word) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const words = data.split(/\r?\n/); // Split the file content by new line to get an array of words
    return words.includes(word); // Check if the word exists in the array
  } catch (err) {
    console.error("Error reading file:", err);
    return false; // Return false in case of an error
  }
}
