// Yatrik character frames: Pulkit's artwork from apk/ui/public/yatrik/pulkit-v1
// (manifest.v1.json, version 1.1.0-pulkit), resized to 192px transparent PNGs.
// Only the states this website uses are included.

export type YatrikPose = "idle" | "listening" | "talking" | "pointing";

export type FrameGroup = { frames: string[]; fps: number };

export const YATRIK_FRAMES: Record<YatrikPose, FrameGroup> = {
  idle: { frames: ["/yatrik/idle/idle-01.png", "/yatrik/idle/idle-02.png", "/yatrik/idle/idle-04.png"], fps: 1 },
  listening: {
    frames: ["/yatrik/listening/listening-01.png", "/yatrik/listening/listening-02.png", "/yatrik/listening/listening-03.png"],
    fps: 2,
  },
  talking: { frames: ["/yatrik/talking/talking-01.png", "/yatrik/talking/talking-05.png"], fps: 2 },
  pointing: {
    frames: ["/yatrik/pointing/pointing-01.png", "/yatrik/pointing/pointing-02.png", "/yatrik/pointing/pointing-03.png"],
    fps: 2,
  },
};
