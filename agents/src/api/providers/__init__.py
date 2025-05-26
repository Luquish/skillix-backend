"""Proveedores de autenticación para Skillix"""

from .google import GoogleAuthProvider as google_auth
from .apple import AppleAuthProvider as apple_auth

__all__ = [
    "google_auth",  # Autenticación con Google
    "apple_auth"    # Autenticación con Apple
] 