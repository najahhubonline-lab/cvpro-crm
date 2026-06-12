import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, Plus, Calendar, Users, Clock, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';

export const Broadcasts: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [scheduledFor, setScheduledFor] = useState('');

  useEffect(() => {
    fetchData();

    // Setup WebSocket for real-time broadcast updates
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '/';
    socketRef.current = io(socketUrl);
    
    socketRef.current.on('broadcastUpdate', (updatedBroadcast: any) => {
      setBroadcasts(prev => {
        const exists = prev.find(b => b.id === updatedBroadcast.id);
        if (exists) {
          return prev.map(b => b.id === updatedBroadcast.id ? updatedBroadcast : b);
        }
        return [updatedBroadcast, ...prev];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [broadcastsData, templatesData] = await Promise.all([
        api.getBroadcasts().catch(() => []),
        api.getTemplates().catch(() => [])
      ]);
      setBroadcasts(broadcastsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error fetching broadcast data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetAudience = stageFilter === 'ALL' ? {} : { stage: stageFilter };
      await api.createBroadcast({
        name,
        templateId,
        targetAudience,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null
      });
      setIsModalOpen(false);
      setName('');
      setTemplateId('');
      setScheduledFor('');
      // No need to manually fetchData() here because the WebSocket will push the new broadcast
    } catch (error) {
      console.error("Failed to create broadcast", error);
      alert("Failed to create broadcast campaign.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'SENDING': return 'bg-blue-100 text-blue-800';
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Broadcast Campaigns</h1>
          <p className="text-slate-500">Send bulk WhatsApp messages to your segments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Total Sent</h3>
            <Megaphone className="text-brand-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {broadcasts.reduce((acc, b) => acc + (b.sentCount || 0), 0)}
          </p>
          <p className="text-sm text-slate-500 mt-1">Messages across all campaigns</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Active Campaigns</h3>
            <Users className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {broadcasts.filter(b => b.status === 'SENDING' || b.status === 'SCHEDULED').length}
          </p>
          <p className="text-sm text-slate-500 mt-1">Currently running or queued</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Campaign Name</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Template</th>
                <th className="p-4 font-medium">Schedule</th>
                <th className="p-4 font-medium">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading campaigns...</td></tr>
              ) : broadcasts.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No campaigns found. Create one to get started.</td></tr>
              ) : (
                broadcasts.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-900">{campaign.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{campaign.template?.name || 'Unknown'}</td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Clock size={14} className="text-slate-400" />
                        <span>{campaign.scheduledFor ? new Date(campaign.scheduledFor).toLocaleString() : 'Immediate'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {campaign.status === 'COMPLETED' || campaign.status === 'SENDING' ? (
                        <div className="w-full max-w-[200px]">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Sent: {campaign.sentCount}</span>
                            <span className="text-red-500">Failed: {campaign.failedCount}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Create Broadcast</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500" 
                  placeholder="e.g., Black Friday Promo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Template</label>
                <select 
                  required
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="" disabled>Select a template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience (Lead Stage)</label>
                <select 
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="ALL">All Customers</option>
                  <option value="NEW">New Leads</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule (Optional)</label>
                <input 
                  type="datetime-local" 
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500" 
                />
                <p className="text-xs text-slate-500 mt-1">Leave blank to send immediately.</p>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
