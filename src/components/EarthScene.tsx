import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Earth() {
  const coreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.15;
    if (wireRef.current) wireRef.current.rotation.y += delta * 0.15;
    if (glowRef.current) glowRef.current.rotation.y -= delta * 0.08;
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshStandardMaterial color="#0B1120" emissive="#16A34A" emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[1.61, 32, 32]} />
        <meshBasicMaterial color="#22C55E" wireframe transparent opacity={0.25} />
      </mesh>
      <mesh ref={glowRef} scale={1.18}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color="#22C55E" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2.2, 0, 0]} scale={1.35}>
        <torusGeometry args={[1.6, 0.012, 16, 100]} />
        <meshBasicMaterial color="#84CC16" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function OrbitingNodes() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  const nodes = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const radius = 2.4 + (i % 3) * 0.3;
        const y = Math.sin(i * 1.7) * 0.6;
        return { angle, radius, y, i };
      }),
    []
  );

  return (
    <group ref={groupRef}>
      {nodes.map((n) => (
        <mesh key={n.i} position={[Math.cos(n.angle) * n.radius, n.y, Math.sin(n.angle) * n.radius]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color={n.i % 2 ? '#84CC16' : '#22C55E'} />
        </mesh>
      ))}
    </group>
  );
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      const r = 3 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.02} color="#4ade80" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export default function EarthScene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 3, 5]} intensity={2} color="#22C55E" />
      <pointLight position={[-5, -2, -3]} intensity={1} color="#84CC16" />
      <Suspense fallback={null}>
        <Earth />
        <OrbitingNodes />
        <ParticleField />
        <Stars radius={50} depth={50} count={1500} factor={4} fade speed={1} />
      </Suspense>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
}
