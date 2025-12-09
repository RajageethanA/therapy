# Emotion Detection & AI Therapy Backend

This Python Flask backend provides emotion detection using your H5 model and AI therapy recommendations using Google's Gemini AI.

## 🚀 Quick Start

### Windows
```bash
cd backend
start.bat
```

### Linux/Mac
```bash
cd backend
chmod +x start.sh
./start.sh
```

## 🎥 Live Emotion Detection Workbench

A real-time testing interface for emotion detection models using your webcam.

### Running the Workbench

#### Windows
```bash
cd backend
start_workbench.bat
```

#### Linux/Mac
```bash
cd backend
chmod +x start_workbench.sh
./start_workbench.sh
```

#### Manual
```bash
cd backend
python live_emotion_workbench.py
```

### Workbench Features
- **Real-time face detection** using OpenCV Haar cascades
- **Live emotion prediction** from webcam feed
- **Visual confidence indicators** (Green = High, Yellow = Medium, Orange = Low)
- **Screenshot capture** - Press 'S' to save
- **Model info panel** showing load status

### Workbench Controls
- `Q` - Quit the workbench
- `S` - Save screenshot (saved to `backend/screenshots/`)
- `R` - Reset/Clear

### Testing Model Loading
```bash
# Test without webcam
python live_emotion_workbench.py --test
```

## 📋 Manual Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.template .env

# Edit .env and add your Gemini API key
# GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Place Model File
Place your `Emo0.1.h5` file in one of these locations:
- `backend/Emo0.1.h5`
- `public/Emo0.1.h5`

### 4. Start Server
```bash
python app.py
```

## 📡 API Endpoints

### Health Check
```
GET http://localhost:5000/health
```

### Emotion Detection + Therapy
```
POST http://localhost:5000/predict_emotion
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "context": "Optional user context"
}
```

### Test Endpoint (Mock Data)
```
GET http://localhost:5000/test_emotion
```

## 🧠 How It Works

1. **Image Upload**: Frontend captures user's facial expression
2. **Preprocessing**: Backend converts image to format suitable for H5 model
3. **Emotion Detection**: H5 model predicts emotion with confidence score
4. **AI Therapy**: Gemini AI generates personalized therapy recommendations
5. **Response**: Combined emotion + therapy data sent back to frontend

## 🔧 Features

- ✅ **Professional H5 Model**: Uses your trained emotion detection model
- ✅ **AI Therapy**: Gemini-powered personalized recommendations
- ✅ **Robust Fallbacks**: Works even without Gemini API or model
- ✅ **CORS Enabled**: Ready for React frontend integration
- ✅ **Error Handling**: Comprehensive error responses
- ✅ **Health Monitoring**: Built-in health check endpoint

## 🐛 Troubleshooting

### Installation Issues (Network Timeouts)
If `pip install -r requirements.txt` fails with timeout errors:

```bash
# Option 1: Use minimal requirements (without OpenCV)
pip install -r requirements-minimal.txt

# Option 2: Run automated installer
install-deps.bat

# Option 3: Install packages individually
pip install flask flask-cors tensorflow numpy pillow python-dotenv
pip install google-generativeai  # Optional for Gemini AI

# Option 4: Use different timeout settings
pip install --timeout 1000 -r requirements.txt

# Option 5: Use different index URL
pip install -i https://pypi.org/simple/ -r requirements.txt
```

### Model Loading Issues
- Ensure `Emo0.1.h5` is in the correct location
- Check model file is valid Keras H5 format
- Verify TensorFlow installation: `python -c "import tensorflow; print(tensorflow.__version__)"`

### Gemini API Issues
- Get API key from: https://makersuite.google.com/app/apikey
- Verify key is correctly set in `.env` file
- Backend works without Gemini (uses fallback therapy)

### Port Issues
- Default port is 5000
- Change in `app.py` if needed: `app.run(port=YOUR_PORT)`
- Update frontend API URL accordingly

### Windows-Specific Issues
- Use `python` instead of `python3` 
- Ensure Python 3.8+ is installed
- Run Command Prompt as Administrator if needed

## 📊 Response Format

```json
{
  "emotion_detection": {
    "emotion": "happy",
    "confidence": 87,
    "all_predictions": {
      "angry": 0.02,
      "disgusted": 0.01,
      "fearful": 0.03,
      "happy": 0.87,
      "neutral": 0.05,
      "sad": 0.01,
      "surprised": 0.01
    }
  },
  "therapy": {
    "acknowledgment": "It's wonderful to see you feeling happy!...",
    "recommendations": [
      "Practice gratitude journaling...",
      "Share your positive energy...",
      "..."
    ],
    "encouragement": "Your happiness is a strength...",
    "immediate_techniques": ["Take three deep breaths...", "..."],
    "follow_up_suggestion": "Continue engaging in activities..."
  },
  "status": "success"
}
```

## 🔐 Security Notes

- Run backend on localhost for development
- Use HTTPS in production
- Keep Gemini API key secure
- Consider rate limiting for production use