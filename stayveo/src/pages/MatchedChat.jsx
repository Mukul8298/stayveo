import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Phone, MoreVertical } from 'lucide-react';
import { roommates } from '../data/mockData';
import './MatchedChat.css';

const mockMessages = [
  { id: 1, from: 'them', text: 'Hey! We got matched 🎉', time: '10:30 AM' },
  { id: 2, from: 'me', text: 'Hi! Yes, our compatibility is really high!', time: '10:31 AM' },
  { id: 3, from: 'them', text: 'Are you looking for a room near Gate 3?', time: '10:32 AM' },
  { id: 4, from: 'me', text: 'Yeah! I found a great PG there. Want to check it together?', time: '10:33 AM' },
  { id: 5, from: 'them', text: 'Sure, let\'s plan a visit this weekend!', time: '10:34 AM' },
];

export default function MatchedChat() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(mockMessages);
  const match = roommates[3];

  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages([...messages, { id: Date.now(), from: 'me', text: msg, time: 'Now' }]);
    setMsg('');
  };

  return (
    <div className="chat-page" id="matched-chat">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <div className="chat-match-info">
          <span className="chat-avatar">{match.avatar}</span>
          <div>
            <h3>{match.name}</h3>
            <span className="chat-compat">{match.compatibility}% compatible</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button><Phone size={18} /></button>
          <button><MoreVertical size={18} /></button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(m => (
          <div key={m.id} className={`chat-bubble ${m.from}`}>
            <p>{m.text}</p>
            <span className="chat-time">{m.time}</span>
          </div>
        ))}
      </div>

      <div className="chat-input-bar">
        <input type="text" placeholder="Type a message..." value={msg}
          onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} />
        <button className="chat-send" onClick={sendMsg}><Send size={18} /></button>
      </div>
    </div>
  );
}
