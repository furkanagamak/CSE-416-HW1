// server.js
const cookie = require("cookie");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { faker } = require("@faker-js/faker");

const { User, Game, PlayerGameStats } = require("./models");
const { Socket } = require("dgram");

const fs = require("fs").promises;

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
const secret = "leave";

app.get("/get-or-assign-name", async (req, res) => {
  if (req.cookies.username) {
    console.log("Username from cookie:", req.cookies.username); // Log the username to the console
    res.json({ username: req.cookies.username });
  } else {
    let usernameAssigned = false;
    let username;

    while (!usernameAssigned) {
      let adjective = faker.word.adjective();
      let noun = faker.word.noun();
      adjective = adjective.charAt(0).toUpperCase() + adjective.slice(1);
      noun = noun.charAt(0).toUpperCase() + noun.slice(1);
      username = adjective + '_' + noun;
      try {
        const userExists = await User.findOne({ username: username });
        if (!userExists) {
          const user = new User({ username: username });
          await user.save();
          res.cookie("username", username, { maxAge: 10000000 });
          res.json({ username });
          usernameAssigned = true;
        }
      } catch (error) {
        console.error("Error checking or saving user:", error);
      }
    }
  }
});

// Function to start a countdown
const startCountdown = (player, roomId) => {
  const countdownTime = 60000; // 60 seconds in milliseconds
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

  // Look up the game with the highest roomId
  const gameWithHighestRoomId = await Game.findOne().sort({ roomId: -1 });

  // creates game instance
  const game = new Game({
    roomId: gameWithHighestRoomId ? gameWithHighestRoomId.roomId + 1 : 1,
    playerTakingTurn: playerTakingTurn.id,
  });

  // initaite players' gameStat instances
  const playerWait = await User.findOne({ _id: player1._user._id });
  const playerWaitStats = new PlayerGameStats({
    player_id: playerWait._id,
    game_id: game._id,
    socket_id: player1.id, //temporary
    username: playerWait.username,
  });
  const playerJoin = await User.findOne({ _id: player2._user._id });
  const playerJoinStats = new PlayerGameStats({
    player_id: playerJoin._id,
    game_id: game._id,
    socket_id: player2.id, //temporary
    username: playerJoin.username,
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
  player1.join(game.roomId);
  player2.join(game.roomId);
  console.log(`${player1.id} has joined room ${game.roomId}`);
  console.log(`${player2.id} has joined room ${game.roomId}`);

  io.to(game.roomId).emit("confirm join", {
    roomId: game.roomId,
    player1Stats: playerWaitStats,
    player2Stats: playerJoinStats,
  });

  waitingPlayer = null;
};

const endGame = async (socket, io, isForfeit) => {
  clearTimeout(socket._turnTimeout); // Clear the turn time out
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

io.on("connection", async (socket) => {
  const username = socket.handshake.query.username;
  console.log(username);
  if (username) {
    try {
      const user = await User.findOne({ username: username });
      if (user) {
        console.log("User found:", user.username);
        socket._user = user;
        console.log(
          `${socket.id} has been associated with user: ${user.username}`
        );
        // Acknowledge user set
        socket.emit("user set", user.username);
      } else {
        console.log("User not found with username:", username);
      }
    } catch (err) {
      console.error(err);
    }
  }

  io.sockets.emit("updateStats");
  socket._game = null;
  socket._gameStats = null;
  socket._turnStart = null;
  socket._opponent = null;

  socket.on("join queue", () => {
    // no one on the queue
    if (!waitingPlayer) {
      waitingPlayer = socket;
      console.log(`${socket._user} 1is now waiting`);
      console.log(`${waitingPlayer.id} is now waiting `);
    }
    // someone waiting on the queue, intiate game instance
    else {
      if (waitingPlayer === socket)
        return console.log(
          `${socket.id} tried to join the queue but is already on the queue`
        );
      console.log("Countdown starts for 3 seconds before initiating the game");
      io.to(waitingPlayer.id).emit("countdown starts", 3);
      io.to(socket.id).emit("countdown starts", 3);

      const waitPlayer = waitingPlayer;
      waitingPlayer = null;

      setTimeout(() => {
        console.log("Initiating game instance.");
        initGameInstance(waitPlayer, socket);
      }, 3000);
    }
  });

  socket.on("leave queue", () => {
    if (waitingPlayer == socket) {
      waitingPlayer = null;
      console.log(`${socket.id} has left the queue`);

      socket.emit("left queue", { success: true });
    } else {
      console.log(
        `${socket.id} attempted to leave the queue but was not waiting`
      );
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
    clearTimeout(socket._turnTimeout); // Clear the turn time out
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