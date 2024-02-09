import React from "react";
import "./userLists.css";
import { useState } from "react";

const ListBoxContainer = () => {
  const [confirmedIn, setConfirmedIn] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [confirmedOut, setConfirmedOut] = useState([]);
  const [inputValueConfirmedIn, setInputValueConfirmedIn] = useState("");
  const [inputValueCandidates, setInputValueCandidates] = useState("");
  const [inputValueConfirmedOut, setInputValueConfirmedOut] = useState("");

  const handleAdd = (value, list, setList, setInputValue) => {
    if (value.trim() === "") return;

    if (list.includes(value)) {
      window.alert("Letter(s) already inserted!");
    } else {
      setList((prevList) => [...prevList, value]);
      setInputValue("");
    }
  };

  const handleDelete = (index, list, setList) => {
    const newList = [...list];
    newList.splice(index, 1);
    setList(newList);
  };

  return (
    <div className="alphabet-list-container">
      <div className="input-container">
        <label>Confirmed In:</label>
        <input
          type="text"
          value={inputValueConfirmedIn}
          onChange={(e) =>
            setInputValueConfirmedIn(e.target.value.toUpperCase())
          }
        />
        <button
          onClick={() =>
            handleAdd(
              inputValueConfirmedIn,
              confirmedIn,
              setConfirmedIn,
              setInputValueConfirmedIn
            )
          }
        >
          Add
        </button>
        <div className="alphabet-list">
          {confirmedIn.map((char, index) => (
            <div key={index}>
              {char}{" "}
              <button
                onClick={() => handleDelete(index, confirmedIn, setConfirmedIn)}
              >
                X
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="input-container">
        <label>Candidates:</label>
        <input
          type="text"
          value={inputValueCandidates}
          onChange={(e) =>
            setInputValueCandidates(e.target.value.toUpperCase())
          }
        />
        <button
          onClick={() =>
            handleAdd(
              inputValueCandidates,
              candidates,
              setCandidates,
              setInputValueCandidates
            )
          }
        >
          Add
        </button>
        <div className="alphabet-list">
          {candidates.map((char, index) => (
            <div key={index}>
              {char}{" "}
              <button
                onClick={() => handleDelete(index, candidates, setCandidates)}
              >
                X
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="input-container">
        <label>Confirmed Out:</label>
        <input
          type="text"
          value={inputValueConfirmedOut}
          onChange={(e) =>
            setInputValueConfirmedOut(e.target.value.toUpperCase())
          }
        />
        <button
          onClick={() =>
            handleAdd(
              inputValueConfirmedOut,
              confirmedOut,
              setConfirmedOut,
              setInputValueConfirmedOut
            )
          }
        >
          Add
        </button>
        <div className="alphabet-list">
          {confirmedOut.map((char, index) => (
            <div key={index}>
              {char}{" "}
              <button
                onClick={() =>
                  handleDelete(index, confirmedOut, setConfirmedOut)
                }
              >
                X
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ListBoxContainer;
