@echo off
echo ============================================
echo Live Emotion Detection Workbench
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Starting Live Emotion Detection Workbench...
echo.
echo Make sure you have installed the required dependencies:
echo   pip install tensorflow opencv-python numpy
echo.
echo Press Ctrl+C to stop or 'Q' in the window to quit.
echo.

python live_emotion_workbench.py

pause
