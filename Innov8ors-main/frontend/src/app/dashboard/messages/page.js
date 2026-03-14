'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Briefcase, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getStoredAuth } from '@/services/auth';
import { fetchJobInterests } from '@/services/api';



export default function MessagesPage() {
  const [accepted, setAccepted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const auth = getStoredAuth();
      const freelancerId = auth?.user?._id || auth?.user?.id;
      if (!freelancerId) { setLoading(false); return; }
      try {
        const res = await fetchJobInterests({ freelancerId, status: 'accepted' });
        setAccepted(res.data?.interests || []);
      } catch {
        setAccepted([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
          <Briefcase size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Messages</h1>
          <p className="text-sm text-slate-500">Projects where employer has accepted your request</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <Clock size={20} className="animate-spin" />
          <p className="text-sm font-medium">Loading messages...</p>
        </div>
      ) : accepted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Briefcase size={28} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-400">No accepted requests yet</p>
          <p className="mt-1 text-sm text-slate-400">Once an employer accepts your request, it will appear here.</p>
          <Link
            href="/dashboard/freelancer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Browse Projects <ChevronRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {accepted.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle size={24} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{item.projectName}</p>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    Accepted
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  Your request to join <span className="font-semibold">{item.projectName}</span> has been accepted by the employer. You can now submit your work using GitHub verification.
                </p>
                <p className="mt-2 text-xs text-slate-400">Accepted on {item.requestedAt}</p>
                <Link
                  href="/dashboard/freelancer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  Open Project & Submit Work <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
