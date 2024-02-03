import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const BACKEND_URI = "http://localhost:5000";
const socket = io.connect(BACKEND_URI);

const SocketContext = createContext(socket);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error(
      "useWordGuessContext not used within the approriate provider"
    );

  return context;
};

export const SocketContextProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
