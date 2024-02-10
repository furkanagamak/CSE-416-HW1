const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// User Schema
const userSchema = new Schema({
  username: { type: String, unique: true, required: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalGuesses: { type: Number, default: 0 },
  secondsPlayed: { type: Number, default: 0 },
});

// Game Schema
const gameSchema = new Schema({
  roomId: { type: Number, unique: true },
  timeStarted: { type: Date, default: Date.now },
  timeEnd: Date,
  playerTakingTurn: { type: String },
});

// PlayerGameStats Schema
const playerGameStatsSchema = new Schema({
  player_id: { type: Schema.Types.ObjectId, ref: "User" }, //This should be used once cookies and username assigning are implemented
  socket_id: {type: String},  //using this temporarily, should be removed once above is implemented
  game_id: { type: Schema.Types.ObjectId, ref: "Game" },
  totalGuesses: { type: Number, default: 0 },
  secondsPlayed: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
  secretWord: { type: String},
  timeTakenForGuesses: { type: Number, default: 0 },
  username: { type: String },
});



// Define models based on the schemas
const User = mongoose.model("User", userSchema);
const Game = mongoose.model("Game", gameSchema);
const PlayerGameStats = mongoose.model(
  "PlayerGameStats",
  playerGameStatsSchema
);

module.exports = { User, Game, PlayerGameStats};