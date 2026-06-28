var groupGhosts = {};
if (data.groups) data.groups.forEach(function(g) {
  var gn = data.nodes.filter(function(n) { return n.group === g.id; });
  var div = document.createElement('div');
  div.className = 'group-label';
  div.style.borderColor = g.color;
  div.style.color = g.color;
  if (g.id === 'knowledge') div.style.textDecoration = 'underline';
  div.textContent = g.label;

  var label = new THREE.CSS2DObject(div);
  var gz = g.id === 'interface' ? -1.0 : g.id === 'infra' ? 1.0 : g.id === 'engines' ? 2.0 : g.id === 'knowledge' ? -0.5 : 0.3;
  var top = gn.length ? Math.max.apply(null, gn.map(function(n) { return n.y; })) : g.y;
  label.position.set(g.x, top + 1.5, gz);
  panelGroup.add(label);

  var gh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), ghostMat);
  gh.position.copy(label.position);
  gh.userData = { label: label, groupId: g.id, isGroup: true };
  scene.add(gh);
  groupGhosts[g.id] = gh;
});

var nodeGhosts = Array(data.nodes.length);
data.nodes.forEach(function(n, i) {
  var c = n.id === 'heartbeat' ? '#ff4455' : getGroupColor(n.group);
  var isCore = n.id === 'opencode';
  var div = document.createElement('div');
  div.className = 'glass-panel';
  if (isCore) {
    div.style.background = 'transparent';
    div.style.backdropFilter = 'none';
    div.style.border = 'none';
    div.style.boxShadow = 'none';
    div.style.position = 'relative';
    div.style.padding = '130px 0 45px 0';
    div.style.minWidth = 'auto';
  } else {
    div.style.borderColor = c + '44';
  }

  var bc = n.badge === 'Pro' ? '#ff3344' : c;

  var iconMap = {
    onedrive: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:5px"><path d="M4.5 17a5 5 0 0 1-.5-9.97A7 7 0 0 1 11 3a7 7 0 0 1 7 4.03A5 5 0 0 1 18 17H4.5z" fill="#0078D4" opacity="0.25"/><path d="M4 17h16" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round"/><path d="M7 14c0-2.5 2-4.5 4.5-4.5S16 11.5 16 14" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M9.5 12L12 9.5l2.5 2.5" stroke="#0078D4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
    config: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    sessionlog: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    browser: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    zed: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    terminal: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    tmux: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    whisper: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    fastapi: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    dsv4free: '<img src="logos/deepseek.svg" width="32" height="32" style="vertical-align:middle;margin-right:4px">',
    bigpickle: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M12 3a7 7 0 0 0-7 7c0 5 4 9 7 11 3-2 7-6 7-11a7 7 0 0 0-7-7z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>',
    mimifree: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.66 5.66l1.42-1.42M6.34 5.66L4.92 4.24"/><path d="M12 9a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0v-4a3 3 0 0 0-3-3z"/></svg>',
    northmini: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><circle cx="12" cy="12" r="10"/><polyline points="12 2 16 8 12 6 8 8"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
    nemotron: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/></svg>',
    fuchetts: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    'kitten-rs': '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M12 20c-4 0-6-2-6-6V8a6 6 0 0 1 12 0v6c0 4-2 6-6 6z"/><path d="M8 7c0-2 1.5-4 4-4s4 2 4 4"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/></svg>',
    qwen35cc: '<img src="logos/qwen.svg" width="32" height="32" style="vertical-align:middle;margin-right:4px">',
    ollama: '<img src="logos/ollama.svg" width="32" height="32" style="vertical-align:middle;margin-right:4px">',
    qwen3coder: '<img src="logos/qwen.svg" width="32" height="32" style="vertical-align:middle;margin-right:4px">',
    gemma4: '<img src="logos/gemma.svg" width="32" height="32" style="vertical-align:middle;margin-right:4px">',
    deepseek: '<img src="logos/deepseek.svg" width="32" height="32" style="vertical-align:middle;margin-right:4px">',
    nanbeige: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/></svg>',
    llama32: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10" fill="#1b1f20" opacity="0.2"/><path d="M12 5v14M8 9h8M6 13h12" stroke="#ff8236" stroke-width="1.2" stroke-linecap="round"/><circle cx="12" cy="10" r="2" fill="#ff8236"/><path d="M14 12l2 4M10 12l-2 4" stroke="#ff8236" stroke-width="1" stroke-linecap="round"/></svg>',
    zen: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    superharness: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="2" style="vertical-align:middle;margin-right:5px"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    vecsearch: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;margin-right:5px"><circle cx="11" cy="11" r="6" stroke="' + c + '" stroke-width="2" fill="none"/><path d="M16 16l4 4" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/><circle cx="9" cy="9" r="1.5" fill="' + c + '" opacity="0.6"/><circle cx="13" cy="11" r="1.5" fill="' + c + '" opacity="0.6"/><circle cx="10" cy="14" r="1.5" fill="' + c + '" opacity="0.6"/></svg>'
  };
  var ico = iconMap[n.id] || '';
  var titleHtml = n.id === 'heartbeat'
    ? '<svg class="heart-icon" width="32" height="32" viewBox="0 0 24 24" fill="#ff3344" style="vertical-align:middle;margin-right:4px"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span style="color:' + c + '">' + n.label + '</span>'
    : isCore
      ? '<span style="color:#00ffa0;font-size:13px;letter-spacing:1.5px">' + n.label + '</span>'
      : ico + '<span style="color:' + c + '">' + n.label + '</span>';
  var env = n.env || '?';
  var envColor = env === 'WSL' ? '#44dd88' : env === 'WIN' ? '#4488ff' : env === 'BOTH' ? '#aa66ff' : env === 'CLOUD' ? '#ffaa33' : '#888';

  var ringSvg = isCore
    ? '<div class="core-ring-wrap" style="position:absolute;top:50%;left:50%;width:200px;height:200px;transform:translate(-50%,-50%);pointer-events:none">'
      + '<svg class="cr-r1" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin 6s linear infinite"><circle cx="50" cy="50" r="46" fill="none" stroke="#ff3355" stroke-width="1.0" opacity="0.85" stroke-dasharray="4 8"/><circle cx="50" cy="50" r="46" fill="none" stroke="#ff3355" stroke-width="0.5" opacity="0.6" stroke-dasharray="1 3" transform="rotate(45 50 50)"/></svg>'
      + '<svg class="cr-r2" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin-rev 8s linear infinite"><circle cx="50" cy="50" r="40" fill="none" stroke="#3388ff" stroke-width="1.0" opacity="0.85" stroke-dasharray="12 16"/><circle cx="50" cy="50" r="40" fill="none" stroke="#3388ff" stroke-width="0.5" opacity="0.6" stroke-dasharray="2 5" transform="rotate(90 50 50)"/></svg>'
      + '<svg class="cr-r3" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin 4s linear infinite reverse"><circle cx="50" cy="50" r="34" fill="none" stroke="#33ff88" stroke-width="0.9" opacity="0.85" stroke-dasharray="6 10"/><circle cx="50" cy="50" r="30" fill="none" stroke="#33ff88" stroke-width="0.7" opacity="0.6" stroke-dasharray="3 7" transform="rotate(30 50 50)"/></svg>'
      + '<svg class="cr-r4" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin 3s linear infinite"><circle cx="50" cy="50" r="25" fill="none" stroke="#ff33cc" stroke-width="0.7" opacity="0.8" stroke-dasharray="2 4"/><circle cx="50" cy="50" r="21" fill="none" stroke="#ff33cc" stroke-width="0.5" opacity="0.55" stroke-dasharray="1 3" transform="rotate(60 50 50)"/></svg>'
      + '<svg class="cr-cross" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin 10s linear infinite"><line x1="6" y1="50" x2="16" y2="50" stroke="#33ddff" stroke-width="1.2" opacity="0.85"/><line x1="84" y1="50" x2="94" y2="50" stroke="#33ddff" stroke-width="1.2" opacity="0.85"/><line x1="50" y1="6" x2="50" y2="16" stroke="#33ddff" stroke-width="1.2" opacity="0.85"/><line x1="50" y1="84" x2="50" y2="94" stroke="#33ddff" stroke-width="1.2" opacity="0.85"/><line x1="50" y1="50" x2="65" y2="25" stroke="#33ddff" stroke-width="0.6" opacity="0.55"/><line x1="50" y1="50" x2="75" y2="50" stroke="#33ddff" stroke-width="0.6" opacity="0.55"/><line x1="50" y1="50" x2="50" y2="75" stroke="#33ddff" stroke-width="0.6" opacity="0.55"/><line x1="50" y1="50" x2="35" y2="25" stroke="#33ddff" stroke-width="0.6" opacity="0.55"/><line x1="50" y1="50" x2="25" y2="50" stroke="#33ddff" stroke-width="0.6" opacity="0.55"/><line x1="50" y1="50" x2="50" y2="25" stroke="#33ddff" stroke-width="0.6" opacity="0.55"/></svg>'
      + '<svg class="cr-scan" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin 4s linear infinite"><path d="M50,50 L50,4 A46,46 0 0,1 96,50" fill="none" stroke="#ff6633" stroke-width="1.5" opacity="0.85"/></svg>'
      + '<svg class="cr-scan-rev" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0;animation:ring-spin-rev 5s linear infinite"><path d="M50,50 L50,8 A42,42 0 0,0 8,50" fill="none" stroke="#7733ff" stroke-width="1.2" opacity="0.85"/></svg>'
      + '<svg class="cr-ticks" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0">'
      + '<line x1="50" y1="4" x2="50" y2="7" stroke="#ffcc33" stroke-width="0.7" opacity="0.8"/>'
      + '<line x1="50" y1="93" x2="50" y2="96" stroke="#ffcc33" stroke-width="0.7" opacity="0.8"/>'
      + '<line x1="4" y1="50" x2="7" y2="50" stroke="#ffcc33" stroke-width="0.7" opacity="0.8"/>'
      + '<line x1="93" y1="50" x2="96" y2="50" stroke="#ffcc33" stroke-width="0.7" opacity="0.8"/>'
      + '<line x1="18" y1="18" x2="20" y2="20" stroke="#ffcc33" stroke-width="0.5" opacity="0.55"/>'
      + '<line x1="82" y1="18" x2="80" y2="20" stroke="#ffcc33" stroke-width="0.5" opacity="0.55"/>'
      + '<line x1="18" y1="82" x2="20" y2="80" stroke="#ffcc33" stroke-width="0.5" opacity="0.55"/>'
      + '<line x1="82" y1="82" x2="80" y2="80" stroke="#ffcc33" stroke-width="0.5" opacity="0.55"/>'
      + '</svg>'
      + '<svg class="cr-pulse" width="200" height="200" viewBox="0 0 100 100" style="position:absolute;top:0;left:0"><circle cx="50" cy="50" r="16" fill="none" stroke="#00ffa0" stroke-width="0.3" opacity="0.4"/><circle cx="50" cy="50" r="10" fill="none" stroke="#00ffa0" stroke-width="0.3" opacity="0.3"/><circle cx="50" cy="50" r="4" fill="#00ffa0" opacity="0.25"/></svg>'
      + '</div>'
    : '';
  div.innerHTML = ringSvg + '<h3 style="display:flex;align-items:center;gap:4px">' + titleHtml + '</h3><p>' + n.detail + '</p><div style="display:flex;gap:4px;justify-content:center;margin-top:4px"><span class="badge" style="color:' + bc + ';border-color:' + bc + '44;background:' + bc + '11">' + n.badge + '</span><span class="badge" style="color:' + envColor + ';border-color:' + envColor + '44;background:' + envColor + '11;font-size:7px">' + env + '</span></div>';

  var nz = n.z !== undefined ? n.z : 0;

  var label = new THREE.CSS2DObject(div);
  label.position.set(n.x, n.y, nz);
  label.userData = { baseY: n.y, baseZ: nz, phase: Math.random() * Math.PI * 2 };
  panelGroup.add(label);

  var ghost = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 0.3), ghostMat);
  ghost.position.set(n.x, n.y, nz);
  ghost.userData = { label: label, index: i };
  scene.add(ghost);
  nodeGhosts[i] = ghost;
});
