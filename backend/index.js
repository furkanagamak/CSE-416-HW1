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
const secret = "leave";

const initGameInstance = async (player1, player2) => {
  // decides which player goes first
  let playerTakingTurn;
  if (Math.round(Math.random()) === 0) playerTakingTurn = player1;
  else playerTakingTurn = player2;

  // creates game instance
  const game = new Game({
    roomId: currentRoomId,
    playerTakingTurn: playerTakingTurn.id,
  });

  // initaite players' gameStat instances
  const playerWait = await User.findOne({ username: player1.id });
  const playerWaitStats = new PlayerGameStats({
    player_id: playerWait._id,
    game_id: game._id,
  });
  const playerJoin = await User.findOne({ username: player2.id });
  const playerJoinStats = new PlayerGameStats({
    player_id: playerJoin._id,
    game_id: game._id,
  });

  await game.save();
  await playerWaitStats.save();
  await playerJoinStats.save();

  // associate each player's socket with their game and gameStat instances
  player1._game = game;
  player1._gameStats = playerWaitStats;
  player2._game = game;
  player2._gameStats = playerJoinStats;
  player1._opponent = player2;
  player2._opponent = player1;

  // socket operations
  player1.join(currentRoomId);
  player2.join(currentRoomId);
  console.log(`${player1.id} has joined room ${currentRoomId}`);
  console.log(`${player2.id} has joined room ${currentRoomId}`);

  io.to(currentRoomId).emit("confirm join", currentRoomId);
  io.to(currentRoomId).emit("take turn", playerTakingTurn.id);

  currentRoomId++;
  waitingPlayer = null;
};

io.on("connection", (socket) => {
  console.log(`${socket.id} is connected!`);

  const user = new User({ username: socket.id });
  user.save();

  socket._user = user;
  socket._game = null;
  socket._gameStats = null;
  socket._turnStart = null;
  socket._opponent = null;

  socket.on("join queue", () => {
    // no one on the queue
    if (!waitingPlayer) {
      waitingPlayer = socket;
      console.log(`${waitingPlayer.id} is now waiting `);
    }
    // someone waiting on the queue, intiate game instance
    else {
      if (waitingPlayer === socket)
        return console.log(
          `${socket.id} tried to join the queue but is already on the queue`
        );

      initGameInstance(waitingPlayer, socket);
    }
  });

  socket.on("submit guess", (guess, roomId) => {
    if (socket.id !== socket._game.playerTakingTurn)
      return console.error(
        "An user attempted to take a turn when it is not their turn"
      );

    const opponentSecret = secret;
    const numOfMatching = countCorrectLetters(guess, opponentSecret);
    socket._gameStats.totalGuesses++;
    socket._gameStats.save();
    io.to(roomId).emit("receive guess", guess, numOfMatching, socket.id);
    socket._game.playerTakingTurn = socket._opponent.id;
    socket._game.save();
    io.to(roomId).emit("take turn", socket._opponent.id);
  });

  socket.on("gameCompleted", async () => {
    const stats = await User.find({});
    io.sockets.emit("updateStats", stats);
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    console.log(`${socket.id} has disconnected!`);
  });
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

function countCorrectLetters(needle, haystack) {
  // Convert both needle and haystack to lowercase for case-insensitive comparison
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();

  let count = 0;

  // Iterate through each character in the needle
  for (let i = 0; i < needle.length; i++) {
    // Check if the current character in needle is present in haystack
    if (haystack.includes(needle[i])) {
      count++;
    }
  }

  return count;
}

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
