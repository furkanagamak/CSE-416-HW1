import { useGameRoomContext } from "./providers/GameRoomProvider";

const CurrentGuesses = () => {
  const context = useGameRoomContext();
  const { myGuesses, opponentGuesses } = context;

  return (
    <div className="GuessBoard">
      <section className="GuessBoard-section">
        <h1 className="GuessBoard-Header">My Guesses</h1>
        <ul className="GuessBoard-List">
          {myGuesses.map((myGuess) => (
            <li>{myGuess.guessWord}</li>
          ))}
        </ul>
      </section>
      <section className="GuessBoard-section">
        <h1 className="GuessBoard-Header">Opponent's Guesses</h1>
        <ul className="GuessBoard-List">
          {opponentGuesses.map((opponentGuess) => (
            <li>{opponentGuess.guessWord}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default CurrentGuesses;
