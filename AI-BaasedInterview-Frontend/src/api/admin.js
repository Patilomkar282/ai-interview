import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5002';

const getAuthHeaders = () => {
    const token = localStorage.getItem('ai-interview-token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const getAdminStats = async () => {
    const res = await axios.get(`${API_BASE}/api/admin/stats`, getAuthHeaders());
    return res.data;
};

export const getAdminInterviews = async (page = 1, limit = 10) => {
    const res = await axios.get(`${API_BASE}/api/admin/interviews?page=${page}&limit=${limit}`, getAuthHeaders());
    return res.data;
};

export const getInterviewFeedback = async (id) => {
    const res = await axios.get(`${API_BASE}/api/admin/interviews/${id}/feedback`, getAuthHeaders());
    return res.data;
};
