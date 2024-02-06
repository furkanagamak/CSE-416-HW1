import React, { useEffect, useState } from 'react';
import '../App.css';

const AnimatedText = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let currentText = '';
        let index = 0;

        const updateText = () => {
            if (index < text.length) {
                currentText += text[index++];
                setDisplayedText(currentText);
            } else {
                index = 0;
                currentText = ''; 

                setTimeout(() => setDisplayedText(currentText), 0);
                return; 
            }
        };


        const intervalId = setInterval(updateText, 500);

 
        return () => clearInterval(intervalId);
    }, [text]);

    return (
        <div className="letter-animation">
            {displayedText.split('').map((char, index) => (
                <span key={index} className="letter" style={{ visibility: char === ' ' ? 'hidden' : 'visible' }}>{char}</span>
            ))}
           
            {Array.from({ length: text.length - displayedText.length }).map((_, index) => (
                <span key={`placeholder-${index}`} className="letter" style={{ visibility: 'hidden' }}>A</span> 
            ))}
        </div>
    );
};

export default AnimatedText;
