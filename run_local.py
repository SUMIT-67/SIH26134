"""
AIRFARE-INDEX Local Runner
Allows 1-command startup of the complete stack (FastAPI backend + React frontend)
without needing Docker installed.
"""

import os
import sys
import subprocess
import time
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def main():
    print("=" * 70)
    print("  AIRFARE-INDEX | MoSPI DIID - Smart India Hackathon 2026")
    print("  Problem Statement 26056: Real-time Airfare Price Index for India")
    print("  Team: MediMinds")
    print("=" * 70)

    # 1. Run database seed check
    print("\n[1/3] Checking & initializing database schema + 30-day historical data...")
    from api.seed import seed_database
    seed_database()

    # 2. Start FastAPI Backend in background process
    print("\n[2/3] Launching FastAPI Backend on http://127.0.0.1:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(BASE_DIR)
    )

    # 3. Start Frontend
    print("\n[3/3] Launching Frontend Dashboard on http://localhost:5173...")
    frontend_dir = BASE_DIR / "frontend"
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
        cwd=str(frontend_dir)
    )

    # Allow servers to bind
    time.sleep(3)

    target_url = "http://127.0.0.1:5173"
    print("\n" + "=" * 70)
    print(f"  SYSTEM ONLINE & STREAMING LIVE!")
    print(f"  Analyst Dashboard: {target_url}")
    print(f"  Interactive Swagger Docs: http://127.0.0.1:8000/docs")
    print(f"  Live WebSocket Stream: ws://127.0.0.1:8000/stream")
    print("=" * 70 + "\n")

    try:
        webbrowser.open(target_url)
    except Exception:
        pass

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down AIRFARE-INDEX services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("All services stopped cleanly.")

if __name__ == "__main__":
    main()
