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
  var hbGhost = nodeGhosts[16];
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

  // Animate cross-line tubes + dots
  crossLines.forEach(function(xl, i) {
    xl.mesh.material.opacity = 0.08 + Math.sin(t * 0.6 + i * 1.2) * 0.06;
    var flow = (t * 0.5 + i * 0.33) % 1;
    xl.fwd.forEach(function(dot, di) {
      var pos = (flow + di / xl.fwd.length) % 1;
      var pt = xl.curve.getPoint(pos);
      dot.position.copy(pt);
      var fade = Math.sin(pos * Math.PI);
      dot.material.opacity = fade * 0.35;
      dot.scale.setScalar(0.5 + fade * 0.5);
    });
    xl.rev.forEach(function(dot, di) {
      var pos = (1 - flow + di / xl.rev.length) % 1;
      var pt = xl.curve.getPoint(pos);
      dot.position.copy(pt);
      var fade = Math.sin(pos * Math.PI);
      dot.material.opacity = fade * 0.2;
      dot.scale.setScalar(0.4 + fade * 0.3);
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

// Restore saved layout
try {
  var saved = localStorage.getItem('ecosystem_layout');
  if (saved) {
    var state = JSON.parse(saved);
    if (state.nodes) state.nodes.forEach(function(p, i) {
      if (nodeGhosts[i]) {
        nodeGhosts[i].position.set(p.x, p.y, nodeGhosts[i].position.z);
        nodeGhosts[i].userData.label.position.set(p.x, p.y, nodeGhosts[i].userData.label.position.z);
        nodeGhosts[i].userData.label.userData.baseY = p.y;
      }
    });
    if (state.groups) Object.keys(state.groups).forEach(function(id) {
      var g = groupGhosts[id];
      if (g) {
        var p = state.groups[id];
        g.position.set(p.x, p.y, g.position.z);
        g.userData.label.position.set(p.x, p.y, g.userData.label.position.z);
      }
    });
    if (typeof updateLines === 'function') updateLines();
  }
} catch(e) {}
