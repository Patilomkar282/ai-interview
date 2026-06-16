import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, getAdminInterviews, getInterviewFeedback } from '../api/admin';
import { BarChart3, Users, Clock, Award, LogOut, ChevronRight, Search, LayoutDashboard, Settings as SettingsIcon, FileText, X, Sliders, Bell, Shield, ArrowLeft, ArrowRight, Save, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Pagination State for All Interviews
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings State
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    maxQuestions: 15,
    difficulty: 'adaptive',
    notifications: true
  });

  // Modal state
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchDashboardData = async (page = 1) => {
    setLoading(true);
    try {
      const [statsData, interviewsData] = await Promise.all([
        getAdminStats(),
        getAdminInterviews(page, activeTab === 'dashboard' ? 5 : 15)
      ]);
      setStats(statsData.data);
      setInterviews(interviewsData.data);
      if (interviewsData.pagination) {
        setCurrentPage(interviewsData.pagination.page);
        setTotalPages(interviewsData.pagination.pages);
      }
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(1);
  }, [activeTab]); // Refetch when switching tabs to reset pagination

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchDashboardData(newPage);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = 'https://www.smartprep.live/login';
  };

  const handleViewReport = async (id) => {
    setReportLoading(true);
    try {
      const data = await getInterviewFeedback(id);
      setSelectedReport(data.data.feedback);
    } catch (error) {
      console.error("Error fetching report details", error);
      alert("Could not load the detailed report. It may not exist yet.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleSaveSettings = () => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const filteredInterviews = interviews.filter(session => 
    (session.userId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.jobRole || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-600 font-medium animate-pulse">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Sidebar - Premium Glassmorphism Design */}
      <div className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col justify-between hidden md:flex shrink-0 h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div>
          <div className="h-20 flex items-center px-8 border-b border-slate-100/50 bg-gradient-to-r from-indigo-500/5 to-transparent">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mr-4 shrink-0 transform transition-transform hover:scale-105">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-950 to-slate-800">AI Admin</span>
          </div>
          
          <div className="p-5 space-y-2 mt-4">
            <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Main Menu</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-semibold group relative overflow-hidden ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}
            >
              {activeTab === 'dashboard' && <div className="absolute left-0 top-0 w-1 h-full bg-white rounded-r-md"></div>}
              <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} /> 
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('interviews')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-semibold group relative overflow-hidden ${activeTab === 'interviews' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}
            >
              {activeTab === 'interviews' && <div className="absolute left-0 top-0 w-1 h-full bg-white rounded-r-md"></div>}
              <FileText className={`w-5 h-5 ${activeTab === 'interviews' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} /> 
              All Interviews
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-sm font-semibold group relative overflow-hidden ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'}`}
            >
              {activeTab === 'settings' && <div className="absolute left-0 top-0 w-1 h-full bg-white rounded-r-md"></div>}
              <SettingsIcon className={`w-5 h-5 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} /> 
              Settings
            </button>
          </div>
        </div>
        
        <div className="p-6 m-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors"></div>
          <div className="flex items-center gap-3 mb-5 relative z-10">
             <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                A
             </div>
             <div className="truncate">
               <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
               <p className="text-xs text-slate-500 truncate mt-0.5">Super Admin</p>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 transition-all duration-300 px-4 py-2.5 rounded-xl hover:bg-red-50 hover:shadow-sm font-semibold text-sm relative z-10"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Mobile Header */}
        <div className="md:hidden bg-white/80 backdrop-blur-xl h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
                <BarChart3 className="w-4 h-4 text-white" />
             </div>
             <span className="font-bold text-slate-900">AI Admin</span>
          </div>
          <button onClick={handleLogout} className="text-slate-500 p-2 hover:bg-slate-100 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 scroll-smooth">
          
          <div className="mb-10 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">{activeTab.replace('-', ' ')}</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              {activeTab === 'dashboard' && 'Overview and analytics of the AI Mock Interview ecosystem.'}
              {activeTab === 'interviews' && 'Detailed log of all candidate sessions and performance metrics.'}
              {activeTab === 'settings' && 'Configure AI behavior, difficulty models, and platform settings.'}
            </p>
          </div>

          {activeTab === 'dashboard' && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
              {/* Premium Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center shrink-0 border border-blue-200/50 shadow-inner">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Interviews</p>
                    <p className="text-4xl font-black text-slate-900">{stats?.totalInterviews || 0}</p>
                    <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Live and active</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200/50 shadow-inner">
                    <Award className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Avg AI Score</p>
                    <p className="text-4xl font-black text-slate-900">{stats?.averageScore || 0}<span className="text-xl text-slate-400 font-semibold">/100</span></p>
                    <p className="text-xs text-slate-500 font-semibold mt-2 flex items-center gap-1">Across all domains</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start gap-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center shrink-0 border border-purple-200/50 shadow-inner">
                    <Clock className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Active Domains</p>
                    <p className="text-4xl font-black text-slate-900">{stats?.interviewsByCategory?.length || 0}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-2 flex items-center gap-1">Job roles tested</p>
                  </div>
                </div>
              </div>

              {/* Recent Interviews Table (Preview) */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Recent Sessions Preview</h2>
                    <p className="text-sm text-slate-500 mt-1">Showing latest 5 mock interviews.</p>
                  </div>
                  <button onClick={() => setActiveTab('interviews')} className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    View All <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                {renderInterviewTable(interviews.slice(0, 5))}
              </div>
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 flex flex-col h-full min-h-[600px]">
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-1 flex flex-col overflow-hidden">
                
                {/* Table Header & Controls */}
                <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <h2 className="text-xl font-bold text-slate-900">Comprehensive Interview Log</h2>
                  <div className="relative group">
                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search candidate or domain..." 
                      className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm w-full sm:w-80 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-x-auto relative">
                  {loading ? (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                       <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : null}
                  {renderInterviewTable(filteredInterviews)}
                </div>

                {/* Pagination Controls */}
                <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <p className="text-sm text-slate-500 font-medium">
                    Showing page <span className="font-bold text-slate-900">{currentPage}</span> of <span className="font-bold text-slate-900">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Sliders className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Platform Configuration</h2>
                  </div>
                  <p className="text-slate-500 text-sm">Fine-tune the AI Interview parameters and administrative preferences.</p>
                </div>
                
                <div className="p-8 space-y-8">
                  {/* Setting Group 1 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4" /> AI Engine Parameters
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Max Questions per Session</label>
                        <select 
                          value={settingsForm.maxQuestions}
                          onChange={(e) => setSettingsForm({...settingsForm, maxQuestions: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                        >
                          <option value="10">10 Questions (Short)</option>
                          <option value="15">15 Questions (Standard)</option>
                          <option value="20">20 Questions (Extended)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">Determines how long the mock interview lasts.</p>
                      </div>

                      <div className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty Scaling</label>
                        <select 
                          value={settingsForm.difficulty}
                          onChange={(e) => setSettingsForm({...settingsForm, difficulty: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                        >
                          <option value="adaptive">Adaptive (Based on performance)</option>
                          <option value="fixed_medium">Fixed Medium</option>
                          <option value="fixed_hard">Fixed Hard</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">How AI scales questions during the session.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Setting Group 2 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-4 h-4" /> Administrative Preferences
                    </h3>
                    
                    <label className="flex items-center justify-between p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors cursor-pointer group">
                      <div>
                        <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Email Notifications</p>
                        <p className="text-xs text-slate-500 mt-1">Receive a daily digest of newly completed interviews.</p>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={settingsForm.notifications} onChange={() => setSettingsForm({...settingsForm, notifications: !settingsForm.notifications})} />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
                  {settingsSaved && (
                    <span className="flex items-center gap-2 text-emerald-600 font-semibold text-sm animate-in fade-in slide-in-from-right-4">
                      <CheckCircle className="w-5 h-5" /> Settings Saved!
                    </span>
                  )}
                  <button 
                    onClick={handleSaveSettings}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-slate-900/20"
                  >
                    <Save className="w-5 h-5" /> Save Configuration
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Report Modal - Premium Redesign */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[95vh] flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-300 overflow-hidden border border-slate-200/50">
            
            {/* Modal Header */}
            <div className="p-6 md:px-10 md:py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Evaluation Report</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Detailed performance analysis</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center shadow-sm hover:scale-105 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-10 overflow-y-auto bg-white custom-scrollbar">
              
              <div className="flex flex-col md:flex-row items-stretch gap-6 mb-10">
                {/* Score Card */}
                <div className="md:w-1/3 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-center text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
                  <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs mb-3 relative z-10">Final Score</p>
                  <p className="text-6xl font-black relative z-10">{selectedReport.score}</p>
                  <p className="text-indigo-200 font-medium text-sm mt-1 relative z-10">out of 100</p>
                </div>
                
                {/* Overall Feedback */}
                <div className="md:w-2/3 bg-slate-50 rounded-3xl p-8 border border-slate-100 relative">
                  <div className="absolute top-8 right-8 text-slate-200">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/></svg>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-3 text-lg relative z-10">Overall Assessment</h4>
                  <p className="text-slate-600 leading-relaxed relative z-10 text-sm md:text-base">{selectedReport.overall_feedback}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100/50">
                  <h4 className="flex items-center gap-3 font-bold text-emerald-900 mb-6 text-lg">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle className="w-4 h-4" /></div> 
                    Key Strengths
                  </h4>
                  <ul className="space-y-4">
                    {selectedReport.strengths?.map((str, idx) => (
                      <li key={idx} className="text-sm font-medium text-emerald-800 flex items-start gap-3">
                        <span className="text-emerald-500 mt-0.5 shrink-0">•</span> 
                        <span className="leading-relaxed">{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50/50 rounded-3xl p-8 border border-amber-100/50">
                  <h4 className="flex items-center gap-3 font-bold text-amber-900 mb-6 text-lg">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Award className="w-4 h-4" /></div> 
                    Areas to Improve
                  </h4>
                  <ul className="space-y-4">
                    {selectedReport.weaknesses?.map((weak, idx) => (
                      <li key={idx} className="text-sm font-medium text-amber-800 flex items-start gap-3">
                        <span className="text-amber-500 mt-0.5 shrink-0">•</span> 
                        <span className="leading-relaxed">{weak}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-indigo-50/30 rounded-3xl p-8 border border-indigo-100/50">
                <h4 className="font-bold text-indigo-950 mb-6 text-lg">Actionable Suggestions</h4>
                <ul className="space-y-4">
                  {selectedReport.suggestions?.map((sug, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                      <span className="leading-relaxed pt-1 font-medium">{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render table so we don't duplicate code between Dashboard preview and All Interviews tab
  function renderInterviewTable(data) {
    return (
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="px-6 md:px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Candidate</th>
            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Domain</th>
            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Date & Time</th>
            <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Score</th>
            <th className="px-6 md:px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100/80">
          {data.length > 0 ? (
            data.map((session) => (
              <tr key={session._id} className="hover:bg-indigo-50/30 transition-colors group">
                <td className="px-6 md:px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 flex items-center justify-center text-sm font-black shadow-inner border border-indigo-200/50 shrink-0">
                      {(session.userId?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{session.userId?.name || 'Unknown Student'}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{session.userId?.email || 'No email provided'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 hidden sm:table-cell">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 capitalize border border-slate-200 shadow-sm">
                    {session.jobRole}
                  </span>
                </td>
                <td className="px-6 py-5 hidden md:table-cell">
                  <p className="text-sm font-semibold text-slate-700">{session.startedAt ? new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{session.startedAt ? new Date(session.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</p>
                </td>
                <td className="px-6 py-5">
                  {session.score !== null && session.score !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-[60px] bg-slate-100 rounded-full h-1.5 hidden lg:block overflow-hidden">
                         <div className={`h-1.5 rounded-full ${session.score >= 70 ? 'bg-emerald-500' : session.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${session.score}%`}}></div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                        session.score >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                        session.score >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                        'bg-red-50 text-red-700 border border-red-200/50'
                      }`}>
                        {session.score}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200/50">Incomplete</span>
                  )}
                </td>
                <td className="px-6 md:px-8 py-5 text-right">
                  <button 
                    onClick={() => handleViewReport(session._id)}
                    disabled={reportLoading || session.score === null || session.score === undefined}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 px-4 py-2 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    View Report <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="px-6 py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">No interview sessions found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }
}
