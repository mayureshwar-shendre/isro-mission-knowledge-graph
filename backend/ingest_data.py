"""
ingest_data.py
==============
This script reads the three CSV files (ISRO_Satellite_List.csv, triples.csv,
graph_entities.csv) and loads them into Neo4j as a property graph.

Run this ONCE before starting the backend:
    python ingest_data.py

It is idempotent — running it multiple times won't create duplicate nodes
because we use MERGE instead of CREATE everywhere.
"""

import os
import pandas as pd
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

# ── Database connection ──────────────────────────────────────────────────────
URI      = os.getenv("NEO4J_URI",      "neo4j://127.0.0.1:7687")
USER     = os.getenv("NEO4J_USER",     "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j@ISRO")

driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))

# ── File paths ───────────────────────────────────────────────────────────────
DATA_DIR         = os.path.join(os.path.dirname(__file__), "..", "data")
SATELLITE_CSV    = os.path.join(DATA_DIR, "ISRO_Satellite_List.csv")
TRIPLES_CSV      = os.path.join(DATA_DIR, "triples.csv")
ENTITIES_CSV     = os.path.join(DATA_DIR, "graph_entities.csv")


def clear_database(session):
    """
    WARNING: This deletes ALL nodes and relationships.
    Remove this call if you want to preserve existing data.
    """
    print("🗑️  Clearing existing database...")
    session.run("MATCH (n) DETACH DELETE n")


def create_constraints(session):
    """
    Uniqueness constraints also act as indexes, making lookups fast.
    Neo4j requires each constraint to be created separately.
    """
    print("🔧  Creating constraints...")
    constraints = [
        "CREATE CONSTRAINT sat_name IF NOT EXISTS FOR (s:Satellite) REQUIRE s.name IS UNIQUE",
        "CREATE CONSTRAINT rocket_name IF NOT EXISTS FOR (r:Rocket) REQUIRE r.name IS UNIQUE",
        "CREATE CONSTRAINT mission_name IF NOT EXISTS FOR (m:Mission) REQUIRE m.name IS UNIQUE",
    ]
    for c in constraints:
        try:
            session.run(c)
        except Exception as e:
            print(f"  Constraint already exists or minor error: {e}")


def ingest_satellites(session):
    """
    Reads ISRO_Satellite_List.csv and creates:
      - (:Satellite) node for each satellite
      - (:Rocket) node for each launch vehicle
      - [:LAUNCHED_BY] relationship linking them

    The launch vehicle column contains full mission names like
    'PSLV-C57/Aditya-L1 Mission' — we extract just the rocket family
    (PSLV, GSLV, LVM3, SSLV, Ariane) for cleaner graph nodes.
    """
    print("🛰️  Loading satellite data...")
    df = pd.read_csv(SATELLITE_CSV, encoding='cp1252')
    df.columns = [c.strip() for c in df.columns]  # strip whitespace from headers
    df = df.fillna("Unknown")

    count = 0
    for _, row in df.iterrows():
        sat_name    = str(row.get("Satellite Name", "")).strip()
        launch_date = str(row.get("Launch Date", "")).strip()
        launch_veh  = str(row.get("Launch Vehicle", "")).strip()
        orbit       = str(row.get("Orbit", "")).strip()
        application = str(row.get("Application", "")).strip()
        remarks     = str(row.get("Remarks", "")).strip()
        sl_no       = str(row.get("SL No", "")).strip()

        if not sat_name or sat_name == "nan":
            continue

        # Determine success status from remarks
        status = "Successful" if "successful" in remarks.lower() else "Failed"

        # Extract rocket family from the full launch vehicle string
        rocket_family = _extract_rocket_family(launch_veh)

        # MERGE ensures we don't create duplicate nodes
        session.run("""
            MERGE (s:Satellite {name: $name})
            SET   s.launch_date = $launch_date,
                  s.orbit       = $orbit,
                  s.application = $application,
                  s.status      = $status,
                  s.serial_no   = $sl_no,
                  s.launch_vehicle = $launch_veh
        """, name=sat_name, launch_date=launch_date, orbit=orbit,
             application=application, status=status, sl_no=sl_no,
             launch_veh=launch_veh)

        # Create Rocket node and relationship
        if rocket_family and rocket_family != "Unknown":
            session.run("""
                MERGE (r:Rocket {name: $rocket})
                MERGE (s:Satellite {name: $sat})
                MERGE (s)-[:LAUNCHED_BY {vehicle: $vehicle}]->(r)
            """, rocket=rocket_family, sat=sat_name, vehicle=launch_veh)

        count += 1

    print(f"  ✅ Loaded {count} satellites")


def _extract_rocket_family(vehicle_str):
    """
    Maps the full mission name to a clean rocket family name.
    Examples:
      'PSLV-C57/Aditya-L1 Mission' → 'PSLV'
      'GSLV Mk III-D1/GSAT-19 Mission' → 'LVM3'
      'Ariane-5 VA-251' → 'Ariane-5'
    """
    v = vehicle_str.upper()
    if "LVM3" in v or "GSLV MK III" in v or "GSLV MK-III" in v:
        return "LVM3"
    elif "GSLV" in v:
        return "GSLV"
    elif "PSLV" in v:
        return "PSLV"
    elif "SSLV" in v:
        return "SSLV"
    elif "ARIANE" in v:
        return "Ariane-5"
    elif "SLV" in v:
        return "SLV"
    elif "ASLV" in v:
        return "ASLV"
    return "Unknown"


