/**
 * AIQnA.jsx — AI-powered Question & Answer Panel
 *
 * This panel is the "face" of the RAG system. Users type natural language
 * questions, click Ask, and the backend retrieves relevant knowledge graph
 * triples then uses Gemini to generate a grounded answer. The panel shows:
 *   1. An input field with suggested questions
 *   2. The AI-generated answer with a typing animation
 *   3. The specific graph triples that were retrieved to generate the answer
 *      (showing the user exactly what knowledge the AI used — this builds trust)
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, ChevronRight, X } from 'lucide-react'
import { API_BASE } from '../App'

// Suggested questions shown as clickable chips below the input.
// These are chosen to demonstrate the breadth of questions the system can answer.
const SUGGESTED_QUESTIONS = [
  'Which rocket launched Chandrayaan-3?',
  'What is PSLV used for?',
  'How many satellites did PSLV launch?',
  'What is the purpose of Aditya-L1?',
  'Which missions are related to Gaganyaan?',
  'What orbit does Cartosat use?',
  'Tell me about GSLV rocket family',
  'What was India\'s first satellite?',
]

export default function AIQnA() {
  const [question,   setQuestion]  = useState('')
  const [answer,     setAnswer]    = useState(null)    // the LLM answer string
  const [retrieved,  setRetrieved] = useState([])      // the retrieved triples
  const [loading,    setLoading]   = useState(false)
  const [error,      setError]     = useState(null)
  const [history,    setHistory]   = useState([])       // Q&A conversation history
  const inputRef = useRef(null)

  const askQuestion = async (q) => {
    const questionText = (q || question).trim()
    if (!questionText) return

    setLoading(true)
    setError(null)
    setAnswer(null)
    setRetrieved([])

    try {
      const response = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, k: 5 }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to get answer')
      }

      const data = await response.json()
      setAnswer(data.answer)
      setRetrieved(data.retrieved || [])
      // Add to conversation history (most recent first for display)
      setHistory(prev => [{ question: questionText, answer: data.answer, retrieved: data.retrieved }, ...prev].slice(0, 5))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askQuestion()
    }
  }

  const clearAnswer = () => {
    setAnswer(null)
    setRetrieved([])
    setQuestion('')
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Panel Header ──────────────────────────────────────────── */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={14} />
          AI QUESTION ANSWERING
        </div>
        <div style={{
          fontSize: '10px', color: 'rgba(34,197,94,0.8)', fontFamily: 'Exo 2',
          background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '4px',
          border: '1px solid rgba(34,197,94,0.25)',
        }}>
          Gemini RAG
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px', gap: '12px', overflow: 'hidden' }}>

        {/* ── Question Input ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            className="input-space"
            placeholder="Ask anything about ISRO missions..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => askQuestion()}
            disabled={loading || !question.trim()}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: (!question.trim() && !loading) ? 0.5 : 1,
            }}
          >
            {loading ? (
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            ) : (
              <Send size={14} />
            )}
            Ask
          </button>
        </div>

        {/* ── Suggested Questions ─────────────────────────────────── */}
        {!answer && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {SUGGESTED_QUESTIONS.slice(0, 4).map(sq => (
              <button
                key={sq}
                onClick={() => { setQuestion(sq); askQuestion(sq) }}
                style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontFamily: 'Exo 2',
                  color: 'rgba(148,197,255,0.8)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(59,130,246,0.18)'
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(59,130,246,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'
                }}
              >
                <ChevronRight size={10} style={{ display: 'inline', marginRight: '4px', opacity: 0.6 }} />
                {sq}
              </button>
            ))}
          </div>
        )}

        {/* ── Error Message ─────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 12px',
                color: '#fca5a5', fontSize: '13px', fontFamily: 'Exo 2',
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading State ──────────────────────────────────────────── */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '10px', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}
          >
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            <div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: '#60a5fa', fontWeight: 600 }}>
                Searching Knowledge Graph...
              </div>
              <div style={{ fontFamily: 'Exo 2', fontSize: '12px', color: 'rgba(226,232,240,0.4)', marginTop: '2px' }}>
                Retrieving relevant triples → Generating answer with Gemini
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Answer Display ────────────────────────────────────────── */}
        <AnimatePresence>
          {answer && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto' }}
            >
              {/* AI Answer Box */}
              <div style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '10px',
                padding: '14px',
                position: 'relative',
              }}>
                <div style={{
                  fontFamily: 'Rajdhani', fontSize: '11px', fontWeight: 600,
                  color: '#60a5fa', letterSpacing: '1px', textTransform: 'uppercase',
                  marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <Brain size={12} /> AI Response
                </div>
                <div style={{ fontFamily: 'Exo 2', fontSize: '14px', lineHeight: 1.6, color: '#e2e8f0' }}>
                  {answer}
                </div>
                <button
                  onClick={clearAnswer}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'transparent', border: 'none',
                    color: 'rgba(226,232,240,0.4)', cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Retrieved Knowledge Graph Triples */}
              {retrieved.length > 0 && (
                <div style={{
                  background: 'rgba(249,115,22,0.05)',
                  border: '1px solid rgba(249,115,22,0.2)',
                  borderRadius: '10px',
                  padding: '12px',
                }}>
                  <div style={{
                    fontFamily: 'Rajdhani', fontSize: '11px', fontWeight: 600,
                    color: '#f97316', letterSpacing: '1px', textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}>
                    Knowledge Retrieved ({retrieved.length} triples)
                  </div>
                  <div className="triples-list">
                    {retrieved.map((triple, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '4px 0',
                          borderBottom: i < retrieved.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          fontSize: '12px', fontFamily: 'Exo 2',
                        }}
                      >
                        <span style={{
                          background: 'rgba(59,130,246,0.15)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          borderRadius: '4px', padding: '1px 6px',
                          color: '#93c5fd', whiteSpace: 'nowrap', maxWidth: '120px',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {triple.subject}
                        </span>
                        <span style={{ color: '#f97316', fontSize: '10px', opacity: 0.8 }}>→</span>
                        <span style={{
                          background: 'rgba(249,115,22,0.1)',
                          border: '1px solid rgba(249,115,22,0.25)',
                          borderRadius: '4px', padding: '1px 6px',
                          color: '#fb923c', fontSize: '10px', whiteSpace: 'nowrap',
                        }}>
                          {triple.predicate?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ color: '#f97316', fontSize: '10px', opacity: 0.8 }}>→</span>
                        <span style={{
                          background: 'rgba(34,197,94,0.1)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          borderRadius: '4px', padding: '1px 6px',
                          color: '#86efac', whiteSpace: 'nowrap', maxWidth: '120px',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {triple.object}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intro state when no question has been asked yet */}
        {!answer && !loading && !error && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '10px', opacity: 0.4,
          }}>
            <Brain size={40} color="#3b82f6" />
            <div style={{ fontFamily: 'Rajdhani', fontSize: '14px', color: '#e2e8f0', textAlign: 'center' }}>
              Ask anything about ISRO missions.<br />
              Powered by Knowledge Graph + Gemini RAG.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
