import React, { useState, useEffect, useRef } from 'react';
import './chatBox.css';
import { useSocketContext } from './providers/SocketProvider';
import { useGameRoomContext } from "./providers/GameRoomProvider";

const ChatBox = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const context = useGameRoomContext();
  const { room, oppUsername, myUsername } = context;     //room id is used to render only messages sent within current room
  const messagesEndRef = useRef(null);
  const socket = useSocketContext();

  useEffect(() => {
    socket.on('chatMessage', (msg) => {          //listens for opponent messages
      setMessages(prevMessages => [...prevMessages, msg]);

      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    });

    return () => socket.off('chatMessage');
  }, [socket, messages]);

  const sendMessage = () => {       //message sending handler
      const chatMessage = {
        text: message,
       sender: socket.id,
       time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };
      socket.emit('chatMessage', room, chatMessage);
      setMessage('');   //clears text
    
  };

  // scroll down to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // handle Enter keypress
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map((msg, index) => {
          const isSentByCurrentUser = msg.sender === socket.id;
          return (
            <div key={index} className={`message ${isSentByCurrentUser ? 'sent' : 'received'}`}>
              {!isSentByCurrentUser && (
                <>
                <p> <span className="message-sender">{oppUsername}-  
                  </span> {msg.text}</p>
                 
                </>
              )}
              {isSentByCurrentUser && (
                <>
                 <p> {msg.text} <span className="message-sender-self">   -{myUsername}</span></p>
                  
                </>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatBox;
