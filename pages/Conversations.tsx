import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Bot, User, Phone, Video, MoreVertical, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { MessageSender, MessageStatus } from '../types';

export const Conversations: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeConvIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for socket listeners
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await api.getConversations();
        setConversations(data);
        if (data.length > 0 && !activeConvId) {
          setActiveConvId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Setup WebSocket
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '/';
    socketRef.current = io(socketUrl);
    
    socketRef.current.on('newMessage', (msg: any) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        
        // Only append if the message belongs to the currently active conversation
        if (activeConvIdRef.current === msg.conversationId) {
          return [...prev, msg];
        }
        return prev;
      });
    });

    socketRef.current.on('conversationUpdate', (conv: any) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id);
        if (exists) {
          return prev.map(c => c.id === conv.id ? conv : c).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        }
        return [conv, ...prev].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeConvId) {
      const fetchMessages = async () => {
        try {
          const data = await api.getMessages(activeConvId);
          setMessages(data);
        } catch (error) {
          console.error("Failed to fetch messages", error);
        }
      };
      fetchMessages();
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleToggleBot = async () => {
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv) return;
    
    try {
      const updated = await api.toggleBot(activeConv.id, !activeConv.botActive);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (error) {
      console.error("Failed to toggle bot", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;
    
    const text = messageInput;
    setMessageInput('');
    
    try {
      const newMsg = await api.sendMessage(activeConvId, text);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const activeCustomer = activeConv?.customer;

  if (loading) return <div className="h-full flex items-center justify-center">Loading chats...</div>;

  return (
    <div className="h-full flex bg-white overflow-hidden">
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => {
            const isActive = conv.id === activeConvId;
            return (
              <div 
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors flex items-start space-x-3 ${isActive ? 'bg-brand-50 border-l-4 border-l-brand-500' : 'hover:bg-slate-100 border-l-4 border-l-transparent'}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                  {conv.customer?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{conv.customer?.name || conv.customer?.phone}</h3>
                    <span className="text-xs text-slate-500">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">Click to view messages</p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      {activeConv && activeCustomer ? (
        <div className="flex-1 flex flex-col bg-[#efeae2] relative">
          {/* Chat Header */}
          <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold">
                {activeCustomer.name?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{activeCustomer.name || activeCustomer.phone}</h2>
                <p className="text-xs text-slate-500">{activeCustomer.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-sm font-medium text-slate-600">AI Assistant</span>
                <button 
                  onClick={handleToggleBot}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${activeConv.botActive ? 'bg-brand-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeConv.botActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => {
              const isOutbound = msg.sender === MessageSender.AI || msg.sender === MessageSender.AGENT;
              const showSender = idx === 0 || messages[idx - 1].sender !== msg.sender;

              return (
                <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 shadow-sm relative ${isOutbound ? 'bg-whatsapp-light rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                    {showSender && isOutbound && (
                      <div className="text-xs font-medium text-slate-500 mb-1 flex items-center space-x-1">
                        {msg.sender === MessageSender.AI ? <Bot size={12} /> : <User size={12} />}
                        <span>{msg.sender === MessageSender.AI ? 'Gemini AI' : 'Agent'}</span>
                      </div>
                    )}
                    
                    {/* Render Media if present */}
                    {msg.mediaUrl && msg.mediaType === 'image' && (
                      <img src={msg.mediaUrl} alt="Media" className="max-w-full rounded-md mb-2" />
                    )}
                    {msg.mediaUrl && msg.mediaType === 'video' && (
                      <video src={msg.mediaUrl} controls className="max-w-full rounded-md mb-2" />
                    )}
                    {msg.mediaUrl && msg.mediaType === 'audio' && (
                      <audio src={msg.mediaUrl} controls className="max-w-full mb-2" />
                    )}
                    {msg.mediaUrl && msg.mediaType === 'document' && (
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mb-2 block">Download Document</a>
                    )}

                    <p className="text-slate-800 text-sm whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end space-x-1 mt-1">
                      <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
                      {isOutbound && msg.status && (
                        <span className="text-slate-400">
                          {msg.status === MessageStatus.SENT && <Check size={12} />}
                          {msg.status === MessageStatus.DELIVERED && <CheckCheck size={12} />}
                          {msg.status === MessageStatus.READ && <CheckCheck size={12} className="text-blue-500" />}
                          {msg.status === MessageStatus.FAILED && <span className="text-red-500 ml-1 text-[10px]">Failed</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-slate-100 p-4 border-t border-slate-200">
            {!activeConv.botActive && (
              <div className="mb-2 text-xs text-center text-slate-500 bg-yellow-100 py-1 rounded">
                Human Takeover Active. AI is paused for this conversation.
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <input 
                type="text" 
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..." 
                className="flex-1 py-3 px-4 rounded-full border-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              />
              <button 
                type="submit"
                disabled={!messageInput.trim()}
                className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Send size={20} className="ml-1" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center text-slate-500">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};
