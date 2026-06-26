import { scene, camera, orbitControls } from './core.js';
import { getSelectedProject } from './builder.js';
import { closePanel } from './panel.js';
import * as THREE from 'three';

let isolationMode = false;
const hiddenStates = new Map();
const _camFrom = new THREE.Vector3();
const _camTo = new THREE.Vector3();
const _targetFrom = new THREE.Vector3();
const _targetTo = new THREE.Vector3();
let _camAnimating = false;
let _camAnimStart = 0;
const CAM_ANIM_DURATION = 1.0;

export function isAnimating() { return _camAnimating; }

export function tickCameraAnimation() {
    if (!_camAnimating) return false;
    const elapsed = (performance.now() - _camAnimStart) / 1000;
    const p = Math.min(elapsed / CAM_ANIM_DURATION, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    camera.position.lerpVectors(_camFrom, _camTo, ease);
    orbitControls.target.lerpVectors(_targetFrom, _targetTo, ease);
    if (p >= 1) {
        _camAnimating = false;
        orbitControls.enabled = true;
        return false;
    }
    return true;
}

export function enterIsolation(obj, cls, webLines) {
    if (isolationMode) return;
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
    if (obj.userData.halo) {
        obj.userData._savedHaloScale = obj.userData.halo.scale.x;
        obj.userData.halo.scale.setScalar(4);
    }
    obj.userData._savedGhostScale = obj.scale.x;
    obj.scale.setScalar(0.3);
    webLines.forEach(l => l.visible = false);
    document.getElementById('back-view').style.display = 'block';
    _camFrom.copy(camera.position);
    _camTo.set(obj.position.x + 10, obj.position.y + 6, obj.position.z + 14);
    _targetFrom.copy(orbitControls.target);
    _targetTo.copy(obj.position);
    _camAnimating = true;
    _camAnimStart = performance.now();
    orbitControls.enabled = false;
}

export function exitIsolation(webLines) {
    if (!isolationMode) return;
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
        if (sel.userData.halo && sel.userData._savedHaloScale) {
            sel.userData.halo.scale.setScalar(sel.userData._savedHaloScale);
        }
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
    closePanel();
}

export { isolationMode };
