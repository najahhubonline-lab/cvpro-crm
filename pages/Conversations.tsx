import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, User, Bot, Check, CheckCheck, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const Conversations: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res || []);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await api.getMessages(convId);
      setMessages(res || []);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleSendText = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    setSending(true);
    try {
      await api.sendMessage(selectedConv.id, newMessage, 'AGENT');
      setNewMessage('');
      await fetchMessages(selectedConv.id);
      await fetchConversations();
    } catch (err) {
      console.error('Failed to send message', err);
      alert('فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedConv) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', selectedConv.id);
      formData.append('sender', 'AGENT');
      
      const response = await fetch('/api/v1/messages/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      await fetchMessages(selectedConv.id);
      await fetchConversations();
      alert('✅ تم إرسال الملف بنجاح!');
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('❌ فشل رفع الملف: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">المحادثات</h2>
        </div>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => setSelectedConv(conv)}
            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
              selectedConv?.id === conv.id ? 'bg-brand-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                <User size={20} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {conv.customer?.name || conv.customer?.phone || 'Unknown'}
                </p>
                <p className="text-sm text-slate-500 truncate">
                  {conv.lastMessage || 'لا توجد رسائل'}
                </p>
              </div>
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="p-8 text-center text-slate-500">لا توجد محادثات</div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <h3 className="font-semibold text-slate-900">
                {selectedConv.customer?.name || selectedConv.customer?.phone}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedConv.customer?.phone}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'AGENT' || msg.sender === 'AI' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender === 'AGENT' || msg.sender === 'AI'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    {msg.mediaUrl ? (
                      <div>
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 ${
                            msg.sender === 'AGENT' || msg.sender === 'AI'
                              ? 'text-white hover:text-brand-100'
                              : 'text-brand-600 hover:text-brand-700'
                          }`}
                        >
                          <Paperclip size={16} />
                          <span>عرض الملف المرفق</span>
                        </a>
                        {msg.text && <p className="mt-2">{msg.text}</p>}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      msg.sender === 'AGENT' || msg.sender === 'AI' ? 'text-brand-100' : 'text-slate-400'
                    }`}>
                      <span>{new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.sender === 'AGENT' && (
                        msg.status === 'READ' ? <CheckCheck size={14} /> : <Check size={14} />
                      )}
                      {msg.sender === 'AI' && <Bot size={14} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                  title="إرفاق ملف"
                >
                  {uploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 p-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                  rows={1}
                />
                <button
                  onClick={handleSendText}
                  disabled={sending || !newMessage.trim()}
                  className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            اختر محادثة للبدء
          </div>
        )}
      </div>
    </div>
  );
};
