"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";

const TERRAIN_ROWS = 80;
const TERRAIN_COLS = 120;
const TERRAIN_COUNT = TERRAIN_ROWS * TERRAIN_COLS;
const PARTICLE_COUNT = 400;
const STREAM_COUNT = 20;
const STREAM_LENGTH = 40;

const COLORS = {
  bg: new THREE.Color("#050608"),
  glow: new THREE.Color("#3B82F6"),
  bright: new THREE.Color("#7AA8FF"),
  accent: new THREE.Color("#6366F1"),
  white: new THREE.Color("#F8FAFC"),
};

function CameraRig() {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3(0, 2, 12));
  const mouseTarget = useRef(new THREE.Vector2(0, 0));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.05;
    mouseTarget.current.lerp(new THREE.Vector2(pointer.x, pointer.y), 0.015);

    target.current.x = Math.sin(t * 0.2) * 2 + mouseTarget.current.x * 1.5;
    target.current.y = 2 + Math.cos(t * 0.15) * 0.5 + mouseTarget.current.y * 0.5;
    target.current.z = 12 + Math.sin(t * 0.1) * 1;

    camera.position.lerp(target.current, 0.01);
    camera.lookAt(mouseTarget.current.x * 0.5, 1 + mouseTarget.current.y * 0.3, 0);
  });

  return null;
}

function DataTerrain() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { gridX, gridZ, sizes, phases } = useMemo(() => {
    const gx = new Float32Array(TERRAIN_COUNT * 3);
    const gz = new Float32Array(TERRAIN_COUNT);
    const sz = new Float32Array(TERRAIN_COUNT);
    const ph = new Float32Array(TERRAIN_COUNT);

    for (let r = 0; r < TERRAIN_ROWS; r++) {
      for (let c = 0; c < TERRAIN_COLS; c++) {
        const i = r * TERRAIN_COLS + c;
        const x = (c / TERRAIN_COLS - 0.5) * 30;
        const z = (r / TERRAIN_ROWS - 0.5) * 20 - 2;
        gx[i * 3] = x;
        gx[i * 3 + 1] = 0;
        gx[i * 3 + 2] = z;
        gz[i] = z;
        sz[i] = 0.02 + Math.random() * 0.015;
        ph[i] = Math.random() * Math.PI * 2;
      }
    }
    return { gridX: gx, gridZ: gz, sizes: sz, phases: ph };
  }, []);

  useFrame(({ clock, pointer }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.15;
    const mx = pointer.x * 3;
    const mz = pointer.y * 2;

    const color = new THREE.Color();
    for (let i = 0; i < TERRAIN_COUNT; i++) {
      const baseX = gridX[i * 3];
      const baseZ = gridX[i * 3 + 2];

      const wave1 = Math.sin(baseX * 0.3 + t + phases[i]) * 0.8;
      const wave2 = Math.cos(baseZ * 0.4 + t * 0.7) * 0.5;
      const wave3 = Math.sin((baseX + baseZ) * 0.2 + t * 0.5) * 0.4;
      const distFromCenter = Math.sqrt(baseX * baseX + baseZ * baseZ);
      const fadeEdge = Math.max(0, 1 - distFromCenter / 12);
      const height = (wave1 + wave2 + wave3) * fadeEdge;

      const dm = Math.sqrt((baseX - mx) * (baseX - mx) + (baseZ - mz) * (baseZ - mz));
      const mouseBump = dm < 4 ? (1 - dm / 4) * 0.5 : 0;

      dummy.position.set(baseX, height + mouseBump, baseZ);
      const s = sizes[i] * (0.6 + fadeEdge * 0.4);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const brightness = 0.15 + fadeEdge * 0.45 + mouseBump * 0.3;
      const hue = 0.6 + Math.sin(baseX * 0.1 + t) * 0.05;
      color.setHSL(hue, 0.8, 0.3 + brightness * 0.4);
      color.multiplyScalar(brightness + 0.1);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, TERRAIN_COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.08, 0.08, 0.08]} />
      <meshBasicMaterial transparent toneMapped={false} />
    </instancedMesh>
  );
}

