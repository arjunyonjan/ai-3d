var raycaster = new THREE.Raycaster();
var pointer = new THREE.Vector2();
var dragObj = null, isDragging = false, dragStart = new THREE.Vector3();

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
    xl.mesh.geometry = new THREE.TubeGeometry(curve, 16, 0.006, 4, false);
    scene.add(xl.mesh);
    xl.fwd.forEach(function(dot, di) {
      dot.position.copy(curve.getPoint(di / xl.fwd.length));
    });
    xl.rev.forEach(function(dot, di) {
      dot.position.copy(curve.getPoint(1 - di / xl.rev.length));
    });
  });
}

var allGhosts = [];

function rebuildGhostList() {
  allGhosts = nodeGhosts.slice();
  Object.keys(groupGhosts).forEach(function(k) { allGhosts.push(groupGhosts[k]); });
}
rebuildGhostList();

function saveState() {
  var state = { nodes: [], groups: {} };
  data.nodes.forEach(function(n, i) {
    state.nodes.push({ x: nodeGhosts[i].position.x, y: nodeGhosts[i].position.y });
  });
  Object.keys(groupGhosts).forEach(function(id) {
    var p = groupGhosts[id].position;
    state.groups[id] = { x: p.x, y: p.y };
  });
  try { localStorage.setItem('ecosystem_layout', JSON.stringify(state)); } catch(e) {}
}

function getPointer(e) {
  var rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerDown(e) {
  getPointer(e);
  raycaster.setFromCamera(pointer, camera);
  var hits = raycaster.intersectObjects(allGhosts);
  if (hits.length) {
    controls.autoRotate = false;
    controls.enabled = false;
    dragObj = hits[0].object;
    dragStart.copy(dragObj.position);
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
      var dx = hit.x - dragObj.position.x;
      var dy = hit.y - dragObj.position.y;
      if (dragObj.userData.isGroup) {
        // Move group label + all child nodes
        dragObj.userData.label.position.copy(hit);
        dragObj.position.copy(hit);
        var gid = dragObj.userData.groupId;
        data.nodes.forEach(function(n, i) {
          if (n.group === gid) {
            var g = nodeGhosts[i];
            g.position.x += dx;
            g.position.y += dy;
            g.userData.label.position.x += dx;
            g.userData.label.position.y += dy;
          }
        });
      } else {
        dragObj.position.copy(hit);
        dragObj.userData.label.position.copy(hit);
      }
      updateLines();
      isDragging = true;
    }
    return;
  }
  raycaster.setFromCamera(pointer, camera);
  var hits = raycaster.intersectObjects(allGhosts);
  renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
}

function onPointerUp() {
  if (!dragObj) return;
  if (isDragging) {
    if (dragObj.userData.isGroup) {
      var gid = dragObj.userData.groupId;
      data.nodes.forEach(function(n, i) {
        if (n.group === gid) {
          var g = nodeGhosts[i];
          n.x = g.position.x;
          n.y = g.position.y;
          g.userData.label.userData.baseY = g.position.y;
        }
      });
      saveState();
    } else {
      var label = dragObj.userData.label;
      var idx = dragObj.userData.index;
      label.userData.baseY = label.position.y;
      data.nodes[idx].x = label.position.x;
      data.nodes[idx].y = label.position.y;
      saveState();
    }
  }
  if (!isDragging && !dragObj.userData.isGroup) {
    controls.autoRotate = !controls.autoRotate;
  }
  dragObj = null;
  isDragging = false;
  controls.enabled = true;
  renderer.domElement.style.cursor = 'grab';
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerup', onPointerUp);
