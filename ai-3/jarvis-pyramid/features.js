import * as THREE from 'three';
import { scene, camera, CSS2DObject } from './core.js';
import { measureLabelPixels, pixelsTo3D } from './labels.js';

export function buildFeatures(folder, ghost, cx, cy, cz) {
    const features = folder.features || [];
    if (!features.length) return [];
    const childFeatures = [];
    const rows = Math.ceil(Math.sqrt(features.length));
    const colsPerRow = [];
    let remaining = features.length;
    for (let r = 0; r < rows; r++) {
        const cols = Math.ceil(remaining / (rows - r));
        colsPerRow.push(cols);
        remaining -= cols;
    }
    let fi = 0;
    for (let r = 0; r < rows; r++) {
        const cols = colsPerRow[r];
        const rowRadius = 3 + r * 4;
        const rowY = cy - 3 - r * 2.5;
        for (let c = 0; c < cols && fi < features.length; c++, fi++) {
            const feat = features[fi];
            const offset = cols <= 1 ? 0 : (c / (cols - 1) - 0.5);
            const fx = cx + offset * rowRadius;
            const fz = cz + 0.5 + r * 0.6;
            const fy = rowY;
            childFeatures.push(createFeature(feat, ghost, fx, fy, fz, cx, cy, cz));
        }
    }
    childFeatures.forEach(f => {
        f.visible = false;
        if (f.userData.label) f.userData.label.visible = false;
        if (f.userData.line) f.userData.line.visible = false;
    });
    ghost.userData.childFeatures = childFeatures;
    ghost.userData.expanded = false;
    ghost.userData._followers.push(pos => {
        childFeatures.forEach(f => {
            if (f.userData.line) {
                f.userData.line.geometry.dispose();
                f.userData.line.geometry = new THREE.BufferGeometry().setFromPoints([pos, f.position]);
            }
        });
    });
    return childFeatures;
}

function createFeature(feat, ghost, fx, fy, fz, cx, cy, cz) {
    const featColor = feat.status === 'fail' ? 0xff4433 : 0x1af0b8;

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64; glowCanvas.height = 64;
    const gctx = glowCanvas.getContext('2d');
    const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, feat.status === 'fail' ? '#ff0022' : '#00e5ff');
    grad.addColorStop(0.3, feat.status === 'fail' ? 'rgba(255,0,34,0.4)' : 'rgba(0,229,255,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 64, 64);

    const featMat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        color: featColor, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false,
    });
    const featureMesh = new THREE.Sprite(featMat);
    featureMesh.scale.set(0.5, 0.5, 1);
    featureMesh.position.set(fx, fy, fz);
    featureMesh.userData = { text: feat.text, folder: ghost.userData.folder, status: feat.status, isFeature: true, coreRef: ghost };
    featureMesh.userData._followers = [];
    scene.add(featureMesh);

    const featDiv = document.createElement('div');
    const icon = feat.status === 'fail' ? '⚠' : '✓';
    featDiv.className = 'feature-label ' + (feat.status === 'fail' ? 'fail' : 'success');
    featDiv.innerHTML = `<span class="feat-icon">${icon}</span> ${feat.text}`;
    const featLabel = new CSS2DObject(featDiv);
    featLabel.position.set(fx, fy - 0.7, fz);
    scene.add(featLabel);
    featureMesh.userData.label = featLabel;
    featureMesh.userData._followers.push(pos => featLabel.position.copy(pos));
    featureMesh.userData._followers.push(pos => {
        if (featureMesh.userData.line) {
            featureMesh.userData.line.geometry.dispose();
            featureMesh.userData.line.geometry = new THREE.BufferGeometry().setFromPoints([featureMesh.userData.coreRef.position, pos]);
        }
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(cx, cy, cz), new THREE.Vector3(fx, fy, fz)]);
    const lineMat = new THREE.LineBasicMaterial({ color: featColor, transparent: true, opacity: 0.04 });
    const line = new THREE.Line(lineGeo, lineMat);
    scene.add(line);
    featureMesh.userData.line = line;

    const featGhostMat = new THREE.MeshBasicMaterial({ color: 0x0a1410, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const dist = camera.position.distanceTo(new THREE.Vector3(fx, fy, fz));
    const { w: featW, h: featH } = measureLabelPixels(`<span class="feat-icon">${icon}</span> ${feat.text}`, '');
    const { w: featGhostW, h: featGhostH } = pixelsTo3D(featW + 16, featH + 16, dist, camera);
    const featGhost = new THREE.Mesh(
        new THREE.BoxGeometry(featGhostW, featGhostH, 0.3),
        featGhostMat
    );
    featGhost.position.set(fx, fy, fz);
    if (!window.__featureGhostMats) window.__featureGhostMats = [];
    window.__featureGhostMats.push(featGhostMat);

    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(featGhostW, featGhostH, 0.3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ffa0, transparent: true, opacity: 0, depthWrite: false });
    const edgeLine = new THREE.Line(edgeGeo, edgeMat);
    edgeLine.position.copy(featGhost.position);
    scene.add(edgeLine);
    if (!window.__featureHitboxLines) window.__featureHitboxLines = [];
    window.__featureHitboxLines.push(edgeLine);

    featGhost.userData = { isFeature: true, targetSprite: featureMesh, coreRef: ghost, text: feat.text, folder: ghost.userData.folder, label: featLabel, line };
    featGhost.userData._followers = [
        pos => featLabel.position.set(pos.x, pos.y - 0.7, pos.z),
        pos => featureMesh.position.copy(pos),
        pos => edgeLine.position.copy(pos),
        pos => { if (line) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints([ghost.position, pos]); } },
    ];
    scene.add(featGhost);

    return featGhost;
}
