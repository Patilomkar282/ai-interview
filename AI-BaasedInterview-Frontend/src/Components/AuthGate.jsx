import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AuthGate() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5002';
    const [error, setError] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const savedToken = localStorage.getItem('ai-interview-token');
        const token = tokenFromUrl || savedToken;

        if (token) {
            try {
                // Decode token to extract user info safely
                const base64Url = token.split('.')[1];
                let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const pad = base64.length % 4;
                if (pad) {
                    base64 += '='.repeat(4 - pad);
                }
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                const payload = JSON.parse(jsonPayload);
                
                // Formulate a user object similar to what AI context expects
                const user = {
                    _id: payload.id,
                    email: payload.email,
                    role: payload.role,
                    isOnboarded: true // Assume onboarded if coming from Central Hub
                };
                
                login(token, user);
                if (user.role === 'admin') {
                    navigate('/admin/dashboard', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } catch (err) {
                console.error("Token parsing error:", err);
                setError("Failed to parse authentication token. The token may be invalid or corrupted.");
            }
        } else {
            setError("No authentication token found in URL.");
        }
    }, [navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white shadow rounded">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Authentication Error</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.href = 'https://smartprep.live/login'}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Return to Central Hub
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-4 text-lg font-semibold text-gray-700">Authenticating with SmartPrep Hub...</p>
        </div>
    );
}
