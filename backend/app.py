"""
Sadness Detection and Therapy Recommendation API
Flask backend that uses H5 model for sadness detection and Gemini for therapy recommendations
Combines emotion detection (30%) with PHQ-9 scores (70%) for comprehensive sadness assessment
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import base64
import os
import google.generativeai as genai
from PIL import Image, ImageOps
import io
import logging
import json
import random
import jwt
import time

# Set TensorFlow environment variables before import
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Reduce TensorFlow logging

# Import TensorFlow with error handling
try:
    import tensorflow as tf
    TF_AVAILABLE = True
    print("✅ TensorFlow loaded successfully")
    print(f"📦 TensorFlow version: {tf.__version__}")
except ImportError as e:
    TF_AVAILABLE = False
    tf = None
    print(f"❌ TensorFlow import failed: {e}")
    print("🔄 Continuing with mock emotion detection...")
except Exception as e:
    TF_AVAILABLE = False
    tf = None
    print(f"❌ TensorFlow compatibility error: {e}")
    print("💡 Try: pip install tensorflow==2.15.0")
    print("🔄 Continuing with mock emotion detection...")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# VideoSDK Configuration
VIDEOSDK_API_KEY = os.getenv('VIDEOSDK_API_KEY', '')
VIDEOSDK_SECRET = os.getenv('VIDEOSDK_SECRET', '')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global variables for model and configuration
emotion_model = None
emotion_labels = ['angry', 'disgusted', 'fearful', 'happy', 'neutral', 'sad', 'surprised']

# Sadness contribution weights from each emotion (negative emotions contribute to sadness)
SADNESS_WEIGHTS = {
    'sad': 1.0,        # Direct sadness
    'fearful': 0.6,    # Fear often accompanies sadness
    'angry': 0.4,      # Anger can mask sadness
    'disgusted': 0.3,  # Disgust can relate to self-directed negativity
    'neutral': 0.1,    # Neutral has minimal contribution
    'surprised': 0.0,  # Surprise is neutral
    'happy': -0.5      # Happiness reduces sadness score
}

# Severity thresholds for combined sadness score (0-100)
SEVERITY_THRESHOLDS = {
    'minimal': (0, 30),      # 0-30%: Minimal sadness - just tips/remedies
    'moderate': (31, 60),    # 31-60%: Moderate sadness - more intensive remedies
    'severe': (61, 100)      # 61-100%: Severe sadness - recommend therapist
}

# PHQ-9 to percentage conversion (PHQ-9 max score is 27)
PHQ9_MAX_SCORE = 27

# Weighting for combined score
EMOTION_WEIGHT = 0.30  # 30% from emotion detection
PHQ9_WEIGHT = 0.70     # 70% from PHQ-9 assessment

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'your_gemini_api_key_here')
if GEMINI_API_KEY and GEMINI_API_KEY != 'your_gemini_api_key_here':
    genai.configure(api_key=GEMINI_API_KEY)

def load_emotion_model():
    """Load the H5 emotion detection model with enhanced error handling"""
    global emotion_model
    
    if not TF_AVAILABLE:
        logger.warning("🚫 TensorFlow not available. Using mock emotion detection.")
        return False
        
    try:
        # Try multiple possible model paths including public folder
        model_paths = [
            '../public/emotion_model.hdf5',
            './public/emotion_model.hdf5',
            '../public/face_model.h5',
            './models/Emo0.1.h5',
            './public/Emo0.1.h5', 
            './Emo0.1.h5',
            '../models/Emo0.1.h5'
        ]
        
        model_path = None
        for path in model_paths:
            if os.path.exists(path):
                model_path = path
                break
                
        if not model_path:
            logger.warning("📁 No emotion model file found in expected locations")
            logger.info("🔍 Searched paths: " + ", ".join(model_paths))
            return False
        
        # Load model with error handling
        emotion_model = tf.keras.models.load_model(model_path, compile=False)
        logger.info(f"✅ Emotion model loaded successfully from: {model_path}")
        logger.info(f"📊 Model input shape: {emotion_model.input_shape}")
        logger.info(f"📊 Model output shape: {emotion_model.output_shape}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to load emotion model: {str(e)}")
        emotion_model = None
        return False

def preprocess_image(image_data):
    """Preprocess image for emotion prediction using PIL only"""
    try:
        # Decode base64 image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to grayscale using PIL
        gray_image = ImageOps.grayscale(image)
        
        # Resize to model input size (48x48 is common for emotion models)
        target_size = 48
        resized = gray_image.resize((target_size, target_size), Image.Resampling.LANCZOS)
        
        # Convert to numpy array
        image_array = np.array(resized)
        
        # Normalize pixel values to 0-1
        normalized = image_array.astype('float32') / 255.0
        
        # Reshape for model input [batch_size, height, width, channels]
        reshaped = normalized.reshape(1, target_size, target_size, 1)
        
        return reshaped
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise

def predict_emotion(processed_image):
    """Predict emotion and calculate sadness score using the loaded model or mock data"""
    global emotion_model
    
    # Enhanced mock emotion data when TensorFlow is not available
    if not TF_AVAILABLE or emotion_model is None:
        # Generate mock emotion predictions
        all_predictions = {
            'angry': random.uniform(5, 20),
            'disgusted': random.uniform(2, 10),
            'fearful': random.uniform(5, 15),
            'happy': random.uniform(10, 30),
            'neutral': random.uniform(15, 35),
            'sad': random.uniform(10, 40),
            'surprised': random.uniform(2, 10)
        }
        
        # Normalize to 100%
        total = sum(all_predictions.values())
        for emotion in all_predictions:
            all_predictions[emotion] = round((all_predictions[emotion] / total) * 100, 1)
        
        # Calculate emotion-based sadness score
        emotion_sadness_score = calculate_emotion_sadness_score(all_predictions)
        
        logger.info(f"🎭 Mock emotion sadness score: {emotion_sadness_score}%")
        
        return {
            'all_predictions': all_predictions,
            'emotion_sadness_score': emotion_sadness_score,
            'analysis_successful': True,
            'mock_data': True
        }
    
    # Real TensorFlow prediction
    try:
        # Predict using the loaded model
        predictions = emotion_model.predict(processed_image, verbose=0)
        
        # Create detailed predictions for all emotions
        all_predictions = {
            emotion_labels[i]: round(float(predictions[0][i]) * 100, 1) 
            for i in range(len(emotion_labels))
        }
        
        # Calculate emotion-based sadness score
        emotion_sadness_score = calculate_emotion_sadness_score(all_predictions)
        
        logger.info(f"🎯 Real emotion sadness score: {emotion_sadness_score}%")
        
        return {
            'all_predictions': all_predictions,
            'emotion_sadness_score': emotion_sadness_score,
            'analysis_successful': True,
            'mock_data': False
        }
        
    except Exception as e:
        logger.error(f"❌ Error predicting emotion: {str(e)}")
        raise


def calculate_emotion_sadness_score(all_predictions):
    """
    Calculate sadness score from emotion predictions (0-100).
    Uses weighted contributions from all emotions.
    """
    sadness_score = 0.0
    
    for emotion, probability in all_predictions.items():
        weight = SADNESS_WEIGHTS.get(emotion.lower(), 0)
        sadness_score += (probability / 100) * weight * 100
    
    # Clamp to 0-100 range
    sadness_score = max(0, min(100, sadness_score))
    
    return round(sadness_score, 1)


def calculate_combined_sadness_score(emotion_sadness_score, phq9_score=None):
    """
    Calculate combined sadness score from emotion detection and PHQ-9.
    Weighting: 30% emotion + 70% PHQ-9
    If PHQ-9 is not provided, use only emotion score.
    """
    if phq9_score is None:
        # Only emotion score available
        return emotion_sadness_score
    
    # Convert PHQ-9 score (0-27) to percentage (0-100)
    phq9_percentage = (phq9_score / PHQ9_MAX_SCORE) * 100
    
    # Calculate weighted combined score
    combined_score = (emotion_sadness_score * EMOTION_WEIGHT) + (phq9_percentage * PHQ9_WEIGHT)
    
    return round(combined_score, 1)


def get_severity_level(sadness_score):
    """
    Determine severity level based on sadness score.
    Returns: 'minimal', 'moderate', or 'severe'
    """
    for level, (min_val, max_val) in SEVERITY_THRESHOLDS.items():
        if min_val <= sadness_score <= max_val:
            return level
    return 'minimal'


def should_recommend_therapist(severity_level):
    """Check if therapist should be recommended based on severity."""
    return severity_level == 'severe'

def get_therapy_recommendations(sadness_score, severity_level, phq9_score=None, user_context=None):
    """
    Generate therapy recommendations using Gemini AI based on sadness score and severity.
    Recommendations are tailored to the severity level:
    - Minimal: Light self-care tips
    - Moderate: More intensive coping strategies
    - Severe: Professional therapist recommendation + crisis resources
    """
    try:
        if GEMINI_API_KEY == 'your_gemini_api_key_here' or not GEMINI_API_KEY:
            raise Exception("Gemini API key not configured - cannot generate therapy recommendations")
        
        # Create the model - using gemini-1.5-flash (gemini-pro is deprecated)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Build context
        context_info = ""
        if user_context:
            context_info = f"\nAdditional context: {user_context}"
        
        phq9_info = ""
        if phq9_score is not None:
            phq9_info = f"\nPHQ-9 Score: {phq9_score}/27"
        
        # Different prompts based on severity
        if severity_level == 'severe':
            prompt = f"""
            You are a compassionate mental health professional. A user has been assessed with a significant level of sadness/depression.

            ASSESSMENT RESULTS:
            - Combined Sadness Score: {sadness_score}% (SEVERE)
            - Severity Level: {severity_level.upper()}
            {phq9_info}
            {context_info}
            
            The user's sadness level is concerning and they should be encouraged to seek professional help.
            
            Please provide:
            1. A compassionate acknowledgment of their struggle
            2. 3 immediate coping techniques for crisis moments
            3. Strong but gentle encouragement to see a therapist
            4. Information about when to seek emergency help
            5. Reassurance that seeking help is a sign of strength
            
            Format as JSON:
            {{
                "sadness_score": {sadness_score},
                "severity": "severe",
                "acknowledgment": "Compassionate message acknowledging their pain",
                "immediate_coping": [
                    "Crisis coping technique 1",
                    "Crisis coping technique 2",
                    "Crisis coping technique 3"
                ],
                "therapist_recommendation": "Strong encouragement to see a professional therapist",
                "why_see_therapist": "Explanation of why professional help is important at this level",
                "emergency_resources": "When to call crisis helpline or go to emergency",
                "encouragement": "Reassuring message that help is available and recovery is possible",
                "recommend_therapist": true
            }}
            """
        elif severity_level == 'moderate':
            prompt = f"""
            You are a compassionate wellness coach. A user is experiencing moderate levels of sadness.

            ASSESSMENT RESULTS:
            - Combined Sadness Score: {sadness_score}% (MODERATE)
            - Severity Level: {severity_level.upper()}
            {phq9_info}
            {context_info}
            
            Please provide helpful coping strategies and self-care recommendations.
            
            Provide:
            1. Empathetic acknowledgment
            2. 5 specific therapeutic activities/coping strategies
            3. Daily wellness routine suggestions
            4. When to consider seeing a therapist
            5. Encouraging words
            
            Format as JSON:
            {{
                "sadness_score": {sadness_score},
                "severity": "moderate",
                "acknowledgment": "Empathetic message about their feelings",
                "coping_strategies": [
                    "Specific coping strategy 1",
                    "Specific coping strategy 2",
                    "Specific coping strategy 3",
                    "Specific coping strategy 4",
                    "Specific coping strategy 5"
                ],
                "daily_routine": [
                    "Morning wellness activity",
                    "Afternoon check-in activity",
                    "Evening wind-down activity"
                ],
                "consider_therapist": "Gentle suggestion about when therapy might help",
                "encouragement": "Supportive and hopeful message",
                "recommend_therapist": false
            }}
            """
        else:  # minimal
            prompt = f"""
            You are a friendly wellness coach. A user has mild or minimal sadness levels.

            ASSESSMENT RESULTS:
            - Combined Sadness Score: {sadness_score}% (MINIMAL)
            - Severity Level: {severity_level.upper()}
            {phq9_info}
            {context_info}
            
            Please provide light self-care tips to maintain emotional wellness.
            
            Provide:
            1. Positive acknowledgment
            2. 3 simple self-care tips
            3. Mood-boosting activities
            4. Encouragement to maintain wellness
            
            Format as JSON:
            {{
                "sadness_score": {sadness_score},
                "severity": "minimal",
                "acknowledgment": "Positive acknowledgment of their emotional state",
                "self_care_tips": [
                    "Simple self-care tip 1",
                    "Simple self-care tip 2",
                    "Simple self-care tip 3"
                ],
                "mood_boosters": [
                    "Fun activity 1",
                    "Fun activity 2",
                    "Fun activity 3"
                ],
                "encouragement": "Uplifting message about maintaining wellness",
                "recommend_therapist": false
            }}
            """
        
        response = model.generate_content(prompt)
        
        # Parse the response
        response_text = response.text.strip()
        
        # Clean the JSON response
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1]
        
        therapy_response = json.loads(response_text)
        
        logger.info(f"Generated therapy recommendations for sadness score: {sadness_score}% (severity: {severity_level})")
        
        return therapy_response
        
    except Exception as e:
        logger.error(f"Error generating therapy recommendations: {str(e)}")
        raise Exception(f"Failed to generate therapy recommendations from Gemini: {str(e)}")

@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint with detailed status"""
    try:
        import datetime
        tensorflow_status = "available" if TF_AVAILABLE else "unavailable"
        model_status = "loaded" if emotion_model is not None else "not_loaded"
        gemini_status = "configured" if (GEMINI_API_KEY and GEMINI_API_KEY != 'your_gemini_api_key_here') else "not_configured"
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.datetime.now().isoformat(),
            'services': {
                'tensorflow': tensorflow_status,
                'emotion_model': model_status,
                'gemini_ai': gemini_status
            },
            'capabilities': {
                'sadness_detection': TF_AVAILABLE and emotion_model is not None,
                'mock_sadness': True,
                'therapy_recommendations': gemini_status == 'configured',
                'phq9_integration': True
            },
            'scoring': {
                'emotion_weight': f"{EMOTION_WEIGHT * 100}%",
                'phq9_weight': f"{PHQ9_WEIGHT * 100}%",
                'thresholds': SEVERITY_THRESHOLDS
            },
            'version': '2.0.0'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/analyze_sadness', methods=['POST'])
