import "./App.css";
import { useState } from "react";
import { GameRoomContextProvider, useGameRoomContext } from "./providers/GameRoomProvider";
import { SocketContextProvider } from "./providers/SocketProvider";
import GuessingController from "./GuessingController";
import CurrentGuesses from "./CurrentGuesses";
import StatScreen from "./statScreen";
import ChatBox from "./chatBox";
import ListBoxContainer from "./userLists";
import HomeScreen from "./HomeScreen";

function App() {
  const [page, setPage] = useState("main");

  return (
    <div className="App">
      <SocketContextProvider>
        {page === "main" && <MainPage setPage={setPage} />}
        {page === "game" && <GamePage setPage={setPage} />}
        {page === "stats" && <StatPage setPage={setPage} />}
      </SocketContextProvider>
    </div>
  );
}

const MainPage = ({ setPage }) => {
  return (
    <div>
      <HomeScreen setPage={setPage} />
    </div>
  );
};

const GamePage = ({ setPage }) => {
  return (
    <GameRoomContextProvider setPage={setPage}>
      <GuessingController />
      <CurrentGuesses />
      <ChatBox />
      <ListBoxContainer />
    </GameRoomContextProvider>
  );
};

const StatPage = ({ setPage }) => {
  return (
    <div>
      <StatScreen setPage={setPage}/>
    </div>
  );
};

export default App;
//<SecretWordModal isOpen = "true"></SecretWordModal>