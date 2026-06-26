import { scene, camera, CSS2DObject } from './core.js';
import * as THREE from 'three';
import { createLabel, measureLabelPixels, pixelsTo3D } from './labels.js';
import { buildFeatures } from './features.js';

function buildPyramid(pyramidData) {
    const clickables = [];
    const draggables = [];
    const allLines = [];
    const allSearchableNodes = [];

    const withFeatures = pyramidData.filter(f => f.features && f.features.length > 0);
    const withoutFeatures = pyramidData.filter(f => !f.features || f.features.length === 0);

    const rings = [
        { radius: 32, y: 0, count: 9 },
        { radius: 28, y: 3.5, count: 8 },
        { radius: 24, y: 7.0, count: 7 },
        { radius: 20, y: 10.5, count: 6 },
        { radius: 16, y: 14.0, count: 5 },
        { radius: 12, y: 17.5, count: 4 },
        { radius: 8, y: 21.0, count: 4 },
    ];
    let idx = 0;

    function placeNode(folder, cx, cy, cz) {
        const recent = folder.recent || 99;
        const recentClass = recent <= 5 ? ' recent-high' : '';
        const labelDiv = createLabel(folder, recentClass);
        const label = new CSS2DObject(labelDiv);
        label.position.set(cx, cy, cz);
        scene.add(label);

        const { w: labelW, h: labelH } = measureLabelPixels(labelDiv.innerHTML, recentClass);
        const dist = camera.position.distanceTo(new THREE.Vector3(cx, cy, cz));
        const { w: ghostW, h: ghostH } = pixelsTo3D(labelW, labelH, dist, camera);

        const ghostMat = new THREE.MeshBasicMaterial({ color: 0x0a1410, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
        if (!window.__coreGhostMats) window.__coreGhostMats = [];
        window.__coreGhostMats.push(ghostMat);
        const ghost = new THREE.Mesh(new THREE.BoxGeometry(ghostW, ghostH, 0.3), ghostMat);
        ghost.position.set(cx, cy, cz);
        ghost.userData = { text: folder.folder, folder: folder.folder, status: folder.status, description: folder.description, isCore: true, label };
        ghost.userData._followers = [pos => label.position.copy(pos)];
        scene.add(ghost);

        const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(ghostW, ghostH, 0.3));
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x00ffa0, transparent: true, opacity: 0, depthWrite: false });
        const edgeLine = new THREE.Line(edgeGeo, edgeMat);
        edgeLine.position.copy(ghost.position);
        scene.add(edgeLine);
        if (!window.__coreHitboxLines) window.__coreHitboxLines = [];
        window.__coreHitboxLines.push(edgeLine);
        ghost.userData._followers.push(pos => edgeLine.position.copy(pos));

        if (recent <= 5) {
            const haloCanvas = document.createElement('canvas');
            haloCanvas.width = 128; haloCanvas.height = 128;
            const hctx = haloCanvas.getContext('2d');
            const grad = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(0,255,160,0.25)');
            grad.addColorStop(0.3, 'rgba(0,255,160,0.08)');
            grad.addColorStop(0.6, 'rgba(0,255,160,0.02)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            hctx.fillStyle = grad; hctx.fillRect(0, 0, 128, 128);
            const haloMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(haloCanvas), color: 0x00ffa0, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.8, depthWrite: false });
            const halo = new THREE.Sprite(haloMat);
            halo.scale.set(12, 12, 1);
            halo.position.set(cx, cy, cz);
            scene.add(halo);
            if (!window.__recentHalos) window.__recentHalos = [];
            window.__recentHalos.push(halo);
            ghost.userData.halo = halo;
            ghost.userData._followers.push(pos => halo.position.copy(pos));
        }

        clickables.push(ghost);
        draggables.push(ghost);
        allSearchableNodes.push(ghost);

        const childFeatures = buildFeatures(folder, ghost, cx, cy, cz);
        childFeatures.forEach(f => {
            clickables.push(f);
            draggables.push(f);
            allSearchableNodes.push(f);
            if (f.userData.line) allLines.push(f.userData.line);
        });
    }

    for (const ring of rings) {
        const { radius, y: baseY, count } = ring;
        for (let ci = 0; ci < count && idx < withFeatures.length; ci++, idx++) {
            const folder = withFeatures[idx];
            const angle = (ci / count) * Math.PI * 2 - Math.PI / 2;
            placeNode(folder, Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
        }
    }

    const scatterRadius = 45;
    for (const folder of withoutFeatures) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * (scatterRadius - 15);
        placeNode(folder, Math.cos(theta) * r, Math.sin(theta) * r, -5 + Math.random() * 28);
    }

    return { clickables, draggables, allLines, allSearchableNodes };
}

let selectedProject = null;
function getSelectedProject() { return selectedProject; }

function toggleProject(ghost) {
    if (selectedProject && selectedProject !== ghost) {
        const prev = selectedProject.userData.childFeatures || [];
        prev.forEach(f => { f.visible = false; if (f.userData.label) { f.userData.label.visible = false; f.userData.label.element.style.display = 'none'; } if (f.userData.line) f.userData.line.visible = false; });
        selectedProject.userData.expanded = false;
    }
    const features = ghost.userData.childFeatures || [];
    const willExpand = !ghost.userData.expanded;
    features.forEach(f => { f.visible = willExpand; if (f.userData.label) { f.userData.label.visible = willExpand; f.userData.label.element.style.display = willExpand ? '' : 'none'; } if (f.userData.line) f.userData.line.visible = willExpand; });
    ghost.userData.expanded = willExpand;
    selectedProject = willExpand ? ghost : null;
}

export { buildPyramid, toggleProject, getSelectedProject };
