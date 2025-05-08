"""Lazy singleton wrappers for GCP clients so they initialise once."""
from google.cloud import aiplatform, texttospeech, storage, firestore
from config import settings

_aiplatform_initialised = False

def vertex_client() -> aiplatform.gapic.IndexEndpointServiceClient:  # type: ignore
    global _aiplatform_initialised
    if not _aiplatform_initialised:
        aiplatform.init(project=settings.PROJECT_ID, location=settings.REGION)
        _aiplatform_initialised = True
    return aiplatform.gapic.IndexEndpointServiceClient()

def tts_client() -> texttospeech.TextToSpeechClient:  # type: ignore
    return texttospeech.TextToSpeechClient()

def storage_client() -> storage.Client:  # type: ignore
    return storage.Client(project=settings.PROJECT_ID)

def firestore_client() -> firestore.Client:  # type: ignore
    return firestore.Client(project=settings.PROJECT_ID)