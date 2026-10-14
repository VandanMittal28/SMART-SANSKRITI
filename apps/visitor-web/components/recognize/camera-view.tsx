"use client";

import { useEffect, useRef, useState } from "react";
import { IconCamera } from "@/components/icons";
import { Notice } from "@/components/ui/notice";

// In-page camera for desktops and laptops. Phones use the native camera
// through <input capture>, which handles permissions and focus better.
export function CameraView({ onCapture, onCancel, onUseGallery }: { onCapture: (file: File) => void; onCancel: () => void; onUseGallery: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera access is blocked. Allow it in your browser's site settings, or choose a photo instead."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera was found on this device. Choose a photo instead."
              : "The camera couldn't be started. Choose a photo instead.",
        );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(new File([blob], "camera-photo.jpg", { type: "image/jpeg", lastModified: Date.now() }));
      },
      "image/jpeg",
      0.92,
    );
  }

  if (error) {
    return (
      <div className="recognize-stack">
        <Notice tone="warn" title="Camera unavailable" role="alert">
          {error}
        </Notice>
        <div className="recognize-actions">
          <button type="button" className="btn btn--primary" onClick={onUseGallery}>
            Choose a photo
          </button>
          <button type="button" className="btn btn--secondary" onClick={onCancel}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recognize-stack">
      <div className="camera">
        <video ref={videoRef} className="camera__video" autoPlay playsInline muted onLoadedData={() => setReady(true)} aria-label="Camera preview" />
        {!ready && (
          <p className="camera__waiting" role="status">
            <span className="spinner" aria-hidden="true" /> Starting the camera…
          </p>
        )}
      </div>
      <div className="recognize-actions">
        <button type="button" className="btn btn--primary" onClick={capture} disabled={!ready}>
          <IconCamera /> Take photo
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
