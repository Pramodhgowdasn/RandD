"""
Email listener for automated ticket intake.
Monitors an IMAP inbox and converts emails into tickets.
Classifies by domain: @siemens.com = Internal, others = External.
"""

import os
import json
import logging
import time
import requests
from datetime import datetime
from dotenv import load_dotenv
from imapclient import IMAPClient
from email.parser import BytesParser
from email import policy

load_dotenv()

# Configuration
IMAP_HOST = os.getenv("IMAP_HOST", "imap.gmail.com")
IMAP_PORT = int(os.getenv("IMAP_PORT", "993"))
IMAP_USER = os.getenv("IMAP_USER")
IMAP_PASSWORD = os.getenv("IMAP_PASSWORD")
IMAP_FOLDER = os.getenv("IMAP_FOLDER", "INBOX")
INTERNAL_DOMAIN = os.getenv("INTERNAL_DOMAIN", "@company.com")
API_BASE = os.getenv("API_BASE", "http://localhost:5000/api")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "60"))  # seconds

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    handlers=[
        logging.FileHandler("email_listener.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def get_sender_domain(email_address):
    """Extract domain from email address."""
    if "@" not in email_address:
        return ""
    return email_address.split("@")[1].lower()


def classify_source(sender_email):
    """Classify email as Internal or External based on domain."""
    domain = get_sender_domain(sender_email)
    internal = INTERNAL_DOMAIN.lower().lstrip("@")
    return "Internal" if domain.endswith(internal) else "External"


def extract_email_data(email_message):
    """Parse email message and extract relevant fields."""
    sender_name = email_message.get("From", "Unknown")
    sender_email = email_message.get("From", "unknown@example.com")
    
    # Clean up sender email if it contains display name
    if "<" in sender_email and ">" in sender_email:
        sender_email = sender_email[sender_email.find("<") + 1 : sender_email.find(">")]
    
    subject = email_message.get("Subject", "(No Subject)")
    message_id = email_message.get("Message-ID", "")
    
    # Extract body
    body = ""
    if email_message.is_multipart():
        for part in email_message.iter_parts():
            if part.get_content_type() == "text/plain":
                body = part.get_content()
                break
    else:
        body = email_message.get_content()
    
    source_type = classify_source(sender_email)
    
    return {
        "senderName": sender_name,
        "senderEmail": sender_email,
        "sourceType": source_type,
        "subject": subject,
        "originalDescription": body[:2000],  # Limit to 2000 chars
        "conversationId": message_id,
        "attachments": "",  # Simplified for now
        "category": "",
        "department": "",
    }


def create_ticket_via_api(ticket_data):
    """Send ticket data to Flask API."""
    try:
        response = requests.post(
            f"{API_BASE}/tickets",
            json=ticket_data,
            timeout=10,
        )
        if response.status_code in [200, 201]:
            result = response.json()
            logger.info(f"✓ Created ticket {result.get('ticketNumber')} from {ticket_data['senderEmail']}")
            return result
        else:
            logger.error(f"API error {response.status_code}: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Failed to create ticket: {e}")
        return None


def poll_inbox():
    """Connect to IMAP and check for new emails."""
    if not IMAP_USER or not IMAP_PASSWORD:
        logger.error("Missing IMAP credentials. Set IMAP_USER and IMAP_PASSWORD in .env")
        return
    
    try:
        logger.info(f"Connecting to {IMAP_HOST}:{IMAP_PORT}...")
        with IMAPClient(IMAP_HOST, port=IMAP_PORT, ssl=True) as client:
            client.login(IMAP_USER, IMAP_PASSWORD)
            logger.info(f"✓ Logged in as {IMAP_USER}")
            
            # Select folder
            client.select_folder(IMAP_FOLDER)
            logger.info(f"✓ Selected folder: {IMAP_FOLDER}")
            
            # Search for unseen emails
            unseen_ids = client.search(["UNSEEN"])
            logger.info(f"Found {len(unseen_ids)} unseen emails")
            
            if not unseen_ids:
                logger.info("No new emails.")
                return
            
            # Fetch and process each email
            for msg_id in unseen_ids:
                try:
                    raw_msg = client.fetch([msg_id], ["RFC822"])
                    email_data = raw_msg[msg_id][b"RFC822"]
                    email_message = BytesParser(policy=policy.default).parsebytes(email_data)
                    
                    # Extract and classify
                    ticket_data = extract_email_data(email_message)
                    logger.info(f"Processing: {ticket_data['subject']} from {ticket_data['senderEmail']} ({ticket_data['sourceType']})")
                    
                    if ticket_data["sourceType"] != "Internal":
                        logger.warning(f"Skipping non-internal email from {ticket_data['senderEmail']}")
                        client.set_flags([msg_id], [b"\\Seen"])
                        continue
                    
                    # Create ticket
                    result = create_ticket_via_api(ticket_data)
                    
                    # Mark as processed
                    if result:
                        client.set_flags([msg_id], [b"\\Seen"])
                        logger.info(f"  → Marked as seen in inbox")
                    
                except Exception as e:
                    logger.error(f"Error processing email ID {msg_id}: {e}")
    
    except Exception as e:
        logger.error(f"IMAP connection failed: {e}")


def main():
    """Main loop: poll inbox at regular intervals."""
    logger.info("=" * 60)
    logger.info("Email Listener Started")
    logger.info(f"Configuration:")
    logger.info(f"  IMAP: {IMAP_HOST}:{IMAP_PORT}")
    logger.info(f"  User: {IMAP_USER}")
    logger.info(f"  Folder: {IMAP_FOLDER}")
    logger.info(f"  Internal Domain: {INTERNAL_DOMAIN}")
    logger.info(f"  API: {API_BASE}")
    logger.info(f"  Poll Interval: {POLL_INTERVAL}s")
    logger.info("=" * 60)
    
    try:
        while True:
            logger.info(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Polling inbox...")
            poll_inbox()
            logger.info(f"Next poll in {POLL_INTERVAL}s...")
            time.sleep(POLL_INTERVAL)
    except KeyboardInterrupt:
        logger.info("\nShutdown requested.")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
