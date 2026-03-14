'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  Briefcase,
  Clock,
  DollarSign,
  ChevronRight,
  MessageSquare,
  FileText,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  UserCircle,
  BriefcaseBusiness,
  Lock,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { getStoredAuth } from '@/services/auth';
import {
  calculateEscrowBreakdown,
  createJobInterest,
  fetchJobInterests,
  listProjects,
  recordProjectMilestoneProgress,
  verifyMilestoneWithAI
} from '@/services/api';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);

const parsePostedDate = (value) => {
  if (!value) return 0;
  const parts = String(value).split('/').map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item))) {
    return 0;
  }

  const [day, month, year] = parts;
  return new Date(year, month - 1, day).getTime();
};

const parseBudgetAmount = (project) =>
  Number(project?.budgetAmount) || Number(String(project?.budget || '0').replace(/[^\d.]/g, '')) || 0;

const normalizePostedJobs = (jobs = []) =>
  jobs
    .map((job) => ({
      ...job,
      budgetAmount:
        Number(job?.budgetAmount) || Number(String(job?.budget || '0').replace(/[^\d.]/g, '')) || 0,
      postedAtTimestamp:
        Number(job?.postedAtTimestamp) || Number(job?.id) || parsePostedDate(job?.postedAt) || 0
    }))
    .sort((left, right) => right.postedAtTimestamp - left.postedAtTimestamp);

const parseVerificationResponse = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  const cleaned = String(value)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      status: 'Review Generated',
      completion_percentage: null,
      short_explanation: cleaned
    };
  }
};

