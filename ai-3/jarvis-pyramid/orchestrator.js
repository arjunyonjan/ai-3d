import { scene, camera, renderer, labelRenderer, orbitControls } from './core.js';
import { getData, miniFuseSearch, openPanelData, closePanel, activePanelData, isHumanInteracted, autoDemoTimer, autoCloseTimer, setHumanInteracted, setAutoDemoTimer, setAutoCloseTimer, clearAutoDemo, clearAutoClose } from './data.js';
import { buildPyramid, toggleProject, getSelectedProject } from './builder.js';
import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

let currentMode = 'category';
let cls = [], dgs = [], lns = [], sns = [], webLines = [];
let dragControls;
let isolationMode = false;
const hiddenStates = new Map();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const _camFrom = new THREE.Vector3();
const _camTo = new THREE.Vector3();
const _targetFrom = new THREE.Vector3();
const _targetTo = new THREE.Vector3();
let _camAnimating = false;
let _camAnimStart = 0;
const CAM_ANIM_DURATION = 1.0;
let _pointerDownPos = null;

function wireDragEvents() {
    dragControls.addEventListener('drag', (event) => {
        const obj = event.object;
        const ud = obj.userData;
        if (ud._followers) ud._followers.forEach(fn => fn(obj.position));
    });
    dragControls.addEventListener('dragstart', () => { orbitControls.enabled = false; });
    dragControls.addEventListener('dragend', () => { orbitControls.enabled = true; });
}

function rebuildPyramid() {
    cls.forEach(o => { scene.remove(o); if (o.userData.label) { o.userData.label.element.style.display = ''; scene.remove(o.userData.label); } if (o.userData.halo) scene.remove(o.userData.halo); });
    lns.forEach(o => scene.remove(o));
    webLines.forEach(o => scene.remove(o));
    webLines = [];
    if (window.__recentHalos) window.__recentHalos = [];
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

function buildWebLines() {
    const cores = cls.filter(c => c.userData.isCore);
    if (cores.length < 2) return;
    const used = new Set();
    const pairs = [];
    // Each node connects to 2-3 random others
    for (let i = 0; i < cores.length; i++) {
        const count = 2 + Math.floor(Math.random() * 2);
        const others = [];
        for (let k = 0; k < cores.length; k++) {
            if (k !== i) others.push(k);
        }
        // Shuffle
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
        // Update web line when either endpoint is dragged
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

renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const visibleDgs = dgs.filter(o => o.visible);
    const hits = raycaster.intersectObjects(visibleDgs);
    dgs.forEach(obj => {
        if (!obj.visible) return;
        const isHovered = hits.length > 0 && hits[0].object === obj;
        if (obj.userData.isFeature) {
            const target = obj.userData.targetSprite || obj;
            const s = isHovered ? 0.8 : 0.5;
            target.scale.set(s, s, 1);
        }
    });
});

renderer.domElement.addEventListener('pointerdown', (e) => {
    _pointerDownPos = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('click', (e) => {
    if (orbitControls.enabled === false) return;
    // Ignore if this was a drag — pointer moved too far from initial press
    if (_pointerDownPos) {
        const dx = e.clientX - _pointerDownPos.x;
        const dy = e.clientY - _pointerDownPos.y;
        if (dx * dx + dy * dy > 100) { _pointerDownPos = null; return; }
    }
    _pointerDownPos = null;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(cls);

    if (hits.length) {
        const obj = hits[0].object;
        if (obj.userData.isCore) {
            // In isolation mode, require the click to be close to the node's screen center
            if (isolationMode) {
                const pos = new THREE.Vector3();
                pos.copy(obj.position).project(camera);
                const sx = (pos.x * 0.5 + 0.5) * window.innerWidth;
                const sy = (-pos.y * 0.5 + 0.5) * window.innerHeight;
                const dist = Math.sqrt((e.clientX - sx) ** 2 + (e.clientY - sy) ** 2);
                if (dist > 20) return;
            }
            toggleProject(obj);
            if (!isolationMode) {
                isolationMode = true;
                hiddenStates.clear();
                cls.forEach(c => {
                    if (c !== obj && c.userData.isCore) {
                        hiddenStates.set(c, c.visible);
                        c.visible = false;
                        if (c.userData.label) { c.userData.label.visible = false; c.userData.label.element.style.display = 'none'; }
                        if (c.userData.halo) c.userData.halo.visible = false;
                    }
                });
                // Shrink the isolated node's glow halo and hitbox for close-up view
                if (obj.userData.halo) {
                    obj.userData._savedHaloScale = obj.userData.halo.scale.x;
                    obj.userData.halo.scale.setScalar(4);
                }
                obj.userData._savedGhostScale = obj.scale.x;
                obj.scale.setScalar(0.3);
                webLines.forEach(l => l.visible = false);
                document.getElementById('back-view').style.display = 'block';
                // Start camera animation toward the clicked node
                _camFrom.copy(camera.position);
                _camTo.set(obj.position.x + 10, obj.position.y + 6, obj.position.z + 14);
                _targetFrom.copy(orbitControls.target);
                _targetTo.copy(obj.position);
                _camAnimating = true;
                _camAnimStart = performance.now();
                orbitControls.enabled = false;
            }
        }
    }
});

const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    const matched = query ? miniFuseSearch(query, sns) : [];
    sns.forEach(n => {
        if (!n.userData.origPos) n.userData.origPos = { x: n.position.x, y: n.position.y, z: n.position.z };
        const match = !query || matched.includes(n);
        const dz = !query ? 0 : (match ? -5 : 50);
        n.position.z = n.userData.origPos.z + dz;
        n.material.opacity = !query || match ? 1 : 0.03;
        if (n.userData.label) n.userData.label.position.z = n.position.z;
    });
});

document.querySelectorAll('.vt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.vt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        isolationMode = false;
        hiddenStates.clear();
        document.getElementById('back-view').style.display = 'none';
        _camAnimating = false;
        orbitControls.enabled = true;
        const inp2 = document.getElementById('search-input');
        inp2.value = '';
        inp2.dispatchEvent(new Event('input'));
        closePanel();
        rebuildPyramid();
        buildWebLines();
    });
});

