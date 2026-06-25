import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const knownStruggles = {
    'ai-3': [
        'CSS2DObject canvas rendering fail',
        'HMR serving stale code (dead code block)',
        'Loss graph invisible on HUD',
        'THREE.CSS2DObject constructor error',
    ],
    'jarvis-rs': [
        'F16 5-bit exponent overflow → BF16',
        'Streaming OOB: code clamp [0,2047]',
        'Daemon cold start pre-warm fix',
        'BF16→F32 conversion in decode',
    ],
    'kokoro-rs': [
        'Post-FX peak normalization RMS→peak',
        'Audio FX pipeline integration',
        'Edge/CPU fallback latency',
    ],
    'ai-bank-chat': [
        'GLiClass intent training data',
        'GLiNER entity extraction accuracy',
        'SBERT contrastive fine-tuning',
        'LanceDB vector store setup',
    ],
    'nabil-bank-bot': [
        'Synonym fallback accuracy',
        'SBERT retrieval threshold tuning',
        'FLAN-T5 vs DeepSeek API cost',
        'Next.js frontend state management',
    ],
    'deepseek-mcp': [
        'Proxy bridge credentials handling',
        'WebSocket reconnection logic',
        'Ollama fallback integration',
    ],
    'fuche-coder': [
        'Python CLI + API design',
        'Tool execution sandboxing',
    ],
    'fuchecode': [
        'Rust binary compilation',
        'Cross-platform path handling',
    ],
    'fuche-tts-extension': [
        'Browser extension CSP issues',
        'Streaming audio from wasm',
    ],
    'xpnd': [
        'wry webview integration',
        'egui text expander UI',
        'Shortcut key interception',
    ],
    'llama.cpp': [
        'Local build optimization',
        'Model quantization setup',
    ],
    'kitten-rs': [
        'KittenML ONNX runtime binding',
        'Nano model format conversion',
    ],
    'dummy-mcp-python': [
        'MCP protocol implementation',
        'Tool registration pattern',
    ],
    'zai-playwright': [
        'Browser automation reliability',
        'CDP session management',
    ],
};

const skipFolders = new Set([
    'chrome_profile', 'temp', 'dev', 'scripts', 'tests', 'docs', 'examples',
    'assets', 'agent_docs', 'backup', 'nltk_data', 'ohmycode-venv', 'downloads',
    'node_modules', '__pycache__', 'target', '.git',
]);

const scanDirs = [
    '/mnt/c/Work',
    '/home/arjun/projects',
    '/home/arjun/deepseek-mcp',
    '/home/arjun/fuche-coder',
    '/home/arjun/xpnd',
];

function getDescription(dir) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            if (pkg.description) return pkg.description;
        } catch {}
    }
    const pyPath = join(dir, 'pyproject.toml');
    if (existsSync(pyPath)) {
        const text = readFileSync(pyPath, 'utf-8');
        const m = text.match(/^description\s*=\s*"([^"]+)"/m);
        if (m) return m[1];
    }
    const cargoPath = join(dir, 'Cargo.toml');
    if (existsSync(cargoPath)) {
        const text = readFileSync(cargoPath, 'utf-8');
        const m = text.match(/^description\s*=\s*"([^"]+)"/m);
        if (m) return m[1];
    }
    const readmePath = join(dir, 'README.md');
    if (existsSync(readmePath)) {
        const line = readFileSync(readmePath, 'utf-8').split('\n')[0];
        return line.replace(/^#\s*/, '').trim();
    }
    return null;
}

const all = [];
for (const base of scanDirs) {
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
        if (entry.startsWith('.')) continue;
        if (skipFolders.has(entry.toLowerCase())) continue;
        const full = join(base, entry);
        if (!statSync(full).isDirectory()) continue;
        const key = entry.toLowerCase();
        if (all.some(p => p.folder.toLowerCase() === key)) continue;

        let features = [];
        const known = knownStruggles[key];
        if (known) {
            features = known.map(f => ({ text: f, status: f.startsWith('CSS') || f.includes('fail') || f.includes('error') || f.includes('OOB') || f.includes('stale') || f.includes('cost') || f.includes('accuracy') || f.includes('sandbox') || f.includes('latency') ? 'fail' : 'success' }));
        }

        const platform = base.includes('/mnt/c/') ? 'win' : 'wsl';
        all.push({
            folder: entry.toUpperCase(),
            platform,
            status: 'success',
            description: getDescription(full) || entry,
            features: features,
        });
    }
}

const data = JSON.stringify(all, null, 2);

const boilerplate = `
let activePanelData = null;
let isHumanInteracted = false;
let autoDemoTimer = null;
let autoCloseTimer = null;

function miniFuseSearch(query, nodeList) {
    if (!query.trim()) return nodeList;
    const q = query.toLowerCase().trim();
    const results = [];
    for (const node of nodeList) {
        const text = (node.userData.text || '').toLowerCase();
        const folder = (node.userData.folder || '').toLowerCase();
        if (text.includes(q) || folder.includes(q)) { results.push(node); continue; }
        let minDist = Infinity;
        const words = q.split(/\\s+/);
        for (const word of words) {
            if (word.length < 2) continue;
            for (const target of [text, folder]) {
                for (let i = 0; i <= target.length - word.length; i++) {
                    let dist = 0;
                    for (let j = 0; j < word.length; j++) { if (target[i + j] !== word[j]) dist++; }
                    if (dist < minDist) minDist = dist;
                }
            }
        }
        if (minDist <= Math.floor(q.length / 3)) results.push(node);
    }
    return results;
}

function openPanelData(d) {
    activePanelData = d;
}

function closePanel() {
    activePanelData = null;
}

function getData(mode) {
    if (mode === 'alpha') {
        return [...pyramidData].sort((a, b) => a.folder.localeCompare(b.folder));
    }
    return pyramidData;
}

function setHumanInteracted(v) { isHumanInteracted = v; }
function setAutoDemoTimer(v) { autoDemoTimer = v; }
function setAutoCloseTimer(v) { autoCloseTimer = v; }
function clearAutoDemo() { if (autoDemoTimer) { clearTimeout(autoDemoTimer); autoDemoTimer = null; } }
function clearAutoClose() { if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; } }

export { pyramidData, getData, miniFuseSearch, openPanelData, closePanel, activePanelData, isHumanInteracted, autoDemoTimer, autoCloseTimer, setHumanInteracted, setAutoDemoTimer, setAutoCloseTimer, clearAutoDemo, clearAutoClose };
`;

const full = 'const pyramidData = ' + data + ';' + boilerplate;
writeFileSync('/mnt/c/Work/ai-3/jarvis-pyramid/data.js', full.trimStart(), 'utf-8');
console.log('Generated data.js with', all.length, 'projects');
