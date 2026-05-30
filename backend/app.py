import os
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "tickets.db")
INTERNAL_DOMAIN = os.getenv("INTERNAL_DOMAIN", "@company.com")
CATEGORY_CHOICES = [chr(ord("A") + i) for i in range(10)]

app = Flask(__name__)
CORS(app)

STATUS_CHOICES = ["Unassigned", "In Progress", "Waiting on Client", "Closed", "Redirected"]
PRIORITY_CHOICES = ["Normal", "Important", "Critical"]


def get_db():
    db = getattr(g, "db", None)
    if db is None:
        db = g.db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


def init_db():
    db = get_db()
    db.executescript("""
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_number TEXT UNIQUE,
        received_at TEXT NOT NULL,
        sender_name TEXT,
        sender_email TEXT,
        source_type TEXT,
        subject TEXT,
        original_description TEXT,
        attachments TEXT,
        conversation_id TEXT,
        status TEXT DEFAULT 'Unassigned',
        priority TEXT DEFAULT 'Normal',
        assigned_to TEXT,
        component_number TEXT,
        resolution_summary TEXT,
        category TEXT,
        department TEXT,
        closed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        author TEXT,
        body TEXT,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    );
    """)
    existing_columns = [row["name"] for row in db.execute("PRAGMA table_info(tickets)").fetchall()]
    if "category" not in existing_columns:
        db.execute("ALTER TABLE tickets ADD COLUMN category TEXT")
    if "department" not in existing_columns:
        db.execute("ALTER TABLE tickets ADD COLUMN department TEXT")
    db.commit()


def classify_source_type(sender_email):
    if not sender_email:
        return "External"
    internal = INTERNAL_DOMAIN.lower().lstrip("@")
    if sender_email.lower().endswith(internal):
        return "Internal"
    return "External"


def row_to_ticket(row):
    if row is None:
        return None
    return {
        "id": row["id"],
        "ticketNumber": row["ticket_number"],
        "receivedAt": row["received_at"],
        "senderName": row["sender_name"],
        "senderEmail": row["sender_email"],
        "sourceType": row["source_type"],
        "subject": row["subject"],
        "originalDescription": row["original_description"],
        "attachments": row["attachments"],
        "conversationId": row["conversation_id"],
        "status": row["status"],
        "priority": row["priority"],
        "assignedTo": row["assigned_to"],
        "componentNumber": row["component_number"],
        "resolutionSummary": row["resolution_summary"],
        "category": row["category"],
        "department": row["department"],
        "closedAt": row["closed_at"],
    }


def build_ticket_number():
    db = get_db()
    row = db.execute("SELECT MAX(id) AS max_id FROM tickets").fetchone()
    next_id = (row["max_id"] or 0) + 1
    return f"RD-{1000 + next_id}"


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "db", None)
    if db is not None:
        db.close()


@app.route("/api/tickets", methods=["GET"])
def list_tickets():
    q = request.args.get("q", "").strip()
    status = request.args.get("status")
    assigned_to = request.args.get("assigned_to")
    db = get_db()
    query = "SELECT * FROM tickets"
    params = []
    clauses = []

    if q:
        clauses.append("(subject LIKE ? OR original_description LIKE ? OR component_number LIKE ? OR resolution_summary LIKE ?)")
        term = f"%{q}%"
        params.extend([term, term, term, term])
    if status:
        clauses.append("status = ?")
        params.append(status)
    if assigned_to:
        clauses.append("assigned_to = ?")
        params.append(assigned_to)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY received_at DESC"

    rows = db.execute(query, params).fetchall()
    tickets = [row_to_ticket(row) for row in rows]
    return jsonify(tickets)


@app.route("/api/tickets/<int:ticket_id>", methods=["GET"])
def get_ticket(ticket_id):
    db = get_db()
    ticket = db.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if ticket is None:
        return jsonify({"error": "Ticket not found"}), 404
    notes = db.execute("SELECT * FROM notes WHERE ticket_id = ? ORDER BY created_at ASC", (ticket_id,)).fetchall()
    ticket_data = row_to_ticket(ticket)
    ticket_data["notes"] = [
        {
            "id": note["id"],
            "createdAt": note["created_at"],
            "author": note["author"],
            "body": note["body"],
        }
        for note in notes
    ]
    return jsonify(ticket_data)


@app.route("/api/tickets", methods=["POST"])
def create_ticket():
    payload = request.get_json() or {}
    sender_email = payload.get("senderEmail")
    if not sender_email:
        return jsonify({"error": "senderEmail is required"}), 400

    source_type = payload.get("sourceType") or classify_source_type(sender_email)
    if source_type != "Internal":
        return jsonify({"error": "Only internal company emails are accepted"}), 400

    ticket_number = build_ticket_number()
    now = datetime.utcnow().isoformat()
    subject = payload.get("subject") or payload.get("originalDescription", "").strip()[:80] or "Internal query"
    db = get_db()
    db.execute(
        "INSERT INTO tickets (ticket_number, received_at, sender_name, sender_email, source_type, subject, original_description, attachments, conversation_id, status, priority, assigned_to, component_number, resolution_summary, category, department, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            ticket_number,
            now,
            payload.get("senderName"),
            sender_email,
            source_type,
            subject,
            payload.get("originalDescription"),
            payload.get("attachments"),
            payload.get("conversationId"),
            payload.get("status", "Unassigned"),
            payload.get("priority", "Normal"),
            payload.get("assignedTo"),
            payload.get("componentNumber"),
            payload.get("resolutionSummary"),
            payload.get("category"),
            payload.get("department"),
            payload.get("closedAt"),
        ),
    )
    db.commit()
    ticket_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return get_ticket(ticket_id)