function TerrainLines() {
  const linesRef = useRef<THREE.LineSegments>(null!);
  const maxLines = TERRAIN_ROWS * (TERRAIN_COLS - 1) + TERRAIN_COLS * (TERRAIN_ROWS - 1);
  const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
  const lineColors = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    return g;
  }, [linePositions, lineColors]);

  const mat = useMemo(() => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false }), []);
  const lineObj = useMemo(() => new THREE.LineSegments(geo, mat), [geo, mat]);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime() * 0.15;
    const mx = pointer.x * 3;
    const mz = pointer.y * 2;
    let idx = 0;

    const getPos = (r: number, c: number) => {
      const x = (c / TERRAIN_COLS - 0.5) * 30;
      const z = (r / TERRAIN_ROWS - 0.5) * 20 - 2;
      const wave1 = Math.sin(x * 0.3 + t + r * 0.1) * 0.8;
      const wave2 = Math.cos(z * 0.4 + t * 0.7) * 0.5;
      const wave3 = Math.sin((x + z) * 0.2 + t * 0.5) * 0.4;
      const distFromCenter = Math.sqrt(x * x + z * z);
      const fadeEdge = Math.max(0, 1 - distFromCenter / 12);
      const height = (wave1 + wave2 + wave3) * fadeEdge;
      return [x, height, z] as [number, number, number];
    };

    for (let r = 0; r < TERRAIN_ROWS; r += 2) {
      for (let c = 0; c < TERRAIN_COLS - 1; c += 2) {
        if (idx >= maxLines * 6) break;
        const a = getPos(r, c);
        const b = getPos(r, c + 1);
        const da = Math.sqrt((a[0] - mx) * (a[0] - mx) + (a[2] - mz) * (a[2] - mz));
        const fade = Math.max(0, 1 - Math.sqrt(a[0] * a[0] + a[2] * a[2]) / 12);
        const alpha = fade * 0.2;

        linePositions[idx] = a[0]; linePositions[idx + 1] = a[1]; linePositions[idx + 2] = a[2];
        linePositions[idx + 3] = b[0]; linePositions[idx + 4] = b[1]; linePositions[idx + 5] = b[2];
        lineColors[idx] = COLORS.glow.r * alpha; lineColors[idx + 1] = COLORS.glow.g * alpha; lineColors[idx + 2] = COLORS.glow.b * alpha;
        lineColors[idx + 3] = COLORS.glow.r * alpha; lineColors[idx + 4] = COLORS.glow.g * alpha; lineColors[idx + 5] = COLORS.glow.b * alpha;
        idx += 6;
      }
    }
    for (let r = 0; r < TERRAIN_ROWS - 1; r += 2) {
      for (let c = 0; c < TERRAIN_COLS; c += 2) {
        if (idx >= maxLines * 6) break;
        const a = getPos(r, c);
        const b = getPos(r + 1, c);
        const fade = Math.max(0, 1 - Math.sqrt(a[0] * a[0] + a[2] * a[2]) / 12);
        const alpha = fade * 0.2;

        linePositions[idx] = a[0]; linePositions[idx + 1] = a[1]; linePositions[idx + 2] = a[2];
        linePositions[idx + 3] = b[0]; linePositions[idx + 4] = b[1]; linePositions[idx + 5] = b[2];
        lineColors[idx] = COLORS.glow.r * alpha; lineColors[idx + 1] = COLORS.glow.g * alpha; lineColors[idx + 2] = COLORS.glow.b * alpha;
        lineColors[idx + 3] = COLORS.glow.r * alpha; lineColors[idx + 4] = COLORS.glow.g * alpha; lineColors[idx + 5] = COLORS.glow.b * alpha;
        idx += 6;
      }
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.setDrawRange(0, idx / 3);
  });

  return <primitive object={lineObj} frustumCulled={false} />;
}

