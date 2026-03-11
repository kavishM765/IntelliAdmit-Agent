import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Welcome to IntelliAdmit for SNS College of Technology! I can answer questions about our streams, campus, and fees. How can I help you today?" }
  ]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll to the bottom of the chat when a new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect to the WebSocket server
  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:8080');
    wsRef.current.onopen = () => setIsConnected(true);
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  // Handle sending a message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !isConnected) return;

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', text: inputText }]);
    
    // Send to Node.js backend
    wsRef.current.send(JSON.stringify({ text: inputText }));
    setInputText('');
  };

  // 🔥 INSTANT MULTILINGUAL SWITCHER
  const changeLanguage = (e) => {
    const lang = e.target.value;
    if (isConnected) {
        // Send a hidden system command to the AI to switch its brain to the new language
        const prompt = `[SYSTEM: The user switched the language to ${lang}. Greet them in ${lang} and continue the conversation strictly in ${lang}.]`;
        wsRef.current.send(JSON.stringify({ text: prompt }));
    }
  };

  return (
    <div className="app-container">
      
      {/* HEADER WITH LANGUAGE CONTROLS */}
      <div className="top-controls">
        <select className="lang-dropdown" onChange={changeLanguage} defaultValue="English">
            <option value="English">🌐 English</option>
            <option value="Tamil">🌐 தமிழ் (Tamil)</option>
            <option value="Malayalam">🌐 മലയാളം (Malayalam)</option>
            <option value="Hindi">🌐 हिन्दी (Hindi)</option>
            <option value="Telugu">🌐 తెలుగు (Telugu)</option>
        </select>
      </div>

      <header className="header-section">
        <h1 className="brand-title">IntelliAdmit Portal</h1>
        <p className="subtitle">SNS College of Technology Admissions Assistant</p>
      </header>
      
      <main className="chat-container">
        <div className="chat-history">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {/* 🔥 NEW: Custom image styling inside Markdown so it never breaks! */}
              <ReactMarkdown 
                components={{
                  // eslint-disable-next-line no-unused-vars
                  img: ({node, ...props}) => (
                    <img 
                      style={{ maxWidth: '100%', borderRadius: '12px', marginTop: '15px', display: 'block', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} 
                      {...props} 
                      alt={props.alt || "Campus Image"}
                    />
                  )
                }}
              >
                {msg.text}
              </ReactMarkdown> 
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form className="input-form" onSubmit={sendMessage}>
          <input 
            type="text" 
            className="chat-input" 
            placeholder={isConnected ? "Ask about courses, fees, or provide your details..." : "Connecting..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!isConnected}
          />
          <button type="submit" className="send-btn" disabled={!isConnected}>Send</button>
        </form>
      </main>
    </div>
  );
}

export default App;