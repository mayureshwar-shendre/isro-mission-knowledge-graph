"""
rag_service.py
==============
The RAG (Retrieval-Augmented Generation) system for the ISRO Q&A feature.

How it works (step by step):
1. At startup, all graph triples are fetched from Neo4j and embedded
   using a sentence-transformer model into dense vector representations.
2. These embeddings are stored in a ChromaDB vector store on disk.
3. When a user asks a question, the question is embedded using the same model.
4. ChromaDB performs an approximate nearest-neighbor search to find
   the top-k most semantically similar triples.
5. Those triples are formatted into a context string.
6. The context + question are sent to Google Gemini (or any LLM).
7. Gemini generates a natural language answer grounded in the retrieved facts.

This means the model cannot hallucinate — every answer is tied to actual
data from your Neo4j knowledge graph.
"""

import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# LangChain imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
CHROMA_PATH    = os.path.join(os.path.dirname(__file__), "chroma_db")


class ISROKnowledgeRAG:
    """
    Encapsulates the entire RAG pipeline for ISRO mission Q&A.

    The class is initialized once when the FastAPI app starts.
    The vector store is persisted to disk so it survives server restarts
    without needing to re-embed all the triples every time.
    """

    def __init__(self):
        # We use a local HuggingFace model for embeddings — this avoids any
        # API cost and works offline. The model is ~90MB and downloads once.
        print("🔍 Loading embedding model (first run downloads ~90MB)...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )

        # Gemini is our generation model — it receives the retrieved context
        # and the user question, then writes a helpful answer.
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.2  # low temp = more factual, less creative
        )

        # The prompt template structures what Gemini receives
        self.prompt = ChatPromptTemplate.from_template("""
You are an expert assistant on ISRO (Indian Space Research Organisation) missions.
Your answers must be grounded ONLY in the provided context from the knowledge graph.
If the context doesn't contain the answer, say "I don't have that information in the knowledge graph."

Context (Knowledge Graph Triples):
{context}

User Question: {question}

Instructions:
- Answer in 2-4 clear sentences.
- Mention specific satellite names, rocket names, and dates from the context when relevant.
- Be enthusiastic about ISRO's achievements!
- Do NOT invent facts not in the context.

Answer:""")

        # We load the vector store from disk if it exists, otherwise
        # it will be populated when build_vector_store() is called.
        self.vector_store = None
        self._try_load_existing_store()

    def _try_load_existing_store(self):
        """
        If a persisted ChromaDB already exists on disk, load it.
        This makes server restarts instant — no re-embedding needed.
        """
        if os.path.exists(CHROMA_PATH):
            try:
                print("📦 Loading existing vector store from disk...")
                self.vector_store = Chroma(
                    persist_directory=CHROMA_PATH,
                    embedding_function=self.embeddings
                )
                count = self.vector_store._collection.count()
                print(f"   ✅ Loaded {count} embeddings from disk")
            except Exception as e:
                print(f"   ⚠️  Could not load existing store: {e}")
                self.vector_store = None

    def build_vector_store(self, triples: List[Dict]):
        """
        Converts knowledge graph triples into Document objects,
        embeds them, and stores in ChromaDB.

        A triple like:
            {'subject': 'Chandrayaan-3', 'predicate': 'LAUNCHED_BY', 'object': 'LVM3'}
        becomes a Document with text:
            "Chandrayaan-3 launched by LVM3"

        Each Document also carries metadata so we can return the raw
        triple alongside the LLM answer in the UI.
        """
        print(f"🏗️  Building vector store from {len(triples)} triples...")
        documents = []
        for triple in triples:
            # Human-readable text of the triple
            text = triple.get("text") or (
                f"{triple['subject']} "
                f"{triple['predicate'].replace('_', ' ').lower()} "
                f"{triple['object']}"
            )
            doc = Document(
                page_content=text,
                metadata={
                    "subject":   triple["subject"],
                    "predicate": triple["predicate"],
                    "object":    triple["object"]
                }
            )
            documents.append(doc)

        # Chroma embeds and stores all documents; persist_directory saves to disk
        self.vector_store = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=CHROMA_PATH
        )
        print(f"   ✅ Vector store built with {len(documents)} embeddings")

    def answer(self, question: str, k: int = 5) -> Dict[str, Any]:
        """
        The main RAG pipeline: given a question, return an answer plus
        the specific triples that were retrieved to generate it.

        Parameters:
            question  — the user's natural language question
            k         — number of triples to retrieve (more = more context, slower)

        Returns a dict with:
            'answer'         — the LLM-generated answer string
            'retrieved'      — list of the top-k triples used as context
            'context_used'   — the raw context string sent to the LLM
        """
        if not self.vector_store:
            return {
                "answer": "Knowledge base not initialized. Please wait for data ingestion to complete.",
                "retrieved": [],
                "context_used": ""
            }

        if not GOOGLE_API_KEY:
            return {
                "answer": "Google API key not configured. Add GOOGLE_API_KEY to your .env file.",
                "retrieved": [],
                "context_used": ""
            }

        try:
            # Step 1: Semantic search — find k most relevant triples
            docs = self.vector_store.similarity_search(question, k=k)

            # Step 2: Format retrieved docs as context string
            context_lines = []
            retrieved_triples = []
            for doc in docs:
                meta = doc.metadata
                context_lines.append(f"• {doc.page_content}")
                retrieved_triples.append({
                    "subject":   meta.get("subject", ""),
                    "predicate": meta.get("predicate", ""),
                    "object":    meta.get("object", ""),
                    "text":      doc.page_content
                })

            context_str = "\n".join(context_lines)

            # Step 3: Build the prompt and call Gemini
            chain = self.prompt | self.llm
            response = chain.invoke({
                "context":  context_str,
                "question": question
            })

            # response.content is the text of the LLM reply
            answer_text = response.content.strip()

            return {
                "answer":       answer_text,
                "retrieved":    retrieved_triples,
                "context_used": context_str
            }

        except Exception as e:
            return {
                "answer":       f"Error generating answer: {str(e)}",
                "retrieved":    [],
                "context_used": ""
            }


# Module-level singleton — created once when the FastAPI app imports this module.
# All API calls share the same instance, avoiding repeated model loading.
rag_system = ISROKnowledgeRAG()
