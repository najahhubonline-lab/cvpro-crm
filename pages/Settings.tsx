import React from 'react';
import { Save, Key, Globe, MessageSquare } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account and system configurations.</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="text-brand-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500" />
            </div>
            <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">Update Password</button>
          </div>
        </div>

        {/* Webhook Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="text-brand-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">WhatsApp Webhook</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Configure this URL in your Meta App Dashboard to receive messages.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
              <div className="flex">
                <input type="text" readOnly value="https://your-domain.com/api/v1/whatsapp/webhook" className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-l-md text-slate-500" />
                <button className="bg-slate-200 px-4 py-2 border border-l-0 border-slate-300 rounded-r-md text-sm font-medium hover:bg-slate-300">Copy</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verify Token</label>
              <input type="text" readOnly value="your-webhook-verify-token" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-500" />
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <MessageSquare className="text-brand-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">AI Assistant Configuration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt</label>
              <textarea rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500" defaultValue="You are a helpful, professional, and friendly sales assistant for CVPRO..."></textarea>
            </div>
            <button className="flex items-center space-x-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
              <Save size={16} />
              <span>Save AI Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};