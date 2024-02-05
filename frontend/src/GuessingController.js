import { useState } from "react";
import { useGameRoomContext } from "./providers/GameRoomProvider";

const GuessingController = () => {
  const [word, setWord] = useState("");
  const context = useGameRoomContext();
  const { submitGuess } = context;

  const handleWordSubmit = (e) => {
    e.preventDefault();
    if (word.length < 5) return window.alert("Please enter a 5 letter word!");
    submitGuess(word);
    setWord("");
  };

  return (
    <form onSubmit={handleWordSubmit} className="guessForm">
      <h1 className="guessForm-header">Enter your five letter guess word!</h1>
      <input
        type="text"
        maxLength={5}
        placeholder="enter your guess word here ..."
        value={word}
        onChange={(e) => setWord(e.target.value.toLowerCase())} // Automatically convert to lowercase
        className="guessForm-input"
      />
      <button type="submit" className="greenButton">
        Submit
      </button>
    </form>
  );
};

export default GuessingController;
