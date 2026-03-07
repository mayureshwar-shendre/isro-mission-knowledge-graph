/**
 * Header.jsx — Top navigation bar
 *
 * Displays the ISRO Mission Navigator logo on the left, the app title
 * in the center with animated tagline, and a status indicator on the right.
 * The logo is the user's uploaded PNG in /public/logo.png.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Satellite, Zap } from 'lucide-react'

export default function Header({ stats, loading }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(5, 12, 24, 0.9)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>

      {/* ── Left: Logo + Brand ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Logo image — place your logo.png in frontend/public/ */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 48, height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(249,115,22,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(249,115,22,0.1), rgba(5,12,24,0.8))',
            overflow: 'hidden',
          }}
        >
          <img
            src="/logo.png"
            alt="ISRO Mission Navigator"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => {
              // Fallback if logo.png not found
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = '<span style="color:#f97316;font-size:20px">🚀</span>'
            }}
          />
        </motion.div>

        <div>
          <div style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '2px',
            background: 'linear-gradient(135deg, #f97316, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ISRO MISSION NAVIGATOR
          </div>
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '11px',
            color: 'rgba(249,115,22,0.7)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>
            ✦ Launch to Legacy ✦
          </div>
        </div>
      </div>

      {/* ── Center: Animated subtitle ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {['Knowledge Graph', 'RAG Q&A', 'Live Analytics', 'D3 Explorer'].map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.3 }}
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(226,232,240,0.5)',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'default',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: ['#f97316','#3b82f6','#22c55e','#a855f7'][i],
              boxShadow: `0 0 6px ${['#f97316','#3b82f6','#22c55e','#a855f7'][i]}`
            }} />
            {label}
          </motion.div>
        ))}
      </div>

      {/* ── Right: Status indicator ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Live data badge */}
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '12px',
            color: '#22c55e',
            fontWeight: 600,
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 8px #22c55e'
          }} />
          LIVE
        </motion.div>

        {/* Node count chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: '6px',
          padding: '4px 12px',
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '12px',
          color: '#60a5fa',
          fontWeight: 600,
        }}>
          <Satellite size={13} />
          {loading ? '...' : (stats?.total_satellites || 0)} Satellites
        </div>
      </div>
    </header>
  )
}
