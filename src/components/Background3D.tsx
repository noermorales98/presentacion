import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SceneParams } from "@/config/presentation";

const BLUE = new THREE.Color("#2F5BFF");
const LIME = new THREE.Color("#B6FF3B");

/** estado interpolado actual → objetivo por diapositiva */
interface LiveScene extends SceneParams {
  color: THREE.Color;
}

function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.35, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function Background3D({ scene }: { scene: SceneParams }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<SceneParams>(scene);

  useEffect(() => {
    targetRef.current = scene;
  }, [scene]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const world = new THREE.Group();
    const ringGroup = new THREE.Group();
    world.add(ringGroup);

    // Anillo principal: toro muy delgado
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.008, 16, 220),
      new THREE.MeshBasicMaterial({ color: BLUE.clone(), transparent: true, opacity: 0.9 })
    );
    ringGroup.add(torus);

    // Segundo anillo discontinuo (línea punteada)
    const pts: THREE.Vector3[] = [];
    const R2 = 3.1;
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * R2, Math.sin(a) * R2, 0));
    }
    const dashed = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({
        color: LIME.clone(),
        dashSize: 0.09,
        gapSize: 0.16,
        transparent: true,
        opacity: 0.35,
      })
    );
    dashed.computeLineDistances();
    ringGroup.add(dashed);

    // Resplandor central suave
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: BLUE.clone(),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.scale.setScalar(7);
    world.add(glow);

    // Campo de partículas: disco galáctico plano
    const COUNT = 1400;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 1.6 + Math.pow(Math.random(), 0.7) * 4.6;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * (0.5 + r * 0.16);
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = Math.random() * Math.PI * 2;
      const c = BLUE.clone().lerp(LIME, Math.random() * 0.25);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.028,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        // mezcla normal (no aditiva): las partículas se ven también sobre fondos claros
        blending: THREE.NormalBlending,
        sizeAttenuation: true,
      })
    );
    world.add(particles);
    world.rotation.x = 0.5;
    world.position.y = -0.15;
    world.position.x = 1.4; // ancla lateral: el contenido respira a la izquierda

    const scene3 = new THREE.Scene();
    scene3.add(world);

    const live: LiveScene = { ...targetRef.current, color: BLUE.clone() };
    const limeShift = new THREE.Color();
    const clock = new THREE.Clock();
    let raf = 0;
    let rafActive = false;
    let contextLost = false;
    let disposed = false;

    const tick = () => {
      rafActive = false;
      if (disposed || contextLost) return;
      const t = clock.getElapsedTime();
      const tgt = targetRef.current;
      const k = reduced ? 1 : 0.045; // suavizado exponencial

      live.mix += (tgt.mix - live.mix) * k;
      live.tiltX += (tgt.tiltX - live.tiltX) * k;
      live.tiltY += (tgt.tiltY - live.tiltY) * k;
      live.ringSpeed += (tgt.ringSpeed - live.ringSpeed) * k;
      live.drift += (tgt.drift - live.drift) * k;
      live.ringScale += (tgt.ringScale - live.ringScale) * k;
      live.ringOpacity += (tgt.ringOpacity - live.ringOpacity) * k;

      // azul siempre dominante; el lima entra solo como tinte secundario
      live.color.copy(BLUE).lerp(LIME, live.mix * 0.45);
      (torus.material as THREE.MeshBasicMaterial).color.copy(live.color);
      (dashed.material as THREE.LineDashedMaterial).color.copy(
        limeShift.copy(LIME).lerp(BLUE, live.mix * 0.5)
      );
      (glow.material as THREE.SpriteMaterial).color.copy(live.color);
      (torus.material as THREE.MeshBasicMaterial).opacity = live.ringOpacity;
      (dashed.material as THREE.LineDashedMaterial).opacity = 0.35 * live.ringOpacity;

      ringGroup.rotation.z = reduced ? 0.6 : t * live.ringSpeed;
      ringGroup.rotation.x = live.tiltX;
      ringGroup.rotation.y = live.tiltY;
      ringGroup.scale.setScalar(live.ringScale);

      if (!reduced) {
        particles.rotation.y = t * live.drift;
        particles.rotation.z = Math.sin(t * 0.08) * 0.05;
        ringGroup.position.y = Math.sin(t * 0.4) * 0.06;
        glow.material.opacity = 0.13 + Math.sin(t * 0.6) * 0.03;
      }
      renderer.render(scene3, camera);
      if (!reduced && !disposed && !contextLost) {
        rafActive = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (!reduced && !disposed && !contextLost && !document.hidden && !rafActive) {
        rafActive = true;
        raf = requestAnimationFrame(tick);
      }
    };

    // si la GPU bajo estrés pierde el contexto WebGL, la app NO muere:
    // se pausa el render y se reanuda solo al restaurarse
    const canvas = renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      if (rafActive) cancelAnimationFrame(raf);
      rafActive = false;
    };
    const onContextRestored = () => {
      contextLost = false;
      schedule();
    };
    // pausar el render cuando la pestaña queda oculta (libera GPU; el resto sigue vivo)
    const onVisibility = () => {
      if (document.hidden) {
        if (rafActive) cancelAnimationFrame(raf);
        rafActive = false;
      } else {
        schedule();
      }
    };
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);
    document.addEventListener("visibilitychange", onVisibility);

    schedule();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      if (reduced && !contextLost) renderer.render(scene3, camera);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      if (rafActive) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      document.removeEventListener("visibilitychange", onVisibility);
      torus.geometry.dispose();
      (torus.material as THREE.Material).dispose();
      dashed.geometry.dispose();
      (dashed.material as THREE.Material).dispose();
      pGeo.dispose();
      (particles.material as THREE.Material).dispose();
      (glow.material as THREE.SpriteMaterial).map?.dispose();
      (glow.material as THREE.Material).dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-90"
    />
  );
}
