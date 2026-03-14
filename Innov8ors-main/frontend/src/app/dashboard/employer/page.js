'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Search, 
  Briefcase, 
  Clock, 
  DollarSign, 
  Plus, 
  ChevronRight, 
  MessageSquare, 
  FileText, 
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  X,
  Loader2,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { getStoredAuth } from '@/services/auth';
import { createProject, fetchJobInterests, listProjects, updateJobInterestStatus } from '@/services/api';

const parseStructuredMilestones = (milestonesText = '') => {
  const text = String(milestonesText || '').trim();
  if (!text) return [];

  const blocks = text
    .replace(/\r/g, '')
    .split(/\n\s*\n(?=-\s*milestone\s*name\s*:|milestone\s*\d+\s*[:\-]|\d+\.\s+)/i)
    .map((block) => block.trim())
    .filter(Boolean);

  const items = blocks.map((block, index) => {
    const titleMatch =
      block.match(/^-\s*milestone\s*name\s*:\s*(.+)$/im) ||
      block.match(/^(Milestone\s*\d+\s*[:\-]\s*.+)$/im) ||
      block.match(/^(\d+\.\s*.+)$/im);

    return {
      title: titleMatch ? titleMatch[1].trim() : `Milestone ${index + 1}`,
      description: block.match(/^\s*description\s*:\s*(.+)$/im)?.[1]?.trim() || '',
      expectedDeliverable: block.match(/^\s*expected\s+deliverable\s*:\s*(.+)$/im)?.[1]?.trim() || '',
      estimatedTimeRange: block.match(/^\s*estimated\s+time\s+range(?:\s+in\s+days)?\s*:\s*(.+)$/im)?.[1]?.trim() || '',
      workloadComplexity: block.match(/^\s*workload\s+complexity\s*:\s*(.+)$/im)?.[1]?.trim() || '',
      payoutPercentage: (() => {
        const value = block.match(/^\s*payout\s+percentage[^\d]*([\d.]+)\s*%/im)?.[1];
        return value ? Number(value) : null;
      })(),
      payableAmount: 0,
      requirement: block
    };
  });

  return items.length > 0
    ? items
    : [{ title: 'Project Milestone', description: text, expectedDeliverable: '', estimatedTimeRange: '', workloadComplexity: '', payoutPercentage: null, payableAmount: 0, requirement: text }];
};

