import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { userAPI } from '../services/api';
import {
  Eye, EyeOff, ChevronDown, Sprout,
  Wheat, MapPin, BarChart3, ShieldCheck,
} from 'lucide-react';

// ── Real paddy field photos ─────────────────────────────────────────────────
const BG_PHOTO =
  'https://images.unsplash.com/photo-1759825905575-3bb789d21165' +
  '?w=1920&h=1200&fit=crop&auto=format&q=90';

// ── Dynamically load Three.js ───────────────────────────────────────────────
const loadThreeScript = () => {
  return new Promise<boolean>((resolve) => {
    if ((window as any).THREE) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function useThreeAnimation(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    let active = true;
    let renderer: any;
    let scene: any;
    let camera: any;
    let particles: any;
    let waterMesh: any;
    let initialZ: Float32Array;
    let ripples: any[] = [];
    let animationFrameId: number;

    const init = async () => {
      const loaded = await loadThreeScript();
      if (!loaded || !active) return;

      const THREE = (window as any).THREE;
      const container = containerRef.current;
      if (!container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      // 1. Scene & Camera Setup
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x041408, 0.012);

      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 40;

      // 2. WebGL Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0); // Explicitly set transparent clear color
      container.appendChild(renderer.domElement);

      // 3. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
      scene.add(ambientLight);

      const cursorLight = new THREE.PointLight(0x5cdf8a, 2.5, 75);
      scene.add(cursorLight);

      // 4. Particle System (Attracted Pollen / Bubbles)
      const particleCount = 180;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const speeds = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount);
      const colors = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);

      const colorPalette = [
        new THREE.Color(0x78e6a0), // Emerald Green
        new THREE.Color(0xa0f0b4), // Light Mint
        new THREE.Color(0xfff082), // Golden Pollen
        new THREE.Color(0xb4ffc8), // Pale Mint
        new THREE.Color(0xffdc64), // Warm Gold
      ];

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

        speeds[i] = 0.1 + Math.random() * 0.3;
        phases[i] = Math.random() * Math.PI * 2;

        const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Circular particle texture generator
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 16;
      pCanvas.height = 16;
      const pCtx = pCanvas.getContext('2d')!;
      const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 16, 16);
      const texture = new THREE.CanvasTexture(pCanvas);

      const material = new THREE.PointsMaterial({
        size: 1.4,
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // 5. Invisible Water Plane Mesh (Used for Raycasting and Ripple Simulation)
      const planeGeo = new THREE.PlaneGeometry(120, 95, 55, 45);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0, // Fully transparent so it doesn't block the background image
        depthWrite: false,
      });
      waterMesh = new THREE.Mesh(planeGeo, planeMat);
      waterMesh.rotation.x = -Math.PI / 5.5; // Tilted angle
      waterMesh.position.z = -5;
      scene.add(waterMesh);

      // Store initial vertex heights
      initialZ = new Float32Array(planeGeo.attributes.position.count);
      const posAttribute = planeGeo.attributes.position;
      for (let i = 0; i < posAttribute.count; i++) {
        initialZ[i] = posAttribute.getZ(i);
      }

      // Cursor interaction tracking
      const mouse = new THREE.Vector2(-999, -999);
      const targetLightPos = new THREE.Vector3(0, 0, 10);
      const raycaster = new THREE.Raycaster();

      const onMouseMove = (e: MouseEvent) => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        mouse.x = (x / rect.width) * 2 - 1;
        mouse.y = -(y / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(waterMesh);
        if (intersects.length > 0) {
          const p = intersects[0].point;
          targetLightPos.copy(p);
          targetLightPos.z += 1.8; // Float slightly above surface

          // Periodically spawn small movement ripples (throttled)
          const now = Date.now();
          if (Math.random() < 0.12) {
            ripples.push({
              x: p.x,
              y: p.y,
              time: now,
              duration: 1400,
              amplitude: 1.0,
              speed: 0.07,
            });
          }
        }
      };

      const onClick = (e: MouseEvent) => {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(waterMesh);
        if (intersects.length > 0) {
          const p = intersects[0].point;
          const now = Date.now();
          // Burst of ripples on click
          ripples.push({
            x: p.x,
            y: p.y,
            time: now,
            duration: 2400,
            amplitude: 3.2,
            speed: 0.11,
          });

          // Disperse nearby particles
          const posArray = particles.geometry.attributes.position.array;
          for (let i = 0; i < particleCount; i++) {
            const px = posArray[i * 3];
            const py = posArray[i * 3 + 1];
            const dx = px - p.x;
            const dy = py - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 18 && dist > 0.1) {
              const force = (1 - dist / 18) * 6.5;
              posArray[i * 3] += (dx / dist) * force;
              posArray[i * 3 + 1] += (dy / dist) * force;
            }
          }
          particles.geometry.attributes.position.needsUpdate = true;
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      container.addEventListener('click', onClick);

      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // 6. Animation tick loop
      const clock = new THREE.Clock();
      const tick = () => {
        if (!active) return;
        animationFrameId = requestAnimationFrame(tick);

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();
        const now = Date.now();

        // Smoothly guide light position to follow mouse
        cursorLight.position.lerp(targetLightPos, 0.08);

        // Update vertex displacements for wave & ripple simulation
        const posAttribute = planeGeo.attributes.position;
        const count = posAttribute.count;

        // Clean expired ripples
        ripples = ripples.filter(r => now - r.time < r.duration);

        for (let i = 0; i < count; i++) {
          const vx = posAttribute.getX(i);
          const vy = posAttribute.getY(i);
          let zOffset = 0;

          // Process active ripples
          ripples.forEach(r => {
            const age = now - r.time;
            const dist = Math.sqrt((vx - r.x) ** 2 + (vy - r.y) ** 2);
            const waveRadius = age * r.speed;
            const width = 7.5;
            if (dist < waveRadius + width && dist > waveRadius - width) {
              const strength = (1 - age / r.duration) * r.amplitude;
              const waveY = Math.sin((dist - waveRadius) * 0.8) * strength;
              zOffset += waveY * Math.exp(-Math.abs(dist - waveRadius) / width);
            }
          });

          // Soft underlying organic background waves
          zOffset += Math.sin(vx * 0.12 + time * 1.3) * Math.cos(vy * 0.12 + time * 1.3) * 0.25;

          posAttribute.setZ(i, initialZ[i] + zOffset);
        }
        planeGeo.computeVertexNormals();
        posAttribute.needsUpdate = true;

        // Update attracted particle coordinates with physics velocity accumulation
        const posArray = particles.geometry.attributes.position.array;
        const lightPos = cursorLight.position;

        for (let i = 0; i < particleCount; i++) {
          let px = posArray[i * 3];
          let py = posArray[i * 3 + 1];
          let pz = posArray[i * 3 + 2];

          let vx = velocities[i * 3];
          let vy = velocities[i * 3 + 1];
          let vz = velocities[i * 3 + 2];

          // Natural drift wind / organic sway (reduced)
          vx += Math.sin(time * 0.3 + phases[i]) * 0.003;
          vy += Math.cos(time * 0.25 + phases[i] * 1.3) * 0.002;

          // Natural upward float tendency (reduced)
          vy += 0.003 * speeds[i];

          // Pull towards cursor light position (reduced)
          const dx = lightPos.x - px;
          const dy = lightPos.y - py;
          const dz = lightPos.z - pz;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const attractRadius = 25.0;

          if (dist < attractRadius && dist > 0.5) {
            const proximity = 1.0 - dist / attractRadius;
            const strength = proximity * 0.012 * speeds[i];
            vx += (dx / dist) * strength;
            vy += (dy / dist) * strength;
            vz += (dz / dist) * strength;
          }

          // Velocity damping (0.95 matches original damping 0.96)
          vx *= 0.95;
          vy *= 0.95;
          vz *= 0.95;

          // Apply velocities to position
          px += vx;
          py += vy;
          pz += vz;

          // Store back velocities
          velocities[i * 3] = vx;
          velocities[i * 3 + 1] = vy;
          velocities[i * 3 + 2] = vz;

          // Wrap / respawn particles floating outside view borders
          if (py > 38) {
            py = -38;
            px = (Math.random() - 0.5) * 80;
            pz = (Math.random() - 0.5) * 20;
            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = 0;
            velocities[i * 3 + 2] = 0;
          }

          posArray[i * 3] = px;
          posArray[i * 3 + 1] = py;
          posArray[i * 3 + 2] = pz;
        }
        particles.geometry.attributes.position.needsUpdate = true;

        // Visual parallax scene rotation based on cursor position
        if (mouse.x > -10) {
          scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, mouse.x * 0.12, 0.04);
          scene.rotation.x = THREE.MathUtils.lerp(scene.rotation.x, mouse.y * 0.08, 0.04);
        }

        renderer.render(scene, camera);
      };

      tick();
    };

    init();

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      if (renderer && renderer.domElement) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
      window.removeEventListener('resize', () => {});
    };
  }, [containerRef]);
}