// Auto-open AI-3 on load — dispatch click at AI-3's screen position
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
    isolationMode = false;
    hiddenStates.forEach((state, obj) => {
        obj.visible = state;
        if (obj.userData.label) { obj.userData.label.visible = state; obj.userData.label.element.style.display = state ? '' : 'none'; }
        if (obj.userData.halo) obj.userData.halo.visible = state;
    });
    hiddenStates.clear();
    webLines.forEach(l => l.visible = true);
    document.getElementById('back-view').style.display = 'none';
    const sel = getSelectedProject();
    if (sel) {
        // Restore halo scale
        if (sel.userData.halo && sel.userData._savedHaloScale) {
            sel.userData.halo.scale.setScalar(sel.userData._savedHaloScale);
        }
        // Restore ghost hitbox scale
        if (sel.userData._savedGhostScale) {
            sel.scale.setScalar(sel.userData._savedGhostScale);
        }
        const features = sel.userData.childFeatures || [];
        features.forEach(f => { f.visible = false; if (f.userData.label) { f.userData.label.visible = false; f.userData.label.element.style.display = 'none'; } if (f.userData.line) f.userData.line.visible = false; });
        sel.userData.expanded = false;
    }
    _camFrom.copy(camera.position);
    _camTo.set(55, 35, 65);
    _targetFrom.copy(orbitControls.target);
    _targetTo.set(0, 10, 0);
    _camAnimating = true;
    _camAnimStart = performance.now();
    orbitControls.enabled = false;
    const inp = document.getElementById('search-input');
    inp.value = '';
    inp.dispatchEvent(new Event('input'));
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
    if (_camAnimating) {
        const elapsed = (performance.now() - _camAnimStart) / 1000;
        const p = Math.min(elapsed / CAM_ANIM_DURATION, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        camera.position.lerpVectors(_camFrom, _camTo, ease);
        orbitControls.target.lerpVectors(_targetFrom, _targetTo, ease);
        if (p >= 1) {
            _camAnimating = false;
            orbitControls.enabled = true;
        }
    }
    orbitControls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();
