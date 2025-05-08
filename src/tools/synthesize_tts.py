"""Generate MP3 via Vertex AI TTS and upload to GCS, return public URL."""
from google.cloud import texttospeech
from services.gcp_clients import tts_client, storage_client
from config import GCS_BUCKET, VERTEX_TTS_VOICE
import uuid


def synthesize_text(text: str, language_code: str = "es") -> str:
    """Convert text to speech and return public GCS URL."""
    client = tts_client()
    input_ = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=language_code, name=VERTEX_TTS_VOICE
    )
    audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
    response = client.synthesize_speech(input=input_, voice=voice, audio_config=audio_config)

    blob_name = f"audio/{uuid.uuid4()}.mp3"
    bucket = storage_client().bucket(GCS_BUCKET)
    blob = bucket.blob(blob_name)
    blob.upload_from_string(response.audio_content, content_type="audio/mpeg")
    blob.make_public()
    return blob.public_url 