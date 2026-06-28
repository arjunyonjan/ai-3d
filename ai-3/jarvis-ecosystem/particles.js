var pCount = 200;
var pGeo = new THREE.BufferGeometry();
var pPos = new Float32Array(pCount * 3);
for (var i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 55;
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
var pMat = new THREE.PointsMaterial({
  color: 0x00ffa0, size: 0.025, transparent: true, opacity: 0.4
});
scene.add(new THREE.Points(pGeo, pMat));
