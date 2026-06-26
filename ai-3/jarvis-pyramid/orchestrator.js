import { scene, camera, renderer, labelRenderer, orbitControls, CSS2DObject } from './core.js';
import { getData } from './data.js';
import { buildPyramid, toggleProject, getSelectedProject } from './builder.js';
import { wireInteraction, wireDragControls } from './interaction.js';
import { enterIsolation, exitIsolation, tickCameraAnimation, isolationMode } from './isolation.js';
import { wireSearch } from './search.js';
import { wireDev, updateDevFrame } from './dev.js';
import { isHumanInteracted, autoDemoTimer, autoCloseTimer, setHumanInteracted, setAutoDemoTimer, setAutoCloseTimer, clearAutoDemo, clearAutoClose } from './demo.js';
import { closePanel } from './panel.js';
import { startListening, stopListening, isSupported as sttSupported } from './stt.js';
import { matchIntent } from './intents.js';
import * as THREE from 'three';
import { DragControls } from 'three/addons/controls/DragControls.js';

let currentMode = 'category';
let cls = [], dgs = [], lns = [], sns = [], webLines = [];
let dragControls;
let _idleTimer = null;
let activeTechFilters = new Set();

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
            const p = line.geometry.attributes.position.array;
            p[0] = a.position.x; p[1] = a.position.y; p[2] = a.position.z;
            p[3] = b.position.x; p[4] = b.position.y; p[5] = b.position.z;
            line.geometry.attributes.position.needsUpdate = true;
        };
        a.userData._followers.push(updateWeb);
        b.userData._followers.push(updateWeb);
    });
}

rebuildPyramid();
buildWebLines();
buildTechFilter();
applyTechFilter();

wireInteraction(dgs, dragControls, cls);
wireSearch(sns);
window.__searchableNodes = sns;
wireDev();
wireSTT();

function startAutoRotate() { orbitControls.autoRotate = true; }
function stopAutoRotate() { orbitControls.autoRotate = false; }
function resetIdleTimer() {
    stopAutoRotate();
    if (_idleTimer) clearTimeout(_idleTimer);
    _idleTimer = setTimeout(startAutoRotate, 5000);
}
orbitControls.autoRotate = true;
orbitControls.autoRotateSpeed = 0.2;
document.addEventListener('keydown', (e) => {
    if (e.key === 'h' && e.ctrlKey && e.shiftKey) {
        document.body.classList.toggle('hide-3d');
        const cb = document.getElementById('dev-hide-3d');
        if (cb) cb.checked = document.body.classList.contains('hide-3d');
    }
});
renderer.domElement.addEventListener('pointerdown', resetIdleTimer);
renderer.domElement.addEventListener('wheel', resetIdleTimer);
renderer.domElement.addEventListener('project-click', resetIdleTimer);

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
        buildTechFilter();
        applyTechFilter();
        wireInteraction(dgs, dragControls, cls);
        wireSearch(sns);
    });
});

document.getElementById('back-view').addEventListener('click', () => {
    exitIsolation(webLines);
});

function buildTechFilter() {
    const container = document.getElementById('tech-filter');
    if (!container) return;
    const techs = [...new Set(cls.filter(c => c.userData.isCore).map(c => c.userData.tech).filter(Boolean))].sort();
    container.innerHTML = '';
    const allBtn = document.createElement('span');
    allBtn.className = 'tf-btn' + (activeTechFilters.size === 0 ? ' active' : '');
    allBtn.textContent = 'ALL';
    allBtn.addEventListener('click', () => {
        activeTechFilters.clear();
        container.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        applyTechFilter();
    });
    container.appendChild(allBtn);
    const techColors = {
        rust: '#ce422b', nextjs: '#111', vite: '#646cff',
        react: '#61dafb', python: '#3776ab', html: '#e44d26',
        node: '#83cd29', three: '#049ef4', playwright: '#45ba4b',
        electron: '#47848f', unknown: '#556',
    };
    techs.forEach(tech => {
        const btn = document.createElement('span');
        btn.className = 'tf-btn' + (activeTechFilters.has(tech) ? ' active' : '');
        const color = techColors[tech] || '#556';
        btn.innerHTML = `<span class="tf-dot" style="background:${color};box-shadow:0 0 4px ${color}"></span>${tech}`;
        btn.addEventListener('click', () => {
            if (activeTechFilters.has(tech)) {
                activeTechFilters.delete(tech);
                btn.classList.remove('active');
            } else {
                activeTechFilters.add(tech);
                btn.classList.add('active');
            }
            allBtn.classList.toggle('active', activeTechFilters.size === 0);
            applyTechFilter();
        });
        container.appendChild(btn);
    });
}

