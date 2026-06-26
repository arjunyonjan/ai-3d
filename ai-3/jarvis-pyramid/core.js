import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1410);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(55, 35, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.autoRotate = true;
orbitControls.autoRotateSpeed = 0.2;
window.__orbitControls = orbitControls;

orbitControls.target.set(0, 10, 0);

const ambient = new THREE.AmbientLight(0x1a6040, 0.8);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0x66ddbb, 1.0);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x1af0b8, 0.2);
fillLight.position.set(-5, 0, 5);
scene.add(fillLight);

const stars = new THREE.BufferGeometry();
const starCount = 2000;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 200;
stars.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const starMat = new THREE.PointsMaterial({ color: 0x33cc99, size: 0.15, transparent: true, opacity: 0.4 });
const starField = new THREE.Points(stars, starMat);
scene.add(starField);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

export { scene, camera, renderer, labelRenderer, orbitControls, CSS2DObject };
