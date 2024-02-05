const mongoose = require('mongoose');
const { User, Game, PlayerGameStats } = require('./models'); // Adjust the path as needed

const dbUri = 'mongodb://127.0.0.1:27017/guess5'; // Update with your MongoDB URI

mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected.'))
  .catch(err => console.log(err));

async function main() {
  try {
    // Create Users
    const user1 = await createUser('basics');
    const user2 = await createUser('advanced');

    // Create a Game with roomId
    const game = new Game({
      roomId: 2
    });
    await game.save();

    // Create PlayerGameStats with additional fields
    const playerStats1 = new PlayerGameStats({
      player_id: user1._id,
      game_id: game._id,
      totalGuesses: 5,
      secondsPlayed: 300,
      isWinner: true,
      secretWord: 'apple'
    });
    await playerStats1.save();

    const playerStats2 = new PlayerGameStats({
      player_id: user2._id,
      game_id: game._id,
      totalGuesses: 7,
      secondsPlayed: 450,
      isWinner: false,
      secretWord: 'grape'
    });
    await playerStats2.save();

    console.log('Database seeded!');
  } catch (error) {
    console.error('An error occurred while seeding the database:', error);
  } finally {
    mongoose.disconnect();
  }
}

async function createUser(username) {
  const user = new User({
    username: username,
    gamesPlayed: 10,
    gamesWon: 5,
    totalGuesses: 50,
    secondsPlayed: 1000
  });
  await user.save();
  return user;
}

main();