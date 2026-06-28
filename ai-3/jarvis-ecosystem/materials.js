var ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
var lineMat = new THREE.LineBasicMaterial({ color: 0x00ffa0, transparent: true, opacity: 0.15 });
var crossMat = new THREE.MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 0.12,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
var dotFwdMat = new THREE.MeshBasicMaterial({
  color: 0xff3344, transparent: true, opacity: 0.35,
  blending: THREE.AdditiveBlending, depthWrite: false
});
var dotRevMat = new THREE.MeshBasicMaterial({
  color: 0x33ff66, transparent: true, opacity: 0.2,
  blending: THREE.AdditiveBlending, depthWrite: false
});
var dotGeo = new THREE.SphereGeometry(0.06, 4, 4);
