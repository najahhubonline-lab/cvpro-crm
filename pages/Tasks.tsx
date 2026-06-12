import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Upload, User, FileText, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.getTasks();
      setTasks(res);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (taskId: string, status: string, outputUrl?: string) => {
    try {
      await api.updateTaskStatus(taskId, status, outputUrl);
      fetchTasks();
    } catch (err) {
      alert("Failed to update task");
    }
  };

  const handleFileUpload = async (taskId: string, file: File) => {
    setUploadingTaskId(taskId);
    try {
      // Upload to GCS via backend endpoint (we'll add this)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);
      
      const response = await fetch('/api/v1/operations/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      await updateStatus(taskId, 'DONE', data.url);
      alert('✅ File uploaded and task marked as done!');
    } catch (err: any) {
      alert('❌ Upload failed: ' + err.message);
    } finally {
      setUploadingTaskId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading tasks...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Team Execution Portal</h1>
        <p className="text-slate-500">Manage and fulfill customer orders.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">Customer</th>
              <th className="p-4 font-medium text-slate-600">Service</th>
              <th className="p-4 font-medium text-slate-600">Status</th>
              <th className="p-4 font-medium text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium">{task.order.customer.name || task.order.customer.phone}</div>
                  <div className="text-xs text-slate-500">Order: {task.order.id.slice(0,8)}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-brand-600">{task.order.serviceType.name}</div>
                  <div className="text-xs text-slate-500">{task.type}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.status === 'DONE' ? 'bg-green-100 text-green-800' : 
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.status}
                  </span>
                </td>
                <td className="p-4">
                  {task.status !== 'DONE' ? (
                    <div className="flex space-x-2 items-center">
                      <button onClick={() => updateStatus(task.id, 'IN_PROGRESS')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Start">
                        <Clock size={18} />
                      </button>
                      <label className={`flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded cursor-pointer hover:bg-green-700 ${uploadingTaskId === task.id ? 'opacity-50' : ''}`}>
                        <Upload size={14} />
                        <span className="text-xs">Upload & Complete</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.doc,.docx,.png,.jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(task.id, file);
                          }}
                          disabled={uploadingTaskId === task.id}
                        />
                      </label>
                    </div>
                  ) : (
                    task.outputUrl && (
                      <a href={task.outputUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline text-sm flex items-center space-x-1">
                        <FileText size={14} /> <span>View File</span> <ExternalLink size={12} />
                      </a>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <div className="p-8 text-center text-slate-500">No tasks assigned yet.</div>}
      </div>
    </div>
  );
};
