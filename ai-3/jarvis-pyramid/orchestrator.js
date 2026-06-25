import { scene, camera, renderer, labelRenderer, orbitControls } from './core.js';
import { getData, miniFuseSearch, openPanelData, closePanel, activePanelData, isHumanInteracted, autoDemoTimer, autoCloseTimer, setHumanInteracted, setAutoDemoTimer, setAutoCloseTimer, clearAutoDemo, clearAutoClose } from './data.js';
import { buildPyramid, toggleProject } from './builder.js';
import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

let currentMode = 'category';
let cls = [], dgs = [], lns = [], sns = [];
let dragControls;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function wireDragEvents() {
    dragControls.addEventListener('drag', (event) => {
        const obj = event.object;
        const ud = obj.userData;
        if (ud.label) ud.label.position.copy(obj.position);
        if (ud.line && ud.coreRef) {
            ud.line.geometry.dispose();
            ud.line.geometry = new THREE.BufferGeometry().setFromPoints([ud.coreRef.position, obj.position]);
        }
        if (ud.isCore && ud.childFeatures) {
            ud.childFeatures.forEach(feature => {
                if (feature.userData.line) {
                    feature.userData.line.geometry.dispose();
                    feature.userData.line.geometry = new THREE.BufferGeometry().setFromPoints([obj.position, feature.position]);
                }
            });
        }
    });
    dragControls.addEventListener('dragstart', () => { orbitControls.enabled = false; });
    dragControls.addEventListener('dragend', () => { orbitControls.enabled = true; });
}

function rebuildPyramid() {
    cls.forEach(o => { scene.remove(o); if (o.userData.label) scene.remove(o.userData.label); });
    lns.forEach(o => scene.remove(o));
    if (dragControls) dragControls.dispose();

    const data = getData(currentMode);
    const result = buildPyramid(data);
    cls = result.clickables;
    dgs = result.draggables;
    lns = result.allLines;
    sns = result.allSearchableNodes;

    dragControls = new DragControls(dgs, camera, renderer.domElement);
    wireDragEvents();
}

rebuildPyramid();

renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(dgs);
    dgs.forEach(obj => {
        const isHovered = hits.length > 0 && hits[0].object === obj;
        if (obj.userData.isFeature) {
            const s = isHovered ? 0.8 : 0.5;
            obj.scale.set(s, s, 1);
        }
    });
});

renderer.domElement.addEventListener('click', (e) => {
    if (orbitControls.enabled === false) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cls);

    if (hits.length) {
        const obj = hits[0].object;
        if (obj.userData.isCore) toggleProject(obj);
    }
});

const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    sns.forEach(n => n.visible = false);
    const matchedNodes = miniFuseSearch(query, sns);
    matchedNodes.forEach(n => {
        n.visible = true;
        if (n.userData.label) n.userData.label.visible = true;
        if (n.userData.line) n.userData.line.visible = true;
    });
});

document.querySelectorAll('.vt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        closePanel();
        rebuildPyramid();
    });
});

const clock = new THREE.Clock();
function animate() {
    const t = clock.getElapsedTime();
    lns.forEach(line => {
        if (line.visible) line.material.opacity = 0.08 + 0.10 * (Math.sin(t * 0.8) * 0.5 + 0.5);
    });
    cls.forEach(dot => {
        if (dot.userData.isFeature) {
            const pulse = 0.6 + 0.4 * (Math.sin(t * 1.5 + dot.id) * 0.5 + 0.5);
            dot.material.opacity = pulse;
            const s = 0.4 + 0.2 * (Math.sin(t * 1.5 + dot.id) * 0.5 + 0.5);
            dot.scale.set(s, s, 1);
        }
    });
    orbitControls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
