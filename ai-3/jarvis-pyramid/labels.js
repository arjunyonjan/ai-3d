import { CSS2DObject } from './core.js';

const svgPE = ' style="pointer-events:none"';
export const icons = {
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
export const platIcons = {
    win: `<svg viewBox="0 0 16 16" width="9" height="9" style="margin-left:3px;pointer-events:none"><rect x="1" y="1" width="6" height="6" fill="#00aaff"/><rect x="9" y="1" width="6" height="6" fill="#00aaff"/><rect x="1" y="9" width="6" height="6" fill="#00aaff"/><rect x="9" y="9" width="6" height="6" fill="#00aaff"/></svg>`,
    wsl: `<svg viewBox="0 0 16 16" width="9" height="9" style="margin-left:3px;pointer-events:none"><circle cx="8" cy="8" r="6" fill="#ff8800"/><circle cx="8" cy="8" r="1.5" fill="#fff"/><circle cx="4" cy="5" r="1" fill="#fff"/><circle cx="12" cy="5" r="1" fill="#fff"/><circle cx="8" cy="12" r="1" fill="#fff"/></svg>`,
};

export function createLabel(folder, recentClass) {
    const div = document.createElement('div');
    div.className = 'folder-label' + recentClass + ' tech-' + (folder.tech || 'unknown');
    div.dataset.platform = folder.platform || 'wsl';
    div.innerHTML = `<span class="tech-dot"></span>${icons[folder.tech] || ''} ${folder.folder}${platIcons[folder.platform] || ''}`;
    return div;
}

export function measureLabelPixels(html, recentClass) {
    const m = document.createElement('div');
    m.className = 'folder-label' + recentClass;
    m.innerHTML = html;
    m.style.position = 'fixed';
    m.style.left = '-9999px';
    m.style.top = '-9999px';
    document.body.appendChild(m);
    const w = m.offsetWidth;
    const h = m.offsetHeight;
    document.body.removeChild(m);
    return { w, h };
}

export function pixelsTo3D(wPx, hPx, dist, camera) {
    const vFov = camera.fov * Math.PI / 180;
    const pU = (window.innerHeight / 2) / (Math.tan(vFov / 2) * dist);
    return { w: wPx / pU, h: hPx / pU };
}
