@echo off
echo 🤖 Starting Emotion Detection ^& Therapy API Server
echo ==================================================

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo ⚡ Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo 🔄 Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Check if .env file exists, if not copy from template
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.template .env
    echo ⚠️  Please edit .env file and add your Gemini API key!
)

REM Check if model file exists
if not exist "..\public\Emo0.1.h5" if not exist "Emo0.1.h5" (
    echo ⚠️  Warning: Emo0.1.h5 model file not found!
    echo    Please place your model file in:
    echo    - backend\Emo0.1.h5 OR
    echo    - public\Emo0.1.h5
)

echo.
echo 🚀 Starting Flask server...
echo 📡 API will be available at: http://localhost:5000
echo.
echo Available endpoints:
echo   GET  /health - Health check
echo   POST /predict_emotion - Emotion detection + therapy
echo   GET  /test_emotion - Test with mock data
echo.

REM Start the Flask app
python app.py

pause