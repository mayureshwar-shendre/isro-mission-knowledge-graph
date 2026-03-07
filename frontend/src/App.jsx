/**
 * App.jsx — Root component for ISRO Mission Navigator
 *
 * Architecture: This component is the "conductor" of the entire app.
 * It owns the shared state (selected node, active tab, stats) that
 * multiple child panels need to access. It also manages the top-level
 * layout — the 2x2 grid of panels that matches the mockup images.
 *
 * State management philosophy: We use React's built-in useState and
 * useEffect hooks rather than Redux or Zustand, because the app state
 * is not deeply nested and lifting state to this root component is
 * sufficient. If the app grows significantly, consider Zustand.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import GraphExplorer from './components/GraphExplorer'
import AIQnA from './components/AIQnA'
import Analytics from './components/Analytics'
import SearchPanel from './components/SearchPanel'
import NodeDetail from './components/NodeDetail'
import StatsBar from './components/StatsBar'

// Base URL for API calls. During development Vite proxies /api to localhost:8000.
// In production this env variable should be set to your deployed backend URL.
export const API_BASE = import.meta.env.VITE_API_URL || ''

export default function App() {
  // ── Shared State ────────────────────────────────────────────────
  // selectedNode: the node clicked in the graph; null means nothing selected
  const [selectedNode, setSelectedNode]     = useState(null)
  // nodeDetail: the full node data fetched from /api/node/:name
  const [nodeDetail,   setNodeDetail]       = useState(null)
  // activeTab: which of the four main panels is "focused" (mobile UX)
  const [activeTab,    setActiveTab]        = useState('graph')
  // stats: the numbers shown in the header stat cards
  const [stats,        setStats]            = useState(null)
  // loading: whether the app is in its initial data fetch
  const [loading,      setLoading]          = useState(true)

  // ── Fetch statistics on mount ────────────────────────────────────
  // This runs once when the component first renders (empty dependency array).
  // We fetch the high-level stats to populate the header cards immediately.
  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err)
        setLoading(false)
      })
  }, [])

  // ── Fetch node detail when a node is selected ─────────────────────
  // This runs every time selectedNode changes. We encode the name to
  // handle spaces and special characters in satellite names.
  useEffect(() => {
    if (!selectedNode) {
      setNodeDetail(null)
      return
    }
    fetch(`${API_BASE}/api/node/${encodeURIComponent(selectedNode)}`)
      .then(r => r.json())
      .then(data => setNodeDetail(data))
      .catch(err => console.error('Node detail fetch failed:', err))
  }, [selectedNode])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--space-950)', position: 'relative' }}>
      {/* Animated star field background layers */}
      <div className="star-field">
        <div className="stars-1" />
        <div className="stars-2" />
        <div className="stars-3" />
      </div>

      {/* Subtle nebula-like radial gradient overlays for depth */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 50% at 20% 20%, rgba(249,115,22,0.04) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(59,130,246,0.05) 0%, transparent 60%)
        `
      }} />

      {/* All actual content sits above the background (z-index: 1) */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top navigation / branding bar */}
        <Header stats={stats} loading={loading} />

        {/* Stats bar — the four metric cards below the header */}
        <StatsBar stats={stats} loading={loading} />

        {/* ── Main Dashboard Grid ─────────────────────────────────────
            The layout mirrors the 2×2 grid from the mockup images:
            ┌─────────────────┬─────────────────┐
            │  Graph Explorer │   AI Q&A        │
            │  (D3.js graph)  │   (RAG panel)   │
            ├─────────────────┼─────────────────┤
            │  Analytics      │  Search/Explore │
            │  (charts)       │  (knowledge)    │
            └─────────────────┴─────────────────┘
        */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'auto auto',
          gap: '16px',
          padding: '0 16px 16px',
          maxWidth: '1600px',
          margin: '0 auto',
        }}>

          {/* Panel 1: Interactive Knowledge Graph (top-left) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel"
            style={{ height: '460px', minHeight: '400px' }}
          >
            <GraphExplorer
              onNodeSelect={setSelectedNode}
              selectedNode={selectedNode}
            />
          </motion.div>

          {/* Panel 2: AI Q&A (top-right) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel"
            style={{ height: '460px', minHeight: '400px' }}
          >
            <AIQnA />
          </motion.div>

          {/* Panel 3: Mission Analytics (bottom-left) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel"
            style={{ minHeight: '420px' }}
          >
            <Analytics />
          </motion.div>

          {/* Panel 4: Search + Node Detail (bottom-right) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel"
            style={{ minHeight: '420px' }}
          >
            {/* If a node is selected (clicked in the D3 graph), show its detail.
                Otherwise show the search panel. AnimatePresence handles the
                smooth transition between the two views. */}
            <AnimatePresence mode="wait">
              {nodeDetail ? (
                <motion.div
                  key="node-detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{ height: '100%' }}
                >
                  <NodeDetail
                    detail={nodeDetail}
                    onClose={() => setSelectedNode(null)}
                    onNodeSelect={setSelectedNode}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{ height: '100%' }}
                >
                  <SearchPanel onNodeSelect={setSelectedNode} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '16px',
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '13px',
          color: 'rgba(226,232,240,0.35)',
          letterSpacing: '0.5px'
        }}>
          🚀 ISRO Mission Navigator | Launch to Legacy | Built with React + D3.js + Neo4j + Gemini RAG
        </footer>
      </div>
    </div>
  )
}