@app.route("/api/tickets/<int:ticket_id>", methods=["PUT"])
def update_ticket(ticket_id):
    payload = request.get_json() or {}
    db = get_db()
    ticket = db.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
    if ticket is None:
        return jsonify({"error": "Ticket not found"}), 404

    fields = [
        "sender_name",
        "sender_email",
        "source_type",
        "subject",
        "original_description",
        "attachments",
        "conversation_id",
        "status",
        "priority",
        "assigned_to",
        "component_number",
        "resolution_summary",
        "category",
        "department",
        "closed_at",
    ]
    updates = []
    params = []
    for key in fields:
        camel = key
        if key == "assigned_to":
            value = payload.get("assignedTo")
        elif key == "original_description":
            value = payload.get("originalDescription")
        elif key == "source_type":
            value = payload.get("sourceType")
        elif key == "conversation_id":
            value = payload.get("conversationId")
        elif key == "component_number":
            value = payload.get("componentNumber")
        elif key == "resolution_summary":
            value = payload.get("resolutionSummary")
        elif key == "category":
            value = payload.get("category")
        elif key == "department":
            value = payload.get("department")
        elif key == "sender_name":
            value = payload.get("senderName")
        elif key == "sender_email":
            value = payload.get("senderEmail")
        else:
            value = payload.get(key)
        if value is not None:
            updates.append(f"{key} = ?")
            params.append(value)
    if not updates:
        return get_ticket(ticket_id)
    params.append(ticket_id)
    db.execute(f"UPDATE tickets SET {', '.join(updates)} WHERE id = ?", params)
    db.commit()
    return get_ticket(ticket_id)


@app.route("/api/tickets/<int:ticket_id>/notes", methods=["POST"])
def add_note(ticket_id):
    payload = request.get_json() or {}
    body = payload.get("body")
    author = payload.get("author")
    if not body:
        return jsonify({"error": "Note body is required"}), 400
    now = datetime.utcnow().isoformat()
    db = get_db()
    db.execute(
        "INSERT INTO notes (ticket_id, created_at, author, body) VALUES (?, ?, ?, ?)",
        (ticket_id, now, author, body),
    )
    db.commit()
    return get_ticket(ticket_id)


@app.route("/api/tickets/<int:ticket_id>/close", methods=["POST"])
def close_ticket(ticket_id):
    payload = request.get_json() or {}
    resolution_summary = payload.get("resolutionSummary")
    if not resolution_summary:
        return jsonify({"error": "Resolution summary is required to close a ticket"}), 400
    now = datetime.utcnow().isoformat()
    db = get_db()
    db.execute(
        "UPDATE tickets SET status = ?, resolution_summary = ?, closed_at = ? WHERE id = ?",
        ("Closed", resolution_summary, now, ticket_id),
    )
    db.commit()
    return get_ticket(ticket_id)


@app.route("/api/seed", methods=["GET", "POST"])
def seed_data():
    db = get_db()
    existing = db.execute("SELECT COUNT(*) AS count FROM tickets").fetchone()["count"]
    if existing > 0:
        return jsonify({"message": "Seed already exists"}), 400
    samples = [
        {
            "senderName": "Manufacturing Engineer",
            "senderEmail": "fabteam@company.local",
            "sourceType": "Internal",
            "subject": "55 KV Insulator specification clarification",
            "originalDescription": "Need confirmation on insulator material and distance specs for the 55 KV assembly.",
            "attachments": "",
            "conversationId": "conv-1001",
            "status": "Unassigned",
            "priority": "Normal",
            "assignedTo": None,
            "componentNumber": "55KV-INS-001",
            "resolutionSummary": None,
            "category": "A",
            "department": "Manufacturing",
        },
        {
            "senderName": "Quality Manager",
            "senderEmail": "quality@company.local",
            "sourceType": "Internal",
            "subject": "Test protocol discrepancy on new batch",
            "originalDescription": "The test protocol says 1500 V but the documentation calls for 1200 V.",
            "attachments": "",
            "conversationId": "conv-1002",
            "status": "In Progress",
            "priority": "Important",
            "assignedTo": "Anjali",
            "componentNumber": "BATCH-TS-2026",
            "resolutionSummary": None,
            "category": "B",
            "department": "Quality",
        },
    ]
    for item in samples:
        db.execute(
            "INSERT INTO tickets (ticket_number, received_at, sender_name, sender_email, source_type, subject, original_description, attachments, conversation_id, status, priority, assigned_to, component_number, resolution_summary, category_tags, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                build_ticket_number(),
                datetime.utcnow().isoformat(),
                item["senderName"],
                item["senderEmail"],
                item["sourceType"],
                item["subject"],
                item["originalDescription"],
                item["attachments"],
                item["conversationId"],
                item["status"],
                item["priority"],
                item["assignedTo"],
                item["componentNumber"],
                item["resolutionSummary"],
                item["categoryTags"],
                None,
            ),
        )
    db.commit()
    return jsonify({"message": "Sample tickets seeded"})


@app.route("/api/choices", methods=["GET"])
def choices():
    return jsonify({"statusChoices": STATUS_CHOICES, "priorityChoices": PRIORITY_CHOICES, "categoryChoices": CATEGORY_CHOICES, "internalDomain": INTERNAL_DOMAIN})


if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
