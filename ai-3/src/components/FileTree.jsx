import { useEffect, useRef, useState } from 'preact/hooks'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DragControls } from 'three/addons/controls/DragControls.js'

function zOff(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i)
  return ((h % 5) - 2) * 0.3
}

function hexRgba(h, a) {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

function makeLabel(text, color) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 80
  const x = c.getContext('2d')
  x.font = 'bold 28px JetBrains Mono, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.shadowColor = color; x.shadowBlur = 14
  x.fillStyle = color; x.fillText(text, 300, 40)
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }))
  s.scale.set(3.8, 0.65, 1); s.position.y = 0.9
  return s
}

function makeGlow(hex, r = 2) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128
  const x = c.getContext('2d')
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, hexRgba(hex, 0))
  g.addColorStop(0.15, hexRgba(hex, 0))
  g.addColorStop(0.3, hexRgba(hex, 0.4))
  g.addColorStop(0.6, hexRgba(hex, 0.15))
  g.addColorStop(1, hexRgba(hex, 0))
  x.fillStyle = g; x.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  s.scale.set(r, r, 1)
  return s
}

function makeFolderIcon(color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64
  const x = c.getContext('2d')
  x.clearRect(0, 0, 64, 64)
  x.strokeStyle = color; x.lineWidth = 3; x.fillStyle = color
  const a = 0.2
  x.beginPath()
  x.moveTo(10, 52); x.lineTo(8 + a * 18, 22); x.lineTo(30, 22)
  x.lineTo(36, 12); x.lineTo(54, 12); x.lineTo(56, 42)
  x.lineTo(54, 52); x.closePath()
  x.fill()
  x.globalAlpha = 0.5
  x.fillRect(12, 28, 40, 18)
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }))
  s.scale.set(0.8, 0.8, 1)
  return s
}