interface LoginPageProps {
  onLogin?: (userType: 'farmer' | 'admin') => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const animationContainerRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [userType, setUserType] = useState<'farmer' | 'admin'>('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bgPhotoUrl, setBgPhotoUrl] = useState(BG_PHOTO);

  // Fallback checker for the background image
  useEffect(() => {
    const img = new Image();
    img.src = BG_PHOTO;
    img.onerror = () => {
      console.warn("Primary background image failed to load. Falling back to alternative field image.");
      setBgPhotoUrl('https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=1920&auto=format&fit=crop');
    };
  }, []);

  // Clear any stale auth data on mount
  useEffect(() => {
    localStorage.removeItem('agriconnect_auth');
    localStorage.removeItem('lastActivityTime');
  }, []);

  // Set up custom Three.js animation
  useThreeAnimation(animationContainerRef);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Parallax backdrop panel motion
  const onGlobalMove = useCallback((e: MouseEvent) => {
    if (!photoRef.current) return;
    const xPct = (e.clientX / window.innerWidth - 0.5) * 2;
    const yPct = (e.clientY / window.innerHeight - 0.5) * 2;
    photoRef.current.style.transform =
      `scale(1.06) translate(${xPct * -1.2}%, ${yPct * -0.8}%)`;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onGlobalMove);
    return () => window.removeEventListener('mousemove', onGlobalMove);
  }, [onGlobalMove]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);

