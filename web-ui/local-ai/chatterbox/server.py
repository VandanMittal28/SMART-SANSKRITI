from __future__ import annotations

import asyncio
import io
import os
import time
import wave
from functools import lru_cache
from pathlib import Path
from typing import Literal

import grpc
import riva.client
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from riva.client.proto.riva_audio_pb2 import AudioEncoding


ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(Path(__file__).with_name(".env"))

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "").strip()
NVIDIA_SERVER = os.getenv(
    "NVIDIA_CHATTERBOX_SERVER", "grpc.nvcf.nvidia.com:443"
).strip()
NVIDIA_FUNCTION_ID = os.getenv(
    "NVIDIA_CHATTERBOX_FUNCTION_ID", "ddacc747-1269-4fab-bfd9-8f593dead106"
).strip()
DEMO_TOKEN = os.getenv("CHATTERBOX_DEMO_TOKEN", "").strip()
SAMPLE_RATE = 22_050

LANGUAGE_CONFIG = {
    "ar": ("ar-SA", "Chatterbox-Multilingual.ar-SA.Male"),
    "da": ("da-DK", "Chatterbox-Multilingual.da-DK.Male"),
    "de": ("de-DE", "Chatterbox-Multilingual.de-DE.Male"),
    "el": ("el-GR", "Chatterbox-Multilingual.el-GR.Male"),
    "en": ("en-US", "Chatterbox-Multilingual.en-US.Male"),
    "es": ("es-ES", "Chatterbox-Multilingual.es-ES.Male"),
    "fi": ("fi-FI", "Chatterbox-Multilingual.fi-FI.Male"),
    "fr": ("fr-FR", "Chatterbox-Multilingual.fr-FR.Male"),
    "he": ("he-IL", "Chatterbox-Multilingual.he-IL.Male"),
    "hi": ("hi-IN", "Chatterbox-Multilingual.hi-IN.Male"),
    "it": ("it-IT", "Chatterbox-Multilingual.it-IT.Male"),
    "ja": ("ja-JP", "Chatterbox-Multilingual.ja-JP.Male"),
    "ko": ("ko-KR", "Chatterbox-Multilingual.ko-KR.Male"),
    "ms": ("ms-MY", "Chatterbox-Multilingual.ms-MY.Male"),
    "nl": ("nl-NL", "Chatterbox-Multilingual.nl-NL.Male"),
    "nb": ("nb-NO", "Chatterbox-Multilingual.nb-NO.Male"),
    "pl": ("pl-PL", "Chatterbox-Multilingual.pl-PL.Male"),
    "pt": ("pt-BR", "Chatterbox-Multilingual.pt-BR.Male"),
    "ru": ("ru-RU", "Chatterbox-Multilingual.ru-RU.Male"),
    "sv": ("sv-SE", "Chatterbox-Multilingual.sv-SE.Male"),
    "sw": ("sw-KE", "Chatterbox-Multilingual.sw-KE.Male"),
    "tr": ("tr-TR", "Chatterbox-Multilingual.tr-TR.Male"),
    "zh": ("zh-CN", "Chatterbox-Multilingual.zh-CN.Male"),
}


class NarrationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1_500)
    language: Literal[
        "ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi",
        "it", "ja", "ko", "ms", "nl", "nb", "pl", "pt", "ru", "sv",
        "sw", "tr", "zh",
    ] = "en"
    profile: str | None = None


def require_demo_token(authorization: str | None = Header(default=None)) -> None:
    if DEMO_TOKEN and authorization != f"Bearer {DEMO_TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid demo token")


@lru_cache(maxsize=1)
def create_synthesis_service() -> riva.client.SpeechSynthesisService:
    if not NVIDIA_API_KEY:
        raise RuntimeError("NVIDIA_API_KEY is not configured")
    auth = riva.client.Auth(
        uri=NVIDIA_SERVER,
        use_ssl=True,
        metadata_args=[
            ["function-id", NVIDIA_FUNCTION_ID],
            ["authorization", f"Bearer {NVIDIA_API_KEY}"],
        ],
        options=[
            ("grpc.max_receive_message_length", 128 * 1024 * 1024),
            ("grpc.max_send_message_length", 128 * 1024 * 1024),
        ],
    )
    return riva.client.SpeechSynthesisService(auth)


def pcm_to_wav(audio: bytes) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        wav_file.writeframes(audio)
    return output.getvalue()


def synthesize(request: NarrationRequest) -> bytes:
    language_code, voice = LANGUAGE_CONFIG[request.language]
    service = create_synthesis_service()
    result = None
    for attempt in range(4):
        try:
            result = service.synthesize(
                request.text.strip(),
                voice,
                language_code,
                sample_rate_hz=SAMPLE_RATE,
                encoding=AudioEncoding.LINEAR_PCM,
            )
            break
        except grpc.RpcError as error:
            if error.code() != grpc.StatusCode.RESOURCE_EXHAUSTED or attempt == 3:
                raise
            time.sleep(1.25 * (attempt + 1))

    if result is None or not result.audio:
        raise RuntimeError("NVIDIA Chatterbox returned empty audio")
    return pcm_to_wav(result.audio)


allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CHATTERBOX_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="Sanskriti NVIDIA Chatterbox Proxy", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

generation_slots = asyncio.Semaphore(1)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ready" if NVIDIA_API_KEY else "missing_api_key",
        "backend": "nvidia-hosted",
        "model": "resembleai/chatterbox-multilingual-tts",
        "languages": list(LANGUAGE_CONFIG),
        "local_model_loaded": False,
    }


@app.post("/warmup", dependencies=[Depends(require_demo_token)])
def warmup() -> dict[str, object]:
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="NVIDIA_API_KEY is not configured")
    return {"status": "ready", "backend": "nvidia-hosted", "model_loaded_locally": False}


@app.post("/v1/narrate", dependencies=[Depends(require_demo_token)])
async def narrate(request: NarrationRequest) -> Response:
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="NVIDIA_API_KEY is not configured")
    try:
        async with generation_slots:
            audio = await asyncio.to_thread(synthesize, request)
    except Exception as error:
        print(f"[NVIDIA Chatterbox] {type(error).__name__}: {error}")
        raise HTTPException(
            status_code=502, detail="NVIDIA Chatterbox is temporarily unavailable"
        ) from None
    return Response(
        content=audio,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-Narration-Backend": "nvidia-hosted"},
    )
