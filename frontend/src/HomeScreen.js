import React, { useEffect, useState } from "react";

const HomeScreen = ({ setPage }) => {
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
