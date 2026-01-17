#!/usr/bin/env python3
"""
YouTube Video Downloader and Transcriber

Downloads YouTube videos, extracts audio, and transcribes using OpenAI Whisper API.
Handles large files by chunking audio into segments.
"""

import os
import sys
import subprocess
from pathlib import Path
import math

import yt_dlp
from openai import OpenAI

# Configuration
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "downloads"
TRANSCRIPT_DIR = SCRIPT_DIR / "transcripts"

# YouTube videos to process
VIDEOS = [
    {
        "url": "https://www.youtube.com/watch?v=13HP_bSeNjU",
        "name": "agent_harnesses_vibe_coding"
    },
    {
        "url": "https://www.youtube.com/watch?v=usQ2HBTTWxs&t=522s",
        "name": "claude_autonomous_coding_1"
    },
    {
        "url": "https://www.youtube.com/watch?v=YW09hhnVqNM",
        "name": "claude_autonomous_coding_2"
    }
]

def setup_directories():
    """Create output directories if they don't exist."""
    OUTPUT_DIR.mkdir(exist_ok=True)
    TRANSCRIPT_DIR.mkdir(exist_ok=True)

def download_audio(video_url: str, output_name: str) -> Path:
    """Download YouTube video and extract audio."""
    output_path = OUTPUT_DIR / f"{output_name}.mp3"
    
    if output_path.exists():
        print(f"Audio already exists: {output_path}")
        return output_path
    
    print(f"Downloading: {video_url}")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': str(OUTPUT_DIR / output_name),
        'quiet': False,
        'no_warnings': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])
    
    return output_path

def get_video_info(video_url: str) -> dict:
    """Get video metadata."""
    ydl_opts = {'quiet': True, 'no_warnings': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)
        return {
            'title': info.get('title', 'Unknown'),
            'duration': info.get('duration', 0),
            'description': info.get('description', ''),
            'channel': info.get('channel', 'Unknown'),
            'upload_date': info.get('upload_date', 'Unknown')
        }

def split_audio(audio_path: Path, max_size_mb: float = 24) -> list[Path]:
    """Split audio file into chunks under the size limit using ffmpeg."""
    file_size_mb = audio_path.stat().st_size / (1024 * 1024)
    
    if file_size_mb <= max_size_mb:
        return [audio_path]
    
    # Calculate number of chunks needed
    num_chunks = math.ceil(file_size_mb / max_size_mb)
    
    # Get audio duration using ffprobe
    result = subprocess.run([
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(audio_path)
    ], capture_output=True, text=True)
    
    duration = float(result.stdout.strip())
    chunk_duration = duration / num_chunks
    
    print(f"Splitting {file_size_mb:.1f}MB audio into {num_chunks} chunks (~{chunk_duration:.0f}s each)")
    
    chunks = []
    for i in range(num_chunks):
        start_time = i * chunk_duration
        chunk_path = audio_path.parent / f"{audio_path.stem}_chunk{i}{audio_path.suffix}"
        
        subprocess.run([
            'ffmpeg', '-y', '-i', str(audio_path),
            '-ss', str(start_time), '-t', str(chunk_duration),
            '-acodec', 'copy', str(chunk_path)
        ], capture_output=True)
        
        chunks.append(chunk_path)
        print(f"  Created chunk {i+1}/{num_chunks}: {chunk_path.name}")
    
    return chunks

def transcribe_audio(audio_path: Path, api_key: str) -> str:
    """Transcribe audio using OpenAI Whisper API."""
    print(f"Transcribing: {audio_path}")
    
    client = OpenAI(api_key=api_key)
    
    file_size = audio_path.stat().st_size / (1024 * 1024)
    print(f"Audio file size: {file_size:.1f} MB")
    
    # Split if too large (Whisper limit is 25MB)
    chunks = split_audio(audio_path, max_size_mb=24)
    
    transcripts = []
    for i, chunk in enumerate(chunks):
        print(f"  Transcribing chunk {i+1}/{len(chunks)}...")
        with open(chunk, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        transcripts.append(transcript)
        
        # Clean up chunk file if it was created
        if chunk != audio_path:
            chunk.unlink()
    
    return " ".join(transcripts)

def save_transcript(transcript: str, name: str, video_info: dict):
    """Save transcript to file with metadata."""
    output_path = TRANSCRIPT_DIR / f"{name}_transcript.md"
    
    content = f"""# {video_info['title']}

**Channel:** {video_info['channel']}
**Duration:** {video_info['duration'] // 60} minutes
**Upload Date:** {video_info['upload_date']}
**URL:** {video_info.get('url', 'N/A')}

## Description

{video_info['description'][:500]}{'...' if len(video_info['description']) > 500 else ''}

---

## Transcript

{transcript}
"""
    
    with open(output_path, 'w') as f:
        f.write(content)
    
    print(f"Saved transcript: {output_path}")
    return output_path

def main():
    """Main execution."""
    # Get API key from environment or argument
    api_key = os.environ.get('OPENAI_API_KEY')
    
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        print("Set it with: export OPENAI_API_KEY='your-key-here'")
        sys.exit(1)
    
    setup_directories()
    
    transcripts = []
    
    for video in VIDEOS:
        print(f"\n{'='*60}")
        print(f"Processing: {video['name']}")
        print('='*60)
        
        try:
            # Get video info
            info = get_video_info(video['url'])
            info['url'] = video['url']
            print(f"Title: {info['title']}")
            print(f"Duration: {info['duration'] // 60} minutes")
            
            # Download audio
            audio_path = download_audio(video['url'], video['name'])
            
            # Transcribe
            transcript = transcribe_audio(audio_path, api_key)
            
            # Save
            transcript_path = save_transcript(transcript, video['name'], info)
            transcripts.append({
                'name': video['name'],
                'path': transcript_path,
                'info': info,
                'transcript': transcript
            })
            
        except Exception as e:
            print(f"Error processing {video['name']}: {e}")
            continue
    
    print(f"\n{'='*60}")
    print(f"Completed! Processed {len(transcripts)} videos.")
    print(f"Transcripts saved to: {TRANSCRIPT_DIR}")
    
    return transcripts

if __name__ == "__main__":
    main()
