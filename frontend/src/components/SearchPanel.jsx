/**
 * SearchPanel.jsx — Semantic search over the knowledge graph
 *
 * Allows users to search for any satellite, rocket, or entity by name.
 * Results are clickable and trigger the NodeDetail panel to open.
 */

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Satellite, Rocket, Building2, HelpCircle } from 'lucide-react'
import { API_BASE } from '../App'

// Icon map: renders the right icon based on node type
const TypeIcon = ({ type, size = 14 }) => {
  const icons = {
    satellite:    <Satellite size={size} color="#3b82f6" />,
    Satellite:    <Satellite size={size} color="#3b82f6" />,
    rocket:       <Rocket size={size} color="#f97316" />,
    Rocket:       <Rocket size={size} color="#f97316" />,
    organization: <Building2 size={size} color="#a855f7" />,
  }
  return icons[type] || <HelpCircle size={size} color="#64748b" />
}

export default function SearchPanel({ onNodeSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  // Debounce: wait 300ms after user stops typing before searching.
  // This prevents a new API request on every keystroke.
  const search = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => { setResults(data); setLoading(false) })
        .catch(() => setLoading(false))
    }, 300)
  }, [])

  const handleChange = (e) => {
    setQuery(e.target.value)
    search(e.target.value)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <Search size={14} />
        EXPLORE KNOWLEDGE GRAPH
      </div>

      <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
        {/* Search input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input-space"
            placeholder="Search satellites, rockets, missions..."
            value={query}
            onChange={handleChange}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={14} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(226,232,240,0.35)', pointerEvents: 'none',
          }} />
          {loading && (
            <div className="spinner" style={{
              width: 14, height: 14, borderWidth: 2,
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            }} />
          )}
        </div>

        {/* Results list */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <AnimatePresence>
            {results.length > 0 ? results.map((node, i) => (
              <motion.button
                key={node.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onNodeSelect(node.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px',
                  background: 'rgba(15,32,64,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                  width: '100%', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(249,115,22,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(15,32,64,0.4)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                }}
              >
                <TypeIcon type={node.type || node.entity_type} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontFamily: 'Rajdhani', fontSize: '14px', fontWeight: 600,
                    color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.name}
                  </div>
                  <div style={{ fontFamily: 'Exo 2', fontSize: '11px', color: 'rgba(226,232,240,0.4)',
                    marginTop: '1px' }}>
                    {node.type || node.entity_type || 'Entity'} · {node.application || node.launch_date || ''}
                  </div>
                </div>
                {node.status && (
                  <span className={(node.status || '').toLowerCase().includes('success') ? 'badge-success' : 'badge-failed'}>
                    {(node.status || '').toLowerCase().includes('success') ? '✓' : '✗'}
                  </span>
                )}
              </motion.button>
            )) : (
              !query && (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', opacity: 0.35, gap: '10px',
                }}>
                  <Search size={36} color="#3b82f6" />
                  <div style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: '#e2e8f0', textAlign: 'center' }}>
                    Search for any satellite, rocket, or mission.<br />
                    Click a node in the graph to see its details.
                  </div>
                </div>
              )
            )}
          </AnimatePresence>

          {results.length === 0 && query && !loading && (
            <div style={{ textAlign: 'center', padding: '20px', opacity: 0.4,
              fontFamily: 'Exo 2', fontSize: '13px', color: '#e2e8f0' }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
