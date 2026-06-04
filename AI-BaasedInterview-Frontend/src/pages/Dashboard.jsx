import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Award, Clock, LogOut, Play,
  ChevronRight, User, Calendar, Flame, AlertTriangle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const CATEGORY_COLORS = {
  fullstack: '#6366f1',
  backend: '#a855f7',
  hr: '#f97316',
  dbms: '#10b981',
  custom: '#3b82f6'
};

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------
const SkeletonBlock = ({ className = '' }) => (
  <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />
);

const StatCardSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-3xl p-7">
    <div className="flex items-center justify-between mb-5">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="w-12 h-12 rounded-2xl" />
    </div>
    <SkeletonBlock className="h-9 w-24 mt-1" />
  </div>
);

const ChartSkeleton = ({ height = 250 }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6">
    <SkeletonBlock className="h-5 w-32 mb-6" />
    <SkeletonBlock className={`w-full rounded-2xl`} style={{ height }} />
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6">
    <SkeletonBlock className="h-5 w-40 mb-6" />
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonBlock className="h-4 flex-1" />
          <SkeletonBlock className="h-4 flex-1" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-12" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <ChartSkeleton height={250} />
      <ChartSkeleton height={250} />
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <ChartSkeleton height={160} />
      <ChartSkeleton height={160} />
    </div>
    <TableSkeleton />
  </div>
);

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/dashboard/history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setStats(statsRes.data);
      setHistory(historyRes.data.history);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryData = stats?.categoryBreakdown
    ? Object.entries(stats.categoryBreakdown).map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: data.count,
        avgScore: data.avgScore,
        color: CATEGORY_COLORS[name] || '#6366f1'
      }))
    : [];

  const radarData = stats?.skillRadar
    ? Object.entries(stats.skillRadar).map(([key, value]) => ({
        skill: key.charAt(0).toUpperCase() + key.slice(1),
        score: value,
        fullMark: 100
      }))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans pb-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[800px] h-[800px] bg-indigo-200/20 rounded-full blur-[120px] -top-64 -left-64 animate-pulse" />
        <div className="absolute w-[800px] h-[800px] bg-purple-200/20 rounded-full blur-[120px] -bottom-64 -right-64 animate-pulse" />
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/50">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
              <p className="text-sm text-slate-500 font-medium">Welcome back, <span className="text-indigo-600">{user?.name}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-sm hover:shadow-indigo-500/25 active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-white" /> New Interview
            </button>
            <button
              onClick={() => { logout(); window.location.href = 'http://localhost:5174/login'; }}
              className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors px-3 py-2.5 rounded-xl hover:bg-red-50 font-medium text-sm"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Stat Cards + Streak Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Total Interviews',
                value: stats?.totalInterviews || 0,
                icon: BarChart3,
                colorClass: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30',
                badge: stats?.percentileRank !== null && stats?.percentileRank !== undefined
                  ? { text: `Top ${100 - stats.percentileRank}%`, color: 'bg-blue-50 text-blue-700 border-blue-200' }
                  : null
              },
              {
                label: 'Average Score',
                value: `${stats?.averageScore || 0}/100`,
                icon: TrendingUp,
                colorClass: 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30',
                badge: stats?.percentileRank !== null && stats?.percentileRank !== undefined
                  ? {
                      text: `${stats.percentileRank}th percentile`,
                      color: stats.percentileRank >= 75
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : stats.percentileRank >= 50
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  : null
              },
              {
                label: 'Sessions Left',
                value: `${stats?.sessionsRemaining ?? 5}/5`,
                icon: Clock,
                colorClass: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30',
                badge: null
              },
              {
                label: 'Best Category',
                value: stats?.bestCategory || 'N/A',
                icon: Award,
                colorClass: 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-purple-500/30',
                badge: null
              }
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-slate-200 shadow-sm rounded-3xl p-7 hover:shadow-md hover:border-slate-300 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">{card.label}</span>
                  <div className={`w-12 h-12 rounded-2xl ${card.colorClass} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon className="w-6 h-6 stroke-[2.5px]" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{card.value}</p>
                {card.badge && (
                  <span className={`inline-flex items-center mt-3 text-xs font-bold px-2.5 py-1 rounded-full border ${card.badge.color}`}>
                    {card.badge.text}
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Streak Card */}
          {stats?.streak && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-3xl p-6 flex items-center gap-6 shadow-sm"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">Interview Streak</p>
                <div className="flex items-baseline gap-4 flex-wrap">
                  <div>
                    <span className="text-4xl font-extrabold text-slate-900">{stats.streak.current}</span>
                    <span className="text-slate-500 font-semibold ml-1.5">day{stats.streak.current !== 1 ? 's' : ''} current</span>
                  </div>
                  <div className="text-slate-400 font-bold text-xl">·</div>
                  <div>
                    <span className="text-2xl font-bold text-amber-600">{stats.streak.longest}</span>
                    <span className="text-slate-500 font-semibold ml-1.5">day longest</span>
                  </div>
                </div>
              </div>
              {stats.streak.current > 0 && (
                <div className="hidden sm:flex flex-col items-center gap-1">
                  {[...Array(Math.min(stats.streak.current, 7))].map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Score Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Score Trend
              </h3>
              {stats?.scoreTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickFormatter={v => v.slice(5)} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#64748B', fontWeight: 600, marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', r: 4, strokeWidth: 2, stroke: '#ffffff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400 font-medium">
                  Complete interviews to see your trend
                </div>
              )}
            </motion.div>

            {/* Skill Radar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" /> Skill Radar
              </h3>
              {radarData.length > 0 && radarData.some(d => d.score > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="skill"
                      stroke="#475569"
                      fontSize={11}
                      fontWeight={600}
                      tick={({ payload, x, y, textAnchor, cx, cy }) => {
                        const item = radarData.find(d => d.skill === payload.value);
                        const isTop = y < cy - 20;
                        const isBottom = y > cy + 20;
                        const yOffset = isTop ? -5 : isBottom ? 10 : 0;
                        return (
                          <text x={x} y={y + yOffset} textAnchor={textAnchor} fill="#475569" fontSize={11} fontWeight={600}>
                            <tspan>{payload.value}</tspan>
                            <tspan x={x} dy="16" fill="#0f172a" fontSize={13} fontWeight="bold">
                              {item?.score ?? 0}
                            </tspan>
                          </text>
                        );
                      }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" tick={false} />
                    <Radar dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400 font-medium">
                  Complete interviews to see skill analysis
                </div>
              )}
            </motion.div>
          </div>

          {/* Second Row: Category + Strengths/Weaknesses */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-6">Category Breakdown</h3>
              {categoryData.length > 0 ? (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={50} stroke="none">
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3 flex-1">
                    {categoryData.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900">{cat.value}</span>
                          <span className="text-xs text-slate-500 ml-2 font-medium">avg {cat.avgScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-slate-400 font-medium">
                  No interviews yet
                </div>
              )}
            </motion.div>

            {/* Key Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-8 tracking-tight">Key Insights</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-gradient-to-b from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100/50 shadow-[inset_0_2px_10px_rgba(16,185,129,0.05)]">
                  <h4 className="text-xs uppercase tracking-widest text-emerald-600 font-extrabold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Strengths
                  </h4>
                  {stats?.aggregatedStrengths?.length > 0 ? (
                    <ul className="space-y-3">
                      {stats.aggregatedStrengths.map((s, i) => {
                        const isExpanded = expandedInsight === `s-${i}`;
                        return (
                          <li
                            key={i}
                            onClick={() => setExpandedInsight(isExpanded ? null : `s-${i}`)}
                            className={`text-sm text-slate-700 font-medium cursor-pointer p-2.5 -mx-2.5 rounded-xl transition-all select-none ${isExpanded ? 'bg-emerald-100/30' : 'hover:bg-emerald-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-emerald-500 font-bold mt-0.5 text-lg leading-none flex-shrink-0">✓</span>
                              <span className={`leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>{s}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-slate-400">Complete interviews to see insights</p>
                  )}
                </div>
                <div className="bg-gradient-to-b from-orange-50 to-white p-6 rounded-2xl border border-orange-100/50 shadow-[inset_0_2px_10px_rgba(249,115,22,0.05)]">
                  <h4 className="text-xs uppercase tracking-widest text-orange-600 font-extrabold mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    Areas to Improve
                  </h4>
                  {stats?.aggregatedWeaknesses?.length > 0 ? (
                    <ul className="space-y-2">
                      {stats.aggregatedWeaknesses.map((w, i) => {
                        const isExpanded = expandedInsight === `w-${i}`;
                        return (
                          <li
                            key={i}
                            onClick={() => setExpandedInsight(isExpanded ? null : `w-${i}`)}
                            className={`text-sm text-slate-700 font-medium cursor-pointer p-2.5 -mx-2.5 rounded-xl transition-all select-none ${isExpanded ? 'bg-orange-100/30' : 'hover:bg-orange-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-orange-500 font-bold mt-0.5 text-lg leading-none flex-shrink-0">!</span>
                              <span className={`leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>{w}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">Complete interviews to see</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Weak Topics */}
          {Array.isArray(stats?.weakTopics) && stats.weakTopics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-red-50/50 border border-red-200 rounded-3xl p-8 shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 border border-red-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Weak Topics to Focus On</h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Topics where your average score is below 50</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.weakTopics.map((t, i) => (
                  <div key={i} className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-semibold text-slate-900 leading-tight">{t.topic}</p>
                      <span className="text-xl font-extrabold text-red-600 flex-shrink-0 ml-2">{t.avgScore}</span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full bg-red-500 transition-all duration-700"
                        style={{ width: `${t.avgScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{t.occurrences} occurrence{t.occurrences !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Interview History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Interview History
            </h3>
            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-xs text-slate-500 uppercase tracking-widest pb-4 font-bold">Date</th>
                      <th className="text-left text-xs text-slate-500 uppercase tracking-widest pb-4 font-bold">Role</th>
                      <th className="text-left text-xs text-slate-500 uppercase tracking-widest pb-4 font-bold">Score</th>
                      <th className="text-left text-xs text-slate-500 uppercase tracking-widest pb-4 font-bold">Questions</th>
                      <th className="text-left text-xs text-slate-500 uppercase tracking-widest pb-4 font-bold">Status</th>
                      <th className="pb-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`/feedback?id=${item.id}`)}>
                        <td className="py-4 text-sm text-slate-600 font-medium">{item.date}</td>
                        <td className="py-4">
                          <span className="text-sm font-bold text-slate-900 capitalize">{item.role}</span>
                        </td>
                        <td className="py-4">
                          <span className={`text-sm font-bold ${item.score >= 70 ? 'text-emerald-600' : item.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {item.score}/100
                          </span>
                        </td>
                        <td className="py-4 text-sm text-slate-600 font-medium">{item.questionsAnswered}</td>
                        <td className="py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wide ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : item.status === 'not started' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            <ChevronRight className="w-4 h-4 text-indigo-600" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20 text-slate-400" />
                <p className="font-medium text-slate-600">No interviews yet. Start your first one!</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
