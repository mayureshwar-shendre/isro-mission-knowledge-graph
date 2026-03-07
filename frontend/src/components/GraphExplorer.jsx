/**
 * GraphExplorer.jsx — Interactive D3.js Force-Directed Knowledge Graph
 *
 * This is the most complex component in the app. It renders hundreds of
 * satellite nodes connected to rocket nodes using D3's physics simulation,
 * where nodes repel each other and links act like springs pulling connected
 * nodes together. The result is an organic, readable layout that the user
 * can drag, zoom, and click to explore.
 *
 * Key D3 concepts used:
 *   - forceSimulation: the physics engine
 *   - forceManyBody: repulsion between all nodes
 *   - forceLink: spring attraction between connected nodes
 *   - forceCenter: pulls everything toward the center of the canvas
 *   - zoom: lets user scroll to zoom and drag to pan
 *   - drag: lets user reposition individual nodes
 *
 * The component uses a useRef for the SVG element because D3 manipulates
 * the DOM directly (it's not React-controlled). We trigger D3 setup in a
 * useEffect that runs after React mounts the SVG element.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { Share2, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react'
import { API_BASE } from '../App'

// ── Node size and color mapping by type ────────────────────────────────────
const NODE_CONFIG = {
  satellite:    { r: 6,  color: '#3b82f6',  stroke: '#60a5fa' },
  rocket:       { r: 14, color: '#f97316',  stroke: '#fb923c' },
  organization: { r: 18, color: '#a855f7',  stroke: '#c084fc' },
  default:      { r: 5,  color: '#64748b',  stroke: '#94a3b8' },
}

// Success/failure override colors for satellite nodes
const STATUS_COLOR = {
  success:  '#22c55e',
  failed:   '#ef4444',
  unknown:  '#f59e0b',
}

export default function GraphExplorer({ onNodeSelect, selectedNode }) {
  const svgRef       = useRef(null)   // reference to the SVG DOM element
  const containerRef = useRef(null)   // reference to the containing div
  const simRef       = useRef(null)   // reference to the D3 simulation (for cleanup)
  const zoomRef      = useRef(null)   // reference to the D3 zoom behavior

  const [graphData,  setGraphData]  = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [tooltip,    setTooltip]    = useState({ visible: false, x: 0, y: 0, data: null })
  const [filter,     setFilter]     = useState('all')  // 'all', 'PSLV', 'GSLV', etc.

  // ── Fetch graph data from backend ─────────────────────────────────────────
  const fetchGraph = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/graph?limit=150`)
      .then(r => { if (!r.ok) throw new Error('Graph data unavailable'); return r.json() })
      .then(data => { setGraphData(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  // ── Build the D3 visualization ─────────────────────────────────────────
  // This effect runs every time graphData or selectedNode changes.
  // We completely rebuild the graph on each rebuild — this is simpler than
  // trying to update individual elements, and the graph data rarely changes.
  useEffect(() => {
    if (!graphData || !svgRef.current) return

    const container = containerRef.current
    const width     = container.clientWidth
    const height    = container.clientHeight

    // Clear any previous SVG content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // ── Zoom behavior ─────────────────────────────────────────────────────
    // The zoom transform is applied to a <g> group element (zoomG), so
    // zooming and panning move all graph content together as one unit.
    const zoomG = svg.append('g').attr('class', 'zoom-group')

    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])  // allow 10% to 800% zoom
      .on('zoom', event => {
        zoomG.attr('transform', event.transform)
      })

    svg.call(zoom)
    zoomRef.current = zoom

    // Fit the initial view to show the full graph with some padding
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6))

    // ── Arrow marker (arrowhead at the end of links) ───────────────────
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', 'rgba(249,115,22,0.4)')

    // ── Filter data by rocket type ─────────────────────────────────────
    let { nodes, links } = graphData
    if (filter !== 'all') {
      // Keep only the selected rocket node and satellites launched by it
      const rocketName = filter
      const linkedSats = new Set(
        links
          .filter(l => l.target === rocketName || (l.target && l.target.id === rocketName))
          .map(l => l.source.id || l.source)
      )
      nodes = nodes.filter(n => n.id === rocketName || linkedSats.has(n.id) || n.type === 'organization')
      links = links.filter(l => {
        const src = l.source.id || l.source
        const tgt = l.target.id || l.target
        return src === rocketName || tgt === rocketName
      })
    }

    // Deep copy nodes and links because D3's simulation modifies them in-place
    // (adds x, y, vx, vy properties). We don't want to mutate React state.
    const simNodes = nodes.map(n => ({ ...n }))
    const simLinks = links.map(l => ({ ...l }))

    // ── D3 Force Simulation ────────────────────────────────────────────────
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks)
        .id(d => d.id)
        .distance(d => {
          // Vary link distance by node type — rockets are central, so
          // satellites orbit them at a comfortable distance.
          if (d.source.type === 'rocket' || d.target.type === 'rocket') return 80
          if (d.source.type === 'organization') return 120
          return 60
        })
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(d => {
          // Larger nodes have stronger repulsion to prevent overlap
          if (d.type === 'organization') return -400
          if (d.type === 'rocket')       return -200
          return -60
        })
      )
      .force('center', d3.forceCenter(0, 0))  // 0,0 because we translate the zoom group
      .force('collision', d3.forceCollide().radius(d => {
        const cfg = NODE_CONFIG[d.type] || NODE_CONFIG.default
        return cfg.r + 4
      }))
      .alphaDecay(0.02)  // slower cooling = more spread out settling

    simRef.current = simulation

    // ── Render links (edges) ───────────────────────────────────────────────
    const link = zoomG.append('g').attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .join('line')
        .attr('class', 'graph-link')
        .attr('stroke', d => {
          if (d.relation === 'LAUNCHED_BY') return 'rgba(249,115,22,0.3)'
          if (d.relation === 'DEVELOPED')   return 'rgba(168,85,247,0.4)'
          return 'rgba(100,116,139,0.25)'
        })
        .attr('marker-end', 'url(#arrow)')

    // ── Render nodes (circles) ─────────────────────────────────────────────
    const nodeG = zoomG.append('g').attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .join('g')
        .attr('class', 'node-group')
        .style('cursor', 'pointer')

    // The actual circle for each node
    nodeG.append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => (NODE_CONFIG[d.type] || NODE_CONFIG.default).r)
      .attr('fill', d => {
        // For satellites, color by success status
        if (d.type === 'satellite') {
          const s = (d.status || '').toLowerCase()
          if (s.includes('success')) return STATUS_COLOR.success
          if (s.includes('fail'))    return STATUS_COLOR.failed
          return STATUS_COLOR.unknown
        }
        return (NODE_CONFIG[d.type] || NODE_CONFIG.default).color
      })
      .attr('stroke', d => {
        if (d.id === selectedNode)
          return '#ffffff'
        return (NODE_CONFIG[d.type] || NODE_CONFIG.default).stroke
      })
      .attr('stroke-width', d => d.id === selectedNode ? 3 : 1.5)
      .attr('opacity', d => d.id === selectedNode ? 1 : 0.85)

    // Pulsing ring for selected node
    nodeG.filter(d => d.id === selectedNode)
      .append('circle')
        .attr('r', d => (NODE_CONFIG[d.type] || NODE_CONFIG.default).r + 6)
        .attr('fill', 'none')
        .attr('stroke', '#f97316')
        .attr('stroke-width', 2)
        .attr('opacity', 0)
        .call(sel => {
          function pulse(node) {
            node.attr('r', d => (NODE_CONFIG[d.type] || NODE_CONFIG.default).r + 6)
                .attr('opacity', 0.8)
              .transition().duration(1200)
                .attr('r', d => (NODE_CONFIG[d.type] || NODE_CONFIG.default).r + 16)
                .attr('opacity', 0)
              .on('end', () => pulse(node))
          }
          pulse(sel)
        })

    // Text label below/above each node
    nodeG.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => (NODE_CONFIG[d.type] || NODE_CONFIG.default).r + 13)
      .text(d => {
        // Truncate long satellite names to keep graph readable
        const name = d.label || d.id || ''
        return name.length > 14 ? name.slice(0, 13) + '…' : name
      })
      .attr('fill', d => {
        if (d.type === 'rocket')       return '#fb923c'
        if (d.type === 'organization') return '#c084fc'
        return 'rgba(226,232,240,0.75)'
      })
      .attr('font-weight', d => ['rocket','organization'].includes(d.type) ? '700' : '400')

    // ── Node interaction: hover tooltip ───────────────────────────────────
    nodeG
      .on('mouseover', (event, d) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip({
          visible: true,
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 10,
          data: d,
        })
        // Highlight node on hover
        d3.select(event.currentTarget).select('circle')
          .transition().duration(150)
          .attr('r', (NODE_CONFIG[d.type] || NODE_CONFIG.default).r * 1.3)
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip(prev => ({
          ...prev,
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top - 10,
        }))
      })
      .on('mouseout', (event, d) => {
        setTooltip(prev => ({ ...prev, visible: false }))
        d3.select(event.currentTarget).select('circle')
          .transition().duration(150)
          .attr('r', (NODE_CONFIG[d.type] || NODE_CONFIG.default).r)
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        onNodeSelect(d.id)
      })

    // ── Drag behavior (allows repositioning nodes) ─────────────────────────
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x  // fx/fy "fix" a node at a position, overriding simulation
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null  // release the fix so simulation can move it again
        d.fy = null
      })

    nodeG.call(drag)

    // Click on SVG background deselects the selected node
    svg.on('click', () => onNodeSelect(null))

    // ── Simulation tick: update positions each frame ────────────────────
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // ── Cleanup: stop simulation when component unmounts ────────────────
    return () => {
      simulation.stop()
    }
  }, [graphData, selectedNode, filter, onNodeSelect])

  // ── Zoom control functions ─────────────────────────────────────────────
  const zoomIn  = () => d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.5)
  const zoomOut = () => d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.67)
  const zoomFit = () => d3.select(svgRef.current).transition().call(
    zoomRef.current.transform,
    d3.zoomIdentity.translate(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2).scale(0.6)
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Panel Header ─────────────────────────────────────────────────── */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={14} />
          KNOWLEDGE GRAPH EXPLORER
        </div>
        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all','PSLV','GSLV','LVM3','SSLV'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 10px',
              borderRadius: '4px',
              border: '1px solid',
              fontSize: '11px',
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === f ? 'rgba(249,115,22,0.2)' : 'transparent',
              borderColor: filter === f ? '#f97316' : 'rgba(255,255,255,0.15)',
              color: filter === f ? '#f97316' : 'rgba(226,232,240,0.6)',
              transition: 'all 0.2s',
            }}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* ── Graph Canvas ──────────────────────────────────────────────────── */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '12px',
          }}>
            <div className="spinner" />
            <span style={{ fontFamily: 'Rajdhani', fontSize: '13px', color: 'rgba(249,115,22,0.7)' }}>
              Loading Knowledge Graph...
            </span>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: '20px', textAlign: 'center',
          }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
            <span style={{ color: '#ef4444', fontFamily: 'Rajdhani', fontSize: '14px' }}>
              {error}
            </span>
            <button onClick={fetchGraph} className="btn-secondary" style={{ marginTop: '8px' }}>
              <RefreshCw size={13} style={{ display: 'inline', marginRight: '6px' }} />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <svg ref={svgRef} className="graph-svg" />
        )}

        {/* Zoom controls overlay */}
        <div style={{
          position: 'absolute', bottom: 12, right: 12,
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          {[
            { icon: ZoomIn,   fn: zoomIn,  title: 'Zoom In'  },
            { icon: ZoomOut,  fn: zoomOut, title: 'Zoom Out' },
            { icon: Maximize2, fn: zoomFit, title: 'Fit View' },
            { icon: RefreshCw, fn: fetchGraph, title: 'Reload' },
          ].map(({ icon: Icon, fn, title }) => (
            <button key={title} onClick={fn} title={title} style={{
              width: 30, height: 30, borderRadius: '6px',
              background: 'rgba(5,12,24,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(226,232,240,0.7)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {/* Node type legend */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          background: 'rgba(5,12,24,0.85)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          {[
            { color: '#22c55e', label: '● Success' },
            { color: '#ef4444', label: '● Failed'  },
            { color: '#f97316', label: '◉ Rocket'  },
            { color: '#a855f7', label: '◎ ISRO'    },
          ].map(({ color, label }) => (
            <div key={label} style={{
              fontFamily: 'Exo 2', fontSize: '11px', color,
              fontWeight: 500,
            }}>{label}</div>
          ))}
        </div>

        {/* Hover tooltip */}
        {tooltip.visible && tooltip.data && (
          <div className="graph-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
            <div className="tooltip-title">{tooltip.data.label || tooltip.data.id}</div>
            {tooltip.data.type && (
              <div style={{ color: 'rgba(226,232,240,0.6)', fontSize: '12px', marginBottom: '4px' }}>
                Type: <span style={{ color: '#60a5fa' }}>{tooltip.data.type}</span>
              </div>
            )}
            {tooltip.data.status && (
              <div style={{ fontSize: '12px' }}>
                Status: <span style={{
                  color: tooltip.data.status.toLowerCase().includes('success') ? '#22c55e' : '#ef4444'
                }}>{tooltip.data.status}</span>
              </div>
            )}
            {tooltip.data.application && (
              <div style={{ color: 'rgba(226,232,240,0.6)', fontSize: '11px', marginTop: '3px' }}>
                {tooltip.data.application}
              </div>
            )}
            <div style={{ color: 'rgba(249,115,22,0.7)', fontSize: '10px', marginTop: '5px' }}>
              Click to explore →
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
