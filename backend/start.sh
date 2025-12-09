#!/bin/bash

# Emotion Detection Backend Startup Script

echo "🤖 Starting Emotion Detection & Therapy API Server"
echo "=" * 50

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "⚡ Activating virtual environment..."
source venv/bin/activate || venv\Scripts\activate

# Upgrade pip
echo "🔄 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists, if not copy from template
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "⚠️  Please edit .env file and add your Gemini API key!"
fi

# Check if model file exists
if [ ! -f "../public/Emo0.1.h5" ] && [ ! -f "Emo0.1.h5" ]; then
    echo "⚠️  Warning: Emo0.1.h5 model file not found!"
    echo "   Please place your model file in:"
    echo "   - backend/Emo0.1.h5 OR"
    echo "   - public/Emo0.1.h5"
fi

echo ""
echo "🚀 Starting Flask server..."
echo "📡 API will be available at: http://localhost:5000"
echo ""
echo "Available endpoints:"
echo "  GET  /health - Health check"
echo "  POST /predict_emotion - Emotion detection + therapy"
echo "  GET  /test_emotion - Test with mock data"
echo ""

# Start the Flask app
python app.py