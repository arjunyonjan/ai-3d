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
  var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.006, 4, false), crossMat);
  scene.add(tube);

  var fwdDots = [], revDots = [];
  for (var d = 0; d < 3; d++) {
    var fd = new THREE.Mesh(dotGeo, dotFwdMat);
    fd.position.copy(curve.getPoint(d / 3));
    scene.add(fd);
    fwdDots.push(fd);
    var rd = new THREE.Mesh(dotGeo, dotRevMat);
    rd.position.copy(curve.getPoint(1 - d / 3));
    scene.add(rd);
    revDots.push(rd);
  }
  crossLines.push({ mesh: tube, fwd: fwdDots, rev: revDots, fromIdx: c.from, toIdx: c.to, curve: curve });
});
