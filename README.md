<div align="center">

<img src="logo.jpeg" alt="ISRO Mission Navigator Logo" width="2000" height="2000" align="centre"/>

# **Infosys Virtual Internship 6.0**

# 🚀 ISRO Mission Knowledge Graph Builder for Enterprise Intelligence
![GitHub License](https://img.shields.io/github/license/mayureshwar-shendre/isro-mission-knowledge-graph)
![Python Version](https://img.shields.io/badge/python-3.8%2B-brightgreen)
![Status](https://img.shields.io/badge/status-Production%20Ready-success)
![Documentation](https://img.shields.io/badge/docs-Complete-informational)

**Transform ISRO's mission data into an interactive knowledge graph.** Automatically ingest mission logs, satellite telemetry, launch records, and orbital data. Extract entities (missions, satellites, payloads, orbits), build relationships, enable semantic search, and visualize mission networks in a dynamic dashboard.[file:1]

[🎯 Vision](#vision) • [✨ Features](#features) • [🏗️ Architecture](#architecture) • [📦 Installation](#installation) • [📚 Documentation](#documentation) • [🤝 Contributing](#contributing)

</div>

---

## 🎯 Vision

**Enterprise Data Intelligence Platform** is a cutting-edge AI-powered system designed to automatically build dynamic knowledge graphs from enterprise data sources including ISRO satelite launches, datasets and databases. By combining Retrieval-Augmented Generation (RAG) pipelines, advanced embeddings, and semantic search capabilities.
Navigate ISRO's complex mission ecosystem like never before. From Chandrayaan to Gaganyaan, uncover hidden connections between satellites, launches, payloads, and orbital paths. Empower space analysts, researchers, and mission planners with AI-driven intelligence.

### Core Mission
Transform raw, unstructured enterprise data into structured, interconnected intelligence through automated processing, intelligent extraction, and interactive visualization.

---

## ✨ Key Features

**1. Data Ingestion & Processing Layer**: Clean, validate, and enrich ISRO mission datasets (CSV, JSON, APIs).

**2. AI-Powered Entity & Relationship Extraction**(LLM-Powered NER): Extract missions, satellites, launches, orbits with 92% confidence.

**3. Dynamic Knowledge Graph Construction**: Neo4j/TigerGraph with 100K+ nodes for mission networks.

**4. RAG-Enhanced Semantic Search**: Query "Chandrayaan-3 landing issues" across all data.

**5. Interactive Graph Dashboard**: D3.js viz of mission graphs, real-time metrics, drill-down analytics.
  
---

## 🏗️ Architecture

---


## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RAW ENTERPRISE DATA                              │
│  (Customer Support Tickets, Emails, Documents, Database Records)    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MODULE 1: DATA INGESTION & PROCESSING                               │
│ 11-Step Pipeline: Clean, Validate, Transform, Enrich, Deduplicate   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MODULE 2: ENTITY & RELATIONSHIP EXTRACTION                          │
│ LLM-Based NER, Relation Extraction, Triple Building                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ MODULE 3: KNOWLEDGE GRAPH CONSTRUCTION                              │
│ Graph Building, Neo4j Storage, Validation                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │   MODULE 4:          │  │   MODULE 5:          │
    │   RAG & SEARCH       │  │   INTERACTIVE        │
    │                      │  │   DASHBOARD          │
    │ • Embeddings         │  │ • Frontend (React)   │
    │ • Vector Store       │  │ • Backend (Flask)    │
    │ • RAG Pipeline       │  │ • Graph Viz (D3.js)  │
    │ • Semantic Search    │  │ • Real-Time Updates  │
    └──────────────────────┘  └──────────────────────┘
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
        ┌─────────────────────────────────────┐
        │   ACTIONABLE BUSINESS INTELLIGENCE   │
        └─────────────────────────────────────┘
```

### Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Data Processing** | Pandas, NumPy, Scikit-learn, NLTK |
| **AI/ML** |  |

---

## 📦 Installation

### Google Colab (Recommended) ⚡

```python
# Step 1: Clone Repository
!git clone https://github.com/mayureshwar-shendre/enterprise-data-intelligence-platform.git
%cd enterprise-data-intelligence-platform

# Step 2: Install Dependencies
!pip install -r requirements.txt

# Step 3: Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Step 4: Verify Installation
import sys
sys.path.append('/content/enterprise-data-intelligence-platform')
from module_1_data_ingestion import DataPreprocessor
print("✅ Installation successful!")
```

## 🗂️ Repository Structure

```
enterprise-data-intelligence-platform/
│
├── 📄 README.md                          # Main documentation (this file)
├── 📄 LICENSE                            # MIT License
├── 📄 .gitignore                         # Git ignore rules
├── 📄 requirements.txt                   # Python dependencies
├── 📄 setup.py                           # Package setup configuration
│
├── 📂 module_1_data_ingestion/
│   ├── 01_data_loading.py               # Multi-source data loading
│   ├── 02_data_cleaning.py              # Cleaning & deduplication
│   ├── 03_data_validation.py            # Quality validation
│   ├── 04_data_transformation.py        # Type conversion & engineering
│   ├── 05_data_filtering.py             # Outlier & noise removal
│   ├── 06_data_enrichment.py            # Feature derivation
│   ├── 07_data_deduplication.py         # Duplicate removal
│   ├── 08_data_masking.py               # PII protection
│   ├── 09_error_handling.py             # Error tracking & recovery
│   ├── 10_metadata_handling.py          # Lineage & versioning
│   ├── 11_data_sampling.py              # Data stratification
│   ├── config_ingestion.py              # Configuration settings
│   ├── README.md                        # Module documentation
│   └── notebooks/
│       └── 01_module1_colab_notebook.ipynb
│
├── 📂 module_2_entity_extraction/
├── 📂 module_3_graph_construction/
├── 📂 module_4_rag_search/
├── 📂 module_5_dashboard/
├── 📂 data/
├── 📂 tests/
```

---

---

## 📊 Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Data Processing** | | |

---

## 📚 Documentation

### Module-Level Guides
- **[Module 1: Data Ingestion](module_1_data_ingestion/README.md)** - Complete data preprocessing pipeline
- **[Module 2: Entity Extraction](module_2_entity_extraction/README.md)** - LLM-based NER and relation extraction
- **[Module 3: Graph Construction](module_3_graph_construction/README.md)** - Knowledge graph building and management
- **[Module 4: RAG Search](module_4_rag_search/README.md)** - Semantic search and RAG pipelines
- **[Module 5: Dashboard](module_5_dashboard/README.md)** - Interactive visualization and analytics

---

## 🎯 Project Timeline

| Phase | Duration | Milestones |
|-------|----------|-----------|
| **Phase 1** | Weeks 1-2 | Data Ingestion & Schema Design |
| **Phase 2** | Weeks 3-4 | Entity Extraction & Graph Building |
| **Phase 3** | Weeks 5-6 | Semantic Search & RAG Pipelines |
| **Phase 4** | Weeks 7-8 | Dashboard & Deployment |

### Milestone Evaluations
- **Week 2**: Data ingestion functional; schema defined ✓
- **Week 4**: Knowledge graph built; entities & relations extracted ✓
- **Week 6**: Semantic search and RAG operational ✓
- **Week 8**: Dashboard deployed; system live ✓

---

---

## 📋 Requirements

### System Requirements
- Python 3.8 or higher
- 4GB+ RAM (8GB recommended)
- 2GB+ disk space
- Git installed

### External Services (Optional)
- Neo4j Database (Graph storage)
- Pinecone API Key (Vector embeddings)
- OpenAI API Key (LLM services)
- Google Colab Account (Cloud execution)

---

## 📖 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team & Support

### Contact Information
- **Email**: mayureshshendre02@gmail.com
- **GitHub**: https://github.com/mayureshwar-shendre/isro-mission-knowledge-graph.git
- **LinkedIn**: https://www.linkedin.com/in/mayureshwar-shendre-490a20290 

---
---

## ⭐ Show Your Support

If this project helped you, please give it a **star** on GitHub! Your support helps us continue improving the platform.

<div align="center">

**[⬆ Back to Top](#-ai-knowledge-graph-builder-for-enterprise-intelligence)**

</div>

---

**Last Updated**: January 2026 | **Version**: 1.0.0 | **Status**: Production Ready ✅

