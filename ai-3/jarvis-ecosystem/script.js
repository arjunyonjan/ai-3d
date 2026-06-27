(function() {
  var data = window.ECOSYSTEM_DATA;
  if (!data) return;

  // ── Scene ─────────────────────────────────────────────
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1410);

  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.cursor = 'grab';
  document.body.appendChild(renderer.domElement);

  var labelRenderer = new THREE.CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none';
  labelRenderer.domElement.classList.add('label-renderer');
  document.body.appendChild(labelRenderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.12;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2.2;

  // ── Camera ────────────────────────────────────────────
  function fitCamera() {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    (data.groups || []).forEach(function(g) {
      minX = Math.min(minX, g.x); maxX = Math.max(maxX, g.x);
      var gn = data.nodes.filter(function(n) { return n.group === g.id; });
      var top = gn.length ? Math.max.apply(null, gn.map(function(n) { return n.y; })) : g.y;
      var bot = gn.length ? Math.min.apply(null, gn.map(function(n) { return n.y; })) : g.y;
      minY = Math.min(minY, bot); maxY = Math.max(maxY, top + 1.5);
    });
    data.nodes.forEach(function(n) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });
    var w = maxX - minX, h = maxY - minY;
    var aspect = camera.aspect;
    var fov = camera.fov * Math.PI / 180;
    var dist = Math.max(
      (w / 2) / (aspect * Math.tan(fov / 2)),
      (h / 2) / Math.tan(fov / 2)
    ) * 1.25;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
  }
  fitCamera();

  // ── Panel Group ───────────────────────────────────────
  var panelGroup = new THREE.Group();
  scene.add(panelGroup);

  // ── Group Colors ──────────────────────────────────────
  var groupColors = {};
  if (data.groups) data.groups.forEach(function(g) { groupColors[g.id] = g.color; });
  function getGroupColor(id) { return groupColors[id] || '#00ffa0'; }

  // ── Materials ─────────────────────────────────────────
  var ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  var lineMat = new THREE.LineBasicMaterial({ color: 0x00ffa0, transparent: true, opacity: 0.15 });
  var crossMat = new THREE.MeshBasicMaterial({
    color: 0xff2222, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  var dotMat = new THREE.MeshBasicMaterial({
    color: 0xff4444, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var dotGeo = new THREE.SphereGeometry(0.06, 4, 4);

  // ── Groups ────────────────────────────────────────────
  var groupGhosts = {};
  if (data.groups) data.groups.forEach(function(g) {
    var div = document.createElement('div');
    div.className = 'group-label';
    div.textContent = g.label;
    div.style.borderColor = g.color;
    div.style.color = g.color;
    if (g.id === 'knowledge') div.style.textDecoration = 'underline';

    var label = new THREE.CSS2DObject(div);
    var gz = g.id === 'interface' ? -1.0 : g.id === 'infra' ? 1.0 : g.id === 'engines' ? 2.0 : g.id === 'knowledge' ? -0.5 : 0.3;
    var gn = data.nodes.filter(function(n) { return n.group === g.id; });
    var top = gn.length ? Math.max.apply(null, gn.map(function(n) { return n.y; })) : g.y;
    label.position.set(g.x, top + 1.5, gz);
    panelGroup.add(label);

    var gh = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4), ghostMat);
    gh.position.copy(label.position);
    scene.add(gh);
    groupGhosts[g.id] = gh;
  });

  // ── Nodes ─────────────────────────────────────────────
  var nodeGhosts = Array(data.nodes.length);
  data.nodes.forEach(function(n, i) {
    var c = n.id === 'heartbeat' ? '#ff4455' : getGroupColor(n.group);
    var isCore = n.id === 'opencode';
    var div = document.createElement('div');
    div.className = 'glass-panel';
    div.style.borderColor = isCore ? '#00ffa0' : c + '44';
    if (isCore) {
      div.style.boxShadow = '0 0 40px rgba(0,255,160,0.3), inset 0 0 30px rgba(0,255,160,0.08)';
      div.style.borderWidth = '1.5px';
    }

    var bc = n.badge === 'Pro' ? '#ff3344' : c;
    var titleHtml = n.id === 'heartbeat'
      ? '<svg class="heart-icon" width="12" height="12" viewBox="0 0 24 24" fill="#ff3344" style="vertical-align:middle;margin-right:3px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span style="color:' + c + '">' + n.label + '</span>'
      : isCore
        ? '<span style="color:#00ffa0;font-size:13px;letter-spacing:1.5px">' + n.label + '</span>'
        : '<span style="color:' + c + '">' + n.label + '</span>';
    var env = n.env || '?';
    var envColor = env === 'WSL' ? '#44dd88' : env === 'WIN' ? '#4488ff' : env === 'BOTH' ? '#aa66ff' : '#888';
    div.innerHTML = '<h3>' + titleHtml + '</h3><p>' + n.detail + '</p><div style="display:flex;gap:4px;justify-content:center;margin-top:4px"><span class="badge" style="color:' + bc + ';border-color:' + bc + '44;background:' + bc + '11">' + n.badge + '</span><span class="badge" style="color:' + envColor + ';border-color:' + envColor + '44;background:' + envColor + '11;font-size:7px">' + env + '</span></div>';

    var label = new THREE.CSS2DObject(div);
    var nz = n.z !== undefined ? n.z : 0;
    label.position.set(n.x, n.y, nz);
    label.userData = { baseY: n.y, baseZ: nz, phase: Math.random() * Math.PI * 2 };
    panelGroup.add(label);

    var ghost = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), ghostMat);
    ghost.position.set(n.x, n.y, nz);
    ghost.userData = { label: label, index: i };
    scene.add(ghost);
    nodeGhosts[i] = ghost;
  });

  // ── Core Ring HUD ─────────────────────────────────────
  var coreRings = [];
  var coreNode = data.nodes.filter(function(n) { return n.id === 'opencode'; })[0];
  if (coreNode) {
    var cPos = new THREE.Vector3(coreNode.x, coreNode.y, coreNode.z || 0);
    var ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffa0, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
      depthWrite: false
    });
    for (var ri = 0; ri < 3; ri++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.8 + ri * 0.35, 0.008, 8, 24), ringMat);
      ring.position.copy(cPos);
      ring.rotation.x = Math.PI / 2 + ri * 0.3;
      ring.rotation.y = ri * 0.5;
      ring.userData = { ri: ri, phase: ri * 1.2 };
      scene.add(ring);
      coreRings.push(ring);
    }
  }

  // ── Connections (same-group lines) ────────────────────
  var connections = [];
  data.connections.forEach(function(c) {
    var from = data.nodes[c.from], to = data.nodes[c.to];
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y - 0.2, from.z || 0),
      new THREE.Vector3(to.x, to.y + 0.2, to.z || 0)
    ]);
    var line = new THREE.Line(geo, lineMat);
    scene.add(line);
    connections.push({ line: line, fromIdx: c.from, toIdx: c.to });
  });

  // ── Cross-Connections (red tubes + flowing dots) ──────
  function makeCrossCurve(from, to) {
    var fx = from.x, fy = from.y, fz = from.z || 0;
    var tx = to.x, ty = to.y, tz = to.z || 0;
    var midX = (fx + tx) / 2, midY = (fy + ty) / 2, midZ = (fz + tz) / 2 + 0.5;
    var dx = tx - fx, dy = ty - fy;
    var arc = Math.abs(dx) < 0.1 ? Math.abs(dy) * 0.25 : Math.abs(dx) * 0.2;
    var cp = new THREE.Vector3(midX + (dx === 0 ? arc : 0), midY + arc, midZ);
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(fx, fy, fz), cp, new THREE.Vector3(tx, ty, tz)
    );
  }

  function resolvePos(idx) {
    if (typeof idx === 'string') return groupGhosts[idx].position;
    return nodeGhosts[idx].position;
  }

  var crossLines = [];
  if (data.crossConnections) data.crossConnections.forEach(function(c) {
    var fp = resolvePos(c.from), tp = resolvePos(c.to);
    var curve = makeCrossCurve(fp, tp);
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.015, 6, false), crossMat);
    scene.add(tube);

    var dots = [];
    var pts = curve.getPoints(24);
    for (var d = 0; d < 3; d++) {
      var dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pts[Math.round((d / 3) * (pts.length - 1))]);
      scene.add(dot);
      dots.push(dot);
    }
    crossLines.push({ mesh: tube, dots: dots, fromIdx: c.from, toIdx: c.to, curve: curve });
  });

  // ── Particles ─────────────────────────────────────────
  var pCount = 200;
  var pGeo = new THREE.BufferGeometry();
  var pPos = new Float32Array(pCount * 3);
  for (var i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 55;
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x00ffa0, size: 0.025, transparent: true, opacity: 0.4
  })));

  // ── Interaction ──────────────────────────────────────
  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var dragObj = null, isDragging = false;

  function updateLines() {
    connections.forEach(function(l) {
      var fg = nodeGhosts[l.fromIdx], tg = nodeGhosts[l.toIdx];
      var pos = l.line.geometry.attributes.position.array;
      pos[0] = fg.position.x; pos[1] = fg.position.y - 0.2; pos[2] = fg.position.z || 0;
      pos[3] = tg.position.x; pos[4] = tg.position.y + 0.2; pos[5] = tg.position.z || 0;
      l.line.geometry.attributes.position.needsUpdate = true;
    });
    crossLines.forEach(function(xl) {
      var fp = resolvePos(xl.fromIdx), tp = resolvePos(xl.toIdx);
      var curve = makeCrossCurve(fp, tp);
      xl.curve = curve;
      scene.remove(xl.mesh);
      xl.mesh.geometry.dispose();
      xl.mesh.geometry = new THREE.TubeGeometry(curve, 24, 0.015, 6, false);
      scene.add(xl.mesh);
      xl.dots.forEach(function(dot, di) {
        dot.position.copy(curve.getPoint(di / xl.dots.length));
      });
    });
  }

  function getPointer(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerDown(e) {
    getPointer(e);
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(nodeGhosts);
    if (hits.length) {
      controls.autoRotate = false;
      controls.enabled = false;
      dragObj = hits[0].object;
      isDragging = false;
      renderer.domElement.style.cursor = 'grabbing';
    }
  }

  function onPointerMove(e) {
    getPointer(e);
    if (dragObj) {
      raycaster.setFromCamera(pointer, camera);
      var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      var hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, hit);
      if (hit) {
        dragObj.position.copy(hit);
        dragObj.userData.label.position.copy(hit);
        updateLines();
        isDragging = true;
      }
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(nodeGhosts);
    renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
  }

  function onPointerUp() {
    if (!dragObj) return;
    if (!isDragging) {
      controls.autoRotate = !controls.autoRotate;
    } else {
      var label = dragObj.userData.label;
      var idx = dragObj.userData.index;
      label.userData.baseY = label.position.y;
      data.nodes[idx].x = label.position.x;
      data.nodes[idx].y = label.position.y;
    }
    dragObj = null;
    isDragging = false;
    controls.enabled = true;
    renderer.domElement.style.cursor = 'grab';
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  // ── Animation ─────────────────────────────────────────
  var clock = new THREE.Clock();

  function animate() {
    var t = clock.getElapsedTime();

    // Float nodes
    if (!isDragging && !dragObj) {
      panelGroup.children.forEach(function(obj) {
        var ud = obj.userData;
        if (ud && ud.baseY !== undefined) {
          obj.position.y = ud.baseY + Math.sin(t * 0.5 + ud.phase) * 0.06;
        }
      });
    }

    // Heartbeat pulse
    var hbGhost = nodeGhosts[11];
    if (hbGhost) {
      var hb = (Math.sin(t * 3) + 1) * 0.5;
      hbGhost.scale.setScalar(0.6 + hb * 0.4);
    }

    // Core glow pulse
    var coreGhost = nodeGhosts[9];
    if (coreGhost) {
      var pulse = 0.85 + Math.sin(t * 1.2) * 0.15;
      coreGhost.scale.setScalar(pulse);
    }

    // Core ring HUD rotation
    coreRings.forEach(function(ring) {
      ring.rotation.z = t * 0.3 + ring.userData.phase;
      ring.material.opacity = 0.15 + Math.sin(t * 0.6 + ring.userData.phase) * 0.1;
    });

    // Animate cross-line dots
    crossLines.forEach(function(xl, i) {
      xl.mesh.material.opacity = 0.15 + Math.sin(t * 0.8 + i) * 0.08;
      var flow = (t * 0.5 + i * 0.33) % 1;
      xl.dots.forEach(function(dot, di) {
        var pos = (flow + di / xl.dots.length) % 1;
        var pt = xl.curve.getPoint(pos);
        dot.position.copy(pt);
        var fade = Math.sin(pos * Math.PI);
        dot.material.opacity = fade * 0.9;
        dot.scale.setScalar(0.5 + fade * 0.5);
      });
    });

    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // ── Resize ────────────────────────────────────────────
  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    fitCamera();
  });
})();
