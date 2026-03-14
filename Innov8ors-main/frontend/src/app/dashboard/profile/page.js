'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Save, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { calculatePFIWithAI } from '@/services/api';
import { getStoredAuth } from '@/services/auth';

const initialMetrics = {
  completedMilestones: 0,
  totalMilestones: 1,
  onTimeDeliveries: 0,
  totalDeliveries: 1,
  averageQualityScore: 0
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [pfiScore, setPfiScore] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.user) {
      return;
    }

    setUser(auth.user);
  }, []);

  const handleMetricChange = (event) => {
    const { name, value } = event.target;
    setMetrics((prev) => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const handleCalculatePFI = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await calculatePFIWithAI(metrics);
      setPfiScore(response.data?.PFI_score ?? 0);
      setMessage('PFI calculated using IIT scoring logic.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to calculate PFI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Profile Management</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update your profile and preview your Professional Fidelity Index.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 border-b border-slate-100 pb-4 text-lg font-bold text-slate-900">Personal Information</h3>

            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Role</label>
                <input
                  type="text"
                  value={user?.role || 'freelancer'}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Portfolio</h3>
            </div>

            <div className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition hover:bg-slate-50">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-900">Click to upload or drag and drop</p>
              <p className="mt-1 text-xs text-slate-500">SVG, PNG, JPG or PDF (max. 10MB)</p>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">PFI Calculator</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Completed Milestones</label>
                <input name="completedMilestones" type="number" min="0" value={metrics.completedMilestones} onChange={handleMetricChange} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total Milestones</label>
                <input name="totalMilestones" type="number" min="1" value={metrics.totalMilestones} onChange={handleMetricChange} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">On-Time Deliveries</label>
                <input name="onTimeDeliveries" type="number" min="0" value={metrics.onTimeDeliveries} onChange={handleMetricChange} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total Deliveries</label>
                <input name="totalDeliveries" type="number" min="1" value={metrics.totalDeliveries} onChange={handleMetricChange} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Average Quality Score</label>
                <input name="averageQualityScore" type="number" min="0" max="100" value={metrics.averageQualityScore} onChange={handleMetricChange} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
            </div>

            <button onClick={handleCalculatePFI} disabled={loading} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              <Sparkles size={16} />
              {loading ? 'Calculating...' : 'Calculate With IIT Logic'}
            </button>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Professional Fidelity Index</p>
              <p className="mt-2 text-4xl font-black text-slate-900">{pfiScore ?? '--'}{pfiScore !== null ? '%' : ''}</p>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, pfiScore ?? 0))}%` }} />
              </div>
            </div>

            {message ? (
              <p className={`mt-4 flex items-center gap-2 text-sm font-medium ${message.toLowerCase().includes('failed') ? 'text-rose-600' : 'text-emerald-600'}`}>
                <AlertCircle size={16} /> {message}
              </p>
            ) : null}
          </section>

          <div className="flex justify-end gap-3">
            <button className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}