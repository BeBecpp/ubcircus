'use client';
/**
 * PerformanceOrbitScene — a digital circus ring.
 * Posters stand upright on an invisible elliptical ring and drift slowly around it.
 * Brass floor rings, a soft spotlight disc and gold dust (a single THREE.Points) suggest the stage.
 * No free camera: automatic orbit, subtle pointer parallax, horizontal drag with inertia.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useRouter } from 'next/navigation';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Locale } from '@/lib/i18n';
import type { Event } from '@/lib/content';
import type { Quality } from '@/components/site/PerformanceOrbitHero';

const RX = 6.7;
const RZ = 2.9;
const CZ = -1.3;
const FLOOR = -1.4;
const RING_TILT = 0.06;

type OrbitState = { rotation: number; velocity: number; dragging: boolean; moved: boolean; pointer: { x: number; y: number }; hovered: number | null };

function Poster({ url, index, count, state, onHover, onOpen }: { url: string; index: number; count: number; state: React.RefObject<OrbitState>; onHover: (i: number | null) => void; onOpen: (i: number) => void }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useTexture(url);
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame((_, dt) => {
    const m = mesh.current;
    const s = state.current;
    if (!m || !material.current || !s) return;
    const k = Math.min(1, dt * 5);
    const angle = (index / count) * Math.PI * 2 + s.rotation;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const depth = (sin + 1) / 2; // 0 = far side, 1 = nearest the audience
    const x = cos * RX;
    const z = sin * RZ + CZ;
    const hovered = s.hovered === index;
    const y = FLOOR + 1.02 + Math.sin(index * 1.7) * 0.12 + depth * 0.06 + sin * RING_TILT * 2;
    m.position.x += (x + s.pointer.x * 0.08 - m.position.x) * k;
    m.position.y += (y + s.pointer.y * 0.05 - m.position.y) * k;
    m.position.z += (z + (hovered ? 0.5 : 0) - m.position.z) * k;
    m.rotation.y = -cos * 0.42;
    m.rotation.z = Math.sin(index * 2.3) * 0.03;
    const scale = 0.84 + depth * 0.3 + (hovered ? 0.05 : 0);
    m.scale.setScalar(m.scale.x + (scale - m.scale.x) * k);
    const behindTitle = depth < 0.58 && Math.abs(x) < 2.6;
    const target = hovered ? 1 : behindTitle ? 0.14 : 0.3 + depth * 0.62;
    material.current.opacity += (target - material.current.opacity) * Math.min(1, dt * 4);
  });

  return (
    <mesh
      ref={mesh}
      position={[0, 0, CZ - RZ]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(index); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onOpen(index); }}
    >
      <planeGeometry args={[1.5, 2]} />
      <meshBasicMaterial ref={material} map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function FloorRings() {
  const lines = useMemo(() => {
    const make = (rx: number, rz: number, opacity: number) => {
      const pts = new THREE.EllipseCurve(0, 0, rx, rz, 0, Math.PI * 2, false, 0).getPoints(180).map((p) => new THREE.Vector3(p.x, 0, p.y));
      const geometry = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#c9a35c', transparent: true, opacity }));
    };
    return [make(RX * 1.06, RZ * 1.06, 0.42), make(RX * 0.9, RZ * 0.9, 0.14), make(RX * 1.18, RZ * 1.18, 0.07)];
  }, []);
  return (
    <group position={[0, FLOOR, CZ]} rotation={[RING_TILT, 0, 0]}>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

function SpotDisc() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(201,163,92,0.5)');
    grd.addColorStop(0.45, 'rgba(201,163,92,0.13)');
    grd.addColorStop(1, 'rgba(201,163,92,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2 + RING_TILT, 0, 0]} position={[0, FLOOR - 0.01, CZ]} scale={[RX * 2.3, RZ * 2.3, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

const dustVertex = /* glsl */ `
  uniform float uTime; uniform float uPixelRatio;
  attribute float aSize; attribute float aPhase; attribute float aTint;
  varying float vAlpha; varying float vTint;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.22 + aPhase) * 0.22;
    p.x += cos(uTime * 0.16 + aPhase * 1.3) * 0.16;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (22.0 / -mv.z);
    vAlpha = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 0.7 + aPhase * 2.0));
    vTint = aTint;
  }`;
const dustFragment = /* glsl */ `
  varying float vAlpha; varying float vTint;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * vAlpha;
    vec3 gold = vec3(0.79, 0.64, 0.36);
    vec3 red = vec3(0.85, 0.2, 0.2);
    gl_FragColor = vec4(mix(gold, red, vTint) * a, a);
  }`;

