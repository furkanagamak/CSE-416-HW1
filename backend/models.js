const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// User Schema
const userSchema = new Schema({
  username: { type: String, unique: true, required: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalGuesses: { type: Number, default: 0 },
  secondsPlayed: { type: Number, default: 0 },
  lastGameTime: { type: Date, default: Date.now },
});

// Game Schema
const gameSchema = new Schema({
  timeStarted: { type: Date, default: Date.now },
  timeEnd: Date,
});

// PlayerGameStats Schema
const playerGameStatsSchema = new Schema({
  player_id: { type: Schema.Types.ObjectId, ref: "User" },
  game_id: { type: Schema.Types.ObjectId, ref: "Game" },
  timeTakenSecs: Number,
});

// Message Schema
const messageSchema = new Schema({
  player1_id: { type: Schema.Types.ObjectId, ref: "User" },
  player2_id: { type: Schema.Types.ObjectId, ref: "User" },
  Message: String,
  Game_id: { type: Schema.Types.ObjectId, ref: "Game" },
  Created_time: { type: Date, default: Date.now },
});

// Define models based on the schemas
const User = mongoose.model("User", userSchema);
const Game = mongoose.model("Game", gameSchema);
const PlayerGameStats = mongoose.model(
  "PlayerGameStats",
  playerGameStatsSchema
);
const Message = mongoose.model("Message", messageSchema);

module.exports = { User, Game, PlayerGameStats, Message };