function applyTechFilter() {
    const showAll = activeTechFilters.size === 0;
    cls.forEach(c => {
        if (c.userData.isCore) {
            const visible = showAll || activeTechFilters.has(c.userData.tech);
            c.visible = visible;
            if (c.userData.label) {
                c.userData.label.visible = visible;
                c.userData.label.element.style.display = visible ? '' : 'none';
            }
            if (c.userData.halo) c.userData.halo.visible = visible;
            if (c.userData.childFeatures) {
                c.userData.childFeatures.forEach(f => {
                    f.visible = visible && c.userData.expanded;
                    if (f.userData.label) { f.userData.label.visible = visible && c.userData.expanded; f.userData.label.element.style.display = visible && c.userData.expanded ? '' : 'none'; }
                    if (f.userData.line) f.userData.line.visible = visible && c.userData.expanded;
                });
            }
        }
    });
    webLines.forEach(l => {
        if (!l.userData.a || !l.userData.b) return;
        l.visible = l.userData.a.visible && l.userData.b.visible;
    });
}

let _previewTimer = null;

function showSpeechPreview(text) {
    const el = document.getElementById('stt-preview');
    if (!el) return;
    el.textContent = `"${text}"`;
    el.classList.add('active');
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(() => el.classList.remove('active'), 2200);
}

const _dotColors = ['#9060ff', '#9060ff', '#9060ff', '#9060ff', '#00e5ff', '#00e5ff', '#00e5ff', '#00e5ff', '#00e5ff', '#00e5ff', '#00ffa0', '#00ffa0', '#00ffa0'];

function setSpeakingLevel(level) {
    const orb = document.querySelector('.sp-orb');
    const glow = document.querySelector('.sp-glow');
    const dots = document.querySelectorAll('.sp-dot');
    const s = 20 + level * 30;
    if (orb) {
        orb.style.width = `${s}px`;
        orb.style.height = `${s}px`;
        orb.style.boxShadow = `0 0 ${20 + level * 40}px rgba(0,229,255,${0.2 + level * 0.5}), 0 0 ${40 + level * 60}px rgba(0,229,255,${0.05 + level * 0.2})`;
    }
    if (glow) {
        glow.style.opacity = 0.3 + level * 0.7;
        glow.style.transform = `translate(-50%, -50%) scale(${0.8 + level * 0.4})`;
    }
    dots.forEach((d, i) => {
        d.style.opacity = 0.2 + level * 0.8;
        const si = 6 + level * 20;
        const c = _dotColors[i % _dotColors.length];
        d.style.boxShadow = `0 0 ${si}px ${c}, 0 0 ${si * 2}px ${c}40`;
    });
}

function showSpeakingIndicator(text, durationMs) {
    const ind = document.getElementById('speaking-indicator');
    const prev = document.getElementById('stt-preview');
    if (ind) ind.classList.add('active');
    if (prev) {
        prev.textContent = `🤖 ${text}`;
        prev.classList.add('active');
    }
}

(function() {
    let timers = [];
    const ind = document.getElementById('speaking-indicator');
    const prev = document.getElementById('stt-preview');
    window.__stopSpeaking = function() {
        timers.forEach(t => clearTimeout(t));
        timers = [];
        setSpeakingLevel(0);
        if (ind) ind.classList.remove('active');
        if (prev) setTimeout(() => prev.classList.remove('active'), 500);
    };
    window.__scheduleSpeakingEnd = function(durationMs) {
        const t = setTimeout(() => {
            if (!timers.length) return;
            window.__stopSpeaking();
        }, durationMs);
        timers.push(t);
    };
})();

async function fetchReasonSSE(text) {
    try {
        const res = await fetch('/api/reason', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const events = buf.split('\n\n');
            buf = events.pop() || '';

            for (const raw of events) {
                for (const line of raw.split('\n')) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.status === 'speaking') {
                                showSpeakingIndicator(data.reply, data.duration * 1000);
                                window.__scheduleSpeakingEnd(data.duration * 1000);
                            }
                            if (data.status === 'level') {
                                setSpeakingLevel(data.value);
                            }
                            if (data.status === 'done') {
                                if (window.__stopSpeaking) window.__stopSpeaking();
                            }
                        } catch {}
                    }
                }
            }
        }
    } catch (err) {
        console.warn('reason SSE error:', err);
    }
}

let _silenceStart = null;

