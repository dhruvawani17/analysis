"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

const VIDEO_URL = "https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8";

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = VIDEO_URL;
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 30, startLevel: -1 });
      hls.loadSource(VIDEO_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      return () => { hls.destroy(); };
    }
  }, []);

  return (
    <div className="fixed inset-0 z-0" style={{ background: "#050608" }}>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay muted loop playsInline
        style={{ filter: "brightness(0.5) saturate(1.2)" }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(5,6,8,0.3) 0%, rgba(5,6,8,0.1) 40%, rgba(5,6,8,0.5) 80%, rgba(5,6,8,0.95) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(5,6,8,0.6) 100%)" }} />
    </div>
  );
}
