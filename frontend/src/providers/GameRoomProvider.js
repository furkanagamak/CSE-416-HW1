import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocketContext } from "./SocketProvider";
import './PostGameModal.css'; 

const GameRoomContext = createContext(undefined);

export const useGameRoomContext = () => {
  const context = useContext(GameRoomContext);
  if (!context)
    throw new Error(
      "useGameRoomContext not used within the approriate provider"
    );

  return context;
};

const PostGameModal = ({ stats, setPage }) => {
  if (!stats || stats.length === 0) return null;

  return (
    <div className={`modal ${stats ? "open" : ""}`}>
      <div className="modal-content">
        <h2>Game Results</h2>
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Result</th>
              <th>Total Guesses</th>
              <th>Time Played (seconds)</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((playerStats, index) => (
              <tr key={index}>
                <td>{playerStats.username}</td>
                <td>{playerStats.isWinner ? "Won" : "Lost"}</td>
                <td>{playerStats.totalGuesses}</td>
                <td>{playerStats.secondsPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setPage("main")}>Return to Home</button>
      </div>
    </div>
  );
};


export const GameRoomContextProvider = ({ children, setPage}) => {
  const [myGuesses, setMyGuesses] = useState([]);
  const [opponentGuesses, setOpponentGuesses] = useState([]);
  const [room, setRoom] = useState(undefined);
  const [inQueue, setInQueue] = useState(false);
  const [yourTurn, setYourTurn] = useState(false);
  const socket = useSocketContext();

  const [postGameStats, setPostGameStats] = useState(null);

  const submitGuess = (guessWord) => {
    if (guessWord.length < 5)
      return window.alert("You need to enter a 5 letter word");
    socket.emit("submit guess", guessWord, room);
  };

  const handleJoinQueue = () => {
    setInQueue(true);
    socket.emit("join queue");
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
    });

    socket.on("gameCompleted", (stats) => {
      setPostGameStats(stats);
      setYourTurn(true);
    });

    // Return a cleanup function to remove event listeners
    return () => {
      socket.off("gameCompleted");
      socket.off("receive guess");
      socket.off("confirm join");
      socket.off("take turn");
    };
  });

  const contextValue = {
    socket,
    myGuesses,
    opponentGuesses,
    submitGuess,
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
      <PostGameModal stats={postGameStats} setPage={setPage} />
      <Modal isOpen={yourTurn} />
      <h1>Room: {room}</h1>
      {children}
    </GameRoomContext.Provider>
  );
};

const Modal = ({ isOpen }) => (
  <div className={`modal ${isOpen ? "" : "open"}`}>
    <div className="modal-content">
      <p>Other player is taking their turn...</p>
    </div>
  </div>
);