def analyze_sadness_endpoint():
    """
    Main endpoint for sadness analysis and therapy recommendations.
    Combines emotion detection (30%) with PHQ-9 score (70%) for comprehensive assessment.
    
    Request body:
    {
        "image": "base64_encoded_image",
        "phq9_score": 0-27 (optional),
        "context": "optional user context"
    }
    """
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        phq9_score = data.get('phq9_score', None)
        user_context = data.get('context', '')
        
        # Validate PHQ-9 score if provided
        if phq9_score is not None:
            if not isinstance(phq9_score, (int, float)) or phq9_score < 0 or phq9_score > 27:
                return jsonify({'error': 'PHQ-9 score must be between 0 and 27'}), 400
            phq9_score = int(phq9_score)
        
        # Preprocess image
        processed_image = preprocess_image(image_data)
        
        # Predict emotion and get emotion-based sadness score
        emotion_result = predict_emotion(processed_image)
        emotion_sadness_score = emotion_result['emotion_sadness_score']
        
        # Calculate combined sadness score
        combined_score = calculate_combined_sadness_score(emotion_sadness_score, phq9_score)
        
        # Determine severity level
        severity_level = get_severity_level(combined_score)
        
        # Check if therapist should be recommended
        recommend_therapist = should_recommend_therapist(severity_level)
        
        logger.info(f"📊 Sadness Analysis: emotion={emotion_sadness_score}%, phq9={phq9_score}, combined={combined_score}%, severity={severity_level}")
        
        # Generate therapy recommendations based on severity
        therapy_recommendations = None
        try:
            therapy_recommendations = get_therapy_recommendations(
                combined_score, 
                severity_level,
                phq9_score,
                user_context
            )
        except Exception as therapy_error:
            logger.warning(f"Failed to generate therapy recommendations: {therapy_error}")
        
        # Build response
        response = {
            'status': 'success',
            'sadness_analysis': {
                'emotion_sadness_score': emotion_sadness_score,
                'phq9_score': phq9_score,
                'phq9_percentage': round((phq9_score / PHQ9_MAX_SCORE) * 100, 1) if phq9_score is not None else None,
                'combined_score': combined_score,
                'severity_level': severity_level,
                'recommend_therapist': recommend_therapist,
                'scoring_weights': {
                    'emotion': f"{EMOTION_WEIGHT * 100}%",
                    'phq9': f"{PHQ9_WEIGHT * 100}%"
                }
            },
            'emotion_breakdown': emotion_result['all_predictions'],
            'mock_data': emotion_result.get('mock_data', False)
        }
        
        if therapy_recommendations:
            response['therapy'] = therapy_recommendations
            response['has_recommendations'] = True
        else:
            response['has_recommendations'] = False
            response['message'] = 'Sadness analyzed but recommendations could not be generated'
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in analyze_sadness endpoint: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'has_recommendations': False
        }), 500


