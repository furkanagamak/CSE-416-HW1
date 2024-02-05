import React, { useState } from 'react';
import './SecretWord.css';
import { useSocketContext } from './providers/SocketProvider';
import { useGameRoomContext } from "./providers/GameRoomProvider";

const SecretWordModal = ({ isOpen }) => {
    const [word, setWord] = useState('');
    const [error, setError] = useState('');
    const { room, secretModalContent } = useGameRoomContext();
    const socket = useSocketContext();

    const validateWord = (inputWord) => {
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
        return "";
    };

    const handleSubmit = () => {
        const validationError = validateWord(word);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        socket.emit('submitSecretWord', { roomId: room, secretWord: word });
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
                        onChange={(e) => setWord(e.target.value)}
                        maxLength="5"
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