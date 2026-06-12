import React, { useEffect } from 'react';
import { X, MessageSquare } from 'lucide-react';

export interface ToastProps {
  id: string;
  title: string;
  message: string;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, title, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-4 flex items-start space-x-3 w-80 animate-slide-in-right">
      <div className="bg-brand-100 text-brand-600 p-2 rounded-full flex-shrink-0">
        <MessageSquare size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 truncate">{title}</h4>
        <p className="text-sm text-slate-500 truncate">{message}</p>
      </div>
      <button onClick={() => onClose(id)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
};
