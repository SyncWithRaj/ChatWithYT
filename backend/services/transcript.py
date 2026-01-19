
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs

def extract_video_id(url: str):
    parsed = urlparse(url)
    if parsed.hostname == 'youtu.be':
        return parsed.path[1:]
    if parsed.hostname in ('www.youtube.com', 'youtube.com'):
        if parsed.path == '/watch':
            p = parse_qs(parsed.query)
            return p.get('v', [None])[0]
    return None

def fetch_transcript(url: str):
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")
    
    try:
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        # Format text
        full_text = " ".join([t.text for t in transcript])
        return {"video_id": video_id, "text": full_text, "raw": transcript}
    except Exception as e:
        raise Exception(f"Failed to fetch transcript: {str(e)}")
