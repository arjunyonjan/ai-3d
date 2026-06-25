import { scene, CSS2DObject } from './core.js';
import * as THREE from 'three';

function buildPyramid(pyramidData) {
    const clickables = [];
    const draggables = [];
    const allLines = [];
    const allSearchableNodes = [];

    const withFeatures = pyramidData.filter(f => f.features && f.features.length > 0);
    const withoutFeatures = pyramidData.filter(f => !f.features || f.features.length === 0);

    // Pyramid rings — only projects with knowledge struggles
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
        const labelDiv = document.createElement('div');
        const recent = folder.recent || 99;
        const recentClass = recent <= 5 ? ' recent-high' : '';
        labelDiv.className = 'folder-label' + recentClass;
        labelDiv.dataset.platform = folder.platform || 'wsl';
        const svgPE = ' style="pointer-events:none"';
        const icons = {
            rust: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><circle cx="8" cy="8" r="6" fill="#ce422b"/><circle cx="6" cy="6" r="0.8" fill="#fff"/><circle cx="10" cy="6" r="0.8" fill="#fff"/><path d="M5 11 Q8 12.5 11 11" fill="none" stroke="#fff" stroke-width="0.6"/><path d="M3 5 L1 3 M5 4 L3 2 M11 4 L13 2 M13 5 L15 3 M4 9 L2 11 M12 9 L14 11" stroke="#fff" stroke-width="0.5"/></svg>`,
            nextjs: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><circle cx="8" cy="8" r="7" fill="#111"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">N</text></svg>`,
            vite: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><polygon points="8,1 15,14 1,14" fill="#646cff"/><text x="8" y="12" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">V</text></svg>`,
            react: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><circle cx="8" cy="8" r="2" fill="#61dafb"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" fill="#61dafb" opacity="0.4"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" fill="#61dafb" opacity="0.4" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6.5" ry="2.5" fill="#61dafb" opacity="0.4" transform="rotate(-60 8 8)"/></svg>`,
            python: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><path d="M5 1h6v3H5z" fill="#3776ab"/><path d="M11 4h2v5H5v2H3V4h2z" fill="#3776ab"/><path d="M11 11V8H5V6h6l2 2v3z" fill="#ffd43b"/><circle cx="4" cy="3" r="0.5" fill="#fff"/><circle cx="12" cy="12" r="0.5" fill="#fff"/></svg>`,
            html: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><polygon points="2,1 14,1 12.5,13 8,15 3.5,13" fill="#e44d26"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">5</text></svg>`,
            node: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="#83cd29"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">n</text></svg>`,
            three: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><polygon points="8,1 15,12 1,12" fill="#049ef4"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="6" font-weight="bold">3</text></svg>`,
            playwright: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><rect x="2" y="4" width="12" height="8" rx="1.5" fill="#45ba4b"/><circle cx="8" cy="8" r="2" fill="#fff"/><circle cx="5" cy="6.5" r="0.6" fill="#fff"/><circle cx="11" cy="6.5" r="0.6" fill="#fff"/></svg>`,
            electron: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><circle cx="8" cy="8" r="2.5" fill="#47848f"/><ellipse cx="8" cy="8" rx="6" ry="2" fill="none" stroke="#47848f" stroke-width="0.8"/><ellipse cx="8" cy="8" rx="6" ry="2" fill="none" stroke="#47848f" stroke-width="0.8" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6" ry="2" fill="none" stroke="#47848f" stroke-width="0.8" transform="rotate(-60 8 8)"/></svg>`,
            unknown: `<svg viewBox="0 0 16 16" width="14" height="14"${svgPE}><circle cx="8" cy="8" r="5" fill="#556"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="7" font-weight="bold">?</text></svg>`,
        };
        const platIcons = {
            win: `<svg viewBox="0 0 16 16" width="9" height="9" style="margin-left:3px;pointer-events:none"><rect x="1" y="1" width="6" height="6" fill="#00aaff"/><rect x="9" y="1" width="6" height="6" fill="#00aaff"/><rect x="1" y="9" width="6" height="6" fill="#00aaff"/><rect x="9" y="9" width="6" height="6" fill="#00aaff"/></svg>`,
            wsl: `<svg viewBox="0 0 16 16" width="9" height="9" style="margin-left:3px;pointer-events:none"><circle cx="8" cy="8" r="6" fill="#ff8800"/><circle cx="8" cy="8" r="1.5" fill="#fff"/><circle cx="4" cy="5" r="1" fill="#fff"/><circle cx="12" cy="5" r="1" fill="#fff"/><circle cx="8" cy="12" r="1" fill="#fff"/></svg>`,
        };
        const iconSvg = icons[folder.tech] || '';
        const platSvg = platIcons[folder.platform] || '';
        labelDiv.innerHTML = `${iconSvg} ${folder.folder}${platSvg}`;
        const label = new CSS2DObject(labelDiv);
        label.position.set(cx, cy, cz);
        scene.add(label);

        const ghostR = recent <= 5 ? 5.0 : 4.0;
        const ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const ghost = new THREE.Mesh(new THREE.SphereGeometry(ghostR, 12, 12), ghostMat);
        ghost.position.set(cx, cy, cz);
        ghost.userData = { text: folder.folder, folder: folder.folder, status: folder.status, description: folder.description, isCore: true, label: label };
        ghost.userData._followers = [];
        ghost.userData._followers.push(pos => label.position.copy(pos));
        scene.add(ghost);

        // Glow halo sprite for recent top 5
        if (recent <= 5) {
            const haloCanvas = document.createElement('canvas');
            haloCanvas.width = 128;
            haloCanvas.height = 128;
            const hctx = haloCanvas.getContext('2d');
            const grad = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(0,255,160,0.25)');
            grad.addColorStop(0.3, 'rgba(0,255,160,0.08)');
            grad.addColorStop(0.6, 'rgba(0,255,160,0.02)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            hctx.fillStyle = grad;
            hctx.fillRect(0, 0, 128, 128);
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

        const features = folder.features || [];
        const featCount = features.length;
        const childFeatures = [];
        // Arrange features in a pyramid below the node
        const rows = Math.ceil(Math.sqrt(featCount));
        const colsPerRow = [];
        let remaining = featCount;
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
            for (let c = 0; c < cols && fi < featCount; c++, fi++) {
                const feat = features[fi];
                const offset = cols <= 1 ? 0 : (c / (cols - 1) - 0.5);
                const fx = cx + offset * rowRadius;
                const fz = cz + 0.5 + r * 0.6;
                const fy = rowY;

            const featColor = feat.status === 'fail' ? 0xff4433 : 0x1af0b8;
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = 64;
            glowCanvas.height = 64;
            const gctx = glowCanvas.getContext('2d');
            const grad = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, feat.status === 'fail' ? '#ff0022' : '#00e5ff');
            grad.addColorStop(0.3, feat.status === 'fail' ? 'rgba(255,0,34,0.4)' : 'rgba(0,229,255,0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            gctx.fillStyle = grad;
            gctx.fillRect(0, 0, 64, 64);
            const glowTex = new THREE.CanvasTexture(glowCanvas);

            const featMat = new THREE.SpriteMaterial({
                map: glowTex,
                color: feat.status === 'fail' ? 0xff4433 : 0x1af0b8,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
            });
            const featureMesh = new THREE.Sprite(featMat);
            featureMesh.scale.set(0.5, 0.5, 1);
            featureMesh.position.set(fx, fy, fz);
            featureMesh.userData = {
                text: feat.text,
                folder: folder.folder,
                status: feat.status,
                isFeature: true,
                coreRef: ghost,
            };
            featureMesh.userData._followers = [];
            featureMesh.userData._followers.push(pos => featLabel.position.copy(pos));
            featureMesh.userData._followers.push(pos => {
                if (featureMesh.userData.line) {
                    featureMesh.userData.line.geometry.dispose();
                    featureMesh.userData.line.geometry = new THREE.BufferGeometry().setFromPoints([featureMesh.userData.coreRef.position, pos]);
                }
            });
            scene.add(featureMesh);
            childFeatures.push(featureMesh);

            const featDiv = document.createElement('div');
            const icon = feat.status === 'fail' ? '⚠' : '✓';
            featDiv.className = 'feature-label ' + (feat.status === 'fail' ? 'fail' : 'success');
            featDiv.innerHTML = `<span class="feat-icon">${icon}</span> ${feat.text}`;
            const featLabel = new CSS2DObject(featDiv);
            featLabel.position.set(fx, fy - 0.7, fz);
            scene.add(featLabel);
            featureMesh.userData.label = featLabel;

            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(cx, cy, cz),
                new THREE.Vector3(fx, fy, fz),
            ]);
            const lineMat = new THREE.LineBasicMaterial({
                color: featColor,
                transparent: true,
                opacity: 0.04,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            allLines.push(line);
            featureMesh.userData.line = line;

            // Invisible box ghost for drag/click — covers the label area
            const featGhost = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 1.5, 0.3),
                new THREE.MeshBasicMaterial({ color: 0x0a1410, transparent: true, opacity: 0, depthWrite: false, depthTest: false })
            );
            featGhost.position.set(fx, fy, fz);
            featGhost.userData = {
                isFeature: true,
                targetSprite: featureMesh,
                coreRef: ghost,
                text: feat.text,
                folder: folder.folder,
                label: featLabel,
                line: line,
            };
            featGhost.userData._followers = [];
            featGhost.userData._followers.push(pos => featLabel.position.set(pos.x, pos.y - 0.7, pos.z));
            featGhost.userData._followers.push(pos => {
                featureMesh.position.copy(pos);
            });
            featGhost.userData._followers.push(pos => {
                if (line) {
                    line.geometry.dispose();
                    line.geometry = new THREE.BufferGeometry().setFromPoints([ghost.position, pos]);
                }
            });
            scene.add(featGhost);
            childFeatures.push(featGhost);
            clickables.push(featGhost);
            draggables.push(featGhost);
            allSearchableNodes.push(featGhost);
            }
        }
        // Hide features by default
        childFeatures.forEach(f => { f.visible = false; if (f.userData.label) f.userData.label.visible = false; if (f.userData.line) f.userData.line.visible = false; });
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
    }

    // Place pyramid projects (with features)
    for (const ring of rings) {
        const { radius, y: baseY, count } = ring;
        for (let ci = 0; ci < count && idx < withFeatures.length; ci++, idx++) {
            const folder = withFeatures[idx];
            const angle = (ci / count) * Math.PI * 2 - Math.PI / 2;
            placeNode(folder, Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
        }
    }

    // Place random projects (without features) — scattered in space
    const scatterRadius = 45;
    for (const folder of withoutFeatures) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const r = 15 + Math.random() * (scatterRadius - 15);
        const cx = Math.cos(theta) * r;
        const cz = Math.sin(theta) * r;
        const cy = -5 + Math.random() * 28;
        placeNode(folder, cx, cy, cz);
    }

    return { clickables, draggables, allLines, allSearchableNodes };
}

let selectedProject = null;

function getSelectedProject() { return selectedProject; }

function toggleProject(ghost) {
    // Close previous
    if (selectedProject && selectedProject !== ghost) {
        const prev = selectedProject.userData.childFeatures || [];
        prev.forEach(f => { f.visible = false; if (f.userData.label) { f.userData.label.visible = false; f.userData.label.element.style.display = 'none'; } if (f.userData.line) f.userData.line.visible = false; });
        selectedProject.userData.expanded = false;
    }
    // Toggle current
    const features = ghost.userData.childFeatures || [];
    const willExpand = !ghost.userData.expanded;
    features.forEach(f => { f.visible = willExpand; if (f.userData.label) { f.userData.label.visible = willExpand; f.userData.label.element.style.display = willExpand ? '' : 'none'; } if (f.userData.line) f.userData.line.visible = willExpand; });
    ghost.userData.expanded = willExpand;
    selectedProject = willExpand ? ghost : null;
}

export { buildPyramid, toggleProject, getSelectedProject };
