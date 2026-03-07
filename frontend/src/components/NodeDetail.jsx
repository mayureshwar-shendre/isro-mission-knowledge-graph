/**
 * NodeDetail.jsx — Detailed panel for a selected knowledge graph node
 *
 * When a user clicks any node in the D3 graph or a search result, this panel
 * slides in to replace the SearchPanel and shows the full properties of that
 * node plus all its graph connections (relationships to other nodes).
 *
 * The "onNodeSelect" callback lets users navigate the graph by clicking on
 * any of the connected nodes listed here — it's essentially graph traversal
 * through the UI.
 */

import React from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react'

// Helper: maps a status string to a badge component
function StatusBadge({ status }) {
  const s = (status || '').toLowerCase()
  if (s.includes('success')) return <span className="badge-success">Successful</span>
  if (s.includes('fail'))    return <span className="badge-failed">Failed</span>
  if (s.includes('ongoing')) return <span className="badge-ongoing">Ongoing</span>
  return <span style={{ color: 'rgba(226,232,240,0.4)', fontSize: '12px' }}>Unknown</span>
}

// Helper: renders one row in the properties table
function PropRow({ label, value }) {
  if (!value || value === 'Unknown' || value === 'nan') return null
  return (
    <div style={{
      display: 'flex', gap: '8px',
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      fontSize: '13px', fontFamily: 'Exo 2',
    }}>
      <span style={{ color: 'rgba(226,232,240,0.4)', minWidth: '100px', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: '#e2e8f0', flex: 1, wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  )
}

export default function NodeDetail({ detail, onClose, onNodeSelect }) {
  if (!detail) return null

  const { node, connections } = detail

  // Separate outgoing and incoming connections for clearer display
  const outgoing = connections.filter(c => c.direction === 'outgoing')
  const incoming  = connections.filter(c => c.direction === 'incoming')

  // The primary type is the first label that isn't just 'Entity'
  const primaryType = (node.labels || []).find(l => l !== 'Entity') || node.entity_type || 'Entity'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Panel Header ─────────────────────────────────────────── */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <span style={{ fontSize: '16px' }}>
            {primaryType === 'Satellite' ? '🛰️' :
             primaryType === 'Rocket'    ? '🚀' :
             primaryType === 'Organization' ? '🏛️' : '🔵'}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'rgba(226,232,240,0.5)',
          cursor: 'pointer', padding: '2px', flexShrink: 0,
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(226,232,240,0.5)'}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Type Badge + Status ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '4px', padding: '2px 10px',
            fontFamily: 'Rajdhani', fontSize: '12px', fontWeight: 600,
            color: '#93c5fd', letterSpacing: '0.5px',
          }}>
            {primaryType}
          </span>
          {node.status && <StatusBadge status={node.status} />}
        </div>

        {/* ── Properties Table ──────────────────────────────────────── */}
        <div style={{
          background: 'rgba(5,12,24,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px', padding: '12px',
        }}>
          <div style={{ fontFamily: 'Rajdhani', fontSize: '11px', fontWeight: 600,
            color: '#f97316', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
            Properties
          </div>
          <PropRow label="Name"           value={node.name} />
          <PropRow label="Type"           value={primaryType} />
          <PropRow label="Launch Date"    value={node.launch_date} />
          <PropRow label="Orbit"          value={node.orbit} />
          <PropRow label="Application"    value={node.application} />
          <PropRow label="Launch Vehicle" value={node.launch_vehicle} />
          <PropRow label="Founded"        value={node.founded} />
          <PropRow label="Full Name"      value={node.full_name} />
        </div>

        {/* ── Connections ───────────────────────────────────────────── */}
        {connections.length > 0 && (
          <div style={{
            background: 'rgba(5,12,24,0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', padding: '12px',
          }}>
            <div style={{ fontFamily: 'Rajdhani', fontSize: '11px', fontWeight: 600,
              color: '#f97316', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Connections ({connections.length})
            </div>

            {/* Outgoing relationships */}
            {outgoing.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontFamily: 'Exo 2', fontSize: '11px', color: 'rgba(226,232,240,0.35)',
                  marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowRight size={11} /> Outgoing
                </div>
                {outgoing.map((conn, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => onNodeSelect(conn.neighbor)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '5px 0', cursor: 'pointer', textAlign: 'left',
                      fontSize: '12px', fontFamily: 'Exo 2',
                      borderBottom: i < outgoing.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span style={{ color: '#f97316', opacity: 0.7, fontSize: '10px', minWidth: '90px',
                      textAlign: 'right', flexShrink: 0 }}>
                      {conn.relation?.replace(/_/g, ' ')}
                    </span>
                    <ChevronRight size={10} color="rgba(249,115,22,0.5)" />
                    <span style={{ color: '#60a5fa', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = '#93c5fd'}
                      onMouseLeave={e => e.target.style.color = '#60a5fa'}
                    >
                      {conn.neighbor}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Incoming relationships */}
            {incoming.length > 0 && (
              <div>
                <div style={{ fontFamily: 'Exo 2', fontSize: '11px', color: 'rgba(226,232,240,0.35)',
                  marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowLeft size={11} /> Incoming
                </div>
                {incoming.map((conn, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => onNodeSelect(conn.neighbor)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      width: '100%', background: 'transparent', border: 'none',
                      padding: '5px 0', cursor: 'pointer', textAlign: 'left',
                      fontSize: '12px', fontFamily: 'Exo 2',
                      borderBottom: i < incoming.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span style={{ color: '#22c55e', opacity: 0.8 }}>{conn.neighbor}</span>
                    <ChevronRight size={10} color="rgba(34,197,94,0.5)" />
                    <span style={{ color: 'rgba(226,232,240,0.4)', fontSize: '10px' }}>
                      {conn.relation?.replace(/_/g, ' ')}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
