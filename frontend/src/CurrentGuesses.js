import { useGameRoomContext } from "./providers/GameRoomProvider";

const CurrentGuesses = () => {
  const context = useGameRoomContext();
  const { myGuesses, opponentGuesses } = context;

  return (
    <div className="GuessBoard">
      <section className="GuessBoard-section">
        <h1 className="GuessBoard-Header">My Guesses</h1>
        {myGuesses.length > 0 ? (
          <ul className="GuessBoard-List">
            {myGuesses.map((myGuess, index) => (
              <li key={index}>
                <p>{myGuess.guessWord}</p>
                <b>{myGuess.numOfMatching}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p>No guesses yet.</p>
        )}
      </section>

      <section className="GuessBoard-section">
        <h1 className="GuessBoard-Header">Opponent's Guesses</h1>
        {opponentGuesses.length > 0 ? (
          <ul className="GuessBoard-List">
            {opponentGuesses.map((opponentGuess, index) => (
              <li key={index}>
                <p>{opponentGuess.guessWord}</p>
                <b>{opponentGuess.numOfMatching}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p>No guesses yet.</p>
        )}
      </section>
    </div>
  );
};

export default CurrentGuesses;
