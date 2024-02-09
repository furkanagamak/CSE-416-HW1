import React, { useState } from 'react';
import './SecretWord.css';
import { useSocketContext } from './providers/SocketProvider';
import { useGameRoomContext, checkWordExists } from "./providers/GameRoomProvider";

const SecretWordModal = ({ isOpen }) => {
    const [word, setWord] = useState('');
    const [error, setError] = useState('');
    const { room, secretModalContent, setMySecretWord } = useGameRoomContext();
    const socket = useSocketContext();

    const handleKeyDown = (e) => {
        console.log("key press");
        if (e.key === 'Enter') {
            handleSubmit();
        }
      };

    async function validateWord(inputWord) {
        // Check for non-letter characters first
        if (!/^[A-Za-z]+$/.test(inputWord)) {
            return "Word must contain only alphabet characters.";
        }
        // Check if word is 5 letters
        if (inputWord.length !== 5) {
            return "Word must be exactly 5 letters.";
        }
        // Check for repeating letters
        const letterSet = new Set(inputWord);
        if (letterSet.size !== inputWord.length) {
            return "Letters cannot repeat.";
        }
        // Check if the word exists in the word list
        const wordExists = await checkWordExists(inputWord);
        if (!wordExists) {
            return "Word must be a valid English word.";
        }
        return "";
    }

    const handleSubmit = async () => {
        const lowerCaseWord = word.toLowerCase(); // Convert the word to lowercase before validation
        const validationError = await validateWord(lowerCaseWord);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        setMySecretWord(lowerCaseWord.toUpperCase());
        socket.emit('submitSecretWord', { roomId: room, secretWord: lowerCaseWord });
    };

    const renderModalContent = () => {
        if (secretModalContent === "enterWord") {
            return (
                <React.Fragment>
                    <h2>Enter Your Secret Word</h2>
                    <p className="modal-rules">Word must contain exactly 5 letters with no repeating letters.</p>
                    <input
                        className='secretInput'
                        type="text"
                        value={word}
                        onChange={(e) => setWord(e.target.value.toLowerCase())} // Automatically convert to lowercase
                        maxLength="5"
                        onKeyDown={handleKeyDown}
                    />
                    <button className ='secretButton' onClick={handleSubmit}>Submit</button>
                    {error && <p className="error">{error}</p>}
                </React.Fragment>
            );
        } else if (secretModalContent === "waitingForOpponent") {
            return <p>Waiting for opponent...</p>;
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="secret-modal">
            <div className="secret-modal-content">
                {renderModalContent()}
            </div>
        </div>
    );
};

export default SecretWordModal;