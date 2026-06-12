import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Upload, FileText, ExternalLink, User, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      setError(null);
      const res = await api.getTasks();
      setTasks(res || []);
    } catch (err: any) { 
      console.error("Failed to fetch tasks", err);
      setError('فشل تحميل المهام. تأكد من اتصالك بالإنترنت.');
    } finally { 
      setLoading(false); 
    }
  };

  const handleUploadAndComplete = async (taskId: string, file: File) => {
    setUploadingId(taskId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);
      
      const response = await fetch('/api/v1/operations/upload', {
        method: 'POST', 
        body: formData, 
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      await fetchTasks();
      alert('✅ تم رفع الملف وإتمام المهمة بنجاح! سيتم إرساله للعميل تلقائياً.');
    } catch (err: any) { 
      console.error('Upload error:', err);
      alert('❌ فشل الرفع: ' + err.message); 
    } finally { 
      setUploadingId(null); 
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.updateTaskStatus(taskId, status);
      await fetchTasks();
    } catch (err: any) {
      alert('❌ فشل تحديث الحالة: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'TODO': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'قيد الانتظار' },
      'IN_PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'جاري العمل' },
      'DONE': { bg: 'bg-green-100', text: 'text-green-800', label: 'تم التسليم' },
    };
    const badge = badges[status as keyof typeof badges] || badges['TODO'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">بوابة فريق التنفيذ</h1>
        <p className="text-slate-500">إدارة طلبات العملاء وتسليم المشاريع بجودة عالية.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium text-slate-600">العميل / الطلب</th>
              <th className="p-4 font-medium text-slate-600">نوع الخدمة</th>
              <th className="p-4 font-medium text-slate-600">الحالة</th>
              <th className="p-4 font-medium text-slate-600">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium flex items-center gap-2">
                    <User size={16} className="text-brand-500"/>
                    {task.order?.customer?.name || task.order?.customer?.phone || 'غير معروف'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    رقم الطلب: {task.order?.id?.slice(0,8)}...
                  </div>
                  {task.order?.customer?.phone && (
                    <div className="text-xs text-slate-500">
                      واتساب: {task.order.customer.phone}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="font-medium text-brand-600">
                    {task.order?.serviceType?.name || task.type}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    تم الإنشاء: {new Date(task.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </td>
                <td className="p-4">
                  {getStatusBadge(task.status)}
                </td>
                <td className="p-4">
                  {task.status !== 'DONE' ? (
                    <div className="flex space-x-2 items-center gap-2">
                      {task.status === 'TODO' && (
                        <button 
                          onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="بدء العمل"
                        >
                          <Clock size={18} />
                        </button>
                      )}
                      <label className={`flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors text-sm ${uploadingId === task.id ? 'opacity-50' : ''}`}>
                        {uploadingId === task.id ? (
                          <>
                            <Loader2 className="animate-spin" size={14} />
                            <span>جاري الرفع...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>رفع وإنهاء</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.doc,.docx" 
                          onChange={(e) => e.target.files?.[0] && handleUploadAndComplete(task.id, e.target.files[0])}
                          disabled={uploadingId === task.id}
                        />
                      </label>
                    </div>
                  ) : (
                    task.outputUrl ? (
                      <a 
                        href={task.outputUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-brand-600 hover:underline text-sm flex items-center gap-1"
                      >
                        <FileText size={14} /> 
                        <span>عرض الملف</span> 
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )
                  )}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  لا توجد مهام حالياً. ستظهر المهام هنا عند تأكيد الدفع.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