function Dust({ count }: { count: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const { positions, sizes, phases, tints } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const tints = new Float32Array(count);
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      positions[i * 3] = Math.cos(a) * r * RX * 1.35;
      positions[i * 3 + 1] = FLOOR + rand() * 3.4;
      positions[i * 3 + 2] = Math.sin(a) * r * RZ * 1.6 + CZ;
      sizes[i] = 0.6 + rand() * 1.6;
      phases[i] = rand() * Math.PI * 2;
      tints[i] = rand() > 0.9 ? 1 : 0;
    }
    return { positions, sizes, phases, tints };
  }, [count]);
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aTint" args={[tints, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} vertexShader={dustVertex} fragmentShader={dustFragment} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{ uTime: { value: 0 }, uPixelRatio: { value: gl.getPixelRatio() } }} />
    </points>
  );
}

function Rig({ state }: { state: React.RefObject<OrbitState> }) {
  const target = useMemo(() => new THREE.Vector3(0, 0.15, CZ), []);
  useFrame(({ camera }, dt) => {
    const s = state.current;
    if (!s) return;
    if (!s.dragging) {
      s.rotation += 0.026 * dt + s.velocity;
      s.velocity *= 0.94;
    }
    const k = Math.min(1, dt * 2.2);
    camera.position.x += (s.pointer.x * 0.55 - camera.position.x) * k;
    camera.position.y += (1.35 + s.pointer.y * 0.22 - camera.position.y) * k;
    camera.lookAt(target);
  });
  return null;
}

function Loaded({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

class Boundary extends Component<{ children: ReactNode; onFail: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

type Props = { events: Event[]; locale: Locale; quality: Quality; active: boolean; onReady: () => void; onFail: () => void; onFocus: (index: number | null) => void };

export default function PerformanceOrbitScene({ events, locale, quality, active, onReady, onFail, onFocus }: Props) {
  const router = useRouter();
  const state = useRef<OrbitState>({ rotation: 0.4, velocity: 0, dragging: false, moved: false, pointer: { x: 0, y: 0 }, hovered: null });
  const wrap = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const count = quality === 'high' ? 12 : quality === 'medium' ? 10 : 8;
  const dust = quality === 'high' ? 900 : quality === 'medium' ? 380 : 0;
  const withPoster = events.filter((e) => e.poster);
  if (!withPoster.length) return null;

  return (
    <Boundary onFail={onFail}>
      <div
        ref={wrap}
        className="canvas-wrap"
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          state.current.dragging = true;
          state.current.moved = false;
          state.current.velocity = 0;
          last.current = e.clientX;
          wrap.current?.classList.add('is-dragging');
        }}
        onPointerMove={(e) => {
          const rect = wrap.current?.getBoundingClientRect();
          if (rect) {
            state.current.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            state.current.pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          }
          if (!state.current.dragging) return;
          const delta = e.clientX - last.current;
          if (Math.abs(delta) > 3) state.current.moved = true;
          state.current.rotation += delta * 0.0035;
          state.current.velocity = delta * 0.0035 * 0.55;
          last.current = e.clientX;
        }}
        onPointerUp={() => { state.current.dragging = false; wrap.current?.classList.remove('is-dragging'); }}
        onPointerLeave={() => { state.current.dragging = false; state.current.pointer.x = 0; state.current.pointer.y = 0; wrap.current?.classList.remove('is-dragging'); }}
        onPointerCancel={() => { state.current.dragging = false; wrap.current?.classList.remove('is-dragging'); }}
      >
        <Canvas
          camera={{ position: [0, 1.35, 8.9], fov: 36, near: 0.5, far: 30 }}
          dpr={quality === 'high' ? [1, 1.75] : quality === 'medium' ? [1, 1.25] : 1}
          frameloop={active ? 'always' : 'never'}
          gl={{ alpha: true, antialias: quality !== 'low', powerPreference: 'high-performance', failIfMajorPerformanceCaveat: quality === 'high' }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onFail(); }, { once: true });
          }}
          onPointerMissed={() => onFocus(null)}
        >
          <fog attach="fog" args={['#070707', 8.5, 15.5]} />
          <Suspense fallback={null}>
            <Rig state={state} />
            <FloorRings />
            <SpotDisc />
            {dust > 0 && <Dust count={dust} />}
            {Array.from({ length: count }, (_, i) => {
              const event = withPoster[i % withPoster.length];
              return (
                <Poster
                  key={i}
                  url={event.poster!.url}
                  index={i}
                  count={count}
                  state={state}
                  onHover={(h) => { state.current.hovered = h; onFocus(h === null ? null : i % withPoster.length); if (wrap.current) wrap.current.style.cursor = h === null ? '' : 'pointer'; }}
                  onOpen={() => { if (!state.current.moved) router.push(`/${locale}/events/${event.slug}`); }}
                />
              );
            })}
            <Loaded onReady={onReady} />
          </Suspense>
        </Canvas>
      </div>
    </Boundary>
  );
}
