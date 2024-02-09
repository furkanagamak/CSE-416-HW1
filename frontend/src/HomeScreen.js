import React, { useState } from "react";
import { useUserContext } from "./providers/UserProvider";

// const socket = io("http://localhost:5000");

const HomeScreen = ({ setPage }) => {
  const username = useUserContext();

  const handleViewStats = () => {
    setPage("stats");
  };

  return (
    <div className='HomeScreen'>
      <h1 className='HomeTitle'>GUESS5</h1>
      <h2 className='Welcome'>Welcome </h2>
      <button className="FindGame" onClick={() => setPage("game")}>Find Game</button>
      <button className='ViewStats' onClick={handleViewStats}>View Stats</button>
    </div>
  );
};

export default HomeScreen;