@app.route('/predict_emotion', methods=['POST'])
def predict_emotion_endpoint():
    """
    Legacy endpoint - redirects to sadness analysis.
    Maintained for backwards compatibility.
    """
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        phq9_score = data.get('phq9_score', None)
        user_context = data.get('context', '')
        
        # Preprocess image
        processed_image = preprocess_image(image_data)
        
        # Predict emotion and get sadness score
        emotion_result = predict_emotion(processed_image)
        emotion_sadness_score = emotion_result['emotion_sadness_score']
        
        # Calculate combined score
        combined_score = calculate_combined_sadness_score(emotion_sadness_score, phq9_score)
        severity_level = get_severity_level(combined_score)
        recommend_therapist = should_recommend_therapist(severity_level)
        
        # Generate therapy recommendations
        therapy_recommendations = None
        try:
            therapy_recommendations = get_therapy_recommendations(
                combined_score, 
                severity_level,
                phq9_score,
                user_context
            )
        except Exception as therapy_error:
            logger.warning(f"Failed to generate therapy recommendations: {therapy_error}")
        
        # Build response (compatible with old format but with new data)
        response = {
            'emotion_detection': {
                'sadness_score': combined_score,
                'emotion_sadness_score': emotion_sadness_score,
                'severity_level': severity_level,
                'all_predictions': emotion_result['all_predictions'],
                'analysis_successful': True,
                'recommend_therapist': recommend_therapist
            },
            'status': 'success'
        }
        
        if therapy_recommendations:
            response['therapy'] = therapy_recommendations
            response['has_recommendations'] = True
        else:
            response['has_recommendations'] = False
            response['message'] = 'Sadness detected but no recommendations generated'
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in predict_emotion endpoint: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error',
            'has_recommendations': False
        }), 500