function StructuredMilestones({ milestoneItems = [] }) {
  if (!Array.isArray(milestoneItems) || milestoneItems.length === 0) {
    return <p className="text-sm text-slate-500">No milestones generated yet.</p>;
  }

  return (
    <div className="space-y-3">
      {milestoneItems.map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">{item.title || `Milestone ${index + 1}`}</p>
              {item.description ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p> : null}
            </div>
            {item.payoutPercentage !== null && item.payoutPercentage !== undefined ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.payoutPercentage}% payout</span>
            ) : null}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Payable Amount</p>
              <p className="mt-1 text-xs font-bold text-emerald-700">₹{Number(item.payableAmount || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Expected Deliverable</p>
              <p className="mt-1 text-xs text-slate-600">{item.expectedDeliverable || 'Not specified'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Estimated Time</p>
              <p className="mt-1 text-xs text-slate-600">{item.estimatedTimeRange || 'Not specified'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Complexity</p>
              <p className="mt-1 text-xs text-slate-600">{item.workloadComplexity || 'Not specified'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// AI Requirement Analyzer Modal
function AIJobModal({ onClose, onJobPosted, employerId }) {
  const [step, setStep] = useState(1); // 1 = form, 2 = milestones review, 3 = payment done
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [milestones, setMilestones] = useState('');
  const [milestoneItems, setMilestoneItems] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please enter a project description.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid project budget.');
      return;
    }
    setError('');
    setLoading(true);
    setMilestones('');
    setMilestoneItems([]);
    try {
      const res = await fetch('https://synapescrow-3.onrender.com/api/generate-milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: `${description}\n\nTotal Budget: ₹${amount}` })
      });
      const data = await res.json();
      if (data.success) {
        // New structured response format
        const projectTitle = data.projectTitle || description.split('\n')[0].slice(0, 60) || 'New Project';
        const aiMilestones = Array.isArray(data.milestones) ? data.milestones : [];
        
        setProjectTitle(projectTitle);
        
        // Convert AI milestones to payable amounts
        const parsedMilestones = aiMilestones.map((item) => {
          const payout = Number(item?.payoutPercentage || 0);
          const budget = Number(amount || 0);
          const payableAmount = Number.isFinite(payout) && payout > 0 && Number.isFinite(budget) && budget > 0
            ? Math.round((budget * payout) / 100)
            : 0;

          return {
            title: String(item?.title || 'Milestone'),
            description: String(item?.description || ''),
            expectedDeliverable: String(item?.expectedDeliverable || ''),
            estimatedTimeRange: String(item?.estimatedTimeRange || ''),
            workloadComplexity: String(item?.workloadComplexity || ''),
            payoutPercentage: payout,
            payableAmount,
            requirement: String(item?.description || '')
          };
        });

        setMilestoneItems(parsedMilestones);
        setStep(2);
      } else {
        setError(data.error || 'AI generation failed. Please try again.');
      }
    } catch {
      setError('Could not reach AI server. Make sure the AI server is running on port 4000.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPayLoading(true);
    setError('');
    try {
      const res = await fetch('https://synapescrow-3.onrender.com/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) })
      });
      const order = await res.json();

      if (!order.id) {
        setError('Failed to create payment order. Check Razorpay keys in IIT/.env');
        setPayLoading(false);
        return;
      }

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'AI Escrow Agent',
        description: 'Project Budget Deposit',
        order_id: order.id,
        handler: async function () {
          const postedAtTimestamp = Date.now();
          await onJobPosted({
            id: postedAtTimestamp,
            name: projectTitle || description.split('\n')[0].slice(0, 60) || 'New Project',
            budgetAmount: Number(amount),
            budget: `₹${Number(amount).toLocaleString('en-IN')}`,
            status: 'Active',
            milestones: milestones,
            milestoneItems,
            description: description,
            employerId: employerId || null,
            postedAt: new Date(postedAtTimestamp).toLocaleDateString('en-IN'),
            postedAtTimestamp
          });
          setStep(3);
          setPayLoading(false);
        },
        modal: {
          ondismiss: function () {
            setPayLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setError('Payment initiation failed. Make sure Razorpay script is loaded and keys are set.');
      setPayLoading(false);
    }
  };

  const stepLabel = step === 1 ? 'Step 1 of 2 — Describe Project' : step === 2 ? 'Step 2 of 2 — Review & Pay' : 'Done!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-slate-900 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/20 p-2">
              <Sparkles size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">AI Job Planner</h2>
              <p className="text-xs text-slate-400">{stepLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center gap-0 px-6 pt-5">
            {[1, 2].map((s) => (
              <div key={s} className="flex flex-1 items-center">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= s ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {s}
                </div>
                {s < 2 && <div className={`h-0.5 flex-1 mx-1 rounded transition-colors ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-6 p-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Project Description <span className="text-emerald-600">*</span>
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Build a full-stack e-commerce app with React frontend, Node.js backend, payment integration, and admin dashboard..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Project Budget (INR) <span className="text-emerald-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  AI is analyzing your project...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Milestones with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-6 p-6">
            {/* AI Title */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">AI Generated Project Title</p>
              <p className="text-lg font-extrabold text-slate-900">{projectTitle}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">AI-Generated Milestones</span>
              </div>
              <StructuredMilestones milestoneItems={milestoneItems} />
            </div>

            {/* Budget summary */}
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-4">
              <span className="text-sm font-bold text-slate-600">Total Budget to Deposit</span>
              <span className="text-xl font-extrabold text-slate-900">₹{Number(amount).toLocaleString('en-IN')}</span>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setError(''); }}
                className="flex-1 rounded-2xl border-2 border-slate-200 py-3.5 font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                ← Edit
              </button>
              <button
                onClick={handlePayment}
                disabled={payLoading}
                className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {payLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Opening payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Continue & Pay ₹{Number(amount).toLocaleString('en-IN')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Success ── */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-6 p-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle size={40} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">Payment Successful!</h3>
              <p className="mt-2 text-slate-500">Your project budget of <span className="font-bold text-slate-800">₹{Number(amount).toLocaleString('en-IN')}</span> has been locked in escrow.</p>
              <p className="mt-1 text-sm text-slate-400">The milestones are ready — freelancers can now apply to your project.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl bg-emerald-500 px-8 py-3 font-bold text-white transition hover:bg-emerald-600"
            >
              Back to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Job Detail Modal (view milestones of a posted job) ──
function JobDetailModal({ job, onClose, interests = [], onStatusChange, actionLoadingId }) {
  const getStatusStyles = (status) => {
    if (status === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (status === 'rejected') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700';
  };

  const paidMilestones = Array.isArray(job?.paymentHistory)
    ? [...job.paymentHistory].sort((a, b) => Number(b?.paidAtTimestamp || 0) - Number(a?.paidAtTimestamp || 0))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-slate-900 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/20 p-2">
              <Briefcase size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">{job.name}</h2>
              <p className="text-xs text-slate-400">Posted {job.postedAt} &middot; Budget {job.budget}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {/* description */}
          {job.description && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Project Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{job.description}</p>
            </div>
          )}

          {/* milestones */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">AI-Confirmed Milestones</span>
              <span className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-600">
                <ShieldCheck size={12} /> Escrow Locked &middot; {job.budget}
              </span>
            </div>
            <StructuredMilestones milestoneItems={job.milestoneItems} />
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Paid Milestones History</p>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{paidMilestones.length}</span>
            </div>

            {paidMilestones.length === 0 ? (
              <p className="text-sm text-slate-500">No auto-released milestone payments yet.</p>
            ) : (
              <div className="space-y-3">
                {paidMilestones.map((item, index) => (
                  <div key={`${item.milestoneTitle}-${item.freelancerId}-${item.paidAtTimestamp}-${index}`} className="rounded-xl border border-blue-100 bg-white px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.milestoneTitle}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Freelancer: {item.freelancerName || 'Freelancer'}</p>
                        <p className="text-xs text-slate-400 mt-1">Paid on: {new Date(Number(item.paidAtTimestamp || Date.now())).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-emerald-700">₹{Number(item.releasedAmount || 0).toLocaleString('en-IN')}</p>
                        <p className="text-[11px] font-semibold text-emerald-600">Released</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Interested Freelancers</p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{interests.length}</span>
            </div>

            {interests.length === 0 ? (
              <p className="text-sm text-slate-500">No freelancer requests yet.</p>
            ) : (
              <div className="space-y-3">
                {interests.map((interest) => (
                  <div key={interest.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{interest.freelancerName}</p>
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                            <TrendingUp size={10} /> PFI {interest.freelancerPfiScore ?? 0}
                          </span>
                        <p className="text-xs text-slate-600">{interest.freelancerEmail}</p>
                        <p className="mt-1 text-xs text-slate-400">Requested: {interest.requestedAt}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${getStatusStyles(interest.status)}`}>
                        {interest.status || 'pending'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {interest.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => onStatusChange(interest.id, 'accepted')}
                            disabled={actionLoadingId === interest.id}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => onStatusChange(interest.id, 'rejected')}
                            disabled={actionLoadingId === interest.id}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}

                      {interest.freelancerEmail && interest.freelancerEmail !== 'N/A' ? (
                        <a
                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(interest.freelancerEmail)}&su=${encodeURIComponent(`Regarding ${job.name}`)}&body=${encodeURIComponent(`Hi ${interest.freelancerName || 'Freelancer'},\n\nI am contacting you regarding ${job.name}.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-white"
                        >
                          Message
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployerDashboardPage() {
  const [user, setUser] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [postedJobs, setPostedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobInterests, setJobInterests] = useState([]);
  const [interestActionLoadingId, setInterestActionLoadingId] = useState(null);

  const employerId = user?._id || user?.id || null;

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setUser(auth.user);
    }
  }, []);

  useEffect(() => {
    const loadPostedJobs = async () => {
      try {
        const response = await listProjects(employerId ? { employerId } : undefined);
        setPostedJobs(Array.isArray(response.data?.projects) ? response.data.projects : []);
      } catch {
        setPostedJobs([]);
      }
    };

    loadPostedJobs();
  }, [employerId]);

  useEffect(() => {
    const loadJobInterests = async () => {
      try {
        const projectIds = postedJobs
          .map((job) => String(job.id || job.postedAtTimestamp || '').trim())
          .filter(Boolean)
          .join(',');

        if (!projectIds) {
          setJobInterests([]);
          return;
        }

        const response = await fetchJobInterests({ projectIds });
        setJobInterests(Array.isArray(response.data?.interests) ? response.data.interests : []);
      } catch {
        // Don't clear existing list on transient error
      }
    };

    loadJobInterests();
    const intervalId = window.setInterval(loadJobInterests, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [postedJobs]);

  const getProjectInterests = (projectId) =>
    jobInterests.filter((item) => String(item.projectId) === String(projectId));

  const handleInterestStatusChange = async (interestId, status) => {
    if (!interestId) return;

    try {
      setInterestActionLoadingId(interestId);
      await updateJobInterestStatus(interestId, {
        status,
        employerId: employerId || undefined
      });

      setJobInterests((prev) =>
        prev.map((item) =>
          String(item.id) === String(interestId)
            ? {
                ...item,
                status
              }
            : item
        )
      );
    } catch {
      // Keep UI unchanged if update fails.
    } finally {
      setInterestActionLoadingId(null);
    }
  };

  const handleJobPosted = async (job) => {
    try {
      const payload = {
        ...job,
        employerId: job?.employerId || employerId || null
      };
      const response = await createProject(payload);
      const savedProject = response.data?.project;
      if (!savedProject) return;

      setPostedJobs((prev) => [savedProject, ...prev]);
    } catch {
      // Keep current UI when persistence fails.
    }
  };

  const pendingInterests = jobInterests.filter((item) => item.status === 'pending').length;

  // Compute real stats from postedJobs
  const totalEscrow = postedJobs.reduce((sum, j) => {
    const num = Number(String(j.budget || '0').replace(/[^\d.]/g, ''));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const formatINR = (n) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(1)}L`
      : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${n}`;

  const stats = [
    { label: 'Active Jobs', value: postedJobs.length, icon: Briefcase, trend: postedJobs.length > 0 ? `+${postedJobs.length}` : '0', color: 'bg-blue-500' },
    { label: 'Proposals', value: jobInterests.length, icon: Send, trend: pendingInterests > 0 ? `+${pendingInterests} new` : '0', color: 'bg-emerald-500' },
    { label: 'Escrow Locked', value: totalEscrow > 0 ? formatINR(totalEscrow) : '₹0', icon: ShieldCheck, trend: 'Stable', color: 'bg-indigo-500' },
    { label: 'Weekly Spend', value: '₹2,36,550', icon: TrendingUp, trend: '+12%', color: 'bg-orange-500' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {showAIModal && (
        <AIJobModal
          onClose={() => setShowAIModal(false)}
          onJobPosted={handleJobPosted}
          employerId={employerId}
        />
      )}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          interests={getProjectInterests(selectedJob.id || selectedJob.postedAtTimestamp)}
          onStatusChange={handleInterestStatusChange}
          actionLoadingId={interestActionLoadingId}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* 8️⃣ Dashboard Welcome Section (Hero) */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-0 bottom-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Welcome, {user?.name || 'Client'}!
          </h1>
          <p className="mt-4 text-xl text-slate-300 font-medium">
            Let's start with your first job post. It's the fastest way to meet top talent.
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-105 active:scale-95">
              <Sparkles size={18} />
              Get started using AI
            </button>
            <button className="rounded-full bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
              I'll do it without AI
            </button>
          </div>
        </div>
      </section>

      {/* Stats Quick View */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="group rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${stat.color} bg-opacity-10 text-white`}>
                <stat.icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content: Active Projects */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Your Active Projects</h2>
              {pendingInterests > 0 ? (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                  {pendingInterests} new requests
                </span>
              ) : null}
            </div>
            <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {postedJobs.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 px-6 py-10 text-center">
                <Briefcase size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-400">No jobs posted yet</p>
                <p className="mt-1 text-sm text-slate-400">Click "Post a new job" below to get started</p>
              </div>
            ) : (
              postedJobs.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedJob(proj)}
                  className="flex flex-wrap items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition hover:border-emerald-300 hover:shadow-md cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg hover:text-emerald-600 cursor-pointer">{proj.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded text-emerald-700 font-bold">{proj.status}</span>
                        <span className="text-xs text-slate-400">Posted {proj.postedAt}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                          Interested: {getProjectInterests(proj.id || proj.postedAtTimestamp).length}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                    <p className="text-lg font-bold text-slate-900">{proj.budget}</p>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <ShieldCheck size={12} /> Escrow Locked
                    </span>
                  </div>
                </div>
              ))
            )}
            
            <button
              onClick={() => setShowAIModal(true)}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2 group">
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              Post a new job
            </button>
          </div>
        </div>

        {/* Sidebar: Quick Actions & Reports */}
        <div className="space-y-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ArrowUpRight size={18} className="text-emerald-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Create a Manual Contract
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Check Messages
                </div>
                {pendingInterests > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingInterests}</span>
                ) : null}
              </button>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Release Next Milestone
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
            <h3 className="text-lg font-bold mb-2">Pro Package</h3>
            <p className="text-sm text-emerald-100 mb-6">Unlock dedicated account managers and premium talent search.</p>
            <button className="w-full bg-white text-emerald-700 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-sm">
              Upgrade Now
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding Completion</h3>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Profile Progress</span>
              <span className="text-emerald-600">85%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
            </div>
            <p className="mt-4 text-xs text-slate-500 font-medium">Add payment method to reach 100%.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
