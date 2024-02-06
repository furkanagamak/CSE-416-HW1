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

// Function to start a countdown
const startCountdown = (player, roomId) => {
  const countdownTime = 10000; // 60 seconds in milliseconds
  // Emit an event to the player and their opponent indicating the countdown start
  io.to(player.id).emit("countdown start", countdownTime);
  io.to(player._opponent.id).emit("countdown start", countdownTime);
  player._turnTimeout = setTimeout(() => {
    console.log(`Player ${player.id}'s turn skipped due to timeout`);
    // Switch turns
    player._game.playerTakingTurn = player._opponent.id;
    io.to(roomId).emit("take turn", player._opponent.id);
    player._game.save();
    startCountdown(player._opponent, roomId);
  }, countdownTime);
};

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
    socket_id: player1.id, //temporary
  });
  const playerJoin = await User.findOne({ username: player2.id });
  const playerJoinStats = new PlayerGameStats({
    player_id: playerJoin._id,
    game_id: game._id,
    socket_id: player2.id, //temporary
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

  currentRoomId++;
  waitingPlayer = null;
};

const endGame = async (socket, io, isForfeit) => {
  socket._game.timeEnd = Date.now();
  await socket._game.save();
  socket._gameStats.isWinner = true;
  socket._gameStats.secondsPlayed =
    (socket._game.timeEnd.getTime() - socket._game.timeStarted.getTime()) /
    1000;
  await socket._gameStats.save();
  socket._opponent._gameStats.isWinner = false;
  socket._opponent._gameStats.secondsPlayed =
    (socket._game.timeEnd.getTime() - socket._game.timeStarted.getTime()) /
    1000;
  await socket._opponent._gameStats.save();

  // Use playerGameStatsSchema's player_id field to find the user by ID, then update the user's gamesPlayed, gamesWon, totalGuesses, and secondsPlayed fields
  const player = await User.findById(socket._gameStats.player_id);
  player.gamesPlayed++;
  player.gamesWon++;
  player.totalGuesses += socket._gameStats.totalGuesses;
  player.secondsPlayed += socket._gameStats.secondsPlayed;
  await player.save();

  // Use playerGameStatsSchema's player_id field to find the user by ID, then update the user's gamesPlayed, gamesWon, totalGuesses, and secondsPlayed fields
  const opponent = await User.findById(socket._opponent._gameStats.player_id);
  opponent.gamesPlayed++;
  opponent.totalGuesses += socket._opponent._gameStats.totalGuesses;
  opponent.secondsPlayed += socket._opponent._gameStats.secondsPlayed;
  await opponent.save();

  // Calculate post-game statistics to send to the frontend
  const totalTimeTaken =
    (socket._game.timeEnd.getTime() - socket._game.timeStarted.getTime()) /
    1000;
  const playerStats = {
    username: socket._user.username,
    isWinner: true,
    totalGuesses: socket._gameStats.totalGuesses,
    secondsPlayed: totalTimeTaken,
    timeTakenForGuesses: socket._gameStats.timeTakenForGuesses,
  };
  const opponentStats = {
    username: socket._opponent._user.username,
    isWinner: false,
    totalGuesses: socket._opponent._gameStats.totalGuesses,
    secondsPlayed: totalTimeTaken,
    timeTakenForGuesses: socket._opponent._gameStats.timeTakenForGuesses,
  };

  const winnerMsg = isForfeit ? "You Won! (Opponent Forfeited)" : "You Won!";
  const loserMsg = isForfeit ? "You Lost! (You forfeited)" : "You Lost!";

  // Emit post-game stats to each player
  socket.emit("gameCompleted", [playerStats, opponentStats], true, winnerMsg);
  socket._opponent.emit(
    "gameCompleted",
    [playerStats, opponentStats],
    false,
    loserMsg
  );
  io.sockets.emit("updateStats");
};

io.on("connection", (socket) => {
  console.log(`${socket.id} is connected!`);

  const user = new User({ username: socket.id });
  user.save();

  io.sockets.emit("updateStats");

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

  socket.on("submit guess", async (guess, roomId, guessDuration) => {
    if (socket.id !== socket._game.playerTakingTurn)
      return console.error(
        "An user attempted to take a turn when it is not their turn"
      );
    clearTimeout(socket._turnTimeout);

    const opponentSecret = socket._opponent._gameStats.secretWord;
    const numOfMatching = countCorrectLetters(guess, opponentSecret);
    socket._gameStats.totalGuesses++;
    socket._gameStats.timeTakenForGuesses += guessDuration; // Update time taken for guesses
    await socket._gameStats.save();

    // Check if the guess is exactly the same as the secret
    if (guess === opponentSecret) {
      await endGame(socket, io, false);
      return;
    }

    io.to(roomId).emit("receive guess", guess, numOfMatching, socket.id);
    socket._game.playerTakingTurn = socket._opponent.id;
    await socket._game.save();
    io.to(roomId).emit("take turn", socket._opponent.id);
    startCountdown(socket._opponent, roomId);
  });

  socket.on("forfeit", async () => {
    await endGame(socket._opponent, io, true);
  });

  socket.on("gameCompleted", async () => {
    const stats = await User.find({});
    io.sockets.emit("updateStats", stats);
  });

  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    console.log(`${socket.id} has disconnected!`);
  });

  socket.on("chatMessage", (room, chatMessage) => {
    const formattedMessage = {
      text: chatMessage.text,
      sender: socket.id,
      time: chatMessage.time,
    };
    io.to(room).emit("chatMessage", formattedMessage);
  });

  socket.on("submitSecretWord", async ({ roomId, secretWord }) => {
    console.log(roomId, secretWord);
    // Find the game using roomId
    const game = await Game.findOne({ roomId: roomId });
    if (!game) {
      console.error("Game not found");
      return;
    }
    // Find the player's game statistics
    const playerStat = await PlayerGameStats.findOne({
      game_id: game._id,
      socket_id: socket.id,
    });
    if (playerStat) {
      playerStat.secretWord = secretWord;
      await playerStat.save();

      // Save the secret word to the socket
      socket._gameStats.secretWord = secretWord;
      await socket._gameStats.save();

      // Check if both players have submitted their secret words
      const gameStats = await PlayerGameStats.find({ game_id: game._id });
      if (
        gameStats.length === 2 &&
        gameStats.every((stat) => stat.secretWord)
      ) {
        io.to(roomId).emit("gameStart");
        io.to(roomId).emit("take turn", socket._game.playerTakingTurn);
        startCountdown(
          io.sockets.sockets.get(socket._game.playerTakingTurn),
          roomId
        );
      } else {
        socket.emit("secretWordConfirmed");
      }
    } else {
      console.error("Player stats not found");
    }
    if (playerStat) {
      playerStat.secretWord = secretWord;
      await playerStat.save();

      // Save the secret word to the socket
      socket._gameStats.secretWord = secretWord;
      await socket._gameStats.save();

      // Check if both players have submitted their secret words
      const gameStats = await PlayerGameStats.find({ game_id: game._id });
      if (
        gameStats.length === 2 &&
        gameStats.every((stat) => stat.secretWord)
      ) {
        io.to(roomId).emit("gameStart");
      } else {
        socket.emit("secretWordConfirmed");
      }
    } else {
      console.error("Player stats not found");
    }
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
