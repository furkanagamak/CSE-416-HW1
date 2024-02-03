import "./App.css";
import { GameRoomContextProvider } from "./providers/GameRoomProvider";
import { SocketContextProvider } from "./providers/SocketProvider";

import GuessingController from "./GuessingController";
import CurrentGuesses from "./CurrentGuesses";

function App() {
  return (
    <div className="App">
      <SocketContextProvider>
        <GameRoomContextProvider>
          <GuessingController />
          <CurrentGuesses />
        </GameRoomContextProvider>
      </SocketContextProvider>
    </div>
  );
}

export default App;
