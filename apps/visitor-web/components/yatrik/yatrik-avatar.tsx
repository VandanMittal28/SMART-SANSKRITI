"use client";

import { useEffect, useState } from "react";
import { REDUCED_MOTION_QUERY, useMedia } from "@/components/use-media";
import { YATRIK_FRAMES, type YatrikPose } from "@/lib/yatrik/frames";

// Yatrik, the existing Sanskriti character (artwork by Pulkit). Frames cycle
// slowly; with reduced motion the first frame of each pose stays still.
export function YatrikAvatar({ pose = "idle", size = 48, decorative = true }: { pose?: YatrikPose; size?: number; decorative?: boolean }) {
  const reduced = useMedia(REDUCED_MOTION_QUERY);
  const group = YATRIK_FRAMES[pose];
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    if (reduced || group.frames.length < 2) return;
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % group.frames.length), 1000 / group.fps);
    return () => window.clearInterval(timer);
  }, [group, reduced]);

  return (
    <img
      className="yatrik-avatar"
      src={group.frames[frame] ?? group.frames[0]}
      width={size}
      height={size}
      alt={decorative ? "" : "Yatrik"}
      aria-hidden={decorative || undefined}
      draggable={false}
      decoding="async"
    />
  );
}
