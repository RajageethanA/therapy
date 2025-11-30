#!/usr/bin/env python3
"""
Script to convert Keras H5 model to TensorFlow.js format
Run this script to convert your Emo0.1.h5 model to work with TensorFlow.js in the browser
"""

import tensorflowjs as tfjs
from tensorflow import keras
import os

def convert_h5_to_tfjs():
    """Convert the H5 model to TensorFlow.js format"""
    
    # Input and output paths
    h5_model_path = './public/Emo0.1.h5'
    output_path = './public/tfjs_model'
    
    try:
        print("Loading H5 model...")
        model = keras.models.load_model(h5_model_path)
        
        print("Model loaded successfully!")
        print(f"Model input shape: {model.input_shape}")
        print(f"Model output shape: {model.output_shape}")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_path, exist_ok=True)
        
        print("Converting to TensorFlow.js format...")
        
        # Convert to TensorFlow.js
        tfjs.converters.save_keras_model(model, output_path)
        
        print(f"✅ Model converted successfully!")
        print(f"📂 TensorFlow.js model saved to: {output_path}")
        print("\nFiles created:")
        print("- model.json (model architecture)")
        print("- *.bin files (model weights)")
        
        print("\n🔧 Next steps:")
        print("1. Update your React code to load from '/tfjs_model/model.json'")
        print("2. Make sure the public/tfjs_model folder is accessible from your web server")
        
        return True
        
    except Exception as e:
        print(f"❌ Error converting model: {str(e)}")
        print("\nPossible solutions:")
        print("1. Make sure Emo0.1.h5 exists in the public folder")
        print("2. Install required dependencies: pip install tensorflowjs tensorflow")
        print("3. Check if the H5 file is a valid Keras model")
        return False

if __name__ == "__main__":
    print("🤖 H5 to TensorFlow.js Model Converter")
    print("=" * 50)
    
    # Check if required packages are installed
    try:
        import tensorflowjs
        import tensorflow
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("\nInstall required packages:")
        print("pip install tensorflowjs tensorflow")
        exit(1)
    
    success = convert_h5_to_tfjs()
    
    if success:
        print("\n🎉 Conversion completed successfully!")
    else:
        print("\n💥 Conversion failed. Please check the errors above.")