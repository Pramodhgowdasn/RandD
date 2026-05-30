# R&D Technical Support & Knowledge Management System

This project implements a local offline version of the centralized ticketing and knowledge management solution described in the R&D blueprint.

The stack:
- Frontend: React + Tailwind CSS
- Backend: Flask
- Database: SQLite

## Contents
- `backend/` — Flask API and SQLite database
- `frontend/` — React + Tailwind UI

## Setup

### Backend
1. Open a terminal in `backend/`
2. Create a virtual environment:
   - `python -m venv venv`
3. Activate it:
   - Windows PowerShell: `venv\Scripts\Activate.ps1`
     - If PowerShell blocks execution, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
4. Install dependencies:
   - `python -m pip install -r requirements.txt`
5. Start the backend:
   - `python app.py`

### Frontend
1. Open a terminal in `frontend/`
2. Install dependencies:
   - `npm install`
3. Start development server:
   - `npm run dev`
4. Copy `frontend/.env.example` to `frontend/.env.local` if you want to override the default support portal access code.

## Notes
- The Flask API runs on port `5000` by default.
- The React app is configured to call `/api` endpoints on the backend.
- The frontend now separates two UI flows:
  - `Submit Query` for internal employees.
  - `Technical Support` for authorized support staff.
- Use the support access code from `frontend/.env.local` to enter the support portal.
- The backend includes a sample seed endpoint at `GET /api/seed`.

## Email Automation (Inbox Listener)

The system includes an automated email listener that monitors an inbox and converts messages into tickets.

### Setup

1. Copy `.env.example` to `.env` in `backend/`:
   ```
   cp .env.example .env
   ```

2. Edit `.env` with your email provider settings:
   - **Gmail**: Use an App Password (not your regular password)
   - **Outlook/Office365**: Use your account credentials
   - **Other**: Configure IMAP settings from your provider

3. Install additional dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the listener in a separate terminal:
   ```
   (venv) PS backend> python email_listener.py
   ```

### Email Classification

- **Internal**: Emails ending with the configured company domain (default `@company.com`)
- **External**: Emails from other domains are ignored by the listener

### Example (Gmail)

1. Enable 2-Step Verification on your Google Account
2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. In `.env`:
   ```
   IMAP_HOST=imap.gmail.com
   IMAP_PORT=993
   IMAP_USER=your-email@gmail.com
   IMAP_PASSWORD=16-character-app-password
   ```
4. Run the listener—it will poll every 60 seconds and auto-create tickets

