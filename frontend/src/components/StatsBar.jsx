/**
 * StatsBar.jsx — Horizontal statistics bar
 *
 * Shows four animated metric cards: Total Satellites, Rockets, Success Rate,
 * and Knowledge Graph relationships. Numbers count up on first render using
 * Framer Motion for a satisfying "loading" feel that conveys scale.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Satellite, Rocket, TrendingUp, Share2 } from 'lucide-react'

// Each stat card has an icon, label, value key (from /api/stats), and color theme.
const STAT_CONFIG = [
  {
    icon: Satellite,
    label: 'Total Satellites',
    key: 'total_satellites',
    suffix: '',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.3)',
  },
  {
    icon: Rocket,
    label: 'Rocket Families',
    key: 'total_rockets',
    suffix: '',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.3)',
  },
  {
    icon: TrendingUp,
    label: 'Mission Success Rate',
    key: 'success_rate',
    suffix: '%',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.3)',
  },
  {
    icon: Share2,
    label: 'Graph Relationships',
    key: 'total_relationships',
    suffix: '+',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.3)',
  },
]

export default function StatsBar({ stats, loading }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      padding: '12px 16px',
      maxWidth: '1600px',
      margin: '0 auto',
    }}>
      {STAT_CONFIG.map((config, i) => {
        const Icon  = config.icon
        const value = stats?.[config.key]
        const displayValue = loading ? '...' : (value ?? 0)

        return (
          <motion.div
            key={config.key}
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="stat-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 18px',
            }}
          >
            {/* Icon circle with glow */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${config.color}22, ${config.color}08)`,
              border: `1px solid ${config.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 12px ${config.glow}`,
              flexShrink: 0,
            }}>
              <Icon size={20} color={config.color} />
            </div>

            {/* Text content */}
            <div>
              <div style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: '22px',
                fontWeight: 700,
                color: config.color,
                lineHeight: 1,
                textShadow: `0 0 12px ${config.glow}`,
                letterSpacing: '-0.5px',
              }}>
                {loading ? (
                  <span style={{ opacity: 0.4 }}>—</span>
                ) : (
                  <motion.span
                    key={displayValue}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {displayValue}{config.suffix}
                  </motion.span>
                )}
              </div>
              <div style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(226,232,240,0.5)',
                letterSpacing: '0.5px',
                marginTop: '3px',
              }}>
                {config.label}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
