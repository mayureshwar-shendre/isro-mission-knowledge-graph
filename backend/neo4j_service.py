"""
neo4j_service.py
================
All Neo4j database interactions live here.

The design principle is simple: every function takes a Neo4j driver,
runs a Cypher query, and returns plain Python dicts/lists that FastAPI
can serialize directly to JSON. No Neo4j-specific objects escape this file.

Key Cypher concepts used:
  MATCH  — find patterns in the graph
  WHERE  — filter results
  RETURN — what to send back
  LIMIT  — cap the number of results
  ORDER BY — sort results
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

URI      = os.getenv("NEO4J_URI",      "neo4j://127.0.0.1:7687")
USER     = os.getenv("NEO4J_USER",     "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j@ISRO")


def get_driver():
    """Return a Neo4j driver instance. Called once at startup."""
    return GraphDatabase.driver(URI, auth=(USER, PASSWORD))


# ── Graph Exploration ─────────────────────────────────────────────────────────

def get_graph_data(driver, limit: int = 150):
    """
    Returns nodes and edges for the D3.js force-directed graph.

    We limit to `limit` satellites connected to rockets to keep the
    browser rendering fast. A full graph with 500+ nodes would be sluggish.

    The D3 graph needs data in exactly this format:
        { nodes: [{id, label, type, ...}], links: [{source, target, relation}] }
    """
    with driver.session() as session:
        # Get satellite → rocket relationships
        result = session.run("""
            MATCH (s:Satellite)-[r:LAUNCHED_BY]->(rocket:Rocket)
            RETURN
                s.name        AS sat_name,
                s.application AS application,
                s.status      AS status,
                s.launch_date AS launch_date,
                rocket.name   AS rocket_name,
                r.vehicle     AS vehicle
            LIMIT $limit
        """, limit=limit)

        nodes_dict = {}  # keyed by name to avoid duplicates
        links      = []

        for record in result:
            sat_name    = record["sat_name"]
            rocket_name = record["rocket_name"]
            status      = record["status"] or "Unknown"
            app         = record["application"] or "Unknown"
            date        = record["launch_date"] or ""

            # Each node needs a unique string ID for D3
            if sat_name not in nodes_dict:
                nodes_dict[sat_name] = {
                    "id":          sat_name,
                    "label":       sat_name,
                    "type":        "satellite",
                    "application": app,
                    "status":      status,
                    "launch_date": date,
                    # Color coding by status
                    "color": "#22c55e" if "success" in status.lower() else "#ef4444"
                }

            if rocket_name and rocket_name not in nodes_dict:
                nodes_dict[rocket_name] = {
                    "id":    rocket_name,
                    "label": rocket_name,
                    "type":  "rocket",
                    "color": "#f59e0b"   # amber for rockets
                }

            if rocket_name:
                links.append({
                    "source":   sat_name,
                    "target":   rocket_name,
                    "relation": "LAUNCHED_BY",
                    "vehicle":  record["vehicle"] or ""
                })

        # Also add ISRO organization node connected to rockets
        isro_result = session.run("""
            MATCH (org:Organization {name: 'ISRO'})-[:DEVELOPED]->(r:Rocket)
            RETURN r.name AS rocket_name
        """)
        isro_added = False
        for rec in isro_result:
            rname = rec["rocket_name"]
            if not isro_added:
                nodes_dict["ISRO"] = {
                    "id":    "ISRO",
                    "label": "ISRO",
                    "type":  "organization",
                    "color": "#6366f1"   # indigo for organizations
                }
                isro_added = True
            if rname in nodes_dict:
                links.append({
                    "source":   "ISRO",
                    "target":   rname,
                    "relation": "DEVELOPED"
                })

        return {
            "nodes": list(nodes_dict.values()),
            "links": links
        }


def search_nodes(driver, query: str, limit: int = 20):
    """
    Full-text search over node names. Used by the search bar.
    The CONTAINS clause is case-insensitive via toLower().
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (n)
            WHERE toLower(n.name) CONTAINS toLower($query)
            RETURN
                n.name          AS name,
                labels(n)[0]    AS type,
                n.status        AS status,
                n.application   AS application,
                n.launch_date   AS launch_date
            LIMIT $limit
        """, query=query, limit=limit)

        return [dict(r) for r in result]


def get_node_detail(driver, name: str):
    """
    Returns a single node's properties plus all its immediate neighbors.
    Used when the user clicks a node in the graph to show the detail panel.
    """
    with driver.session() as session:
        # Get the main node
        node_result = session.run("""
            MATCH (n {name: $name})
            RETURN
                n.name          AS name,
                labels(n)       AS labels,
                n.status        AS status,
                n.application   AS application,
                n.launch_date   AS launch_date,
                n.orbit         AS orbit,
                n.launch_vehicle AS launch_vehicle,
                n.full_name     AS full_name,
                n.founded       AS founded,
                n.entity_type   AS entity_type
        """, name=name).single()

        if not node_result:
            return None

        # Get all relationships (both directions)
        rels_result = session.run("""
            MATCH (n {name: $name})-[r]->(neighbor)
            RETURN
                type(r)         AS relation,
                neighbor.name   AS neighbor,
                labels(neighbor)[0] AS neighbor_type,
                'outgoing'      AS direction
            UNION
            MATCH (neighbor)-[r]->(n {name: $name})
            RETURN
                type(r)         AS relation,
                neighbor.name   AS neighbor,
                labels(neighbor)[0] AS neighbor_type,
                'incoming'      AS direction
            LIMIT 30
        """, name=name)

        connections = [dict(r) for r in rels_result]

        return {
            "node":        dict(node_result),
            "connections": connections
        }


# ── Analytics & Statistics ────────────────────────────────────────────────────

def get_statistics(driver):
    """
    Returns high-level statistics for the dashboard header stats cards.
    These are computed live from the graph, not hardcoded.
    """
    with driver.session() as session:
        stats = {}

        # Total satellites
        stats["total_satellites"] = session.run(
            "MATCH (s:Satellite) RETURN count(s) AS cnt"
        ).single()["cnt"]

        # Total rockets
        stats["total_rockets"] = session.run(
            "MATCH (r:Rocket) RETURN count(r) AS cnt"
        ).single()["cnt"]

        # Successful launches
        stats["successful_launches"] = session.run(
            "MATCH (s:Satellite) WHERE toLower(s.status) CONTAINS 'success' "
            "RETURN count(s) AS cnt"
        ).single()["cnt"]

        # Total relationships
        stats["total_relationships"] = session.run(
            "MATCH ()-[r]->() RETURN count(r) AS cnt"
        ).single()["cnt"]

        # Success rate percentage
        if stats["total_satellites"] > 0:
            stats["success_rate"] = round(
                (stats["successful_launches"] / stats["total_satellites"]) * 100, 1
            )
        else:
            stats["success_rate"] = 0

        return stats


def get_rocket_launch_counts(driver):
    """
    Returns how many satellites each rocket family has launched.
    Used for the bar chart in the Analytics panel.
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Satellite)-[:LAUNCHED_BY]->(r:Rocket)
            RETURN r.name AS rocket, count(s) AS launches
            ORDER BY launches DESC
            LIMIT 10
        """)
        return [{"rocket": r["rocket"], "launches": r["launches"]} for r in result]


def get_application_distribution(driver):
    """
    Returns the count of satellites per application category.
    Used for the pie chart in the Analytics panel.
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Satellite)
            WHERE s.application IS NOT NULL AND s.application <> 'Unknown'
            RETURN s.application AS application, count(s) AS count
            ORDER BY count DESC
            LIMIT 8
        """)
        return [{"application": r["application"], "count": r["count"]} for r in result]


def get_launch_timeline(driver):
    """
    Returns the number of satellites launched per year.
    Used for the timeline line chart.
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Satellite)
            WHERE s.launch_date IS NOT NULL AND s.launch_date <> 'Unknown'
            WITH s,
                 CASE
                   WHEN size(split(s.launch_date, '-')) >= 3
                   THEN split(s.launch_date, '-')[2]    // DD-Mon-YY format
                   ELSE substring(s.launch_date, 0, 4)  // YYYY-... format
                 END AS year_part
            WITH year_part,
                 CASE WHEN size(year_part) = 4 THEN toInteger(year_part)
                      ELSE NULL END AS launch_year
            WHERE launch_year IS NOT NULL AND launch_year >= 1975 AND launch_year <= 2026
            RETURN launch_year AS year, count(*) AS launches
            ORDER BY year ASC
        """)
        return [{"year": r["year"], "launches": r["launches"]} for r in result]


def get_recent_missions(driver, limit: int = 6):
    """
    Returns the most recent satellite missions, ordered by serial number
    (which correlates with launch order in the dataset).
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Satellite)
            WHERE s.serial_no IS NOT NULL AND s.serial_no <> 'Unknown'
            WITH s, toInteger(s.serial_no) AS sno
            ORDER BY sno DESC
            LIMIT $limit
            RETURN
                s.name         AS name,
                s.launch_date  AS launch_date,
                s.status       AS status,
                s.application  AS application,
                s.orbit        AS orbit
        """, limit=limit)
        return [dict(r) for r in result]


# ── Knowledge Graph Triples (for RAG) ────────────────────────────────────────

def get_all_triples(driver):
    """
    Returns all (subject, predicate, object) triples from the graph.
    This is used to build the vector store for the RAG system.
    Each triple becomes one text chunk to be embedded.
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (a)-[r]->(b)
            WHERE a.name IS NOT NULL AND b.name IS NOT NULL
            RETURN
                a.name    AS subject,
                type(r)   AS predicate,
                b.name    AS object
            LIMIT 2000
        """)
        return [
            {
                "subject":   rec["subject"],
                "predicate": rec["predicate"],
                "object":    rec["object"],
                # Text format that gets embedded into the vector store
                "text": f"{rec['subject']} {rec['predicate'].replace('_', ' ').lower()} {rec['object']}"
            }
            for rec in result
        ]


def query_related_triples(driver, entity_name: str, limit: int = 10):
    """
    Given an entity name, returns all triples where it appears
    as subject OR object. Used to enrich RAG context.
    """
    with driver.session() as session:
        result = session.run("""
            MATCH (a {name: $name})-[r]->(b)
            RETURN a.name AS subject, type(r) AS predicate, b.name AS object
            UNION
            MATCH (a)-[r]->(b {name: $name})
            RETURN a.name AS subject, type(r) AS predicate, b.name AS object
            LIMIT $limit
        """, name=entity_name, limit=limit)
        return [dict(rec) for rec in result]
