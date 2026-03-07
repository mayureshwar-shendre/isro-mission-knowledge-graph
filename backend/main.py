"""
main.py
=======
FastAPI backend for the ISRO Mission Navigator.

All frontend requests go through this server. It acts as the bridge between:
  - The React frontend (which calls these endpoints)
  - The Neo4j graph database (via neo4j_service.py)
  - The RAG Q&A system (via rag_service.py)

To run:
    uvicorn main:app --reload --port 8000

The --reload flag means the server auto-restarts when you save a file.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import neo4j_service as db
import rag_service as rag

load_dotenv()

# ── Lifespan: runs at startup and shutdown ────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Everything before 'yield' runs at startup; after yield runs at shutdown.
    
    At startup we:
    1. Create the Neo4j driver (reusable connection pool)
    2. Build the RAG vector store from graph triples (if not already on disk)
    """
    print("\n🚀 Starting ISRO Mission Navigator Backend...")

    # Create database driver — this is a connection pool, not a single connection
    app.state.driver = db.get_driver()
    print(f"   ✅ Connected to Neo4j at {os.getenv('NEO4J_URI')}")

    # Build RAG vector store if it doesn't already exist on disk
    if rag.rag_system.vector_store is None:
        print("   🔨 Building RAG vector store from graph triples...")
        triples = db.get_all_triples(app.state.driver)
        rag.rag_system.build_vector_store(triples)
    else:
        print("   ✅ RAG vector store already loaded")

    print("   🌐 Server ready! Visit http://localhost:8000/docs for API docs\n")

    yield  # Server runs here

    # Shutdown: close the database connection pool cleanly
    app.state.driver.close()
    print("👋 Server shutdown complete")


# ── App initialization ────────────────────────────────────────────────────────

app = FastAPI(
    title="ISRO Mission Navigator API",
    description="Knowledge Graph + RAG Q&A backend for ISRO missions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS (Cross-Origin Resource Sharing) allows the React frontend running on
# localhost:5173 to make requests to this server on localhost:8000.
# Without this, browsers block all cross-origin requests for security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",       # Vite dev server
        "http://localhost:3000",       # CRA dev server (alternative)
        "https://*.vercel.app",        # Vercel deployments
        "https://*.netlify.app",       # Netlify deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Models (request/response schemas) ────────────────────────────────

class QuestionRequest(BaseModel):
    """
    Schema for the AI Q&A endpoint.
    Pydantic automatically validates that 'question' is a non-empty string.
    """
    question: str
    k: int = 5  # number of triples to retrieve (default 5)


# ── API Routes ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    """Health check endpoint. Useful for deployment monitoring."""
    return {"status": "running", "app": "ISRO Mission Navigator API"}


@app.get("/api/health")
def health():
    """Detailed health check that also verifies database connectivity."""
    try:
        with app.state.driver.session() as s:
            count = s.run("MATCH (n) RETURN count(n) AS cnt").single()["cnt"]
        return {
            "status": "healthy",
            "neo4j": "connected",
            "node_count": count,
            "rag_ready": rag.rag_system.vector_store is not None
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {e}")


@app.get("/api/graph")
def get_graph(limit: int = Query(default=120, ge=10, le=500)):
    """
    Returns the full graph data for the D3.js visualization.
    
    The 'limit' query parameter controls how many satellite-rocket pairs
    are included. More nodes = richer graph but slower rendering.
    
    Example: GET /api/graph?limit=150
    """
    try:
        return db.get_graph_data(app.state.driver, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search")
def search_nodes(q: str = Query(..., min_length=1)):
    """
    Searches node names for the given query string.
    Returns up to 20 matching nodes.
    
    Example: GET /api/search?q=chandrayaan
    """
    try:
        return db.search_nodes(app.state.driver, query=q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/node/{name}")
def get_node(name: str):
    """
    Returns full details for a single node, including all its relationships.
    Called when the user clicks a node in the D3 graph.
    
    Example: GET /api/node/Chandrayaan-3
    """
    try:
        result = db.get_node_detail(app.state.driver, name)
        if not result:
            raise HTTPException(status_code=404, detail=f"Node '{name}' not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
def get_statistics():
    """
    Returns summary statistics for the dashboard header cards.
    Example response: { total_satellites: 130, total_rockets: 6, success_rate: 93.8 }
    """
    try:
        return db.get_statistics(app.state.driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/rockets")
def get_rocket_analytics():
    """
    Returns satellite launch count per rocket family.
    Used for the bar chart in the Analytics panel.
    """
    try:
        return db.get_rocket_launch_counts(app.state.driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/applications")
def get_application_analytics():
    """
    Returns satellite count per application type.
    Used for the pie/donut chart in the Analytics panel.
    """
    try:
        return db.get_application_distribution(app.state.driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/timeline")
def get_launch_timeline():
    """
    Returns number of launches per year, from 1975 to present.
    Used for the timeline line chart in the Analytics panel.
    """
    try:
        return db.get_launch_timeline(app.state.driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recent-missions")
def get_recent_missions(limit: int = Query(default=6, le=20)):
    """
    Returns the most recent ISRO missions, sorted by launch order.
    Used for the Recent Missions card in the Analytics panel.
    """
    try:
        return db.get_recent_missions(app.state.driver, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask")
def ask_question(req: QuestionRequest):
    """
    The main AI Q&A endpoint.
    
    Takes a natural language question, retrieves relevant triples from the
    vector store, and uses Gemini to generate a grounded answer.
    
    Example request body:
        { "question": "Which rocket launched Chandrayaan-3?", "k": 5 }
    
    Example response:
        {
          "answer": "Chandrayaan-3 was launched by LVM3...",
          "retrieved": [
            { "subject": "Chandrayaan-3", "predicate": "LAUNCHED_BY", "object": "LVM3" }
          ]
        }
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        result = rag.rag_system.answer(req.question, k=req.k)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rebuild-rag")
def rebuild_rag():
    """
    Rebuilds the RAG vector store from the latest graph data.
    Call this endpoint after loading new data into Neo4j.
    """
    try:
        triples = db.get_all_triples(app.state.driver)
        rag.rag_system.build_vector_store(triples)
        return {"message": f"Vector store rebuilt with {len(triples)} triples"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
