@echo off
echo 🤖 Installing Backend Dependencies
echo ==================================

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo ⚡ Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip first
echo 🔄 Upgrading pip...
python -m pip install --upgrade pip

echo.
echo 📥 Installing dependencies...
echo Trying minimal requirements first (without OpenCV)...
echo.

REM Try minimal requirements first
pip install -r requirements-minimal.txt

if %ERRORLEVEL% EQU 0 (
    echo ✅ Minimal dependencies installed successfully!
    echo.
    echo 📝 Note: Using PIL for image processing instead of OpenCV
    echo 📝 This should be sufficient for most emotion detection tasks
) else (
    echo ❌ Installation failed with minimal requirements
    echo 🔄 Trying individual package installation...
    
    REM Try installing packages individually
    echo Installing Flask...
    pip install flask==3.0.0
    pip install flask-cors==4.0.0
    
    echo Installing TensorFlow...
    pip install tensorflow==2.15.0
    
    echo Installing basic packages...
    pip install numpy==1.24.3
    pip install pillow==10.1.0
    pip install python-dotenv==1.0.0
    
    echo Installing Gemini AI (optional)...
    pip install google-generativeai==0.3.2
)

echo.
echo 🔍 Checking installation...
python -c "import flask; print('✅ Flask installed')"
python -c "import tensorflow; print('✅ TensorFlow installed')"
python -c "import numpy; print('✅ NumPy installed')"
python -c "import PIL; print('✅ Pillow installed')"

echo.
echo 🎉 Installation complete! You can now run:
echo    python app.py
echo.

pause