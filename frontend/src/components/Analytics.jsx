/**
 * Analytics.jsx — Mission Insights & Analysis Panel
 *
 * Displays three visualizations using the Recharts library (which wraps D3
 * but provides React-friendly components):
 *   1. A pie chart showing mission success vs failure rates
 *   2. A bar chart showing which rocket families have launched the most satellites
 *   3. A card grid showing the most recent missions
 *
 * Recharts is declarative — you describe what the chart should look like using
 * JSX components, and Recharts figures out the D3 math. It's the right tool
 * for standard business charts. We use D3 directly only for the graph explorer
 * where we need full physics simulation control.
 */

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend
} from 'recharts'
import { BarChart2, Clock } from 'lucide-react'
import { API_BASE } from '../App'

// Custom colors for rocket bars — each rocket gets its own color
const ROCKET_COLORS = ['#f97316','#3b82f6','#22c55e','#a855f7','#f59e0b','#06b6d4']
// Pie chart colors for success/failure
const PIE_COLORS    = { Success: '#22c55e', Failed: '#ef4444', Unknown: '#f59e0b' }

// Custom recharts tooltip styled to match the dark space theme
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(5,12,24,0.97)',
      border: '1px solid rgba(249,115,22,0.3)',
      borderRadius: '8px', padding: '10px 14px',
      fontFamily: 'Exo 2', fontSize: '13px',
    }}>
      {label && <div style={{ color: '#f97316', fontWeight: 600, marginBottom: '4px' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#e2e8f0' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [rockets,  setRockets]  = useState([])
  const [recent,   setRecent]   = useState([])
  const [timeline, setTimeline] = useState([])
  const [stats,    setStats]    = useState(null)
  const [activeTab, setActiveTab] = useState('rockets')  // 'rockets' | 'timeline' | 'recent'
  const [loading,  setLoading]  = useState(true)

  // Fetch all analytics data in parallel when component mounts
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/analytics/rockets`).then(r => r.json()),
      fetch(`${API_BASE}/api/recent-missions`).then(r => r.json()),
      fetch(`${API_BASE}/api/analytics/timeline`).then(r => r.json()),
      fetch(`${API_BASE}/api/stats`).then(r => r.json()),
    ])
      .then(([rocketData, recentData, timelineData, statsData]) => {
        setRockets(rocketData)
        setRecent(recentData)
        setTimeline(timelineData)
        setStats(statsData)
        setLoading(false)
      })
      .catch(err => {
        console.error('Analytics fetch error:', err)
        setLoading(false)
      })
  }, [])

  // Build pie chart data from stats (success rate)
  const pieData = stats ? [
    { name: 'Success', value: stats.successful_launches },
    { name: 'Failed',  value: stats.total_satellites - stats.successful_launches },
  ] : []

  // The custom pie label showing percentage inside the segment
  const renderPieLabel = ({ name, percent }) =>
    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Panel Header ──────────────────────────────────────────── */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={14} />
          MISSION INSIGHTS & ANALYSIS
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { id: 'rockets',  label: 'Rockets'  },
            { id: 'timeline', label: 'Timeline' },
            { id: 'recent',   label: 'Recent'   },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '3px 10px', borderRadius: '4px', border: '1px solid',
              fontSize: '11px', fontFamily: 'Rajdhani', fontWeight: 600, cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(249,115,22,0.2)' : 'transparent',
              borderColor: activeTab === tab.id ? '#f97316' : 'rgba(255,255,255,0.12)',
              color: activeTab === tab.id ? '#f97316' : 'rgba(226,232,240,0.55)',
              transition: 'all 0.2s',
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '14px', overflow: 'auto' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* ── Tab: Rockets — Bar chart + Pie chart side by side ─── */}
            {activeTab === 'rockets' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', gap: '16px', height: '100%' }}>

                {/* Bar chart: satellites per rocket */}
                <div style={{ flex: 1.5 }}>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: 'rgba(226,232,240,0.5)',
                    letterSpacing: '0.5px', marginBottom: '10px', textTransform: 'uppercase' }}>
                    Top Rockets by Launches
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={rockets} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="rocket"
                        tick={{ fill: 'rgba(226,232,240,0.6)', fontSize: 11, fontFamily: 'Rajdhani' }}
                        angle={-30} textAnchor="end"
                        stroke="rgba(255,255,255,0.08)"
                      />
                      <YAxis tick={{ fill: 'rgba(226,232,240,0.6)', fontSize: 10 }} stroke="rgba(255,255,255,0.08)" />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="launches" name="Launches" radius={[4,4,0,0]}>
                        {rockets.map((entry, index) => (
                          <Cell key={index} fill={ROCKET_COLORS[index % ROCKET_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart: success rate */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: 'rgba(226,232,240,0.5)',
                    letterSpacing: '0.5px', marginBottom: '10px', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
                    Mission Success Rate
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={PIE_COLORS[entry.name] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'Exo 2', fontSize: '12px', color: 'rgba(226,232,240,0.7)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[d.name] }} />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                  {/* Success rate big number */}
                  {stats && (
                    <div style={{ marginTop: '12px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Orbitron', fontSize: '28px', fontWeight: 700,
                        color: '#22c55e', textShadow: '0 0 15px rgba(34,197,94,0.5)' }}>
                        {stats.success_rate}%
                      </div>
                      <div style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: 'rgba(226,232,240,0.4)' }}>
                        Overall Success Rate
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── Tab: Timeline — Line chart of launches per year ──── */}
            {activeTab === 'timeline' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: 'rgba(226,232,240,0.5)',
                  letterSpacing: '0.5px', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Satellite Launches Per Year (1975–2025)
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeline} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="year"
                      tick={{ fill: 'rgba(226,232,240,0.6)', fontSize: 10, fontFamily: 'Exo 2' }}
                      stroke="rgba(255,255,255,0.08)"
                      interval={4}
                    />
                    <YAxis tick={{ fill: 'rgba(226,232,240,0.6)', fontSize: 10 }} stroke="rgba(255,255,255,0.08)" />
                    <Tooltip content={<DarkTooltip />} />
                    <Line
                      type="monotone" dataKey="launches" name="Launches"
                      stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }}
                      activeDot={{ r: 7, fill: '#fb923c', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* ── Tab: Recent — Grid of recent mission cards ─────────── */}
            {activeTab === 'recent' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {recent.map((mission, i) => {
                  const isSuccess = (mission.status || '').toLowerCase().includes('success')
                  return (
                    <motion.div
                      key={mission.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        background: 'rgba(15,32,64,0.5)',
                        border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        borderRadius: '8px', padding: '12px',
                        cursor: 'default',
                      }}
                    >
                      {/* Status color bar at top */}
                      <div style={{ height: 2, borderRadius: 1, marginBottom: 8,
                        background: isSuccess ? '#22c55e' : '#ef4444' }} />
                      <div style={{ fontFamily: 'Rajdhani', fontSize: '13px', fontWeight: 700,
                        color: '#e2e8f0', marginBottom: '4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mission.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(226,232,240,0.5)',
                        fontFamily: 'Exo 2', marginBottom: '6px' }}>
                        {mission.launch_date}
                      </div>
                      <span className={isSuccess ? 'badge-success' : 'badge-failed'}>
                        {isSuccess ? 'Successful' : 'Failed'}
                      </span>
                      {mission.application && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'rgba(226,232,240,0.4)',
                          fontFamily: 'Exo 2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {mission.application}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
