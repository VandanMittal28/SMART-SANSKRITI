'use client'
import { useRef, useEffect, useState } from 'react'

interface PanoramaViewerProps {
  imageSrc: string
  accentColor: string
  eraLabel: string
  eraPeriod: string
  monumentName: string
}

export function PanoramaViewer({ imageSrc, accentColor, eraLabel, eraPeriod, monumentName }: PanoramaViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)

  // Build the HTML for the 360° Three.js viewer
  const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0F0B1E; overflow:hidden; font-family:sans-serif; }
  #viewer { width:100%; height:100vh; display:block; cursor:grab; }
  #viewer:active { cursor:grabbing; }
  #overlay {
    position:absolute; top:0; left:0; right:0; bottom:0;
    pointer-events:none;
    display:flex; align-items:flex-end; justify-content:center;
    padding-bottom:24px;
  }
  #hint {
    background:rgba(0,0,0,0.6); color:#E8C97A;
    font-size:13px; padding:8px 18px; border-radius:999px;
    border:1px solid rgba(201,168,76,0.4);
    transition:opacity 1.5s ease;
    backdrop-filter:blur(6px);
  }
  #era-badge {
    position:absolute; top:14px; left:50%; transform:translateX(-50%);
    background:rgba(0,0,0,0.65); color:${accentColor};
    font-size:14px; font-weight:600;
    padding:8px 22px; border-radius:999px;
    border:1px solid ${accentColor}66;
    pointer-events:none;
    backdrop-filter:blur(6px);
    letter-spacing:0.03em;
  }
  #loading {
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    background:#0F0B1E;
    z-index:10;
    transition:opacity 0.5s ease;
  }
  .spinner {
    width:40px; height:40px;
    border:3px solid rgba(201,168,76,0.2);
    border-top:3px solid ${accentColor};
    border-radius:50%;
    animation:spin 1s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
</head>
<body>
<div style="position:relative; width:100%; height:100vh;">
  <canvas id="viewer"></canvas>
  <div id="era-badge">${eraLabel} &nbsp;·&nbsp; ${eraPeriod}</div>
  <div id="overlay"><div id="hint">🖱️ Drag to look around · Auto-rotating</div></div>
  <div id="loading"><div class="spinner"></div></div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
  const canvas = document.getElementById("viewer");
  const loading = document.getElementById("loading");
  const W = window.innerWidth || 800;
  const H = window.innerHeight || 500;
  canvas.width = W;
  canvas.height = H;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000);
  camera.position.set(0, 0, 0.001);

  // Sphere geometry flipped inside-out for panorama
  const geo = new THREE.SphereGeometry(500, 64, 40);
  geo.scale(-1, 1, 1);

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = "${imageSrc}";
  img.onload = function() {
    const tex = new THREE.Texture(img);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    loading.style.opacity = "0";
    setTimeout(() => loading.style.display = "none", 500);
    animate();
  };
  img.onerror = function() {
    loading.innerHTML = '<div style="color:#E8A85C;font-size:14px;text-align:center;">Could not load panorama image</div>';
  };

  // Drag controls
  let isDragging = false, prevX = 0, prevY = 0;
  let lon = 0, lat = 0;
  let autoRotate = true;

  canvas.addEventListener("mousedown", e => {
    isDragging = true; prevX = e.clientX; prevY = e.clientY;
    autoRotate = false;
    document.getElementById("hint").style.opacity = "0";
  });
  canvas.addEventListener("mouseup", () => isDragging = false);
  canvas.addEventListener("mouseleave", () => { isDragging = false; autoRotate = true; });
  canvas.addEventListener("mousemove", e => {
    if (!isDragging) return;
    lon -= (e.clientX - prevX) * 0.3;
    lat += (e.clientY - prevY) * 0.15;
    lat = Math.max(-85, Math.min(85, lat));
    prevX = e.clientX; prevY = e.clientY;
  });

  // Touch support
  canvas.addEventListener("touchstart", e => {
    isDragging = true;
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;
    autoRotate = false;
    document.getElementById("hint").style.opacity = "0";
  });
  canvas.addEventListener("touchend", () => { isDragging = false; autoRotate = true; });
  canvas.addEventListener("touchmove", e => {
    if (!isDragging) return;
    lon -= (e.touches[0].clientX - prevX) * 0.3;
    lat += (e.touches[0].clientY - prevY) * 0.15;
    lat = Math.max(-85, Math.min(85, lat));
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });

  // Scroll zoom
  canvas.addEventListener("wheel", e => {
    camera.fov = Math.max(30, Math.min(100, camera.fov + e.deltaY * 0.05));
    camera.updateProjectionMatrix();
    e.preventDefault();
  }, { passive: false });

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) lon += 0.05;
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);
    camera.lookAt(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
    renderer.render(scene, camera);
  }

  // Resize
  window.addEventListener("resize", () => {
    const w = window.innerWidth; const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
<\/script>
</body>
</html>`

  useEffect(() => {
    // Reset loaded state when image changes
    setLoaded(false)
  }, [imageSrc])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      borderRadius: 14,
      overflow: 'hidden',
      border: `1px solid ${accentColor}44`,
      background: '#0F0B1E'
    }}>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title={`360° view of ${monumentName} — ${eraLabel}`}
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: 480,
          border: 'none',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        sandbox="allow-scripts allow-same-origin"
      />
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0F0B1E'
        }}>
          <div style={{
            width: 36, height: 36,
            border: `3px solid rgba(201,168,76,0.2)`,
            borderTop: `3px solid ${accentColor}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  )
}
