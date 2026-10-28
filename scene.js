/* The homepage keeps its interactive 3D feature; shopping uses real photographs. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  if (!$('#product-scene')) return;
  const { colors, catalog, productUrl } = window.AuroraCatalog;
  let updateHeroModel = () => {};
  $$('[data-hero-color]').forEach((button) => button.addEventListener('click', () => {
    const color = button.dataset.heroColor;
    updateHeroModel(color);
    $('.scene-fallback svg path').setAttribute('fill', colors[color].hex);
    $('#product-scene').setAttribute('aria-label', 'Interactive Boreal puffer jacket in ' + colors[color].name);
    $('.hero-feature p').textContent = colors[color].name + ' / Everyday insulation';
    $('.hero-feature [data-product]').href = productUrl(catalog.boreal, color);
    $$('[data-hero-color]').forEach((swatch) => {
      swatch.classList.toggle('selected', swatch === button);
      swatch.setAttribute('aria-pressed', String(swatch === button));
    });
  }));
  try {
    if (!window.THREE) throw new Error('Three.js unavailable');
    initializeEquipmentScene();
  } catch (error) {
    console.warn('Using the homepage jacket illustration.', error);
    $('#product-scene').hidden = true;
    $('.scene-fallback').hidden = false;
    $('.visual-bottom>span').innerHTML = '<span class="live-dot"></span> DESIGNED FOR THE EVERYDAY';
  }

  function initializeEquipmentScene() {
    const T = window.THREE;
    const canvas = $('#product-scene');
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xf5f5df, 0x273326, .65));
    const key = new T.DirectionalLight(0xf6f8ea, 1.8); key.position.set(-4, 7, 6); scene.add(key);
    const fill = new T.DirectionalLight(0xb6cca4, .55); fill.position.set(5, 2, 3); scene.add(fill);
    const rim = new T.DirectionalLight(0xb9ec80, 1.6); rim.position.set(3, 4, -5); scene.add(rim);
    const camera = new T.PerspectiveCamera(36, 1, .1, 60);
    camera.position.set(0, .1, 8.8);
    camera.lookAt(0, 0, 0);

    // Fine woven texture adds surface grain without external image dependencies.
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = textureCanvas.height = 128;
    const ctx = textureCanvas.getContext('2d');
    const texturePixels = ctx.createImageData(128, 128);
    let seed = 1743;
    for (let i = 0; i < texturePixels.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const value = 125 + (seed % 35);
      texturePixels.data[i] = texturePixels.data[i + 1] = texturePixels.data[i + 2] = value;
      texturePixels.data[i + 3] = 255;
    }
    ctx.putImageData(texturePixels, 0, 0);
    const texture = new T.CanvasTexture(textureCanvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(8, 8);
    const trim = new T.MeshStandardMaterial({ color: '#20271f', roughness: .8 });
    const metal = new T.MeshStandardMaterial({ color: '#8d9880', metalness: .6, roughness: .35 });
    const label = new T.MeshStandardMaterial({ color: '#c4f36a', roughness: .8 });
    const inner = new T.MeshStandardMaterial({ color: '#1b221a', roughness: 1, side: T.DoubleSide });
    [trim, metal, label, inner].forEach((material) => material.color.convertSRGBToLinear());

    function fabric(color, fleece = false) {
      const material = new T.MeshStandardMaterial({ color, roughness: fleece ? .98 : .58, metalness: fleece ? 0 : .09, bumpMap: texture, bumpScale: fleece ? .032 : .008, side: T.DoubleSide });
      material.color.convertSRGBToLinear();
      return material;
    }
    function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
      const object = new T.Mesh(geometry, material);
      object.position.set(x, y, z); parent.add(object); return object;
    }
    function box(parent, width, height, depth, material, x, y, z, rotation = 0) {
      const object = mesh(new T.BoxGeometry(width, height, depth), material, parent, x, y, z);
      object.rotation.z = rotation; return object;
    }
    function rounded(parent, width, height, depth, radius, material, x, y, z) {
      const shape = new T.Shape(); const w = width / 2, h = height / 2, r = radius;
      shape.moveTo(-w + r, -h); shape.lineTo(w - r, -h); shape.quadraticCurveTo(w, -h, w, -h + r);
      shape.lineTo(w, h - r); shape.quadraticCurveTo(w, h, w - r, h); shape.lineTo(-w + r, h); shape.quadraticCurveTo(-w, h, -w, h - r);
      shape.lineTo(-w, -h + r); shape.quadraticCurveTo(-w, -h, -w + r, -h);
      const geometry = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 3, steps: 1, curveSegments: 8 });
      return mesh(geometry, material, parent, x, y, z - depth / 2);
    }
    function ring(parent, rx, rz, y, radius = .012, material = trim) {
      const curve = new T.EllipseCurve(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
      const points = curve.getPoints(80).map((point) => new T.Vector3(point.x, y, point.y));
      return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points, true), 80, radius, 5, true), material, parent);
    }
    function tube(parent, material, { bottom, top, rx, rz, puff = .1, segments = 1, taper = 0, cap = true }) {
      const vertices = [], uvs = [], indices = [];
      const radial = 72, vertical = Math.max(18, segments * 12);
      for (let j = 0; j <= vertical; j++) {
        const t = j / vertical;
        const wave = Math.pow(Math.max(0, Math.sin((t * segments % 1) * Math.PI)), .65) * puff;
        const width = rx * (1 + taper * (t - .5)) + wave;
        const depth = rz + wave * .65;
        for (let i = 0; i <= radial; i++) {
          const angle = i / radial * Math.PI * 2;
          // A soft superellipse gives the front a tailored, flatter surface.
          const sin = Math.sin(angle), cos = Math.cos(angle);
          const x = Math.sign(cos) * Math.pow(Math.abs(cos), .83) * width;
          const z = Math.sign(sin) * Math.pow(Math.abs(sin), .83) * depth;
          const wrinkle = Math.sin(angle * 17 + t * 29) * Math.sin(t * Math.PI) * .004;
          vertices.push(x + wrinkle, bottom + (top - bottom) * t, z + wrinkle);
          uvs.push(i / radial, t);
          if (j < vertical && i < radial) {
            const a = j * (radial + 1) + i, b = a + radial + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
        }
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
      const object = mesh(geo, material, parent);
      if (cap) {
        for (const [y, width] of [[bottom, rx * (1 - taper / 2)], [top, rx * (1 + taper / 2)]]) {
          const end = mesh(new T.CircleGeometry(1, 64), material, parent, 0, y, 0);
          end.rotation.x = Math.PI / 2; end.scale.set(width, rz, 1);
        }
      }
      return object;
    }
    function brandPatch(parent, x, y, z) {
      box(parent, .26, .105, .016, label, x, y, z);
      const shape = new T.Shape(); shape.moveTo(-.04, -.027); shape.lineTo(0, .031); shape.lineTo(.04, -.027); shape.lineTo(.023, -.027); shape.lineTo(0, .007); shape.lineTo(-.023, -.027); shape.closePath();
      mesh(new T.ShapeGeometry(shape), trim, parent, x, y, z + .012);
    }
    function zipper(parent, top, bottom, z) {
      box(parent, .055, top - bottom, .022, trim, 0, (top + bottom) / 2, z);
      for (let y = bottom + .02; y < top; y += .05) box(parent, .025, .018, .01, metal, 0, y, z + .016);
      box(parent, .047, .12, .025, metal, .015, top - .16, z + .035, -.16);
    }
    function createJacket(product, color) {
      const group = new T.Group(), cloth = fabric(colors[color].hex, product.id === 'drift');
      group.userData.cloth = cloth;
      const fleece = product.id === 'drift', vest = product.id === 'terrain';
      const width = vest ? .9 : 1.0, bottom = -1.22, top = .9;
      tube(group, cloth, { bottom, top, rx: width, rz: .37, puff: fleece ? .025 : .11, segments: fleece ? 1 : 6, taper: .09 });
      // Sloping shoulder panels close the torso around the neck.
      const shoulder = mesh(new T.SphereGeometry(1, 48, 24), cloth, group, 0, .87, 0);
      shoulder.scale.set(width * 1.03, .22, .39);
      if (!fleece) for (let i = 0; i <= 6; i++) ring(group, width * (1 + .09 * (i / 6 - .5)), .375, bottom + (top - bottom) * i / 6, .009, cloth);
      ring(group, width * .96, .38, bottom, .045, trim);
      // Open stand collar, with a dark lining visible from the camera.
      tube(group, cloth, { bottom: .91, top: 1.35, rx: .46, rz: .31, puff: .055, segments: 1, taper: .1, cap: false });
      tube(group, inner, { bottom: 1.05, top: 1.34, rx: .412, rz: .266, puff: 0, cap: false });
      ring(group, .484, .328, 1.35, .022, cloth);
      const neckBottom = mesh(new T.CircleGeometry(.42, 48), inner, group, 0, 1.06, 0); neckBottom.rotation.x = -Math.PI / 2; neckBottom.scale.y = .65;
      if (!vest) {
        for (const side of [-1, 1]) {
          const sleeve = new T.Group(); group.add(sleeve);
          sleeve.position.set(side * 1.01, .7, -.015); sleeve.rotation.z = side * .29;
          tube(sleeve, cloth, { bottom: -1.94, top: .13, rx: .30, rz: .32, puff: fleece ? .018 : .07, segments: fleece ? 1 : 6, taper: .4 });
          const sleeveCap = mesh(new T.SphereGeometry(1, 32, 20), cloth, sleeve, 0, .08, 0); sleeveCap.scale.set(.36, .25, .36);
          tube(sleeve, trim, { bottom: -2.04, top: -1.91, rx: .258, rz: .28, puff: .008, cap: true });
        }
      } else {
        // Dark armhole trim emphasizes the vest silhouette.
        for (const side of [-1, 1]) {
          const armhole = ring(group, .21, .33, 0, .04, trim);
          armhole.rotation.z = Math.PI / 2; armhole.position.set(side * .92, .57, 0);
        }
      }
      zipper(group, 1.31, -1.22, .457);
      for (const side of [-1, 1]) {
        const pocket = box(group, .025, .49, .025, trim, side * .64, -.64, .455, side * -.18);
        box(group, .034, .09, .025, metal, side * .66, -.46, .48, side * -.18);
        pocket.userData.detail = true;
      }
      if (fleece) {
        rounded(group, .38, .45, .035, .035, trim, .58, .35, .405);
        box(group, .29, .02, .025, metal, .58, .51, .447);
      }
      brandPatch(group, .58, fleece ? .32 : .47, fleece ? .452 : .46);
      group.rotation.set(-.04, -.28, -.10);
      return group;
    }
    const hero = createJacket(catalog.boreal, 'glacier');
    scene.add(hero);
    updateHeroModel = (color) => hero.userData.cloth.color.set(colors[color].hex).convertSRGBToLinear();
    function resize() {
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.position.z = camera.aspect < .92 ? 10.4 : 8.7;
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
    let dragging = false, lastX = 0, lastY = 0, dragRotation = 0, dragTilt = 0;
    canvas.addEventListener('pointerdown', (event) => { dragging = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      dragRotation += (event.clientX - lastX) * .009;
      dragTilt = Math.max(-.3, Math.min(.3, dragTilt + (event.clientY - lastY) * .003));
      lastX = event.clientX; lastY = event.clientY;
    });
    canvas.addEventListener('pointerup', () => { dragging = false; });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = true;
    new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }).observe(canvas);
    function animate(time) {
      requestAnimationFrame(animate);
      if (document.hidden || !inView) return;
      const motion = reducedMotion.matches ? 0 : 1;
      hero.rotation.y = -.28 + dragRotation + Math.sin(time * .00033) * .13 * motion;
      hero.rotation.x = -.04 + dragTilt;
      hero.rotation.z = -.1 + Math.sin(time * .00045) * .018 * motion;
      hero.position.y = .05 + Math.sin(time * .0008) * .045 * motion;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }
})();

