import React, { useState, useEffect } from 'react';
import { Save, Key, Globe, MessageSquare, Copy, Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'packages'>('prompt');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  
  const [masterPrompt, setMasterPrompt] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  
  const currentUrl = window.location.origin;
  const webhookUrl = `${currentUrl}/api/v1/whatsapp/webhook`;
  const verifyToken = 'cvpro_secure_meta_token_2026';

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.getAiConfig();
      setMasterPrompt(res.masterPrompt || '');
      setPackages(res.packages || []);
    } catch (err) {
      console.error('Failed to load AI config', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateAiConfig({ masterPrompt, packages });
      alert('✅ Settings saved successfully! AI will use the new configuration immediately.');
    } catch (err) {
      alert('❌ Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const updatePackage = (index: number, field: string, value: any) => {
    const newPackages = [...packages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setPackages(newPackages);
  };

  const addPackage = () => {
    setPackages([...packages, { id: `pkg_${Date.now()}`, name: 'New Package', priceAED: 0, priceUSD: 0, features: [''] }]);
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updateFeature = (pkgIndex: number, featIndex: number, value: string) => {
    const newPackages = [...packages];
    newPackages[pkgIndex].features[featIndex] = value;
    setPackages(newPackages);
  };

  const addFeature = (pkgIndex: number) => {
    const newPackages = [...packages];
    newPackages[pkgIndex].features.push('');
    setPackages(newPackages);
  };

  const removeFeature = (pkgIndex: number, featIndex: number) => {
    const newPackages = [...packages];
    newPackages[pkgIndex].features.splice(featIndex, 1);
    setPackages(newPackages);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand-500" size={32} /></div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Taskora Control Center</h1>
          <p className="text-slate-500">Manage AI behavior, pricing, and integrations.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center space-x-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit mb-6">
        {['prompt', 'packages'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {tab === 'prompt' ? 'AI Master Prompt' : 'Packages & Pricing'}
          </button>
        ))}
      </div>

      <div className="max-w-4xl">
        {activeTab === 'prompt' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <MessageSquare className="text-brand-500" size={20} />
              <h2 className="text-lg font-semibold text-slate-900">System Instructions</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Define how the AI agent behaves. Changes apply immediately to new conversations.</p>
            <textarea 
              rows={12} 
              value={masterPrompt}
              onChange={(e) => setMasterPrompt(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-mono leading-relaxed"
              placeholder="Enter AI master prompt..."
            />
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <Globe className="text-brand-500" size={20} />
                  <h2 className="text-lg font-semibold text-slate-900">Packages & Pricing</h2>
                </div>
                <button onClick={addPackage} className="flex items-center space-x-1 text-sm text-brand-600 hover:text-brand-800 font-medium">
                  <Plus size={16} /> <span>Add Package</span>
                </button>
              </div>
              <div className="grid gap-4">
                {packages.map((pkg, idx) => (
                  <div key={pkg.id || idx} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex justify-between mb-3">
                      <input value={pkg.name} onChange={(e) => updatePackage(idx, 'name', e.target.value)} className="font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none w-1/2" />
                      <button onClick={() => removePackage(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="text-xs text-slate-500">Price (AED)</label>
                        <input type="number" value={pkg.priceAED} onChange={(e) => updatePackage(idx, 'priceAED', Number(e.target.value))} className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Price (USD)</label>
                        <input type="number" value={pkg.priceUSD} onChange={(e) => updatePackage(idx, 'priceUSD', Number(e.target.value))} className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Features</label>
                      {pkg.features.map((feat: string, fIdx: number) => (
                        <div key={fIdx} className="flex space-x-2 mb-2">
                          <input value={feat} onChange={(e) => updateFeature(idx, fIdx, e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm" />
                          <button onClick={() => removeFeature(idx, fIdx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <button onClick={() => addFeature(idx)} className="text-xs text-brand-600 hover:text-brand-800 mt-1">+ Add Feature</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Webhook Info */}
        <div className="mt-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="text-brand-500" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">WhatsApp Integration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Callback URL</label>
              <div className="flex">
                <input readOnly value={webhookUrl} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-l-md text-slate-700 font-mono text-sm" />
                <button onClick={() => handleCopy(webhookUrl, 'url')} className="bg-slate-200 px-4 py-2 border border-l-0 border-slate-300 rounded-r-md text-sm font-medium hover:bg-slate-300 flex items-center space-x-1">
                  {copied === 'url' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  <span>{copied === 'url' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verify Token</label>
              <div className="flex">
                <input readOnly value={verifyToken} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-l-md text-slate-700 font-mono text-sm" />
                <button onClick={() => handleCopy(verifyToken, 'token')} className="bg-slate-200 px-4 py-2 border border-l-0 border-slate-300 rounded-r-md text-sm font-medium hover:bg-slate-300 flex items-center space-x-1">
                  {copied === 'token' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  <span>{copied === 'token' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
