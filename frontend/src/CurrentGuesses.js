import { useGameRoomContext } from "./providers/GameRoomProvider";

const CurrentGuesses = () => {
  const context = useGameRoomContext();
  const { myGuesses, opponentGuesses, oppUsername } = context;

  return (
    <div className="GuessBoard">
      <section className="GuessBoard-section">
        <h1 className="GuessBoard-Header">My Guesses</h1>
        {myGuesses.length > 0 ? (
          <ul className="GuessBoard-List">
            {myGuesses.map((myGuess, index) => (
              <li key={index}>
                <p className="guess-word-small">{myGuess.guessWord.toUpperCase()}</p>
                <b className="num-matching">{myGuess.numOfMatching}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="guess-word-small">No guesses yet.</p>
        )}
      </section>

      <section className="GuessBoard-section">
        <h1 className="GuessBoard-Header">{oppUsername}'s Guesses</h1>
        {opponentGuesses.length > 0 ? (
          <ul className="GuessBoard-List">
            {opponentGuesses.map((opponentGuess, index) => (
              <li key={index}>
                <p className="guess-word-small">{opponentGuess.guessWord.toUpperCase()}</p>
                <b className="num-matching">{opponentGuess.numOfMatching}</b>
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