const extractMilestoneOptions = (milestonesText = '') => {
  const text = String(milestonesText || '').trim();
  if (!text) return [];

  const lines = text.split('\n');
  const markers = [];

  lines.forEach((line, index) => {
    const cleanedLine = line
      .replace(/[*`>#]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const numberedMatch = cleanedLine.match(/^(Milestone\s*\d+\s*[:\-]\s*.+)$/i);
    const namedMatch = cleanedLine.match(/^(?:[-•]\s*)?milestone\s*name\s*:\s*(.+)$/i);
    const listMatch = cleanedLine.match(/^(\d+\.\s*.+)$/);

    if (numberedMatch) {
      markers.push({
        index,
        title: numberedMatch[1].trim()
      });
      return;
    }

    if (namedMatch) {
      markers.push({
        index,
        title: namedMatch[1].trim()
      });
      return;
    }

    if (listMatch) {
      markers.push({
        index,
        title: listMatch[1].trim()
      });
    }
  });

  if (markers.length === 0) {
    return [
      {
        title: 'Project Milestone',
        requirement: text,
        payoutPercentage: null,
        payableAmount: null
      }
    ];
  }

  return markers.map((marker, idx) => {
    const nextMarker = markers[idx + 1];
    const start = marker.index;
    const end = nextMarker ? nextMarker.index : lines.length;

    const requirement = lines.slice(start, end).join('\n').trim();
    const payoutMatch = requirement.match(/payout\s*percentage[^\d]*([\d.]+)\s*%/i);

    return {
      title: marker.title,
      requirement,
      payoutPercentage: payoutMatch ? Number(payoutMatch[1]) : null,
      payableAmount: null
    };
  });
};

const buildMilestoneOptions = (project) => {
  if (Array.isArray(project?.milestoneItems) && project.milestoneItems.length > 0) {
    return project.milestoneItems.map((item, index) => ({
      title: String(item?.title || `Milestone ${index + 1}`),
      requirement: String(item?.requirement || item?.description || item?.title || ''),
      payoutPercentage:
        item?.payoutPercentage === null || item?.payoutPercentage === undefined || Number.isNaN(Number(item?.payoutPercentage))
          ? null
          : Number(item.payoutPercentage),
      payableAmount:
        item?.payableAmount === null || item?.payableAmount === undefined || Number.isNaN(Number(item?.payableAmount))
          ? null
          : Number(item.payableAmount)
    }));
  }

  return extractMilestoneOptions(project?.milestones || project?.description || '');
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

function ProjectVerificationModal({ project, onClose, onProjectUpdated }) {
  const [repoLink, setRepoLink] = useState('');
  const [milestoneOptions, setMilestoneOptions] = useState([]);
  const [selectedMilestoneTitle, setSelectedMilestoneTitle] = useState('');
  const [milestoneText, setMilestoneText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [releaseMessage, setReleaseMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [myRequest, setMyRequest] = useState(null);
  const [checkingRequest, setCheckingRequest] = useState(true);

  const allMilestoneOptions = useMemo(
    () => buildMilestoneOptions(project),
    [project]
  );

  useEffect(() => {
    const auth = getStoredAuth();
    const freelancerIdFromAuth = String(auth?.user?._id || auth?.user?.id || '');

    const completedTitles = Array.isArray(project?.completedMilestones)
      ? project.completedMilestones
          .filter((entry) => String(entry?.freelancerId || '') === freelancerIdFromAuth)
          .map((entry) => String(entry?.milestoneTitle || '').trim())
          .filter(Boolean)
      : [];

    const pendingOnly = allMilestoneOptions.filter((item) => !completedTitles.includes(item.title));
    setMilestoneOptions(pendingOnly);

    if (pendingOnly.length === 0) {
      setSelectedMilestoneTitle('');
      setMilestoneText('');
      return;
    }

    setSelectedMilestoneTitle(pendingOnly[0].title);
    setMilestoneText(pendingOnly[0].requirement || pendingOnly[0].title);
  }, [allMilestoneOptions, project?.id, project?.postedAtTimestamp]);

  useEffect(() => {
    const checkExistingRequest = async () => {
      const auth = getStoredAuth();
      const freelancerIdFromAuth = auth?.user?._id || auth?.user?.id;
      const projectId = project?.id || project?.postedAtTimestamp;
      if (!freelancerIdFromAuth || !projectId) {
        setCheckingRequest(false);
        return;
      }
      try {
        const response = await fetchJobInterests({
          projectId: String(projectId),
          freelancerId: String(freelancerIdFromAuth)
        });
        const interests = response.data?.interests || [];
        setMyRequest(interests[0] || null);
      } catch {
        // silently fall through
      } finally {
        setCheckingRequest(false);
      }
    };
    checkExistingRequest();
  }, [project]);

  const handleVerify = async () => {
    if (!repoLink.trim()) {
      setError('GitHub repository link required for AI verification.');
      return;
    }

    if (!milestoneText.trim()) {
      setError('Please select a milestone to verify.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setReleaseMessage('');
      const response = await verifyMilestoneWithAI({
        repoLink: repoLink.trim(),
        milestone: milestoneText.trim()
      });
      const parsedResult = parseVerificationResponse(response.data?.result);
      setResult(parsedResult);

      const completion = Number(parsedResult?.completion_percentage);
      if (completion === 100 && selectedMilestoneTitle) {
        const selected = milestoneOptions.find((item) => item.title === selectedMilestoneTitle);
        const budgetAmount = parseBudgetAmount(project);
        const payoutPercentage = selected?.payoutPercentage;
        const payableAmount = Number(selected?.payableAmount);
        const milestoneAmount = Number.isFinite(payableAmount) && payableAmount > 0
          ? Math.round(payableAmount)
          : payoutPercentage !== null && !Number.isNaN(payoutPercentage)
          ? Math.round((budgetAmount * payoutPercentage) / 100)
          : budgetAmount;

        let releasedAmount = milestoneAmount;
        try {
          const payout = await calculateEscrowBreakdown({
            milestoneAmount,
            completion_percentage: 100
          });
          releasedAmount = Number(payout?.data?.freelancer_payment) || milestoneAmount;
        } catch {
          // fall back to local calculation when API is temporarily unavailable
        }

        const auth = getStoredAuth();
        const freelancerIdFromAuth = auth?.user?._id || auth?.user?.id || 'unknown';
        const freelancerNameFromAuth = auth?.user?.name || myRequest?.freelancerName || 'Freelancer';
        const projectId = String(project?.id || project?._id || '');

        if (projectId) {
          try {
            const persistResponse = await recordProjectMilestoneProgress(projectId, {
              milestoneTitle: selectedMilestoneTitle,
              freelancerId: String(freelancerIdFromAuth),
              freelancerName: freelancerNameFromAuth,
              completionPercentage: 100,
              releasedAmount,
              paidAtTimestamp: Date.now()
            });

            if (typeof onProjectUpdated === 'function' && persistResponse.data?.project) {
              onProjectUpdated(persistResponse.data.project);
            }
          } catch {
            // Keep UI flow alive even when persistence call fails.
          }
        }

        const remaining = milestoneOptions.filter((item) => item.title !== selectedMilestoneTitle);
        setMilestoneOptions(remaining);
        if (remaining.length > 0) {
          setSelectedMilestoneTitle(remaining[0].title);
          setMilestoneText(remaining[0].requirement || remaining[0].title);
        } else {
          setSelectedMilestoneTitle('');
          setMilestoneText('');
        }

        setReleaseMessage(`${selectedMilestoneTitle} verified 100%. ${formatINR(releasedAmount)} released to freelancer, and milestone removed from pending list.`);
      }
    } catch (verifyError) {
      const errData = verifyError.response?.data;
      setError((errData?.error ? `${errData.error}${errData.detail ? `: ${errData.detail}` : ''}` : null) || 'AI quality verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestToJoin = async () => {
    const auth = getStoredAuth();
    const freelancer = auth?.user;
    const freelancerId = freelancer?._id || freelancer?.id;

    if (!freelancerId) {
      setRequestMessage('Please login as freelancer to send an interest request.');
      return;
    }

    const projectId = project?.id || project?.postedAtTimestamp;

    if (!projectId) {
      setRequestMessage('This project does not have a valid ID.');
      return;
    }

    try {
      setRequestLoading(true);
      setRequestMessage('');
      const employerId = project?.employerId || project?.employer_id || null;

      const response = await createJobInterest({
        projectId: String(projectId),
        projectName: project?.name || 'Untitled Project',
        employerId: employerId ? String(employerId) : null,
        freelancerId: String(freelancerId),
        freelancerName: freelancer?.name || 'Freelancer',
        freelancerEmail: freelancer?.email || 'N/A'
      });

      setRequestMessage(response.data?.message || 'Request sent to employer successfully.');
      setMyRequest({ status: 'pending' });
    } catch (requestError) {
      setRequestMessage(requestError?.response?.data?.message || 'Unable to send request right now.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-slate-900 px-6 py-5 text-white">
          <div>
            <h3 className="text-xl font-extrabold">{project.name}</h3>
            <p className="mt-1 text-xs text-slate-300">Posted {project.postedAt} • Budget {project.budget}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Project Description</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{project.description}</p>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={16} />
              <p className="text-sm font-bold">AI-Confirmed Milestones</p>
            </div>
            <StructuredMilestones milestoneItems={project.milestoneItems} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {checkingRequest ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Checking request status...
              </div>
            ) : myRequest?.status === 'accepted' ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Your request was accepted!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">You can now submit your work using the GitHub verification below.</p>
                </div>
              </div>
            ) : myRequest?.status === 'pending' ? (
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <Loader2 size={20} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Request Pending</p>
                  <p className="text-xs text-amber-600 mt-0.5">Waiting for employer to review your request. GitHub submission unlocks once accepted.</p>
                </div>
              </div>
            ) : myRequest?.status === 'rejected' ? (
              <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                <AlertCircle size={20} className="text-rose-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-rose-800">Request Rejected</p>
                  <p className="text-xs text-rose-600 mt-0.5">The employer has declined your interest for this project.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Interested in this project?</p>
                    <p className="text-xs text-slate-500">Send a request so employer can review your interest.</p>
                  </div>
                  <button
                    onClick={handleRequestToJoin}
                    disabled={requestLoading}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {requestLoading ? 'Sending...' : 'Request to Join Project'}
                  </button>
                </div>
                {requestMessage ? (
                  <p className={`mt-3 text-sm font-medium ${requestMessage.toLowerCase().includes('successfully') ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {requestMessage}
                  </p>
                ) : null}
              </>
            )}
          </section>

          {myRequest?.status === 'accepted' ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">GitHub Repository Link</label>
              <input
                value={repoLink}
                onChange={(event) => setRepoLink(event.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Milestone Requirement For Verification</label>
              <select
                value={selectedMilestoneTitle}
                disabled={milestoneOptions.length === 0}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setSelectedMilestoneTitle(nextTitle);
                  const selected = milestoneOptions.find((option) => option.title === nextTitle);
                  setMilestoneText(selected?.requirement || nextTitle);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {milestoneOptions.length === 0 ? (
                  <option value="">All milestones are already completed</option>
                ) : null}
                {milestoneOptions.map((option) => (
                  <option key={option.title} value={option.title}>
                    {option.title}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                <AlertCircle size={16} /> {error}
              </p>
            ) : null}

            <button
              onClick={handleVerify}
              disabled={loading || milestoneOptions.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Running AI Verification...' : 'Run Quality Verification'}
            </button>

            {releaseMessage ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {releaseMessage}
              </p>
            ) : null}
          </section>
          ) : (
            <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <Lock size={18} className="shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-600">GitHub Submission Locked</p>
                <p className="text-xs text-slate-400 mt-0.5">Employer must accept your request before you can submit work and run AI verification.</p>
              </div>
            </section>
          )}

          {result ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Verification Result</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400">Status</p>
                  <p className="mt-1 font-bold text-slate-900">{result.status || 'N/A'}</p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400">Completion</p>
                  <p className="mt-1 font-bold text-slate-900">
                    {result.completion_percentage === null || result.completion_percentage === undefined
                      ? 'N/A'
                      : `${result.completion_percentage}%`}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400">AI Assessment</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{result.short_explanation || 'No explanation returned.'}</p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function FreelancerDashboardPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setUser(auth.user);
      const freelancerId = auth.user?._id || auth.user?.id;
      if (freelancerId) {
        fetchJobInterests({ freelancerId, status: 'accepted' })
          .then((res) => { setAcceptedCount(res.data?.count || 0); })
          .catch(() => {});
      }
    }

    listProjects()
      .then((response) => {
        const projectList = Array.isArray(response.data?.projects) ? response.data.projects : [];
        setProjects(normalizePostedJobs(projectList));
      })
      .catch(() => {
        setProjects([]);
      });
  }, []);

  const handleProjectUpdated = (updatedProject) => {
    if (!updatedProject?.id && !updatedProject?._id) return;
    const updatedId = String(updatedProject.id || updatedProject._id);

    setProjects((prev) =>
      prev.map((item) => (String(item.id || item._id) === updatedId ? { ...item, ...updatedProject } : item))
    );

    setSelectedProject((prev) =>
      prev && String(prev.id || prev._id) === updatedId ? { ...prev, ...updatedProject } : prev
    );
  };

  const totalEscrowLocked = projects.reduce((sum, project) => sum + project.budgetAmount, 0);

  const stats = [
    {
      label: 'Active Contracts',
      value: projects.length,
      icon: BriefcaseBusiness,
      trend: projects.length > 0 ? `+${projects.length}` : '0',
      color: 'bg-blue-500'
    },
      { label: 'PFI Score', value: user?.pfi_score ?? 0, icon: TrendingUp, trend: (user?.pfi_score ?? 0) > 75 ? 'Excellent' : (user?.pfi_score ?? 0) > 50 ? 'Good' : 'Building', color: 'bg-purple-500' },
    { label: 'Total Earnings', value: formatINR(0), icon: TrendingUp, trend: '0%', color: 'bg-emerald-500' },
    {
      label: 'Escrow Locked',
      value: formatINR(totalEscrowLocked),
      icon: ShieldCheck,
      trend: projects.length > 0 ? 'Live' : '0',
      color: 'bg-indigo-500'
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {selectedProject ? (
        <ProjectVerificationModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onProjectUpdated={handleProjectUpdated}
        />
      ) : null}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-0 bottom-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Welcome, {user?.name || 'Freelancer'}!
          </h1>
          <p className="mt-4 text-xl text-slate-300 font-medium">
            Your next big opportunity is waiting. Explore jobs and build your reputation.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-105 active:scale-95">
              <Sparkles size={18} />
              Find work with AI
            </button>
            <button className="rounded-full bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
              Boost my profile
            </button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
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
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">Your Active Projects</h2>
            <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
                No employer-posted projects yet.
              </div>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj.id || proj.postedAtTimestamp}
                  className="flex flex-wrap items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition hover:border-emerald-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg hover:text-emerald-600 cursor-pointer">{proj.name}</h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                          <Users size={14} /> {proj.employerName || 'Employer Posted'}
                        </p>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{proj.status || 'Active'}</span>
                        <span className="text-xs text-slate-400">Posted {proj.postedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                    <p className="text-lg font-bold text-slate-900">{formatINR(proj.budgetAmount)}</p>
                    <p className="text-xs font-bold text-orange-500 flex items-center gap-1">
                      <Clock size={12} /> Latest employer posting
                    </p>
                    <button
                      onClick={() => setSelectedProject(proj)}
                      className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ArrowUpRight size={18} className="text-emerald-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <Send size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Submit Your Work
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <Link href="/dashboard/messages" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Check Messages
                </div>
                {acceptedCount > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{acceptedCount}</span>
                ) : null}
              </Link>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Escrow Balance
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-600" />
                PFI Score
              </h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${(user?.pfi_score ?? 0) > 75 ? 'bg-emerald-100 text-emerald-700' : (user?.pfi_score ?? 0) > 50 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {(user?.pfi_score ?? 0) > 75 ? 'Excellent' : (user?.pfi_score ?? 0) > 50 ? 'Good' : 'Building'}
              </span>
            </div>
            <div className="flex flex-col items-center py-3">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-purple-200 bg-purple-50">
                <span className="text-3xl font-extrabold text-purple-700">{user?.pfi_score ?? 0}</span>
              </div>
              <span className="mt-1 text-xs font-bold text-slate-400">out of 100</span>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500 leading-relaxed">Performance Fidelity Index reflects your delivery quality and on-time reliability.</p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
            <h3 className="text-lg font-bold mb-2">Build Influence</h3>
            <p className="text-sm text-emerald-100 mb-6">Complete your profile to 100% and get noticed by premium clients.</p>
            <button className="w-full bg-white text-emerald-700 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-sm">
              Complete Profile
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding Completion</h3>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Profile Progress</span>
              <span className="text-emerald-600">65%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="mt-4 text-xs text-slate-500 font-medium">Add skills and category to reach 100%.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
