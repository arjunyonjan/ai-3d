import { scene, camera, renderer, orbitControls } from './core.js';
import * as THREE from 'three';

let _pointerDownPos = null;

export function wireInteraction(dgs, dragControls, clickables) {
    renderer.domElement.addEventListener('pointermove', (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
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
        if (_pointerDownPos) {
            const dx = e.clientX - _pointerDownPos.x;
            const dy = e.clientY - _pointerDownPos.y;
            if (dx * dx + dy * dy > 100) { _pointerDownPos = null; return; }
        }
        _pointerDownPos = null;
        const pointer = new THREE.Vector2();
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickables);
        if (hits.length) {
            const obj = hits[0].object;
            if (obj.userData.isCore) {
                const evt = new CustomEvent('project-click', { detail: { obj, event: e } });
                renderer.domElement.dispatchEvent(evt);
            }
        }
    });
}

export function wireDragControls(dragControls, orbitControls) {
    dragControls.addEventListener('drag', (event) => {
        const obj = event.object;
        const ud = obj.userData;
        if (ud._followers) ud._followers.forEach(fn => fn(obj.position));
    });
    dragControls.addEventListener('dragstart', () => { orbitControls.enabled = false; });
    dragControls.addEventListener('dragend', () => { orbitControls.enabled = true; });
}
