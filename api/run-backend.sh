#!/bin/bash
# Exit on error for setup steps, but handle running gracefully
set -e

# Navigate to the workspace root directory (where package.json is)
# Since the script is run from the workspace root, we use "venv"
VENV_DIR="venv"

echo "=== Resilient Backend Startup Script ==="
echo "Checking Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

echo "Installing/updating dependencies..."
pip install --upgrade pip
pip install -r api/requirements.txt

echo "Starting FastAPI backend via Uvicorn on port 5328..."
# Disable 'set -e' so that if uvicorn exits/fails, we don't crash this script
set +e
uvicorn api.index:app --port 5328 --reload

# If uvicorn exited with an error, handle it gracefully
if [ $? -ne 0 ]; then
    echo "========================================================"
    echo "WARNING: FastAPI backend failed to start or crashed!"
    echo "We are keeping this process alive so Next.js doesn't stop."
    echo "Please check your Python environment or dependencies."
    echo "========================================================"
    # Sleep forever to keep concurrently active
    tail -f /dev/null
fi
