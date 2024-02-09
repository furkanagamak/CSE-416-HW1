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
        <button type="submit" className="greenButton">
          Submit
        </button>
      </>
    ) : (
      <>
        <button type="submit" className="button-disabled" disabled={true}>
          Submit
        </button>
      </>
    );

  return (
    <form onSubmit={handleWordSubmit} className="guessForm">
      <h1 className="guessForm-header">Enter your five letter guess word!</h1>
      <input
        type="text"
        maxLength={5}
        placeholder="enter your guess word here ..."
        value={word}
        onChange={(e) => setWord(e.target.value.toLowerCase())}
        className="guessForm-input"
      />
      {submitBtn}
    </form>
  );
};

export default GuessingController;
