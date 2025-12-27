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

  React.useEffect(() => {
    if (geometry) {
      console.log('[ThreePreview] Geometry loaded:', {
        vertices: geometry.attributes.position?.count || 0,
        hasNormals: !!geometry.attributes.normal,
        boundingBox: geometry.boundingBox,
      });
    } else {
      console.log('[ThreePreview] No geometry provided');
    }
  }, [geometry]);

  if (!geometry) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#666666" wireframe />
      </mesh>
    );
  }

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial color="#4a90e2" />
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
    <div style={{ position: "absolute", inset: 0, background: "#1a1a1a" }}>
      <Canvas 
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#1a1a1a"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 2]} intensity={1} />
        <pointLight position={[-3, -5, -2]} intensity={0.5} />
        <OrbitControls makeDefault />
        <PreviewMesh geometry={geometry} mode={mode} />
      </Canvas>
    </div>
  );
}
