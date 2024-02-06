import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocketContext } from "./SocketProvider";
import "./PostGameModal.css";
import SecretWordModal from "../SecretWord";

const GameRoomContext = createContext(undefined);

export const useGameRoomContext = () => {
  const context = useContext(GameRoomContext);
  if (!context)
    throw new Error(
      "useGameRoomContext not used within the approriate provider"
    );

  return context;
};

const PostGameModal = ({ stats, setPage, won, message }) => {
  if (!stats || stats.length === 0) return null;

  return (
    <div className={`modal ${stats ? "open" : ""}`}>
      <div className="modal-content">
        <h2>Game Results</h2>
        <h2 className={won ? "PostGameModal-WonMsg" : "PostGameModal-LostMsg"}>
          {message}
        </h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Result</th>
              <th>Number of Guesses</th>
              <th>Time Taken for Guesses (seconds)</th>
              <th>Average Time per Guess (seconds)</th>
              <th>Time Played (seconds)</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((playerStats, index) => (
              <tr key={index}>
                <td>{playerStats.username}</td>
                <td>{playerStats.isWinner ? "Won" : "Lost"}</td>
                <td>{playerStats.totalGuesses}</td>
                <td>{playerStats.timeTakenForGuesses.toFixed(2)}</td>
                <td>
                  {playerStats.totalGuesses > 0
                    ? (
                        playerStats.timeTakenForGuesses /
                        playerStats.totalGuesses
                      ).toFixed(2)
                    : (0).toFixed(2)}
                </td>
                <td>{playerStats.secondsPlayed.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setPage("main")}>Return to Home</button>
      </div>
    </div>
  );
};

export const GameRoomContextProvider = ({ children, setPage }) => {
  const [myGuesses, setMyGuesses] = useState([]);
  const [opponentGuesses, setOpponentGuesses] = useState([]);
  const [room, setRoom] = useState(undefined);
  const [inQueue, setInQueue] = useState(false);
  const [isSecretWordSubmitted, setIsSecretWordSubmitted] = useState(false);
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(true);
  const [secretModalContent, setSecretModalContent] = useState("enterWord");
  const [gameStarted, setGameStarted] = useState(false);
  const [yourTurn, setYourTurn] = useState(false);
  const socket = useSocketContext();

  const [postGameStats, setPostGameStats] = useState(null);
  const [turnStartTime, setTurnStartTime] = useState(null);

  const handleSecretModalClose = () => {
    setIsSecretModalOpen(false);
  };

  const submitGuess = (guessWord) => {
    if (guessWord.length < 5)
      return window.alert("You need to enter a 5 letter word");
    const endTime = Date.now(); // Record the end time when the guess is submitted
    const duration = turnStartTime ? (endTime - turnStartTime) / 1000 : 0; // Calculate the duration in seconds

    socket.emit("submit guess", guessWord, room, duration); // Send this duration to the server as well
    setTurnStartTime(null); // reset the turnStartTime after the guess is submitted
  };

  const handleJoinQueue = () => {
    setInQueue(true);
    socket.emit("join queue");
  };

  const handleForfeit = () => {
    socket.emit("forfeit");
  };

  useEffect(() => {
    socket.on("receive guess", (guessWord, numOfMatching, socket_id) => {
      if (socket_id === socket.id)
        setMyGuesses([...myGuesses, { guessWord, numOfMatching }]);
      else
        setOpponentGuesses([...opponentGuesses, { guessWord, numOfMatching }]);
    });

    socket.on("confirm join", (roomId) => {
      setRoom(roomId);
    });

    socket.on("take turn", (playerTakingTurn) => {
      const checkTurn = playerTakingTurn === socket.id;
      setYourTurn(checkTurn);
      if (checkTurn) {
        setTurnStartTime(Date.now()); // Record the start time when the player's turn starts
      }
    });

    socket.on("gameCompleted", (stats, won, message) => {
      setPostGameStats({
        stats: stats,
        won: won,
        message: message,
      });
      setYourTurn(true);
    });

    socket.on("secretWordConfirmed", () => {
      //listener for secret word submissions
      setIsSecretWordSubmitted(true);
      setSecretModalContent("waitingForOpponent");
    });

    socket.on("gameStart", () => {
      //leaves secret word modal open
      setIsSecretModalOpen(false);
      setGameStarted(true);
    });

    // Return a cleanup function to remove event listeners
    return () => {
      socket.off("gameCompleted");
      socket.off("receive guess");
      socket.off("confirm join");
      socket.off("take turn");
      socket.off("gameStart");
      socket.off("secretWordConfirmed");
    };
  });

  const contextValue = {
    socket,
    myGuesses,
    opponentGuesses,
    submitGuess,
    yourTurn,
    gameStarted,
    room,
    isSecretWordSubmitted,
    isSecretModalOpen,
    handleSecretModalClose,
    secretModalContent,
  };

  if (yourTurn === undefined) return <div>Loading ...</div>;
  if (!inQueue)
    return (
      <div>
        <button onClick={handleJoinQueue}>Click here to join queue</button>
      </div>
    );
  if (!room) return <div>Waiting for other players to join ...</div>;
  return (
    <GameRoomContext.Provider value={contextValue}>
      <h1>Room: {room}</h1>
      <button onClick={handleForfeit} className="forfeitBtn">
        Forfeit
      </button>
      {isSecretModalOpen && (
        <SecretWordModal
          isOpen={isSecretModalOpen}
          onClose={handleSecretModalClose}
        />
      )}
      {/* {gameStarted && <Modal isOpen={yourTurn} />} */}
      {postGameStats && (
        <PostGameModal
          stats={postGameStats.stats}
          setPage={setPage}
          won={postGameStats.won}
          message={postGameStats.message}
        />
      )}
      {children}
    </GameRoomContext.Provider>
  );
};
