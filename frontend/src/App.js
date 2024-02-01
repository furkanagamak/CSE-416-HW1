import logo from "./logo.svg";
import "./App.css";
import { useEffect, useState } from "react";

const backend_uri = "http://localhost:5000";

function App() {
  const [text, setText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(backend_uri);
      if (!res.ok) return console.log("something went wrong while fetching");

      setText(await res.text());
    };

    fetchData();
  }, []);

  if (!text) return <div>Loading ...</div>;
  return (
    <div className="App">
      <h1>The server sent back: {text}</h1>
    </div>
  );
}

export default App;
