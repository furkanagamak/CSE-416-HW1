import "./App.css";
import { GameRoomContextProvider } from "./providers/GameRoomProvider";
import { SocketContextProvider } from "./providers/SocketProvider";

import GuessingController from "./GuessingController";
import CurrentGuesses from "./CurrentGuesses";

import StatScreen from "./statScreen";

import { useState } from "react";

function App() {
  const [page, setPage] = useState("main");

  return (
    <div className="App">
      <SocketContextProvider>
        {page === "main" && <MainPage setPage={setPage} />}
        {page === "game" && <GamePage />}
      </SocketContextProvider>
    </div>
  );
}

const MainPage = ({ setPage }) => {
  return (
    <div>
      <button onClick={() => setPage("game")}>Game screen</button>
      <StatScreen />
    </div>
  );
};

const GamePage = () => {
  return (
    <GameRoomContextProvider>
      <GuessingController />
      <CurrentGuesses />
    </GameRoomContextProvider>
  );
};

export default App;
