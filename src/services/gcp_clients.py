"""Lazy singleton wrappers for GCP clients so they initialise once."""
from google.cloud import aiplatform, texttospeech, storage, firestore
from config import PROJECT_ID, REGION

_aiplatform_initialised = False

def vertex_client() -> aiplatform.gapic.IndexEndpointServiceClient:  # type: ignore
    global _aiplatform_initialised
    if not _aiplatform_initialised:
        aiplatform.init(project=PROJECT_ID, location=REGION)
        _aiplatform_initialised = True
    return aiplatform.gapic.IndexEndpointServiceClient()

def tts_client() -> texttospeech.TextToSpeechClient:  # type: ignore
    return texttospeech.TextToSpeechClient()

def storage_client() -> storage.Client:  # type: ignore
    return storage.Client(project=PROJECT_ID)

def firestore_client() -> firestore.Client:  # type: ignore
    return firestore.Client(project=PROJECT_ID)