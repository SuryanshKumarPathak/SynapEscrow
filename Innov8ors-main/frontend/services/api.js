import axios from 'axios';

const ensureApiBaseUrl = (rawUrl, fallbackUrl) => {
  const resolvedUrl = (rawUrl || fallbackUrl || '').trim();

  // Keep existing /api paths untouched and append /api when missing.
  if (/\/api\/?$/i.test(resolvedUrl)) {
    return resolvedUrl.replace(/\/$/, '');
  }

  return `${resolvedUrl.replace(/\/$/, '')}/api`;
};

const API_BASE_URL = ensureApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL,
  'https://synapescrow-2.onrender.com/api'
);
const IIT_API_BASE_URL = ensureApiBaseUrl(
  process.env.NEXT_PUBLIC_IIT_API_BASE_URL,
  'https://synapescrow-1.onrender.com/api'
);

const api = axios.create({
  baseURL: API_BASE_URL
});

const iitApi = axios.create({
  baseURL: IIT_API_BASE_URL
});

export const createProject = (payload) => api.post('/projects', payload);
export const listProjects = (params) => api.get('/projects', { params });
export const approveProjectMilestones = (projectId, payload) =>
  api.post(`/projects/${projectId}/milestones/approval`, payload);
export const generateMilestones = (payload) =>
  iitApi.post('/generate-milestones', payload);
export const createPaymentOrder = (payload) =>
  iitApi.post('/create-payment', payload);
export const submitMilestone = (milestoneId, payload) =>
  api.post(`/milestones/${milestoneId}/submit`, payload);
export const fetchMilestonesByFreelancer = (freelancerId) =>
  api.get(`/milestones/freelancer/${freelancerId}`);
export const fetchMilestonesByProject = (projectId) =>
  api.get(`/milestones/project/${projectId}`);
export const releaseEscrowPayment = (payload) => api.post('/payments/release', payload);
export const fetchFreelancerPFI = (freelancerId) =>
  api.get(`/freelancers/${freelancerId}/pfi`);

export const loginUser = (payload) => api.post('/auth/login', payload);
export const signupUser = (payload) => api.post('/auth/signup', payload);
export const onboardUser = (payload) => api.post('/auth/onboarding', payload);
export const saveCategoriesAndSkills = (payload) => api.post('/profile/categories-skills', payload);
export const completeProfile = (payload) => api.post('/profile/complete', payload);

export const fetchProjectById = (projectId) => api.get(`/projects/${projectId}`);
export const fetchProjectMilestones = (projectId) =>
  api.get(`/projects/${projectId}/milestones`);
export const recordProjectMilestoneProgress = (projectId, payload) =>
  api.post(`/projects/${projectId}/milestones/progress`, payload);
export const fetchProjectPayments = (projectId) =>
  api.get(`/payments/project/${projectId}`);
export const fetchEscrowDashboard = (projectId) =>
  api.get(`/payments/project/${projectId}/dashboard`);

export const createJobInterest = (payload) => api.post('/job-interests', payload);
export const fetchJobInterests = (params) => api.get('/job-interests', { params });
export const updateJobInterestStatus = (interestId, payload) =>
  api.patch(`/job-interests/${interestId}/status`, payload);

export const verifyMilestoneWithAI = (payload) => iitApi.post('/verify-milestone', payload);
export const calculatePFIWithAI = (payload) => iitApi.post('/calculate-pfi', payload);
export const calculateEscrowBreakdown = (payload) => iitApi.post('/release-payment', payload);
export const generateMilestonesWithIIT = (payload) => iitApi.post('/generate-milestones', payload);
export const createPaymentWithIIT = (payload) => iitApi.post('/create-payment', payload);

export default api;
