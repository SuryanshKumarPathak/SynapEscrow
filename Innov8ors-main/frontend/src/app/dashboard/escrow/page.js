'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Sparkles, Unlock } from 'lucide-react';
import { calculateEscrowBreakdown } from '@/services/api';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);

const escrowStats = [
  {
    title: 'Total Escrow Locked',
    value: formatINR(373500),
    icon: Lock,
    wrapperClass: 'bg-purple-50 text-purple-600'
  },
  {
    title: 'Pending Release',
    value: formatINR(232400),
    icon: Unlock,
    wrapperClass: 'bg-amber-50 text-amber-600'
  },
  {
    title: 'Released Payments',
    value: formatINR(1033350),
    icon: CheckCircle2,
    wrapperClass: 'bg-emerald-50 text-emerald-600'
  }
];

const transactions = [
  {
    id: '#TRX-9482',
    project: 'E-commerce Redesign Next.js',
    client: 'Acme Corp',
    milestone: 'Frontend Architecture',
    amount: formatINR(124500),
    status: 'Locked',
    statusClass: 'bg-purple-100 text-purple-700',
    date: 'Oct 21, 2026'
  },
  {
    id: '#TRX-9481',
    project: 'AI Writing Assistant API',
    client: 'TechNova',
    milestone: 'Beta Testing',
    amount: formatINR(232400),
    status: 'Pending Release',
    statusClass: 'bg-amber-100 text-amber-700',
    date: 'Oct 19, 2026'
  },
  {
    id: '#TRX-9480',
    project: 'AI Writing Assistant API',
    client: 'TechNova',
    milestone: 'Initial Setup',
    amount: formatINR(83000),
    status: 'Released',
    statusClass: 'bg-emerald-100 text-emerald-700',
    date: 'Oct 10, 2026'
  },
  {
    id: '#TRX-9479',
    project: 'Real Estate Dashboard UI',
    client: 'Elevate Realty',
    milestone: 'Final Delivery',
    amount: formatINR(99600),
    status: 'Released',
    statusClass: 'bg-emerald-100 text-emerald-700',
    date: 'Oct 02, 2026'
  }
];

export default function EscrowDashboardPage() {
  const [milestoneAmount, setMilestoneAmount] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState('');
  const [calcResult, setCalcResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setMessage('');
      const response = await calculateEscrowBreakdown({
        milestoneAmount: Number(milestoneAmount),
        completion_percentage: Number(completionPercentage)
      });
      setCalcResult(response.data);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to calculate payout breakdown.');
      setCalcResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Escrow Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track escrow deposits, pending milestones, and released payments securely.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">AI Escrow Release Calculator</h3>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Use IIT payout logic to calculate freelancer release and employer refund from milestone completion percentage.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <input
            value={milestoneAmount}
            onChange={(event) => setMilestoneAmount(event.target.value)}
            placeholder="Milestone amount in ₹"
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            value={completionPercentage}
            onChange={(event) => setCompletionPercentage(event.target.value)}
            placeholder="Completion percentage"
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Calculating...' : 'Run IIT Escrow Logic'}
          </button>
        </div>

        {calcResult ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-400">Milestone Amount</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatINR(calcResult.milestone_amount)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-400">Freelancer Release</p>
              <p className="mt-1 text-lg font-bold text-emerald-700">{formatINR(calcResult.freelancer_payment)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-400">Employer Refund</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{formatINR(calcResult.employer_refund)}</p>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-600">
            <AlertCircle size={16} /> {message}
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {escrowStats.map((stat, i) => (
          <article key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
             <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.wrapperClass}`}>
                <stat.icon size={24} />
             </div>
             <div>
               <p className="text-sm font-medium text-slate-500">{stat.title}</p>
               <p className="mt-0.5 text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
             </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Escrow Transactions</h3>
        
        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">Project</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Client</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Milestone</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx, i) => (
                  <tr key={i} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{trx.project}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{trx.id}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{trx.client}</td>
                    <td className="px-6 py-4 text-slate-600">{trx.milestone}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{trx.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${trx.statusClass}`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">{trx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
