import requests
import json
import base64
import os
import pygame
import tempfile
import threading
from queue import Queue
import time

class SinhalaTTS:
    def __init__(self, config):
        self.config = config
        self.speech_queue = Queue()
        self.is_speaking = False
        self.is_running = True
        
        # Initialize pygame mixer
        pygame.mixer.init()
        
        # Start speech processing thread
        self.speech_thread = threading.Thread(target=self._process_speech_queue)
        self.speech_thread.daemon = True
        self.speech_thread.start()
        
    def speak_sinhala(self, text):
        """Convert Sinhala text to speech"""
        self.speech_queue.put(text)
        
    def _process_speech_queue(self):
        """Process speech queue"""
        while self.is_running:
            try:
                text = self.speech_queue.get(timeout=0.1)
                self._generate_sinhala_speech(text)
            except queue.Empty:
                continue
                
    def _generate_sinhala_speech(self, text):
        """Generate Sinhala speech using Google TTS"""
        try:
            self.is_speaking = True
            
            # Use gTTS for Sinhala
            from gtts import gTTS
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
                tts = gTTS(text=text, lang='si', slow=False)
                tts.save(tmp_file.name)
                
                # Play audio
                pygame.mixer.music.load(tmp_file.name)
                pygame.mixer.music.play()
                
                while pygame.mixer.music.get_busy():
                    time.sleep(0.1)
                    
                os.unlink(tmp_file.name)
                
            self.is_speaking = False
            
        except Exception as e:
            print(f"Error in Sinhala speech generation: {e}")
            self.is_speaking = False
            
    def stop_speech(self):
        """Stop current speech"""
        pygame.mixer.music.stop()
        self.is_speaking = False
        
    def shutdown(self):
        """Clean shutdown"""
        self.is_running = False
        self.stop_speech()
        pygame.mixer.quit()