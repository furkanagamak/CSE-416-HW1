import { useState } from "react";

import {
  useGameRoomContext,
  checkWordExists,
} from "./providers/GameRoomProvider";


const GuessingController = () => {
  const [word, setWord] = useState("");
  const context = useGameRoomContext();
  const { submitGuess, gameStarted, yourTurn } = context;

  const handleWordSubmit = async (e) => {
    e.preventDefault();
    if (!/^[A-Za-z]+$/.test(word))
      return window.alert("Word must contain only alphabet characters!");

    if (word.length < 5) return window.alert("Please enter a 5 letter word!");

    const wordExists = await checkWordExists(word);
    if (!wordExists) return window.alert("Word must be a valid English word!");

    submitGuess(word);
    setWord("");
  };

  const submitBtn =
    gameStarted && yourTurn ? (
      <>
        <input
          type="text"
          maxLength={5}
          placeholder="Enter guess here ..."
          value={word}
          onChange={(e) => setWord(e.target.value.toLowerCase())} // Automatically convert to lowercase
          className="guessForm-input"
        />
        <button type="submit" className="greenButton">
          Submit
        </button>
      </>
    ) : (
      <>
        <input
          type="text"
          placeholder="Enter guess here ..."
          className="guessForm-input"
          value={word}
          onChange={(e) => setWord(e.target.value.toLowerCase())} // Automatically convert to lowercase
        />
        <button type="submit" className="button-disabled" disabled={true}>
          Submit
        </button>
      </>
    );

    return (
      <form onSubmit={handleWordSubmit} className="guessForm">
        {gameStarted && yourTurn ? (
          <h1 className="guessForm-header">Enter your five letter guess word!</h1>
        ) : (
          <h1 className="guessForm-header">Waiting for opponent...</h1> 
        )}
        {submitBtn}
      </form>
    );
};

export default GuessingController;