    try {
      // Connect to auth API
      const response = await userAPI.login({
        email,
        password,
        intendedRole: userType
      });

      const actualRole = response.user?.type || response.user?.role || userType;
      const mappedUserType = (actualRole === 'user') ? 'farmer' : actualRole;

      const authData = {
        userType: mappedUserType,
        email: response.user?.email || email,
        token: response.token,
        isAuthenticated: true,
        timestamp: new Date().toISOString(),
        userId: response.user?._id,
        firstName: response.user?.firstName,
        lastName: response.user?.lastName,
      };
      
      localStorage.setItem('agriconnect_auth', JSON.stringify(authData));
      localStorage.setItem('lastActivityTime', Date.now().toString());

      toast.success('Login successful! Welcome back.');

      // Navigation redirect
      if (mappedUserType === 'farmer') {
        navigate('/farmer/home');
      } else {
        navigate('/admin/dashboard');
      }

      if (onLogin) {
        onLogin(mappedUserType as 'farmer' | 'admin');
      }
    } catch (err: any) {
      console.error('Login error details:', err);
      let errorMessage = 'Failed to login. Please check your credentials and try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    background: '#f7faf8', border: '1.5px solid #d4e8da',
    color: '#1a3d28', fontSize: '0.875rem', outline: 'none',
    transition: 'all 0.2s', fontFamily: 'inherit',
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = '1.5px solid #2a9e58';
    e.target.style.background = '#ffffff';
    e.target.style.boxShadow = '0 0 0 3px rgba(34,160,80,0.12)';
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.border = '1.5px solid #d4e8da';
    e.target.style.background = '#f7faf8';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div className="lp-root" style={{
      minHeight: '100vh', display: 'flex', overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ══════════════════════ LEFT — PHOTO & WebGL PANEL ══════════════════════════ */}
      <div className="lp-photo" style={{
        flex: '0 0 65%', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Photo Background */}
        <div ref={photoRef} style={{
          position: 'absolute', inset: '-6%',
          background: 'linear-gradient(135deg, #041a0b 0%, #010f06 100%)',
          backgroundImage: `url(${bgPhotoUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          transition: 'transform 0.12s ease-out',
          willChange: 'transform',
        }} aria-label="Lush green rice paddy field with palm trees and mountains" />

        {/* Dynamic Shader Gradient Overlays */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg, rgba(4,20,8,0.62) 0%, rgba(4,20,8,0.25) 60%, rgba(4,20,8,0.08) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(4,20,8,0.75) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(4,20,8,0.15) 0%, transparent 100%)' }} />

        {/* Three.js Container */}
        <div ref={animationContainerRef} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'auto', cursor: 'crosshair',
        }} />

        {/* UI HUD Overlay */}
        <div className="lp-photo-ui" style={{ position: 'relative', zIndex: 10, flex: 1,
          display: 'flex', flexDirection: 'column', padding: '36px 44px' }}>

          {/* Title Header logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
            }}>
              <Sprout style={{ width: 20, height: 20, color: '#7de8a0' }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                Agri<span style={{ color: '#5cdf8a' }}>Connect</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.58rem',
                letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono',monospace" }}>
                Agricultural Management System
              </div>
            </div>
          </div>

          {/* Headline details */}
          <div className="lp-headline-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <div>
              <div className="left-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(92,223,138,0.15)', border: '1px solid rgba(92,223,138,0.35)',
                borderRadius: 20, padding: '5px 14px', marginBottom: 20,
                backdropFilter: 'blur(6px)', position: 'relative' }}>
                <span style={{ position: 'relative', width: 6, height: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ position: 'absolute', width: 6, height: 6, borderRadius: '50%',
                    background: '#5cdf8a', animation: 'ringPulse 1.8s ease-out infinite' }} />
                  <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%',
                    background: '#5cdf8a', animation: 'dotPulse 1.8s ease-in-out infinite' }} />
                </span>
                <span style={{ color: '#9ef5be', fontSize: '0.65rem', fontWeight: 600,
                  fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  All systems operational
                </span>
              </div>
              <h1 className="left-headline" style={{
                color: '#ffffff', margin: 0,
                fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
                fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em',
              }}>
                Empowering<br />
                <span style={{ color: '#5cdf8a' }}>Sri Lanka's</span><br />
                Farming Future.
              </h1>
              <p className="left-sub" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', lineHeight: 1.75,
                marginTop: 16, maxWidth: 360 }}>
                District-managed paddy records, AI crop disease detection,
                and harvest analytics — built for Sri Lankan agriculture.
              </p>
            </div>

            {/* Statistics */}
            <div className="lp-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { icon: <Wheat style={{width:13,height:13}}/>, label:'Active Farmers',   value:'12,480',  accent:'#5cdf8a' },
                { icon: <MapPin style={{width:13,height:13}}/>, label:'Districts',        value:'25 / 25', accent:'#fbbf24' },
                { icon: <BarChart3 style={{width:13,height:13}}/>, label:'Harvest Records', value:'98K+',  accent:'#60a5fa' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{
                  flex: '1 1 100px', padding: '12px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(10px)',
                  cursor: 'default',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.accent, marginBottom: 5 }}>
                    {s.icon}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badge info */}
          <div className="lp-bottom-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.62rem',
                fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Ministry of Agriculture · Government of Sri Lanka
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.6rem' }}>
              Photo: Unsplash
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════ RIGHT — FORM PANEL ══════════════════════════ */}
      <div className="lp-form" style={{
        flex: '0 0 35%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #f0f9f3 0%, #e8f5ec 50%, #f4fbf6 100%)',
        padding: '40px 24px', position: 'relative', overflow: 'visible',
      }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: 280, height: 280,
          borderRadius: '50%', background: 'rgba(34,160,80,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: 320, height: 320,
          borderRadius: '50%', background: 'rgba(34,160,80,0.05)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 320, position: 'relative' }}>
          
          <div className="anim-fadeup-1" style={{ marginBottom: 28 }}>
            <h2 style={{ color: '#0f2e18', fontWeight: 800, fontSize: '1.55rem',
              letterSpacing: '-0.025em', margin: '0 0 6px' }}>
              Welcome back
            </h2>
            <p style={{ color: '#6b9a7b', fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
              Sign in to access your AgriConnect dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Role selector dropdown */}
            <div className="anim-fadeup-2" style={{ position: 'relative', zIndex: 100 }}>
              <label style={{ display: 'block', color: '#3d6b50', fontSize: '0.78rem',
                fontWeight: 700, marginBottom: 8, letterSpacing: '0.01em' }}>
                Login as
              </label>
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button type="button" onClick={() => setIsDropdownOpen(o => !o)}
                  style={{ ...inp, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', cursor: 'pointer', padding: '12px 16px',
                    background: '#f7faf8', border: '1.5px solid #d4e8da' }}>
                  <span style={{ color: '#1a3d28', fontWeight: 600 }}>
                    {userType === 'farmer' ? '🌾  Farmer' : '🏛  District Admin / Officer'}
                  </span>
                  <ChevronDown style={{
                    width: 16, height: 16, color: '#6b9a7b', flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }} />
                </button>
                {isDropdownOpen && (
                  <div style={{
                    position: 'absolute', zIndex: 9999, width: '100%', top: 'calc(100% + 6px)',
                    left: 0, borderRadius: 12, overflow: 'hidden',
                    background: '#ffffff', opacity: 1,
                    border: '1.5px solid #b8d8c4',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.12), 0 24px 48px rgba(10,60,25,0.15)',
                    animation: 'fadeUp 0.18s ease both',
                    isolation: 'isolate',
                  }}>
                    {([
                      { v: 'farmer' as const, l: '🌾  Farmer' },
                      { v: 'admin'  as const, l: '🏛  District Admin / Officer' },
                    ]).map(opt => (
                      <button key={opt.v} type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          setUserType(opt.v);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          width: '100%', padding: '14px 16px', textAlign: 'left',
                          background: userType === opt.v ? '#e8f5ec' : '#ffffff',
                          color: userType === opt.v ? '#1a6a35' : '#2a4a35',
                          fontSize: '0.875rem', cursor: 'pointer', border: 'none',
                          borderBottom: '1px solid #f0f5f2',
                          fontFamily: 'inherit', fontWeight: userType === opt.v ? 700 : 500,
                          transition: 'background 0.15s',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = userType === opt.v ? '#dff0e6' : '#f4fbf6'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = userType === opt.v ? '#e8f5ec' : '#ffffff'; }}
                      >
                        <span>{opt.l}</span>
                        {userType === opt.v && (
                          <span style={{ color: '#1a8a3a', fontSize: '0.8rem', marginLeft: 8 }}>✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div className="anim-fadeup-3" style={{ position: 'relative', zIndex: 1 }}>
              <label style={{ display: 'block', color: '#3d6b50', fontSize: '0.78rem',
                fontWeight: 700, marginBottom: 8 }}>
                Email Address
              </label>
              <input type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="you@agri.gov.lk"
                style={inp} onFocus={onFocus} onBlur={onBlur} />
            </div>

            {/* Password Field */}
            <div className="anim-fadeup-4" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#3d6b50', fontSize: '0.78rem', fontWeight: 700 }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} required
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...inp, paddingRight: 46 }}
                  onFocus={onFocus} onBlur={onBlur}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#8aaa98', padding: 2, display: 'flex', lineheight: 1,
                  }}>
                  {showPassword
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye     style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {/* Sign In Trigger CTA */}
            <button type="submit" disabled={isLoading}
              className={isLoading ? '' : 'signin-btn anim-fadeup-5'}
              style={{
                width: '100%', padding: '14px 0', marginTop: 4,
                borderRadius: 12, border: 'none',
                background: isLoading ? 'rgba(26,138,58,0.45)' : undefined,
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit', letterSpacing: '0.01em',
              }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    display: 'inline-block', animation: 'spin 0.75s linear infinite',
                  }} />
                  Signing in…
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          {/* Footer Separator */}
          <div className="anim-fadeup-6" style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e0ede5' }} />
            <span style={{ color: '#a0c4ac', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
              New to AgriConnect?
            </span>
            <div style={{ flex: 1, height: 1, background: '#e0ede5' }} />
          </div>

          <p style={{ textAlign: 'center', color: '#6b9a7b', fontSize: '0.83rem', margin: 0 }}>
            {"Contact your "}
            <a href="#" style={{ color: '#1a8a3a', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
              District Agriculture Officer
            </a>
            {" to register"}
          </p>

          {/* Secure details badges */}
          <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid #e0ede5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {[
              { icon: '🔒', text: 'SSL Secured' },
              { icon: '🏛', text: 'Govt. Certified' },
              { icon: '🛡', text: 'Data Protected' },
            ].map(b => (
              <div key={b.text} className="trust-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: '1rem' }}>{b.icon}</span>
                <span style={{ color: '#9abaa8', fontSize: '0.62rem', fontWeight: 600,
                  letterSpacing: '0.04em', textTransform: 'uppercase' }}>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        /* ── Animations Keyframes ─────────────────────────────────────── */
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes fadeUp    { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
        @keyframes floatY    { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-7px); } }
        @keyframes floatY2   { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-5px); } }
        @keyframes pulseGlow { 0%,100%{ box-shadow:0 8px 28px rgba(22,163,74,0.38); } 50%{ box-shadow:0 12px 38px rgba(22,163,74,0.6),0 0 0 4px rgba(22,163,74,0.12); } }
        @keyframes shimmer   { 0%{ background-position:-200% center; } 100%{ background-position:200% center; } }
        @keyframes dotPulse  { 0%,100%{ transform:scale(1); opacity:1; } 50%{ transform:scale(1.6); opacity:0.6; } }
        @keyframes ringPulse { 0%{ transform:scale(1); opacity:0.6; } 100%{ transform:scale(2.2); opacity:0; } }
        @keyframes slideRight{ from{ opacity:0; transform:translateX(-18px); } to{ opacity:1; transform:translateX(0); } }
        @keyframes heroPan   { 0%{ background-position:60% 50%; } 100%{ background-position:40% 55%; } }

        /* ── Baseline Reset overrides ────────────────────────────────── */
        input::placeholder { color: #b0c8b8; }
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Fade-in Stagger configurations ───────────────────────────── */
        .anim-fadeup-1 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.05s both; }
        .anim-fadeup-2 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.15s both; }
        .anim-fadeup-3 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.25s both; }
        .anim-fadeup-4 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.35s both; }
        .anim-fadeup-5 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.45s both; }
        .anim-fadeup-6 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.55s both; }

        /* ── Left side stat animation floats ──────────────────────────── */
        .stat-card:nth-child(1) { animation: fadeUp 0.6s ease 0.2s  both, floatY  4.2s ease-in-out 0.8s infinite; }
        .stat-card:nth-child(2) { animation: fadeUp 0.6s ease 0.35s both, floatY2 5.0s ease-in-out 1.2s infinite; }
        .stat-card:nth-child(3) { animation: fadeUp 0.6s ease 0.5s  both, floatY  4.6s ease-in-out 0.4s infinite; }

        /* ── Submit CTA pulse glow effects ────────────────────────────── */
        .signin-btn {
          animation: pulseGlow 2.8s ease-in-out infinite;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 60%, #22c55e 100%);
          background-size: 200% auto;
        }
        .signin-btn:not(:disabled):hover {
          animation: shimmer 1.2s linear infinite, pulseGlow 2.8s ease-in-out infinite;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 60%, #22c55e 100%);
          background-size: 200% auto;
          transform: translateY(-2px);
        }

        .trust-badge              { animation: fadeIn 0.6s ease 0.9s  both; }
        .trust-badge:nth-child(2) { animation-delay: 1.0s; }
        .trust-badge:nth-child(3) { animation-delay: 1.1s; }

        .left-headline { animation: slideRight 0.7s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .left-sub      { animation: slideRight 0.7s cubic-bezier(.22,1,.36,1) 0.2s both; }
        .left-badge    { animation: fadeIn 0.5s ease 0.05s both; }

        /* ── Tablet 1024px responsive override ────────────────────────── */
        @media (max-width: 1024px) {
          .lp-photo { flex: 0 0 58% !important; }
          .lp-form  { flex: 0 0 42% !important; }
          .lp-photo-ui { padding: 28px 32px !important; }
        }

        /* ── Mobile 768px layout stack ────────────────────────────────── */
        @media (max-width: 768px) {
          .lp-root {
            flex-direction: column !important;
            overflow-y: auto !important;
            min-height: 100dvh !important;
          }
          .lp-photo {
            flex: none !important;
            width: 100% !important;
            height: 48vh !important;
            min-height: 260px !important;
            max-height: 340px !important;
          }
          .lp-photo > div:first-child {
            animation: heroPan 18s ease-in-out infinite alternate !important;
            transition: none !important;
          }
          .lp-photo-ui {
            padding: 20px 20px 16px !important;
          }
          .left-sub { display: none !important; }
          .left-headline {
            font-size: clamp(1.5rem, 6vw, 2.2rem) !important;
            margin-bottom: 4px !important;
          }
          .lp-stats {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            gap: 8px !important;
            padding-bottom: 4px !important;
          }
          .stat-card {
            flex: 0 0 120px !important;
            padding: 10px 12px !important;
          }
          .lp-bottom-badge { display: none !important; }
          .lp-form {
            flex: none !important;
            width: 100% !important;
            padding: 28px 20px 36px !important;
            align-items: flex-start !important;
            min-height: 0 !important;
          }
          .lp-form > div {
            max-width: 100% !important;
          }
        }

        @media (max-width: 380px) {
          .lp-photo { max-height: 280px !important; }
          .lp-photo-ui { padding: 16px !important; }
          .lp-form  { padding: 22px 16px 32px !important; }
        }
      `}</style>
    </div>
  );
}