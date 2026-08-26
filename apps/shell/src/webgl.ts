import * as THREE from 'three';

export function initWebGLBackground(canvas: HTMLCanvasElement) {
  const scene = new THREE.Scene();
  
  // Use OrthographicCamera since we just want a 2D fluid-like effect
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // performance
  
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  renderer.setSize(width, height, false);

  // A simple shader material for a fluid wave effect
  const uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(width, height) },
    u_color1: { value: new THREE.Color('#00a693') }, // teal
    u_color2: { value: new THREE.Color('#daa520') }, // gold
    u_theme: { value: document.documentElement.dataset.theme === 'dark' ? 1.0 : 0.0 }
  };

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform float u_theme;
    
    varying vec2 vUv;

    // Simplex noise function
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 st = gl_FragCoord.xy/u_resolution.xy;
      st.x *= u_resolution.x/u_resolution.y;

      float n = snoise(vec2(st.x * 2.0 + u_time * 0.1, st.y * 2.0 + u_time * 0.15));
      n += snoise(vec2(st.x * 4.0 - u_time * 0.2, st.y * 4.0 + u_time * 0.1));
      
      n = n * 0.5 + 0.5;

      vec3 color = mix(u_color1, u_color2, n);
      
      // Make it subtle and blend with background
      float alpha = mix(0.15, 0.05, u_theme); 
      
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Resize handler
  function onWindowResize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    uniforms.u_resolution.value.set(width, height);
  }
  window.addEventListener('resize', onWindowResize);

  // Theme update handler
  window.addEventListener('theme-changed', (e: Event) => {
    const customEvent = e as CustomEvent;
    uniforms.u_theme.value = customEvent.detail.theme === 'dark' ? 1.0 : 0.0;
  });

  // Intersection Observer to pause rendering when out of view
  let isVisible = true;
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  });
  observer.observe(canvas.parentElement!);

  // Animation Loop
  let frameId: number;
  function render(time: number) {
    if (isVisible) {
      uniforms.u_time.value = time * 0.001;
      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(render);
  }
  
  frameId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onWindowResize);
    observer.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