function onVoiceLevel(level) {
    const bars = document.querySelectorAll('.stt-wave-bar');
    const multipliers = [0.5, 0.8, 1.0, 0.8, 0.5];
    bars.forEach((bar, i) => {
        const s = Math.max(0.1, 0.15 + level * multipliers[i] * 2.5);
        bar.style.transform = `scaleY(${s})`;
    });
    const vbLevel = document.getElementById('voice-level');
    if (vbLevel) {
        const vbars = vbLevel.querySelectorAll('.voice-bar');
        const vmult = [0.6, 1.0, 1.0, 0.6];
        vbars.forEach((bar, i) => {
            const s = Math.max(0.1, 0.15 + level * vmult[i] * 3);
            bar.style.transform = `scaleY(${s})`;
        });
    }
    document.documentElement.style.setProperty('--voice-level', level);

    if (level < 0.04) {
        if (!_silenceStart) _silenceStart = performance.now();
        else if (performance.now() - _silenceStart > 2000) {
            _silenceStart = null;
            stopListening();
        }
    } else {
        _silenceStart = null;
    }
}

function sttCleanup() {
    const btn = document.getElementById('stt-btn');
    const holo = document.getElementById('stt-hologram');
    if (btn) btn.classList.remove('listening');
    if (holo) holo.classList.remove('active');
    document.querySelectorAll('.stt-wave-bar').forEach(b => b.style.transform = 'scaleY(0.15)');
}

function wireSTT() {
    const btn = document.getElementById('stt-btn');
    if (!btn || !sttSupported()) return;
    btn.addEventListener('click', () => {
        if (btn.classList.contains('listening')) {
            stopListening();
            sttCleanup();
        } else {
            startListening((text) => {
                showSpeechPreview(text);
                const vlCb = document.getElementById('dev-voice-loop');
                if (!vlCb || vlCb.checked) {
                    fetchReasonSSE(text);
                }
                const intent = matchIntent(text);
                if (!intent) return;
                const { action, payload } = intent;
                switch (action) {
                    case 'filterTech':
                        activeTechFilters.clear();
                        activeTechFilters.add(payload);
                        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tf-btn').forEach(b => {
                            if (b.textContent.trim().toLowerCase() === payload) b.classList.add('active');
                        });
                        applyTechFilter();
                        break;
                    case 'showAll':
                        activeTechFilters.clear();
                        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tf-btn')[0]?.classList.add('active');
                        applyTechFilter();
                        if (isolationMode) exitIsolation(webLines);
                        document.getElementById('search-input').value = '';
                        document.getElementById('search-input').dispatchEvent(new Event('input'));
                        break;
                    case 'goBack':
                        if (isolationMode) exitIsolation(webLines);
                        break;
                    case 'clearSearch':
                        document.getElementById('search-input').value = '';
                        document.getElementById('search-input').dispatchEvent(new Event('input'));
                        break;
                    case 'toggleDev':
                        document.getElementById('dev-btn')?.click();
                        break;
                    case 'stopListening':
                        stopListening();
                        sttCleanup();
                        break;
                    case 'searchProject':
                        document.getElementById('search-input').value = payload;
                        document.getElementById('search-input').dispatchEvent(new Event('input'));
                        const found = cls.find(c => c.userData.isCore && c.userData.folder && c.userData.folder.toUpperCase().includes(payload));
                        if (found) {
                            const evt = new CustomEvent('project-click', { detail: { obj: found } });
                            renderer.domElement.dispatchEvent(evt);
                        }
                        break;
                    case 'search':
                    default:
                        document.getElementById('search-input').value = payload || text;
                        document.getElementById('search-input').dispatchEvent(new Event('input'));
                        break;
                }
            }, sttCleanup, onVoiceLevel);
            btn.classList.add('listening');
            const holo = document.getElementById('stt-hologram');
            if (holo) holo.classList.add('active');
        }
    });
}

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
        const ht = t * 0.6;
        window.__recentHalos.forEach(halo => {
            if (halo.visible) halo.material.opacity = 0.6 + 0.4 * (Math.sin(ht + halo.id) * 0.5 + 0.5);
        });
    }
    cls.forEach(dot => {
        if (dot.userData.isFeature && dot.userData.targetSprite && dot.visible) {
            const sprite = dot.userData.targetSprite;
            const pulse = 0.6 + 0.4 * (Math.sin(t * 1.5 + dot.id) * 0.5 + 0.5);
            sprite.material.opacity = pulse;
            const s = 0.4 + 0.2 * (Math.sin(t * 1.5 + dot.id) * 0.5 + 0.5);
            sprite.scale.set(s, s, 1);
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
