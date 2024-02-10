import React, { createContext, useContext } from "react";
import io from "socket.io-client";
import { useUserContext } from "./UserProvider";

const SocketContext = createContext(null);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error(
      "useWordGuessContext not used within the approriate provider"
    );

  return context;
};

export const SocketContextProvider = ({ children }) => {
  const username = useUserContext();
  const socket = io("http://localhost:5000", {
    query: {
      username: username,
    },
  });
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
