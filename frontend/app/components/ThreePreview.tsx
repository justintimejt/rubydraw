import * as React from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";

function PreviewMesh({
  geometry,
  mode,
}: {
  geometry: THREE.BufferGeometry | null;
  mode: "spin" | "bob";
}) {
  const ref = React.useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;

    if (mode === "spin") {
      m.rotation.y += dt * 0.8;
    } else {
      m.position.y = Math.sin(performance.now() / 450) * 0.15;
    }
  });

  if (!geometry) return null;

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial />
    </mesh>
  );
}

export function ThreePreview({
  geometry,
  mode = "spin",
}: {
  geometry: THREE.BufferGeometry | null;
  mode?: "spin" | "bob";
}) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1} />
        <OrbitControls makeDefault />
        <PreviewMesh geometry={geometry} mode={mode} />
      </Canvas>
    </div>
  );
}
