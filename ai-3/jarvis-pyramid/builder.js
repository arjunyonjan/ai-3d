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
        labelDiv.className = 'folder-label';
        labelDiv.dataset.platform = folder.platform || 'wsl';
        const icons = {
            rust: '<svg viewBox="0 0 16 16" width="10" height="10"><circle cx="8" cy="8" r="5" fill="none" stroke="#ce422b" stroke-width="1.2"/><circle cx="6" cy="6" r="0.8" fill="#ce422b"/><circle cx="10" cy="6" r="0.8" fill="#ce422b"/><path d="M5 11 Q8 13 11 11" fill="none" stroke="#ce422b" stroke-width="0.8"/><path d="M3 6 L1 4 M5 5 L3 3 M11 5 L13 3 M13 6 L15 4 M4 10 L2 12 M12 10 L14 12" stroke="#ce422b" stroke-width="0.6"/></svg>',
            nextjs: '<svg viewBox="0 0 16 16" width="10" height="10"><circle cx="8" cy="8" r="7" fill="#111"/><text x="8" y="11" text-anchor="middle" fill="#fff" font-size="8" font-weight="bold">N</text></svg>',
            vite: '<svg viewBox="0 0 16 16" width="10" height="10"><polygon points="8,1 15,14 1,14" fill="none" stroke="#646cff" stroke-width="1.2"/><text x="8" y="12" text-anchor="middle" fill="#646cff" font-size="7" font-weight="bold">V</text></svg>',
            react: '<svg viewBox="0 0 16 16" width="10" height="10"><circle cx="8" cy="8" r="1.5" fill="#61dafb"/><ellipse cx="8" cy="8" rx="6" ry="2.5" fill="none" stroke="#61dafb" stroke-width="0.8"/><ellipse cx="8" cy="8" rx="6" ry="2.5" fill="none" stroke="#61dafb" stroke-width="0.8" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6" ry="2.5" fill="none" stroke="#61dafb" stroke-width="0.8" transform="rotate(-60 8 8)"/></svg>',
            python: '<svg viewBox="0 0 16 16" width="10" height="10"><path d="M5 1h6v3H5z" fill="#3776ab"/><path d="M11 4h2v5H5v2H3V4h2z" fill="#3776ab"/><path d="M11 11V8H5V6h6l2 2v3z" fill="#ffd43b"/><circle cx="4" cy="3" r="0.5" fill="#fff"/><circle cx="12" cy="12" r="0.5" fill="#fff"/></svg>',
            html: '<svg viewBox="0 0 16 16" width="10" height="10"><polygon points="2,1 14,1 12.5,13 8,15 3.5,13" fill="none" stroke="#e44d26" stroke-width="1"/><text x="8" y="11" text-anchor="middle" fill="#e44d26" font-size="6" font-weight="bold">5</text></svg>',
            node: '<svg viewBox="0 0 16 16" width="10" height="10"><polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="none" stroke="#83cd29" stroke-width="1"/><text x="8" y="11" text-anchor="middle" fill="#83cd29" font-size="7" font-weight="bold">n</text></svg>',
            three: '<svg viewBox="0 0 16 16" width="10" height="10"><polygon points="8,1 15,12 1,12" fill="none" stroke="#049ef4" stroke-width="1"/><text x="8" y="11" text-anchor="middle" fill="#049ef4" font-size="6">3</text></svg>',
            playwright: '<svg viewBox="0 0 16 16" width="10" height="10"><rect x="2" y="4" width="12" height="8" rx="1" fill="none" stroke="#45ba4b" stroke-width="1"/><circle cx="8" cy="8" r="2" fill="none" stroke="#45ba4b" stroke-width="0.8"/><circle cx="5" cy="6.5" r="0.6" fill="#45ba4b"/><circle cx="11" cy="6.5" r="0.6" fill="#45ba4b"/></svg>',
            electron: '<svg viewBox="0 0 16 16" width="10" height="10"><circle cx="8" cy="8" r="2" fill="none" stroke="#47848f" stroke-width="0.8"/><ellipse cx="8" cy="8" rx="5.5" ry="2" fill="none" stroke="#47848f" stroke-width="0.6"/><ellipse cx="8" cy="8" rx="5.5" ry="2" fill="none" stroke="#47848f" stroke-width="0.6" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="5.5" ry="2" fill="none" stroke="#47848f" stroke-width="0.6" transform="rotate(-60 8 8)"/></svg>',
        };
        const platIcons = {
            win: '<svg viewBox="0 0 16 16" width="7" height="7" style="margin-left:3px"><rect x="1" y="1" width="6" height="6" fill="#00aaff"/><rect x="9" y="1" width="6" height="6" fill="#00aaff"/><rect x="1" y="9" width="6" height="6" fill="#00aaff"/><rect x="9" y="9" width="6" height="6" fill="#00aaff"/></svg>',
            wsl: '<svg viewBox="0 0 16 16" width="7" height="7" style="margin-left:3px"><circle cx="8" cy="8" r="6" fill="none" stroke="#ff8800" stroke-width="1.5"/><circle cx="8" cy="8" r="1.5" fill="#ff8800"/><circle cx="4" cy="5" r="1" fill="#ff8800"/><circle cx="12" cy="5" r="1" fill="#ff8800"/><circle cx="8" cy="12" r="1" fill="#ff8800"/></svg>',
        };
        const iconSvg = icons[folder.tech] || '';
        const platSvg = platIcons[folder.platform] || '';
        labelDiv.innerHTML = `${iconSvg} ${folder.folder}${platSvg}`;
        const label = new CSS2DObject(labelDiv);
        label.position.set(cx, cy, cz);
        scene.add(label);

        const ghostMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const ghost = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 12), ghostMat);
        ghost.position.set(cx, cy, cz);
        ghost.userData = { text: folder.folder, folder: folder.folder, status: folder.status, description: folder.description, isCore: true, label: label };
        scene.add(ghost);
        clickables.push(ghost);
        draggables.push(ghost);
        allSearchableNodes.push(ghost);

        const features = folder.features || [];
        const featCount = features.length;
        const featRadius = 4.5;
        const childFeatures = [];
        features.forEach((feat, fi) => {
            const angle = (fi / featCount) * Math.PI * 2;
            const fx = cx + Math.cos(angle) * featRadius;
            const fz = cz + Math.sin(angle) * featRadius;
            const fy = cy + 0.1;

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
            scene.add(featureMesh);
            clickables.push(featureMesh);
            draggables.push(featureMesh);
            allSearchableNodes.push(featureMesh);
            childFeatures.push(featureMesh);

            const featDiv = document.createElement('div');
            featDiv.className = 'feature-label ' + (feat.status === 'fail' ? 'fail' : 'success');
            featDiv.textContent = feat.text;
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
                opacity: 0.08,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            scene.add(line);
            allLines.push(line);
            featureMesh.userData.line = line;
        });
        // Hide features by default
        childFeatures.forEach(f => { f.visible = false; if (f.userData.label) f.userData.label.visible = false; if (f.userData.line) f.userData.line.visible = false; });
        ghost.userData.childFeatures = childFeatures;
        ghost.userData.expanded = false;
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

function toggleProject(ghost) {
    // Close previous
    if (selectedProject && selectedProject !== ghost) {
        const prev = selectedProject.userData.childFeatures || [];
        prev.forEach(f => { f.visible = false; if (f.userData.label) f.userData.label.visible = false; if (f.userData.line) f.userData.line.visible = false; });
        selectedProject.userData.expanded = false;
    }
    // Toggle current
    const features = ghost.userData.childFeatures || [];
    const willExpand = !ghost.userData.expanded;
    features.forEach(f => { f.visible = willExpand; if (f.userData.label) f.userData.label.visible = willExpand; if (f.userData.line) f.userData.line.visible = willExpand; });
    ghost.userData.expanded = willExpand;
    selectedProject = willExpand ? ghost : null;
}

export { buildPyramid, toggleProject };
