#!/bin/bash

echo "============================================"
echo "Live Emotion Detection Workbench"
echo "============================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed"
    exit 1
fi

echo "Starting Live Emotion Detection Workbench..."
echo ""
echo "Make sure you have installed the required dependencies:"
echo "  pip install tensorflow opencv-python numpy"
echo ""
echo "Press Ctrl+C to stop or 'Q' in the window to quit."
echo ""

python3 live_emotion_workbench.py