function VerticalStreams() {
  const groupRef = useRef<THREE.Group>(null!);

  const streams = useMemo(() => {
    return Array.from({ length: STREAM_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 26,
      z: (Math.random() - 0.5) * 16 - 2,
      speed: 0.001 + Math.random() * 0.002,
      phase: Math.random() * Math.PI * 2,
      particles: Array.from({ length: STREAM_LENGTH }, (_, j) => ({
        offset: j / STREAM_LENGTH,
        size: 0.005 + Math.random() * 0.01,
      })),
    }));
  }, []);

  const meshRefs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    let idx = 0;
    streams.forEach((stream) => {
      stream.particles.forEach((p) => {
        const mesh = meshRefs.current[idx];
        if (mesh) {
          const progress = ((t * stream.speed + p.offset) % 1);
          const y = progress * 10 - 2;
          const sway = Math.sin(t * 0.3 + stream.phase + p.offset * 5) * 0.2;
          mesh.position.set(stream.x + sway, y, stream.z);
          const s = p.size * (0.5 + (1 - progress) * 0.5);
          mesh.scale.setScalar(s);
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.2 * (1 - Math.abs(progress - 0.5) * 2);
        }
        idx++;
      });
    });
  });

  let globalIdx = 0;
  return (
    <group ref={groupRef}>
      {streams.map((stream, si) => (
        <group key={si}>
          {stream.particles.map((_, pi) => {
            const idx = globalIdx++;
            return (
              <mesh key={pi} ref={(el) => { if (el) meshRefs.current[idx] = el; }}>
                <sphereGeometry args={[1, 4, 4]} />
                <meshBasicMaterial color={COLORS.bright} transparent opacity={0.2} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function ScatteredParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { positions, sizes, phases } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const sz = new Float32Array(PARTICLE_COUNT);
    const ph = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = Math.random() * 8 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2;
      sz[i] = 0.01 + Math.random() * 0.04;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, sizes: sz, phases: ph };
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const color = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pulse = Math.sin(t * 0.5 + phases[i]) * 0.5 + 0.5;
      dummy.position.set(
        positions[i * 3] + Math.sin(t * 0.05 + phases[i]) * 0.3,
        positions[i * 3 + 1] + Math.cos(t * 0.04 + phases[i]) * 0.2,
        positions[i * 3 + 2]
      );
      const s = sizes[i] * (0.5 + pulse * 0.5);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const brightness = 0.3 + pulse * 0.5;
      color.copy(COLORS.bright).multiplyScalar(brightness);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent toneMapped={false} />
    </instancedMesh>
  );
}

function HUD() {
  const groupRef = useRef<THREE.Group>(null!);

  const panels = useMemo(() => [
    { pos: [-8, 4, -6] as [number, number, number], text: "DATA POINT 01" },
    { pos: [6, 3, -8] as [number, number, number], text: "TOTAL ANALYSIS" },
    { pos: [-3, 5, -10] as [number, number, number], text: "DATA 01" },
    { pos: [9, 2, -7] as [number, number, number], text: "DATA ANALYTICS" },
    { pos: [-6, 1, -5] as [number, number, number], text: "ANALYSING DATA" },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.1;
    groupRef.current.children.forEach((child, i) => {
      child.position.y = panels[i].pos[1] + Math.sin(t + i) * 0.2;
      child.lookAt(0, child.position.y, 5);
    });
  });

  return (
    <group ref={groupRef}>
      {panels.map((p, i) => (
        <group key={i} position={p.pos}>
          <mesh>
            <planeGeometry args={[1.5, 0.08]} />
            <meshBasicMaterial color={COLORS.glow} transparent opacity={0.15} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <planeGeometry args={[1.2, 0.04]} />
            <meshBasicMaterial color={COLORS.glow} transparent opacity={0.08} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <planeGeometry args={[0.8, 0.03]} />
            <meshBasicMaterial color={COLORS.bright} transparent opacity={0.1} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.03} color="#F8FAFC" />
      <pointLight position={[0, 5, 5]} intensity={0.3} color="#3B82F6" distance={25} decay={2} />
      <pointLight position={[-5, 2, -3]} intensity={0.15} color="#7AA8FF" distance={20} decay={2} />
    </>
  );
}

function SceneSetup() {
  const { scene } = useThree();
  useMemo(() => {
    scene.fog = new THREE.FogExp2("#050608", 0.035);
    scene.background = COLORS.bg;
  }, [scene]);
  return null;
}

function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.6} luminanceThreshold={0.3} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
      <DepthOfField focusDistance={0.02} focalLength={0.06} bokehScale={3} height={480} />
      <Vignette eskil={false} offset={0.15} darkness={0.9} />
    </EffectComposer>
  );
}

function Scene() {
  return (
    <>
      <SceneSetup />
      <CameraRig />
      <Lighting />
      <DataTerrain />
      <TerrainLines />
      <VerticalStreams />
      <ScatteredParticles />
      <HUD />
      <PostProcessing />
    </>
  );
}

export function ParticleBackground() {
  return (
    <div className="fixed inset-0 z-0" style={{ background: "#050608" }}>
      <Canvas
        camera={{ position: [0, 2, 12], fov: 55, near: 0.1, far: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", stencil: false, depth: true }}
        style={{ background: "#050608" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
