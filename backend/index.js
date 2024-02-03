// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const { User, Game, PlayerGameStats, Message } = require('./models');

mongoose.connect('mongodb://127.0.0.1:27017/guess5', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected.'))
  .catch(err => {
    console.error('Database connection error:', err);
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

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('gameCompleted', async () => {
    const stats = await User.find({});
    io.sockets.emit('updateStats', stats);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Creates a user.
app.post("/user", async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
    io.sockets.emit('updateStats'); // Emit an event to update stats (This is just for testing purposes, we should remove it later).
  } catch (err) {
    res.status(400).send(err);
  }
}
);
