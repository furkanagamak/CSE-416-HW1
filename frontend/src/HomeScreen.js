import React from "react";
import { useUserContext } from "./providers/UserProvider";

const HomeScreen = ({ setPage }) => {
  const username = useUserContext();

  const handleViewStats = () => {
    setPage("stats");
  };

  return (
    <div className="HomeScreen">
      <h1 className="HomeTitle">GUESS5</h1>
      <h2 className="Welcome">Welcome, {username}</h2>
      <button className="FindGame" onClick={() => setPage("game")}>
        Find Game
      </button>
      <button className="ViewStats" onClick={handleViewStats}>
        View Stats
      </button>
      <div className="game-rules">
        <h2>Game Rules:</h2>
        <ul className="game-rules-list">
          <li className="game-rules-main">
            This is a two-player, turn-based game.
          </li>
          <li className="game-rules-main">
            Both players choose a 5 letter secret word with no repeating
            letters.
          </li>
          <li className="game-rules-main">
            Once both players have submitted a valid word, one player is
            randomly selected to go first.
          </li>
          <li className="game-rules-main">
            Each player takes turn being the guessing player.
          </li>
          <li className="game-rules-main">
            The guessing player has 60 seconds to submit a valid 5 letter guess
            word:
          </li>
          <li className="game-rules-sub">
            If the 60 seconds passes and no submission has been made, the other
            player becomes the guessing player.
          </li>
          <li className="game-rules-sub">
            Guesses are restricted to 5 letter real words, and can have repeating
            letters.
          </li>
          <li className="game-rules-sub">
            If the guess word is the secret word of the other player, then the
            guessing player wins.
          </li>
          <li className="game-rules-sub">
            If the guess word is not the secret word of the other player, then
            the game will notify the guessing player how many letters of the
            guess word are within the other player's secret word. Then, the other
            player will become the guessing player.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HomeScreen;
