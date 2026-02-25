<div align="center">
  
# **🗄️ Module 3: Graph Construction & Storage Hub**

</div>

---


## 🧠 Overview

The Entity & Relationship Extraction Engine is the core intelligence module that automatically identifies entities (e.g., Satellites, Rockets, Scientists, Missions) and their relationships from ISRO datasets using AI and NLP techniques.

---


## 🎯 Purpose

To transform raw mission data into structured knowledge triples (Entity → Relation → Entity) that form the backbone of the knowledge graph.

---


## ⚙️ Key Responsibilities

1. Named Entity Recognition (NER) using LLM/NLP

2. Relation extraction between mission components

3. Triple generation (Subject–Predicate–Object)

4. Domain-specific ontology mapping (ISRO missions)

---


## 🔍 Example Knowledge Triples
~~~
Chandrayaan-3 → launched_by → LVM3

PSLV → developed_by → ISRO

Aditya-L1 → mission_type → Solar Mission

~~~

---


## 📊 Input

Preprocessed mission data

---


## 📤 Output

1. Extracted Entities

2. Relationship Triples (KG-ready format)

---


## 🛠️ Tech Stack

1. SpaCy / Transformers

2. LangChain

3. NLP Pipelines

4. LLM-based Extraction


