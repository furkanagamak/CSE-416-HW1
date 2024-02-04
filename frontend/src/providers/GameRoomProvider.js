import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocketContext } from "./SocketProvider";

const GameRoomContext = createContext(undefined);

export const useGameRoomContext = () => {
  const context = useContext(GameRoomContext);
  if (!context)
    throw new Error(
      "useGameRoomContext not used within the approriate provider"
    );

  return context;
};

export const GameRoomContextProvider = ({ children }) => {
  const [myGuesses, setMyGuesses] = useState([]);
  const [opponentGuesses, setOpponentGuesses] = useState([]);
  const [room, setRoom] = useState(undefined);
  const [inQueue, setInQueue] = useState(false);
  const [yourTurn, setYourTurn] = useState(false);
  const socket = useSocketContext();

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