@app.route('/test_sadness', methods=['GET'])
def test_sadness():
    """Test endpoint with mock sadness analysis for development"""
    try:
        # Generate mock data
        mock_phq9 = random.randint(0, 27)
        mock_emotion_sadness = random.uniform(10, 80)
        combined_score = calculate_combined_sadness_score(mock_emotion_sadness, mock_phq9)
        severity_level = get_severity_level(combined_score)
        recommend_therapist = should_recommend_therapist(severity_level)
        
        # Mock emotion predictions
        mock_predictions = {
            'angry': round(random.uniform(5, 15), 1),
            'disgusted': round(random.uniform(2, 8), 1),
            'fearful': round(random.uniform(5, 20), 1),
            'happy': round(random.uniform(10, 30), 1),
            'neutral': round(random.uniform(10, 30), 1),
            'sad': round(random.uniform(15, 45), 1),
            'surprised': round(random.uniform(2, 10), 1)
        }
        
        # Only test therapy if Gemini is available
        therapy_recommendations = None
        if GEMINI_API_KEY and GEMINI_API_KEY != 'your_gemini_api_key_here':
            try:
                therapy_recommendations = get_therapy_recommendations(combined_score, severity_level, mock_phq9)
            except:
                pass
        
        response = {
            'status': 'success (test data)',
            'sadness_analysis': {
                'emotion_sadness_score': round(mock_emotion_sadness, 1),
                'phq9_score': mock_phq9,
                'phq9_percentage': round((mock_phq9 / PHQ9_MAX_SCORE) * 100, 1),
                'combined_score': combined_score,
                'severity_level': severity_level,
                'recommend_therapist': recommend_therapist,
                'scoring_weights': {
                    'emotion': f"{EMOTION_WEIGHT * 100}%",
                    'phq9': f"{PHQ9_WEIGHT * 100}%"
                }
            },
            'emotion_breakdown': mock_predictions,
            'mock_data': True
        }
        
        if therapy_recommendations:
            response['therapy'] = therapy_recommendations
            response['has_recommendations'] = True
        else:
            response['has_recommendations'] = False
            response['message'] = 'Test data - Gemini API not configured'
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500


