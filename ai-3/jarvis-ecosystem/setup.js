var data = window.ECOSYSTEM_DATA;
if (!data) throw new Error('No ECOSYSTEM_DATA');

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

var clock = new THREE.Clock();

var panelGroup = new THREE.Group();
scene.add(panelGroup);

var groupColors = {};
if (data.groups) data.groups.forEach(function(g) { groupColors[g.id] = g.color; });
function getGroupColor(id) { return groupColors[id] || '#00ffa0'; }

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
