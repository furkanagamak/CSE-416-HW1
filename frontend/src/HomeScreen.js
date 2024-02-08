import React, { useEffect, useState } from "react";
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const HomeScreen = ({ setPage }) => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/get-or-assign-name', {
      credentials: 'include', 
    })
      .then(response => response.json())
      .then(data => setUserName(data.username))
      .catch(error => console.error('Error:', error));
  }, []);
  

  const handleViewStats = () => {
    setPage("stats");
  };

  const socket = io('http://localhost:5000', {
  query: {
    username: userName 
  }
});

  return (
    <div className='HomeScreen'>
      <h1 className='HomeTitle'>GUESS5</h1>
      <h2 className='Welcome'>Welcome back, {userName}</h2>
      <button className="FindGame" onClick={() => setPage("game")}>Find Game</button>
      <button className='ViewStats' onClick={handleViewStats}>View Stats</button>
    </div>
  );
};

export default HomeScreen;
