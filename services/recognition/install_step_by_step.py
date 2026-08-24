import subprocess
import sys
import os

def install_packages():
    """Install packages in groups to avoid conflicts"""
    
    # Group 1: Core packages (install first)
    core = [
        'numpy==1.24.3',
        'Pillow==9.5.0',
        'scipy==1.11.1',
    ]
    
    # Group 2: ML packages
    ml = [
        'scikit-learn==1.3.0',
        'tensorflow==2.13.0',
        'keras==2.13.1',
        'opencv-python==4.8.0.74',
    ]
    
    # Group 3: Visualization
    viz = [
        'matplotlib==3.7.1',
        'seaborn==0.12.2',
        'pandas==2.0.3',
    ]
    
    # Group 4: Audio
    audio = [
        'gTTS==2.3.1',
        'pygame==2.5.1',
        'playsound==1.3.0',
        'sounddevice==0.4.6',
    ]
    
    # Group 5: Video
    video = [
        'moviepy==1.0.3',
        'imageio==2.31.1',
        'imageio-ffmpeg==0.4.7',
        'mediapipe==0.10.7',
        'scikit-image==0.21.0',
    ]
    
    # Group 6: Utilities
    utils = [
        'tqdm==4.65.0',
        'pyyaml==6.0.1',
        'joblib==1.3.1',
        'requests==2.31.0',
        'python-dotenv==1.0.0',
        'h5py==3.10.0',
        'protobuf==3.20.3',
        'plotly==5.17.0',
        'wget==3.2',
        'opencv-contrib-python==4.8.0.74',
    ]
    
    all_groups = [
        ("Core", core),
        ("ML", ml),
        ("Visualization", viz),
        ("Audio", audio),
        ("Video", video),
        ("Utilities", utils)
    ]
    
    for group_name, packages in all_groups:
        print(f"\n{'='*60}")
        print(f"Installing {group_name} packages...")
        print('='*60)
        
        for package in packages:
            try:
                print(f"Installing {package}...")
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", 
                    "--no-cache-dir", package
                ])
            except subprocess.CalledProcessError as e:
                print(f"⚠️ Error installing {package}: {e}")
            except Exception as e:
                print(f"⚠️ Unexpected error with {package}: {e}")

if __name__ == "__main__":
    install_packages()