(function() {
  var data = window.ECOSYSTEM_DATA;
  if (!data) return;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1410);

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

  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  fitCamera();

  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.cursor = 'grab';
  document.body.appendChild(renderer.domElement);

  var labelRenderer = new THREE.CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.classList.add('label-renderer');
  document.body.appendChild(labelRenderer.domElement);

  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.12;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2.2;

  var panelGroup = new THREE.Group();
  scene.add(panelGroup);

  var ghosts = [];
  var lines = [];

  var groupColors = {};
  if (data.groups) {
    data.groups.forEach(function(g) { groupColors[g.id] = g.color; });
  }

  function getGroupColor(groupId) {
    return groupColors[groupId] || '#00ffa0';
  }

  // Group labels
  var ghostByGroup = {};
  if (data.groups) {
    data.groups.forEach(function(g) {
      var div = document.createElement('div');
      div.className = 'group-label';
      div.textContent = g.label;
      div.style.borderColor = g.color;
      div.style.color = g.color;
      if (g.id === 'knowledge') div.style.textDecoration = 'underline';
      var label = new THREE.CSS2DObject(div);
      var gz = g.id === 'interface' ? -1.0 : g.id === 'infra' ? 1.0 : g.id === 'engines' ? 2.0 : g.id === 'knowledge' ? -0.5 : 0.3;
      var groupNodes = data.nodes.filter(function(n) { return n.group === g.id; });
      var maxNodeY = groupNodes.length ? Math.max.apply(null, groupNodes.map(function(n) { return n.y; })) : g.y;
      label.position.set(g.x, maxNodeY + 1.5, gz);
      panelGroup.add(label);
      var gh = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4), ghostMat);
      gh.position.copy(label.position);
      gh.userData.isGroupLabel = true;
      scene.add(gh);
      ghosts.push(gh);
      ghostByGroup[g.id] = gh;
    });
  }

  var ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

  // Nodes
  data.nodes.forEach(function(n) {
    var c = getGroupColor(n.group);
    var div = document.createElement('div');
    div.className = 'glass-panel';
    div.style.borderColor = c + '44';
    var badgeHtml = n.badge === 'Pro' 
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + bc + '" style="vertical-align:middle"><polygon points="12,2 15,9 22,9 16,14 18,22 12,17 6,22 8,14 2,9 9,9"/></svg>'
      : n.badge;
    div.innerHTML = '<h3 style="color:' + c + '">' + n.label + '</h3><p>' + n.detail + '</p><span class="badge" style="color:' + bc + ';border-color:' + bc + '44;background:' + bc + '11">' + badgeHtml + '</span>';
    var label = new THREE.CSS2DObject(div);
    var nz = n.z !== undefined ? n.z : 0;
    label.position.set(n.x, n.y, nz);
    label.userData = { baseY: n.y, baseZ: nz, phase: Math.random() * Math.PI * 2 };
    panelGroup.add(label);

    var ghost = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      ghostMat
    );
    ghost.position.set(n.x, n.y, nz);
    ghost.userData = { label: label, index: data.nodes.indexOf(n) };
    scene.add(ghost);
    ghosts.push(ghost);
  });

  // Connections
  var lineMat = new THREE.LineBasicMaterial({
    color: 0x00ffa0, transparent: true, opacity: 0.15
  });

  data.connections.forEach(function(c) {
    var from = data.nodes[c.from];
    var to = data.nodes[c.to];
    var geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y - 0.2, (from.z || 0)),
      new THREE.Vector3(to.x, to.y + 0.2, (to.z || 0))
    ]);
    var line = new THREE.Line(geo, lineMat);
    scene.add(line);
    lines.push({ line: line, fromIdx: c.from, toIdx: c.to });
  });

  // Cross-group connections (red glow tube + flowing pulse dots)
  var crossLines = [];
  var crossMat = new THREE.MeshBasicMaterial({
    color: 0xff2222, transparent: true, opacity: 0.15,
    blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide
  });
  var dotMat = new THREE.MeshBasicMaterial({
    color: 0xff4444, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var dotGeo = new THREE.SphereGeometry(0.06, 4, 4);

  function makeCrossCurve(from, to) {
    var midX = (from.x + to.x) / 2;
    var midY = (from.y + to.y) / 2;
    var midZ = ((from.z || 0) + (to.z || 0)) / 2 + 0.5;
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var sideArc = Math.abs(dx) < 0.1 ? Math.abs(dy) * 0.25 : Math.abs(dx) * 0.2;
    var cp = new THREE.Vector3(midX + (dx === 0 ? sideArc : 0), midY + sideArc, midZ);
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(from.x, from.y, from.z || 0),
      cp,
      new THREE.Vector3(to.x, to.y, to.z || 0)
    );
  }

  if (data.crossConnections) {
    data.crossConnections.forEach(function(c, ci) {
      var fromNode = typeof c.from === 'string' ? ghostByGroup[c.from].position : data.nodes[c.from];
      var toNode = typeof c.to === 'string' ? ghostByGroup[c.to].position : data.nodes[c.to];
      var fromPos = fromNode.isVector3 ? fromNode : new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z || 0);
      var toPos = toNode.isVector3 ? toNode : new THREE.Vector3(toNode.x, toNode.y, toNode.z || 0);
      var curve = makeCrossCurve(fromPos, toPos);
      var tubularSegments = 24;
      var radius = 0.015;
      var radialSegments = 6;
      var geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
      var mesh = new THREE.Mesh(geo, crossMat);
      scene.add(mesh);
      var dots = [];
      var pts = curve.getPoints(24);
      var dotCount = 3;
      for (var d = 0; d < dotCount; d++) {
        var dot = new THREE.Mesh(dotGeo, dotMat);
        var t = d / dotCount;
        var idx = Math.round(t * (pts.length - 1));
        dot.position.copy(pts[idx]);
        scene.add(dot);
        dots.push(dot);
      }
      crossLines.push({ mesh: mesh, dots: dots, fromIdx: c.from, toIdx: c.to, curve: curve, pts: pts });
    });
  }

  // Particles
  var particleCount = 200;
  var pGeo = new THREE.BufferGeometry();
  var positions = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 55;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  var pMat = new THREE.PointsMaterial({
    color: 0x00ffa0, size: 0.025, transparent: true, opacity: 0.4
  });
  var particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var dragObj = null;
  var isDragging = false;

  function updateLines() {
    lines.forEach(function(l) {
      var fg = ghosts[l.fromIdx];
      var tg = ghosts[l.toIdx];
      var pos = l.line.geometry.attributes.position.array;
      pos[0] = fg.position.x; pos[1] = fg.position.y - 0.2; pos[2] = fg.position.z;
      pos[3] = tg.position.x; pos[4] = tg.position.y + 0.2; pos[5] = tg.position.z;
      l.line.geometry.attributes.position.needsUpdate = true;
    });
    crossLines.forEach(function(xl) {
      function getPos(idx) {
        if (typeof idx === 'string') return ghostByGroup[idx].position;
        return ghosts[idx].position;
      }
      var fp = getPos(xl.fromIdx);
      var tp = getPos(xl.toIdx);
      var fx = fp.x, fy = fp.y, fz = fp.z;
      var tx = tp.x, ty = tp.y, tz = tp.z;
      var midX = (fx + tx) / 2;
      var midY = (fy + ty) / 2;
      var midZ = (fz + tz) / 2 + 0.5;
      var dx = tx - fx;
      var sideArc3 = Math.abs(dx) < 0.1 ? Math.abs(ty-fy) * 0.25 : Math.abs(dx) * 0.2;
      var cp = new THREE.Vector3(midX + (dx === 0 ? sideArc3 : 0), midY + sideArc3, midZ);
      var curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(fx, fy, fz), cp, new THREE.Vector3(tx, ty, tz)
      );
      xl.curve = curve;
      scene.remove(xl.mesh);
      xl.mesh.geometry.dispose();
      xl.mesh.geometry = new THREE.TubeGeometry(curve, 24, 0.015, 5, false);
      scene.add(xl.mesh);
      var pts = curve.getPoints(24);
      xl.dots.forEach(function(dot, di) {
        var t = di / xl.dots.length;
        var pt = curve.getPoint(t);
        dot.position.copy(pt);
      });
    });
  }

  function onPointerDown(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(ghosts);
    if (hits.length) {
      controls.autoRotate = false;
      controls.enabled = false;
      dragObj = hits[0].object;
      isDragging = false;
      renderer.domElement.style.cursor = 'grabbing';
    }
  }

  function onPointerMove(e) {
    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (dragObj) {
      raycaster.setFromCamera(pointer, camera);
      var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      var intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      if (intersect) {
        dragObj.position.copy(intersect);
        dragObj.userData.label.position.copy(intersect);
        updateLines();
        isDragging = true;
      }
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(ghosts);
    renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
  }

  function onPointerUp() {
    if (dragObj) {
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
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  var clock = new THREE.Clock();

  function animate() {
    var t = clock.getElapsedTime();
    panelGroup.children.forEach(function(obj) {
      var ud = obj.userData;
      if (ud && ud.baseY !== undefined && !isDragging && !dragObj) {
        obj.position.y = ud.baseY + Math.sin(t * 0.5 + ud.phase) * 0.06;
      }
    });
    // Heartbeat pulse
    var hbGhost = ghosts[8];
    if (hbGhost) {
      var hb = (Math.sin(t * 3) + 1) * 0.5;
      var scale = 0.6 + hb * 0.4;
      hbGhost.scale.setScalar(scale);
    }
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

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    fitCamera();
  });
})();
