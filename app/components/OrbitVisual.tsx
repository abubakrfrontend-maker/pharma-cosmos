"use client";

import { useEffect, useId, useRef, useState } from "react";
import "./OrbitVisual.css";

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;
uniform mat4 uModel;
uniform mat4 uViewProjection;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;
void main() {
  vec4 p = uModel * vec4(aPosition, 1.0);
  vPosition = p.xyz;
  vNormal = mat3(uModel) * aNormal;
  vUV = aUV;
  gl_Position = uViewProjection * p;
}`;

const fragmentSource = `
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;
uniform float uRing;
uniform float uBack;
const float PI = 3.141592653589793;
vec3 environment(vec3 r) {
  vec3 ivory = vec3(0.963, 0.957, 0.937);
  vec3 ink = vec3(0.055, 0.15, 0.19);
  float horizon = exp(-pow((r.y + 0.18) * 9.0, 2.0));
  float seam = exp(-pow((r.x + r.y * 0.2 - 0.17) * 15.0, 2.0));
  vec3 col = mix(ivory, ink, horizon * 0.73 + seam * 0.12);
  float box = smoothstep(0.65, 0.87, dot(r, normalize(vec3(-0.8, 1.0, 1.5))));
  float ribbon = exp(-pow((r.x - r.y * 0.23 + 0.6) * 17.0, 2.0));
  col += vec3(0.6) * box + vec3(0.82) * ribbon;
  col = mix(col, vec3(1.0, 0.46, 0.12), 0.2 * (1.0 - smoothstep(-0.9, -0.1, r.y)));
  return col;
}
void main() {
  vec3 n = normalize(vNormal);
  if (uBack > 0.5) n = -n;
  vec3 view = normalize(vec3(0.0, 0.0, 5.0) - vPosition);
  float ndv = abs(dot(n, view));
  float fresnel = pow(1.0 - ndv, 3.0);
  vec3 refl = reflect(-view, n);
  vec3 reflected = environment(refl);
  vec3 refracted = environment(refract(-view, n, 0.72));
  float angular = smoothstep(-0.15, 0.8, -sin(vUV.x * 2.0 * PI + uRing * 0.76));
  float internalBand = pow(max(0.0, cos(vUV.y * 2.0 * PI - 0.55)), 9.0);
  float orange = angular * (internalBand * 0.85 + fresnel * 0.32);
  vec3 amber = mix(vec3(1.0, 0.68, 0.19), vec3(1.0, 0.29, 0.025), internalBand);
  vec3 glass = mix(vec3(0.94, 0.955, 0.95), refracted, 0.32);
  glass = mix(glass, reflected, 0.36 + fresnel * 0.57);
  glass = mix(glass, amber, orange);
  vec3 light = normalize(vec3(-3.0, 4.0, 4.0) - vPosition);
  vec3 halfDir = normalize(light + view);
  float spec = pow(max(dot(n, halfDir), 0.0), 125.0);
  float spec2 = pow(max(dot(n, normalize(vec3(2.0, -0.5, 3.0) + view)), 0.0), 210.0);
  glass += vec3(0.92) * spec + vec3(1.0, 0.8, 0.5) * spec2 * 0.6;
  float opacity = 0.24 + fresnel * 0.64 + orange * 0.30 + spec * 0.2;
  if (uBack > 0.5) opacity *= 0.55;
  gl_FragColor = vec4(clamp(glass, 0.0, 1.0), clamp(opacity, 0.0, 0.96));
}`;

function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
    }
  }
  return out;
}

function modelMatrix(x: number, y: number, z: number, scale: number, lift: number) {
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  const rx = new Float32Array([1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1]);
  const ry = new Float32Array([cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1]);
  const rz = new Float32Array([cz,sz,0,0, -sz,cz,0,0, 0,0,1,0, 0,0,0,1]);
  const m = multiply(rz, multiply(ry, rx));
  for (let i = 0; i < 12; i++) m[i] *= scale;
  m[13] = lift;
  return m;
}

function makeTorus() {
  const positions: number[] = [], normals: number[] = [], uv: number[] = [], indices: number[] = [];
  const radial = 160, tubular = 28, radius = 1.08, thickness = 0.105;
  for (let i = 0; i <= radial; i++) {
    const u = i / radial * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= tubular; j++) {
      const v = j / tubular * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      positions.push((radius + thickness * cv) * cu, (radius + thickness * cv) * su, thickness * sv);
      normals.push(cv * cu, cv * su, sv);
      uv.push(i / radial, j / tubular);
      if (i < radial && j < tubular) {
        const a = i * (tubular + 1) + j, b = a + tubular + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), uv: new Float32Array(uv), indices: new Uint16Array(indices) };
}

export default function OrbitVisual({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const id = useId().replace(/:/g, "");

  useEffect(() => {
    const element = host.current, surface = canvas.current;
    if (!element || !surface) return;
    const gl = surface.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;
    const shaders: WebGLShader[] = [], buffers: WebGLBuffer[] = [];
    let program: WebGLProgram | null = null;
    let frame = 0, last = 0, elapsed = 0, visible = true, dead = false;
    let width = 1, height = 1;
    let px = 0, py = 0, targetX = 0, targetY = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Shader creation failed");
        shaders.push(shader);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
        return shader;
      };
      program = gl.createProgram();
      if (!program) throw new Error("Program creation failed");
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Program linking failed");
      gl.useProgram(program);
      const geometry = makeTorus();
      const attribute = (name: string, data: Float32Array, size: number) => {
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error("Buffer creation failed");
        buffers.push(buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const location = gl.getAttribLocation(program!, name);
        gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      };
      attribute("aPosition", geometry.positions, 3);
      attribute("aNormal", geometry.normals, 3);
      attribute("aUV", geometry.uv, 2);
      const indexBuffer = gl.createBuffer();
      if (!indexBuffer) throw new Error("Index buffer creation failed");
      buffers.push(indexBuffer); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);
      const model = gl.getUniformLocation(program, "uModel"), vp = gl.getUniformLocation(program, "uViewProjection");
      const ring = gl.getUniformLocation(program, "uRing"), back = gl.getUniformLocation(program, "uBack");
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.CULL_FACE);
      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);

      const render = (time: number) => {
        frame = 0;
        if (dead || !visible || document.hidden || gl.isContextLost()) return;
        const interval = width < 600 ? 1000 / 30 : 1000 / 45;
        if (!reduced.matches && last && time - last < interval) { frame = requestAnimationFrame(render); return; }
        const delta = last ? Math.min((time - last) / 1000, 0.08) : 0;
        last = time;
        if (!reduced.matches) elapsed += delta;
        px += ((reduced.matches ? 0 : targetX) - px) * 0.065;
        py += ((reduced.matches ? 0 : targetY) - py) * 0.065;
        gl.viewport(0, 0, surface.width, surface.height); gl.clear(gl.COLOR_BUFFER_BIT);
        const aspect = width / height, fov = 36 * Math.PI / 180, f = 1 / Math.tan(fov / 2), n = 0.1, far = 30;
        const projection = new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+n)/(n-far),-1, 0,0,(2*far*n)/(n-far),0]);
        const view = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-4.65,1]);
        gl.uniformMatrix4fv(vp, false, multiply(projection, view));
        const sway = Math.sin(elapsed * 0.18) * 0.09;
        const lift = Math.sin(elapsed * 0.45) * 0.035;
        const rings = [
          { x: 0.92 + sway + py * 0.13, y: -0.27 + px * 0.16, z: -0.60, s: 1.08, yPos: 0.08 + lift },
          { x: 0.10 - sway * 0.5 + py * 0.12, y: 0.61 + px * 0.17, z: -0.58, s: 0.96, yPos: 0.04 + lift },
          { x: 1.65 + sway * 0.7 + py * 0.14, y: -0.10 + px * 0.14, z: -0.53, s: 1.01, yPos: -0.03 + lift },
        ];
        for (let pass = 0; pass < 2; pass++) {
          gl.cullFace(pass === 0 ? gl.FRONT : gl.BACK);
          gl.uniform1f(back, pass === 0 ? 1 : 0);
          rings.forEach((r, i) => {
            gl.uniformMatrix4fv(model, false, modelMatrix(r.x, r.y, r.z, r.s, r.yPos));
            gl.uniform1f(ring, i);
            gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);
          });
        }
        if (!reduced.matches) frame = requestAnimationFrame(render);
      };
      const kick = () => { if (!frame && !dead && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(render); } };
      const resize = () => {
        const rect = element.getBoundingClientRect();
        width = Math.max(1, rect.width); height = Math.max(1, rect.height);
        // Pixel budget stays bounded on phones and high-DPI desktop displays.
        const dpr = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.35 : 1.65, Math.sqrt(1000000 / (width * height)));
        surface.width = Math.round(width * dpr); surface.height = Math.round(height * dpr);
        kick();
      };
      const pointer = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" || reduced.matches) return;
        const rect = element.getBoundingClientRect();
        targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      };
      const leave = () => { targetX = 0; targetY = 0; };
      const pause = () => { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; };
      const visibility = () => { if (document.hidden) pause(); else kick(); };
      const motionChange = () => { pause(); kick(); };
      const lost = (event: Event) => { event.preventDefault(); dead = true; pause(); setReady(false); };
      const restored = () => { /* The graceful SVG remains until the next mount. */ setReady(false); };
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); else pause(); }, { rootMargin: "80px" });
      const resizer = new ResizeObserver(resize);
      observer.observe(element); resizer.observe(element);
      window.addEventListener("pointermove", pointer, { passive: true });
      window.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", visibility);
      reduced.addEventListener("change", motionChange);
      surface.addEventListener("webglcontextlost", lost);
      surface.addEventListener("webglcontextrestored", restored);
      resize(); setReady(true);

      return () => {
        dead = true; pause(); observer.disconnect(); resizer.disconnect();
        window.removeEventListener("pointermove", pointer); window.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", visibility); reduced.removeEventListener("change", motionChange);
        surface.removeEventListener("webglcontextlost", lost); surface.removeEventListener("webglcontextrestored", restored);
        buffers.forEach((buffer) => gl.deleteBuffer(buffer)); shaders.forEach((shader) => gl.deleteShader(shader));
        if (program) gl.deleteProgram(program);
      };
    } catch {
      buffers.forEach((buffer) => gl.deleteBuffer(buffer)); shaders.forEach((shader) => gl.deleteShader(shader));
      if (program) gl.deleteProgram(program);
      setReady(false);
    }
  }, []);

  return (
    <div className={`orbit-visual ${ready ? "orbit-visual--ready" : ""} ${className}`} ref={host} aria-hidden="true">
      <div className="orbit-visual__halo" />
      <div className="orbit-visual__shadow" />
      <svg className="orbit-visual__fallback" viewBox="0 0 680 650" fill="none">
        <defs>
          <linearGradient id={`${id}-glass`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#fff" /><stop offset=".16" stopColor="#adbbc0" stopOpacity=".45" /><stop offset=".28" stopColor="#fff" />
            <stop offset=".43" stopColor="#ff6a28" stopOpacity=".9" /><stop offset=".52" stopColor="#ffcf85" />
            <stop offset=".59" stopColor="#fff" stopOpacity=".8" /><stop offset=".78" stopColor="#8d9da7" stopOpacity=".5" /><stop offset="1" stopColor="#fff" />
          </linearGradient>
        </defs>
        {[[-35, 185, 109], [38, 185, 111], [-18, 219, 66]].map(([angle, rx, ry], index) => (
          <g key={index} transform={`translate(340 300) rotate(${angle})`}>
            <ellipse rx={rx} ry={ry} stroke="#79909b" strokeOpacity=".2" strokeWidth="35" />
            <ellipse rx={rx} ry={ry} stroke={`url(#${id}-glass)`} strokeWidth="31" />
            <ellipse rx={rx + 13} ry={ry + 13} stroke="white" strokeOpacity=".9" strokeWidth="2" />
            <ellipse rx={rx - 13} ry={ry - 13} stroke="#ff742a" strokeOpacity=".48" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <canvas className="orbit-visual__canvas" ref={canvas} />
      <span className="orbit-visual__satellite" />
    </div>
  );
}