@app.route('/test_emotion', methods=['GET'])
def test_emotion():
    """Legacy test endpoint - redirects to test_sadness"""
    return test_sadness()


@app.route('/videosdk/token', methods=['GET'])
def get_videosdk_token():
    """
    Generate a VideoSDK JWT token for video calls.
    This endpoint generates tokens with both allow_join and allow_mod permissions.
    """
    try:
        if not VIDEOSDK_API_KEY or not VIDEOSDK_SECRET:
            return jsonify({
                'error': 'VideoSDK credentials not configured',
                'message': 'Set VIDEOSDK_API_KEY and VIDEOSDK_SECRET environment variables'
            }), 500
        
        # Create JWT payload
        payload = {
            'apikey': VIDEOSDK_API_KEY,
            'permissions': ['allow_join', 'allow_mod'],
            'version': 2,
            'iat': int(time.time()),
            'exp': int(time.time()) + 86400  # 24 hours expiration
        }
        
        # Generate token
        token = jwt.encode(payload, VIDEOSDK_SECRET, algorithm='HS256')
        
        logger.info("✅ Generated VideoSDK token successfully")
        
        return jsonify({
            'token': token
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating VideoSDK token: {str(e)}")
        return jsonify({
            'error': str(e),
            'message': 'Failed to generate VideoSDK token'
        }), 500


@app.route('/videosdk/create-meeting', methods=['POST'])
def create_videosdk_meeting():
    """
    Create a new VideoSDK meeting room.
    Returns the room ID that can be shared with participants.
    """
    try:
        import requests
        
        if not VIDEOSDK_API_KEY or not VIDEOSDK_SECRET:
            return jsonify({
                'error': 'VideoSDK credentials not configured'
            }), 500
        
        # Generate token first
        payload = {
            'apikey': VIDEOSDK_API_KEY,
            'permissions': ['allow_join', 'allow_mod'],
            'version': 2,
            'iat': int(time.time()),
            'exp': int(time.time()) + 86400
        }
        token = jwt.encode(payload, VIDEOSDK_SECRET, algorithm='HS256')
        
        # Create meeting using VideoSDK API
        response = requests.post(
            'https://api.videosdk.live/v2/rooms',
            headers={
                'authorization': token,
                'Content-Type': 'application/json'
            },
            json={}
        )
        
        if response.status_code != 200:
            logger.error(f"VideoSDK API error: {response.status_code} - {response.text}")
            return jsonify({
                'error': f'VideoSDK API error: {response.status_code}',
                'details': response.text
            }), response.status_code
        
        data = response.json()
        logger.info(f"✅ Created VideoSDK meeting: {data.get('roomId')}")
        
        return jsonify({
            'roomId': data.get('roomId'),
            'token': token
        })
        
    except Exception as e:
        logger.error(f"❌ Error creating VideoSDK meeting: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("🧠 SADNESS DETECTION & THERAPY API v2.0")
    print("=" * 60)
    
    # Load the emotion model
    model_loaded = load_emotion_model()
    
    if model_loaded:
        print("✅ Emotion detection model: LOADED")
    elif TF_AVAILABLE:
        print("⚠️  Emotion detection model: NOT FOUND (using mock data)")
    else:
        print("⚠️  TensorFlow: NOT AVAILABLE (using mock detection)")
    
    # Check Gemini configuration
    if GEMINI_API_KEY and GEMINI_API_KEY != 'your_gemini_api_key_here':
        print("✅ Gemini AI: CONFIGURED")
        print("🧠 Therapy recommendations: ENABLED")
    else:
        print("❌ Gemini AI: NOT CONFIGURED")
        print("💡 Set GEMINI_API_KEY environment variable for therapy features")
    
    print("=" * 60)
    print("📊 Scoring Configuration:")
    print(f"   • Emotion Weight: {EMOTION_WEIGHT * 100}%")
    print(f"   • PHQ-9 Weight: {PHQ9_WEIGHT * 100}%")
    print("📈 Severity Thresholds:")
    for level, (min_val, max_val) in SEVERITY_THRESHOLDS.items():
        print(f"   • {level.capitalize()}: {min_val}-{max_val}%")
    print("=" * 60)
    print("🌐 Server starting on: http://localhost:5000")
    print("📡 Available endpoints:")
    print("   📊 GET  /health         - System health check")
    print("   😢 POST /analyze_sadness - Sadness analysis + therapy")
    print("   🎭 POST /predict_emotion - Legacy endpoint (same as above)")
    print("   🧪 GET  /test_sadness   - Test with mock data")
    print("=" * 60)
    
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        logger.error(f"Server startup failed: {e}")