export default function FileTree() {
  const el = useRef()
  const [entries, setEntries] = useState(null)
  const [count, setCount] = useState(0)
  const { current: store } = useRef({ byPath: new Map(), groups: [], links: [], dragGroup: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchIdx, setSearchIdx] = useState(-1)
  const searchTimer = useRef(null)

  useEffect(() => {
    fetch('/api/ls?path=.').then(r => r.json()).then(d => {
      store.rootName = d.root || 'project'
      setEntries(d.entries)
      setCount(d.entries.length + 1)
    })
  }, [])

  useEffect(() => {
    if (!entries) return
    const w = window.innerWidth, h = window.innerHeight
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#030a14')
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
    camera.position.set(0, 8, 40)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    el.current.appendChild(renderer.domElement)

    const orbit = new OrbitControls(camera, renderer.domElement)
    orbit.target.set(0, 6, 0)
    orbit.autoRotate = true
    orbit.autoRotateSpeed = 0.08
    orbit.enableDamping = true
    orbit.dampingFactor = 0.08
    orbit.update()
    store._camera = camera
    store._orbit = orbit
    store.focusTarget = null

    const rootPath = '.'
    const rootNode = { path: rootPath, name: store.rootName, isDir: true, children: [], expanded: true, parent: null, idx: 0, total: 1 }
    store.byPath.set(rootPath, rootNode)

    function makeChildGroup(ent, idx, total, parentEnt) {
      const perRow = 8
      const row = Math.floor(idx / perRow)
      const col = idx % perRow
      const nCols = Math.min(total - row * perRow, perRow)
      const px = parentEnt._x
      const x = px - 10.5 + (col + 0.5) * (21 / perRow)
      const y = parentEnt._y - 4.5 - row * 4.5
      const color = ent.isDir ? '#ffaa33' : '#44ddcc'
      const g = new THREE.Group()
      const dot = ent.isDir ? makeFolderIcon(color) : new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshBasicMaterial({ color }))
      g.add(dot)
      const glow = makeGlow(color, ent.isDir ? 1.5 : 1.5)
      g.add(glow)
      const label = makeLabel(ent.name, color)
      g.add(label)
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
      pad.position.y = 0.9
      pad.layers.set(1)
      g.add(pad)
      const z = ((idx || 0) - (total || 1) / 2) * 0.5 + zOff(ent.name)
      g.position.set(x, y, z)
      scene.add(g)
      store.dragGroup.push(g)
      ent._g = g; ent._x = x; ent._y = y
    }

    const rootG = new THREE.Group()
    const rootDot = makeFolderIcon('#1af0b8')
    rootDot.scale.set(1.0, 1.0, 1)
    rootG.add(rootDot)
    const rootGlow = makeGlow('#1af0b8', 2.5)
    rootG.add(rootGlow)
    const rootLabel = makeLabel(store.rootName, '#1af0b8')
    rootG.add(rootLabel)
    const rootPad = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    rootPad.position.y = 0.9
    rootPad.layers.set(1)
    rootG.add(rootPad)
    rootG.position.set(0, 16, 0)
    scene.add(rootG)
    store.dragGroup.push(rootG)
    rootNode._g = rootG; rootNode._x = 0; rootNode._y = 16

    const linkMats = []

    function addLinks(parentEnt, children) {
      const parentG = parentEnt._g
      children.forEach(c => {
        const g = c._g
        if (!g || !parentG) return
        const bg = new THREE.BufferGeometry()
        bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
        const p = bg.attributes.position.array
        p[0] = parentG.position.x; p[1] = parentG.position.y; p[2] = parentG.position.z
        p[3] = g.position.x; p[4] = g.position.y; p[5] = g.position.z
        bg.attributes.position.needsUpdate = true
        const m = new THREE.LineBasicMaterial({ color: '#336688', transparent: true, opacity: 0.25 })
        const l = new THREE.Line(bg, m)
        scene.add(l)
        if (!parentEnt._links) parentEnt._links = []
        parentEnt._links.push(l)
        linkMats.push(m)
        c._linkGeom = bg
      })
    }

    function updateLink(p, g) {
      const bg = g._linkGeom
      if (!bg) return
      const pa = p._g; if (!pa) return
      const ga = g._g; if (!ga) return
      const arr = bg.attributes.position.array
      arr[0] = pa.position.x; arr[1] = pa.position.y; arr[2] = pa.position.z
      arr[3] = ga.position.x; arr[4] = ga.position.y; arr[5] = ga.position.z
      bg.attributes.position.needsUpdate = true
    }

    function updateChildLinks(ent) {
      (ent.children || []).forEach(c => {
        updateLink(ent, c)
        updateChildLinks(c)
      })
    }

    const SKIP = new Set(['.git', 'node_modules', '.venv', '__pycache__', '.next', 'dist', '.cache', 'build', '.vscode', '.idea'])

    function createChildren(parentEnt, list) {
      const skipped = list.filter(e => SKIP.has(e.name)).length
      store.excluded = (store.excluded || 0) + skipped
      list = list.filter(e => !SKIP.has(e.name))
      list.forEach((e, i) => {
        const ent = { path: e.path, name: e.name, isDir: e.isDir, children: [], expanded: false, parent: parentEnt, idx: i, total: list.length }
        store.byPath.set(e.path, ent)
        makeChildGroup(ent, i, list.length, parentEnt)
        parentEnt.children.push(ent)
      })
      addLinks(parentEnt, parentEnt.children)
      setCount(store.byPath.size)
    }

    createChildren(rootNode, entries)

    const drag = new DragControls(store.dragGroup, camera, renderer.domElement)
    drag.transformGroup = true
    drag.addEventListener('dragstart', () => orbit.enabled = false)
    drag.addEventListener('drag', () => { updateChildLinks(rootNode) })
    drag.addEventListener('dragend', () => orbit.enabled = true)

    const raycaster = new THREE.Raycaster()
    raycaster.layers.enable(1)
    const pointer = new THREE.Vector2()
    let hoveredGroup = null

    let isolatedPath = null
    let wasExpanded = false

    function setGroupVisible(g, show) {
      if (!g) return
      g.visible = show
      g.children.forEach(c => c.visible = show)
    }

    function applyIsolation(path) {
      isolatedPath = path
      store.byPath.forEach(e => {
        const show = e.path === '.' || e.path === path || path.startsWith(e.path + '/') || e.path.startsWith(path + '/')
        setGroupVisible(e._g, show)
      })
      store.byPath.forEach(e => {
        if (!e._links) return
        e._links.forEach((l, i) => {
          const child = e.children[i]
          l.visible = e._g?.visible && child?._g?.visible
        })
      })
    }

    function restoreAll() {
      const was = isolatedPath
      isolatedPath = null
      store.byPath.forEach(e => {
        setGroupVisible(e._g, true)
        if (e._links) e._links.forEach(l => l.visible = true)
      })
      if (was && wasExpanded) {
        const ent = store.byPath.get(was)
        if (ent && ent.expanded) {
          ent.expanded = false
          const stack = [...ent.children]
          while (stack.length) {
            const c = stack.shift()
            store.byPath.delete(c.path)
            if (c._links) c._links.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose() })
            if (c._g) { scene.remove(c._g); c._g = null }
            if (c.children) stack.push(...c.children)
            c.children = []
          }
          ent.children = []
          if (ent._links) {
            ent._links.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose() })
            ent._links = []
          }
          setCount(store.byPath.size)
        }
      }
      wasExpanded = false
      orbit.autoRotate = false
      store.focusTarget = { x: 0, y: 6, z: 0, cx: 0, cy: 8, cz: 40 }
    }

    function isolateDir(ent) {
      const path = ent.path
      if (isolatedPath === path) { restoreAll(); return }
      if (ent.isDir && !ent.expanded) {
        wasExpanded = true
        expandDir(ent).then(() => { applyIsolation(path); store.focusNode(path) })
        return
      }
      wasExpanded = false
      applyIsolation(path)
      store.focusNode(path)
    }

    function hitTest(e) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(store.dragGroup, true)
      if (hits.length === 0) return null
      let obj = hits[0].object
      while (obj.parent && store.dragGroup.indexOf(obj) === -1) obj = obj.parent
      if (store.dragGroup.indexOf(obj) === -1) return null
      if (!obj.visible) return null
      return [...store.byPath.values()].find(x => x._g === obj) || null
    }

    function onClick(e) {
      const ent = hitTest(e)
      if (!ent) return
      if (e.shiftKey) {
        fetch('/api/open?path=' + encodeURIComponent(ent.path))
        return
      }
      if (ent.isDir) isolateDir(ent)
    }

    function onDblClick(e) {
      const ent = hitTest(e)
      if (!ent || ent.isDir) return
      fetch('/api/open-file?path=' + encodeURIComponent(ent.path))
    }

    function expandDir(ent) {
      if (ent.loading) return Promise.resolve()
      ent.loading = true
      return fetch('/api/ls?path=' + encodeURIComponent(ent.path))
        .then(r => r.json())
        .then(d => {
          ent.loading = false
          ent.expanded = true
          createChildren(ent, d.entries || [])
        })
        .catch(() => { ent.loading = false })
    }

    function collapseDir(ent) {
      ent.expanded = false
      const stack = [...ent.children]
      while (stack.length) {
        const c = stack.shift()
        store.byPath.delete(c.path)
        if (c._links) c._links.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose() })
        if (c._g) { scene.remove(c._g); c._g = null }
        if (c.children) stack.push(...c.children)
        c.children = []
      }
      ent.children = []
      if (ent._links) {
        ent._links.forEach(l => {
          scene.remove(l); l.geometry.dispose(); l.material.dispose()
          const idx = linkMats.indexOf(l.material)
          if (idx > -1) linkMats.splice(idx, 1)
        })
        ent._links = []
      }
      setCount(store.byPath.size)
    }

    store.focusNode = (path) => {
      const ent = store.byPath.get(path)
      if (!ent || !ent._g) return
      const pos = new THREE.Vector3()
      ent._g.getWorldPosition(pos)
      orbit.autoRotate = false
      store.focusTarget = { x: pos.x, y: pos.y, z: pos.z, cx: pos.x, cy: pos.y + 6, cz: pos.z + 20 }
      store.byPath.forEach(e => {
        if (!e._g) return
        const glow = e._g.children[1]
        if (glow && glow.isSprite) {
          if (e === ent) { glow.scale.set(4, 4, 1) }
          else { glow.scale.set(0.25, 0.25, 1) }
        }
      })
      store._highlightTimer = setTimeout(() => {
        store.byPath.forEach(e => {
          if (!e._g) return
          const glow = e._g.children[1]
          if (glow && glow.isSprite) glow.scale.set(glow.userData.bs || 2, glow.userData.bs || 2, 1)
        })
      }, 2000)
    }

    store.searchSelect = async (path) => {
      const segments = path.split('/')
      let cur = '.'
      for (const seg of segments) {
        if (!seg) continue
        const childPath = cur === '.' ? seg : cur + '/' + seg
        let ent = store.byPath.get(childPath)
        if (!ent) {
          const parent = store.byPath.get(cur)
          if (parent && parent.isDir && !parent.expanded) {
            await expandDir(parent)
            ent = store.byPath.get(childPath)
          }
        }
        if (!ent) break
        cur = childPath
      }
      store.focusNode(path)
    }

    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('dblclick', onDblClick)

    let running = true
    let time = 0
    let focusDoneTime = 0
    function animate() {
      if (!running) return
      time += 0.025
      const p = 0.85 + 0.15 * Math.sin(time * 0.4)
      store.dragGroup.forEach(g => {
        const glow = g.children[1]
        if (glow && glow.isSprite) glow.scale.set(p * (glow.userData.bs || 2), p * (glow.userData.bs || 2), 1)
      })
      linkMats.forEach((m, i) => { m.opacity = 0.18 + 0.15 * Math.sin(time * 0.5 + i * 0.2) })
      if (store.focusTarget) {
        const t = store.focusTarget
        orbit.target.x += (t.x - orbit.target.x) * 0.08
        orbit.target.y += (t.y - orbit.target.y) * 0.08
        orbit.target.z += (t.z - orbit.target.z) * 0.08
        camera.position.x += (t.cx - camera.position.x) * 0.08
        camera.position.y += (t.cy - camera.position.y) * 0.08
        camera.position.z += (t.cz - camera.position.z) * 0.08
        if (Math.abs(orbit.target.x - t.x) < 0.01 && Math.abs(orbit.target.y - t.y) < 0.01) {
          store.focusTarget = null
          focusDoneTime = time
        }
      }
      if (!store.focusTarget && focusDoneTime && time - focusDoneTime > 3) {
        orbit.autoRotate = true
        focusDoneTime = 0
      }
      orbit.update()
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    store.dragGroup.forEach(g => {
      const glow = g.children[1]
      if (glow && glow.isSprite) glow.userData.bs = glow.scale.x
    })
    requestAnimationFrame(animate)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    addEventListener('resize', onResize)

    return () => {
      running = false
      removeEventListener('resize', onResize)
      drag.dispose()
      orbit.dispose()
      renderer.domElement.remove()
      renderer.dispose()
    }
  }, [entries])

  function onSearchInput(e) {
    const q = e.target.value
    setSearchQuery(q)
    setSearchIdx(-1)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (q.length < 1) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q))
        const data = await res.json()
        setSearchResults(data.results || [])
      } catch { setSearchResults([]) }
    }, 300)
  }

  function onSearchKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchIdx(i => Math.min(i + 1, searchResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSearchIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && searchIdx >= 0) { onSearchSelect(searchResults[searchIdx].path) }
    if (e.key === 'Escape') { setSearchQuery(''); setSearchResults([]); setSearchIdx(-1); e.target.blur() }
  }

  function onSearchSelect(path) {
    setSearchQuery('')
    setSearchResults([])
    setSearchIdx(-1)
    store.searchSelect(path)
  }

  return (
    <>
      <div ref={el} style="position:fixed;top:0;left:0;width:100%;height:100%" />
      <div id="arch-hud">FILE EXPLORER · {count} ENTRIES{store.excluded ? ' · ' + store.excluded + ' EXCLUDED' : ''}<span class="cursor">▌</span></div>
      <div id="files-hint">click folder to isolate · double-click file to open · shift+click for terminal</div>
      <div id="search-bar">
        <input
          id="search-input"
          type="text"
          placeholder="search files..."
          value={searchQuery}
          onInput={onSearchInput}
          onKeyDown={onSearchKeyDown}
        />
        {searchResults.length > 0 && (
          <div id="search-dropdown">
            {searchResults.map((r, i) => (
              <div
                class={"search-item" + (i === searchIdx ? " search-on" : "")}
                onClick={() => onSearchSelect(r.path)}
                onMouseEnter={() => setSearchIdx(i)}
              >
                <span class={"si-icon" + (r.isDir ? " si-dir" : " si-file")} />
                <span class="si-name">{r.name}</span>
                <span class="si-path">{r.path}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button id="arch-back-btn" onClick={() => { history.pushState(null, '', '/'); dispatchEvent(new Event('navigate')) }}>← NN VIEW</button>
      <div class="scanlines"></div>
      <div id="corner-brackets">
        <div class="cb cb-tl"></div><div class="cb cb-tr"></div>
        <div class="cb cb-bl"></div><div class="cb cb-br"></div>
      </div>
    </>
  )
}
