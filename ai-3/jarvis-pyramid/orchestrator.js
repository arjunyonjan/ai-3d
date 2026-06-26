import { scene, camera, renderer, labelRenderer, orbitControls } from './core.js';
import { getData } from './data.js';
import { buildPyramid, toggleProject, getSelectedProject } from './builder.js';
import { wireInteraction, wireDragControls } from './interaction.js';
import { enterIsolation, exitIsolation, tickCameraAnimation, isolationMode } from './isolation.js';
import { wireSearch } from './search.js';
import { wireDev, updateDevFrame } from './dev.js';
import { isHumanInteracted, autoDemoTimer, autoCloseTimer, setHumanInteracted, setAutoDemoTimer, setAutoCloseTimer, clearAutoDemo, clearAutoClose } from './demo.js';
import { openPanelData, closePanel, activePanelData } from './panel.js';
import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

let currentMode = 'category';
let cls = [], dgs = [], lns = [], sns = [], webLines = [];
let dragControls;

function rebuildPyramid() {
    cls.forEach(o => { scene.remove(o); if (o.userData.label) { o.userData.label.element.style.display = ''; scene.remove(o.userData.label); } if (o.userData.halo) scene.remove(o.userData.halo); });
    lns.forEach(o => scene.remove(o));
    webLines.forEach(o => scene.remove(o));
    webLines = [];
    if (window.__recentHalos) window.__recentHalos = [];
    if (window.__coreGhostMats) window.__coreGhostMats = [];
    if (window.__coreHitboxLines) { window.__coreHitboxLines.forEach(l => scene.remove(l)); window.__coreHitboxLines = []; }
    if (window.__featureGhostMats) window.__featureGhostMats = [];
    if (window.__featureHitboxLines) { window.__featureHitboxLines.forEach(l => scene.remove(l)); window.__featureHitboxLines = []; }
    if (window.__followerLines) { window.__followerLines.forEach(l => scene.remove(l)); window.__followerLines = null; }
    if (dragControls) dragControls.dispose();

    const data = getData(currentMode);
    const result = buildPyramid(data);
    cls = result.clickables;
    dgs = result.draggables;
    lns = result.allLines;
    sns = result.allSearchableNodes;

    dragControls = new DragControls(dgs, camera, renderer.domElement);
    wireDragControls(dragControls, orbitControls);
}

function buildWebLines() {
    const cores = cls.filter(c => c.userData.isCore);
    if (cores.length < 2) return;
    const used = new Set();
    const pairs = [];
    for (let i = 0; i < cores.length; i++) {
        const count = 2 + Math.floor(Math.random() * 2);
        const others = [];
        for (let k = 0; k < cores.length; k++) { if (k !== i) others.push(k); }
        for (let k = others.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [others[k], others[j]] = [others[j], others[k]];
        }
        let added = 0;
        for (const j of others) {
            if (added >= count) break;
            const key = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (used.has(key)) continue;
            used.add(key);
            pairs.push([cores[i], cores[j]]);
            added++;
        }
    }
    pairs.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);
        const mat = new THREE.LineBasicMaterial({
            color: 0x00ffa0,
            transparent: true,
            opacity: 0.04 + Math.random() * 0.04,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.userData = { a, b, baseOpacity: mat.opacity };
        scene.add(line);
        webLines.push(line);
        const updateWeb = () => {
            line.geometry.dispose();
            line.geometry = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);
        };
        a.userData._followers.push(updateWeb);
        b.userData._followers.push(updateWeb);
    });
}

rebuildPyramid();
buildWebLines();

wireInteraction(dgs, dragControls, cls);
wireSearch(sns);
wireDev();

renderer.domElement.addEventListener('project-click', (e) => {
    const obj = e.detail.obj;
    toggleProject(obj);
    if (!isolationMode) {
        enterIsolation(obj, cls, webLines);
    }
});

document.querySelectorAll('.vt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        exitIsolation(webLines);
        const inp2 = document.getElementById('search-input');
        inp2.value = '';
        inp2.dispatchEvent(new Event('input'));
        rebuildPyramid();
        buildWebLines();
        wireInteraction(dgs, dragControls, cls);
        wireSearch(sns);
    });
});

setTimeout(() => {
    const ai3 = cls.find(c => c.userData.folder === 'AI-3');
    if (!ai3) return;
    const el = ai3.userData.label?.element;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    renderer.domElement.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
}, 1200);

document.getElementById('back-view').addEventListener('click', () => {
    exitIsolation(webLines);
});

const clock = new THREE.Clock();
function animate() {
    const t = clock.getElapsedTime();
    lns.forEach(line => {
        if (line.visible) line.material.opacity = 0.08 + 0.10 * (Math.sin(t * 0.8) * 0.5 + 0.5);
    });
    webLines.forEach(line => {
        if (line.visible) {
            const pulse = 0.5 + 0.5 * (Math.sin(t * 0.4 + line.userData.baseOpacity * 10) * 0.5 + 0.5);
            line.material.opacity = line.userData.baseOpacity * (0.6 + 0.4 * pulse);
        }
    });
    if (window.__recentHalos) {
        window.__recentHalos.forEach(halo => {
            if (halo.visible) {
                const pulse = 0.6 + 0.4 * (Math.sin(t * 0.6 + halo.id) * 0.5 + 0.5);
                halo.material.opacity = pulse;
            }
        });
    }
    cls.forEach(dot => {
        if (dot.userData.isFeature) {
            const pulse = 0.6 + 0.4 * (Math.sin(t * 1.5 + dot.id) * 0.5 + 0.5);
            dot.material.opacity = pulse;
            const s = 0.4 + 0.2 * (Math.sin(t * 1.5 + dot.id) * 0.5 + 0.5);
            dot.scale.set(s, s, 1);
        }
    });
    tickCameraAnimation();
    updateDevFrame();
    orbitControls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