def ingest_triples(session):
    """
    Reads triples.csv (Entity1, Relation, Entity2) and creates generic
    Entity nodes with typed relationships. This is the raw knowledge graph.

    Relations like 'launched_by', 'used_for', 'orbit_type', 'rocket_family'
    are converted to Neo4j relationship types.
    """
    print("🔗  Loading knowledge graph triples...")
    df = pd.read_csv(TRIPLES_CSV, encoding='cp1252')
    df.columns = [c.strip() for c in df.columns]
    df = df.fillna("")

    # Map CSV relation names to clean Neo4j relationship types
    RELATION_MAP = {
        "launched_by":   "LAUNCHED_BY",
        "used_for":      "USED_FOR",
        "orbit_type":    "HAS_ORBIT",
        "rocket_family": "BELONGS_TO_FAMILY",
        "launch_on":     "LAUNCHED_ON",
        "related_to":    "RELATED_TO",
        "designed_by":   "DESIGNED_BY",
        "next_mission":  "NEXT_MISSION",
    }

    count = 0
    for _, row in df.iterrows():
        e1       = str(row.get("Entity1", "")).strip()
        relation = str(row.get("Relation", "")).strip().lower()
        e2       = str(row.get("Entity2", "")).strip()

        if not e1 or not e2 or not relation:
            continue

        rel_type = RELATION_MAP.get(relation, relation.upper().replace(" ", "_"))

        # Use a parameterized dynamic relationship type via APOC-style trick
        # Since Neo4j doesn't allow parameterized rel types, we use apocless approach
        query = f"""
            MERGE (a:Entity {{name: $e1}})
            MERGE (b:Entity {{name: $e2}})
            MERGE (a)-[:{rel_type} {{source: 'triples_csv'}}]->(b)
        """
        try:
            session.run(query, e1=e1, e2=e2)
            count += 1
        except Exception as ex:
            print(f"  Warning on triple ({e1} → {rel_type} → {e2}): {ex}")

    print(f"  ✅ Loaded {count} triples")


def ingest_entities(session):
    """
    Reads graph_entities.csv and applies the correct label to each entity node.
    For example, an entity with type='Satellite' gets the :Satellite label.
    """
    print("🏷️  Applying entity labels...")
    df = pd.read_csv(ENTITIES_CSV, encoding='cp1252')
    df.columns = [c.strip() for c in df.columns]
    df = df.fillna("Unknown")

    count = 0
    for _, row in df.iterrows():
        entity = str(row.get("entity", "")).strip()
        etype  = str(row.get("type",   "")).strip()

        if not entity or not etype or entity == "nan":
            continue

        # Add the typed label alongside :Entity
        query = f"""
            MERGE (e:Entity {{name: $entity}})
            SET e :{etype}
            SET e.entity_type = $etype
        """
        try:
            session.run(query, entity=entity, etype=etype)
            count += 1
        except Exception as ex:
            print(f"  Warning on entity {entity}: {ex}")

    print(f"  ✅ Labeled {count} entities")


def create_isro_org_node(session):
    """
    Creates the central ISRO organization node and connects rockets to it,
    since ISRO developed all the indigenous rockets.
    """
    print("🏛️  Creating ISRO organization node...")
    session.run("""
        MERGE (isro:Organization {name: 'ISRO'})
        SET isro.full_name = 'Indian Space Research Organisation',
            isro.founded   = '1969',
            isro.hq        = 'Bengaluru, India',
            isro.website   = 'https://www.isro.gov.in'
    """)

    # Connect indigenous rockets to ISRO
    for rocket in ["PSLV", "GSLV", "LVM3", "SSLV", "SLV", "ASLV"]:
        session.run("""
            MERGE (r:Rocket {name: $rocket})
            MERGE (isro:Organization {name: 'ISRO'})
            MERGE (isro)-[:DEVELOPED]->(r)
        """, rocket=rocket)

    print("  ✅ ISRO organization node created")


def print_summary(session):
    """Print a summary of what was loaded."""
    results = session.run("""
        MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
        ORDER BY count DESC
    """)
    print("\n📊 Database Summary:")
    print("  " + "─" * 30)
    for record in results:
        print(f"  {record['label']:20s}: {record['count']:>4d} nodes")

    rel_count = session.run("MATCH ()-[r]->() RETURN count(r) AS cnt").single()["cnt"]
    print(f"  {'Relationships':20s}: {rel_count:>4d}")
    print("  " + "─" * 30)


def main():
    print("=" * 50)
    print("🚀 ISRO Mission Navigator — Data Ingestion")
    print("=" * 50)
    print(f"\nConnecting to Neo4j at {URI}...\n")

    with driver.session() as session:
        clear_database(session)
        create_constraints(session)
        ingest_satellites(session)
        ingest_triples(session)
        ingest_entities(session)
        create_isro_org_node(session)
        print_summary(session)

    driver.close()
    print("\n✅ Data ingestion complete! Start the backend with:")
    print("   uvicorn main:app --reload --port 8000\n")


if __name__ == "__main__":
    main()
