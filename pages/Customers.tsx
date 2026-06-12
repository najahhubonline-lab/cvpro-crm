import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Customer, LeadStage } from '../types';

const StageBadge = ({ stage }: { stage: LeadStage }) => {
  const styles = {
    [LeadStage.NEW]: 'bg-blue-100 text-blue-800',
    [LeadStage.QUALIFIED]: 'bg-purple-100 text-purple-800',
    [LeadStage.PROPOSAL]: 'bg-yellow-100 text-yellow-800',
    [LeadStage.WON]: 'bg-green-100 text-green-800',
    [LeadStage.LOST]: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[stage] || styles[LeadStage.NEW]}`}>
      {stage}
    </span>
  );
};

export const Customers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.getCustomers();
        setCustomers(response.data || []);
      } catch (err: any) {
        console.error("Failed to fetch customers", err);
        setError(err.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers & Leads</h1>
          <p className="text-slate-500">Manage your contacts and track their journey.</p>
        </div>
        <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-300 rounded-lg bg-white">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading customers...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">Stage</th>
                  <th className="p-4 font-medium">Last Contact</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{customer.name || 'Unknown'}</div>
                      <div className="text-sm text-slate-500">ID: {customer.id.substring(0, 8)}...</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-900">{customer.phone}</div>
                      <div className="text-sm text-slate-500">{customer.email || 'No email'}</div>
                    </td>
                    <td className="p-4">
                      <StageBadge stage={customer.stage} />
                    </td>
                    <td className="p-4 text-slate-600">
                      {new Date(customer.lastContact || customer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-slate-400 hover:text-brand-600 p-1"><Edit size={18} /></button>
                      <button className="text-slate-400 hover:text-red-600 p-1 ml-2"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No customers found matching your search.
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600 bg-slate-50/50">
          <div>Showing {filteredCustomers.length} of {customers.length} results</div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50" disabled>Previous</button>
            <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};
