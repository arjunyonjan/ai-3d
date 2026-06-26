import * as THREE from 'three';
import { scene, camera, renderer } from './core.js';

let laserLine = null;
let fpsFrameCount = 0;
let fpsLastTime = 0;
const fpsDisplay = document.getElementById('dev-fps-display');
const fpsCheck = document.getElementById('dev-fps');

export function wireDev() {
    const devBtn = document.getElementById('dev-btn');
    const devPanel = document.getElementById('dev-panel');
    const hitboxCheck = document.getElementById('dev-hitbox');
    const featHitboxCheck = document.getElementById('dev-feat-hitbox');
    const laserCheck = document.getElementById('dev-laser');
    const followerCheck = document.getElementById('dev-followers');

    devBtn.addEventListener('click', () => {
        devPanel.classList.toggle('open');
    });

    hitboxCheck.addEventListener('change', () => {
        const show = hitboxCheck.checked;
        (window.__coreGhostMats || []).forEach(mat => {
            mat.opacity = show ? 0.15 : 0;
        });
        (window.__coreHitboxLines || []).forEach(line => {
            line.material.opacity = show ? 0.4 : 0;
        });
    });

    featHitboxCheck.addEventListener('change', () => {
        const show = featHitboxCheck.checked;
        (window.__featureGhostMats || []).forEach(mat => {
            mat.opacity = show ? 0.15 : 0;
        });
        (window.__featureHitboxLines || []).forEach(line => {
            line.material.opacity = show ? 0.4 : 0;
        });
    });

    laserCheck.addEventListener('change', () => {
        if (laserCheck.checked) {
            if (!laserLine) {
                const geo = new THREE.BufferGeometry();
                const positions = new Float32Array(6);
                geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const mat = new THREE.LineBasicMaterial({ color: 0x00ffa0, transparent: true, opacity: 0.3, depthWrite: false });
                laserLine = new THREE.Line(geo, mat);
                window.__laserLine = laserLine;
                scene.add(laserLine);
            }
            laserLine.visible = true;
            renderer.domElement.addEventListener('pointermove', onPointerMoveLaser);
        } else {
            if (laserLine) laserLine.visible = false;
            renderer.domElement.removeEventListener('pointermove', onPointerMoveLaser);
        }
    });

    followerCheck.addEventListener('change', () => {
        const show = followerCheck.checked;
        let lines = window.__followerLines;
        if (show) {
            if (!lines) {
                lines = [];
                window.__followerLines = lines;
            }
            buildFollowerLines(lines);
        } else if (lines) {
            lines.forEach(l => scene.remove(l));
            lines.length = 0;
        }
    });

    fpsCheck.addEventListener('change', () => {
        fpsDisplay.style.display = fpsCheck.checked ? 'block' : 'none';
        if (fpsCheck.checked) {
            fpsFrameCount = 0;
            fpsLastTime = performance.now();
        }
    });
}

function onPointerMoveLaser(e) {
    if (!laserLine || !laserLine.visible) return;
    const pointer = new THREE.Vector2();
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const dir = raycaster.ray.direction.clone().multiplyScalar(100);
    const end = raycaster.ray.origin.clone().add(dir);
    const pos = laserLine.geometry.attributes.position.array;
    pos[0] = raycaster.ray.origin.x; pos[1] = raycaster.ray.origin.y; pos[2] = raycaster.ray.origin.z;
    pos[3] = end.x; pos[4] = end.y; pos[5] = end.z;
    laserLine.geometry.attributes.position.needsUpdate = true;
}

function buildFollowerLines(lines) {
    lines.forEach(l => scene.remove(l));
    lines.length = 0;
    scene.traverse(obj => {
        if (obj.userData && obj.userData._followers) {
            const core = obj;
            obj.userData._followers.forEach(fn => {
                const geo = new THREE.BufferGeometry().setFromPoints([core.position, core.position]);
                const mat = new THREE.LineBasicMaterial({ color: 0x00ffa0, transparent: true, opacity: 0.1, depthWrite: false });
                const line = new THREE.Line(geo, mat);
                line.userData = { core, update: fn };
                scene.add(line);
                lines.push(line);
            });
        }
    });
}

export function updateDevFrame() {
    if (fpsCheck && fpsCheck.checked) {
        fpsFrameCount++;
        const now = performance.now();
        if (now - fpsLastTime >= 1000) {
            fpsDisplay.textContent = `${Math.round(fpsFrameCount * 1000 / (now - fpsLastTime))} FPS`;
            fpsFrameCount = 0;
            fpsLastTime = now;
        }
    }
}
