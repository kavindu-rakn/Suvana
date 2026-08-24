import os
import pygame
from gtts import gTTS
import tempfile
import threading
from queue import Queue, Empty
import time
import subprocess
import platform

class TextToSpeech:
    def __init__(self, config):
        self.config = config
        self.language = config['speech']['language']
        self.speed = config['speech']['speed']
        self.speech_queue = Queue()
        self.is_speaking = False
        self.is_running = True
        
        # Initialize pygame mixer
        try:
            pygame.mixer.init()
            self.use_pygame = True
        except Exception as e:
            print(f"Pygame initialization failed: {e}. Using fallback audio.")
            self.use_pygame = False
        
        # Start speech processing thread
        self.speech_thread = threading.Thread(target=self._process_speech_queue)
        self.speech_thread.daemon = True
        self.speech_thread.start()
        
    def speak(self, text):
        """Add text to speech queue"""
        if text and text.strip():
            self.speech_queue.put(text)
        
    def _process_speech_queue(self):
        """Process speech queue in background"""
        while self.is_running:
            try:
                text = self.speech_queue.get(timeout=0.1)
                if text and text.strip():
                    self._generate_and_play_speech(text)
            except Empty:
                continue
            except Exception as e:
                print(f"Speech processing error: {e}")
                
    def _generate_and_play_speech(self, text):
        """Generate and play speech for text"""
        try:
            self.is_speaking = True
            
            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
                temp_filename = tmp_file.name
                
                # Generate speech
                tts = gTTS(text=text, lang=self.language, slow=(self.speed < 1.0))
                tts.save(temp_filename)
                
                # Play audio using pygame if available
                if self.use_pygame:
                    self._play_with_pygame(temp_filename)
                else:
                    # Fallback: use system default player
                    self._play_with_system_player(temp_filename)
                    
                # Clean up
                try:
                    os.unlink(temp_filename)
                except:
                    pass
                
            self.is_speaking = False
            
        except Exception as e:
            print(f"Error in speech generation: {e}")
            self.is_speaking = False
    
    def _play_with_pygame(self, audio_file):
        """Play audio using pygame"""
        try:
            pygame.mixer.music.load(audio_file)
            pygame.mixer.music.play()
            
            # Wait for playback to finish
            while pygame.mixer.music.get_busy():
                time.sleep(0.1)
                
        except Exception as e:
            print(f"Pygame playback error: {e}")
            # Fallback to system player
            self._play_with_system_player(audio_file)
    
    def _play_with_system_player(self, audio_file):
        """Play audio using system default player"""
        try:
            system = platform.system()
            if system == 'Windows':
                os.startfile(audio_file)
            elif system == 'Darwin':  # macOS
                subprocess.run(['afplay', audio_file])
            else:  # Linux
                subprocess.run(['xdg-open', audio_file])
            
            # Wait for playback (rough estimate)
            time.sleep(3)  # Adjust based on audio length
            
        except Exception as e:
            print(f"System playback error: {e}")
    
    def stop_speech(self):
        """Stop current speech"""
        if self.use_pygame:
            pygame.mixer.music.stop()
        self.is_speaking = False
        
    def is_busy(self):
        """Check if speech system is busy"""
        return self.is_speaking or not self.speech_queue.empty()
    
    def shutdown(self):
        """Clean shutdown of speech system"""
        self.is_running = False
        self.stop_speech()
        if self.use_pygame:
            pygame.mixer.quit()