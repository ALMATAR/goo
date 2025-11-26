#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate audio files for queue management system
This script uses Google Text-to-Speech to generate Arabic audio files
"""

import os
import sys
from gtts import gTTS
from pydub import AudioSegment
from pydub.playback import play
import arabic_reshaper
from bidi.algorithm import get_display

def generate_audio(text, filename, lang='ar'):
    """Generate audio file from text"""
    try:
        # Reshape Arabic text for proper display
        reshaped_text = arabic_reshaper.reshape(text)
        bidi_text = get_display(reshaped_text)
        
        # Create TTS object
        tts = gTTS(text=text, lang=lang, slow=False)
        
        # Save to temporary file
        temp_file = f"temp_{filename}"
        tts.save(temp_file)
        
        # Load and export as MP3
        audio = AudioSegment.from_file(temp_file)
        audio.export(filename, format="mp3")
        
        # Remove temporary file
        os.remove(temp_file)
        
        print(f"✓ Generated: {filename}")
        return True
    except Exception as e:
        print(f"✗ Error generating {filename}: {str(e)}")
        return False

def generate_number_audios():
    """Generate audio files for numbers 1-200"""
    print("Generating number audio files...")
    
    # Arabic numbers
    arabic_numbers = {
        1: "واحد", 2: "اثنين", 3: "ثلاثة", 4: "أربعة", 5: "خمسة",
        6: "ستة", 7: "سبعة", 8: "ثمانية", 9: "تسعة", 10: "عشرة",
        11: "أحد عشر", 12: "اثنا عشر", 13: "ثلاثة عشر", 14: "أربعة عشر", 15: "خمسة عشر",
        16: "ستة عشر", 17: "سبعة عشر", 18: "ثمانية عشر", 19: "تسعة عشر", 20: "عشرون",
        30: "ثلاثون", 40: "أربعون", 50: "خمسون", 60: "ستون", 70: "سبعون",
        80: "ثمانون", 90: "تسعون", 100: "مائة", 200: "مائتان"
    }
    
    def number_to_arabic(n):
        """Convert number to Arabic text"""
        if n in arabic_numbers:
            return arabic_numbers[n]
        elif n < 100:
            tens = (n // 10) * 10
            ones = n % 10
            if ones == 0:
                return arabic_numbers[tens]
            else:
                return arabic_numbers[ones] + " و" + arabic_numbers[tens]
        elif n < 200:
            remainder = n - 100
            if remainder == 0:
                return arabic_numbers[100]
            else:
                return arabic_numbers[100] + " و" + number_to_arabic(remainder)
    
    for i in range(1, 201):
        text = f"على العميل رقم {number_to_arabic(i)}"
        filename = f"audio/{i}.mp3"
        generate_audio(text, filename)

def generate_clinic_audios():
    """Generate audio files for clinics"""
    print("Generating clinic audio files...")
    
    clinic_names = {
        1: "عيادة طب الأسرة",
        2: "عيادة الباطنة",
        3: "عيادة الجراحة",
        4: "عيادة الأطفال",
        5: "عيادة النساء والتوليد",
        6: "عيادة العظام",
        7: "عيادة العيون",
        8: "عيادة الأنف والأذن",
        9: "عيادة الأسنان",
        10: "عيادة الجلدية"
    }
    
    for clinic_num, clinic_name in clinic_names.items():
        text = f"التوجه إلى {clinic_name}"
        filename = f"audio/clinic{clinic_num}.mp3"
        generate_audio(text, filename)

def generate_instant_audios():
    """Generate instant audio files"""
    print("Generating instant audio files...")
    
    instant_messages = [
        ("اهلاً وهلا بكم فى المركز رجاء الانتظار بالاستراحه", "instant1.mp3"),
        ("شكراً لصبركم سيتم استدعاؤكم قريباً", "instant2.mp3"),
        ("يرجى الانتظار حتى يتم استدعاء رقمكم", "instant3.mp3"),
        ("نرحب بكم في مركزنا الطبي", "instant4.mp3"),
        ("الرجاء الحفاظ على الهدوء في قاعة الانتظار", "instant5.mp3")
    ]
    
    for text, filename in instant_messages:
        generate_audio(text, f"audio/{filename}")

def generate_ding_sound():
    """Generate ding sound"""
    print("Generating ding sound...")
    
    # Create a simple ding sound using pydub
    try:
        # Generate a simple tone
        duration = 500  # milliseconds
        frequency = 800  # Hz
        
        # Create sine wave
        sample_rate = 44100
        samples = int(sample_rate * duration / 1000)
        
        import numpy as np
        t = np.linspace(0, duration / 1000, samples)
        wave = np.sin(2 * np.pi * frequency * t) * 0.5
        
        # Apply envelope
        envelope = np.exp(-t * 10)  # Exponential decay
        wave *= envelope
        
        # Convert to audio segment
        audio = AudioSegment(
            (wave * 32767).astype(np.int16).tobytes(),
            frame_rate=sample_rate,
            sample_width=2,
            channels=1
        )
        
        # Export as MP3
        audio.export("audio/ding.mp3", format="mp3")
        print("✓ Generated: audio/ding.mp3")
        
    except Exception as e:
        print(f"✗ Error generating ding sound: {str(e)}")
        # Create a fallback silent audio
        try:
            silent = AudioSegment.silent(duration=500)
            silent.export("audio/ding.mp3", format="mp3")
            print("✓ Generated fallback ding sound")
        except:
            pass

def main():
    """Main function"""
    print("Queue Management System - Audio Generator")
    print("=" * 50)
    
    # Create audio directory if it doesn't exist
    os.makedirs("audio", exist_ok=True)
    
    # Generate all audio files
    generate_number_audios()
    generate_clinic_audios()
    generate_instant_audios()
    generate_ding_sound()
    
    print("\n" + "=" * 50)
    print("Audio generation completed!")
    print("Check the 'audio' directory for generated files.")

if __name__ == "__main__":
    # Check if required packages are installed
    try:
        from gtts import gTTS
        from pydub import AudioSegment
        import arabic_reshaper
        from bidi.algorithm import get_display
        print("All required packages are installed.")
    except ImportError as e:
        print(f"Missing package: {e}")
        print("Please install required packages:")
        print("pip install gtts pydub arabic-reshaper python-bidi numpy")
        sys.exit(1)
    
    main()