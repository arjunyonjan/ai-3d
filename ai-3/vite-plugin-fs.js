import { readdirSync } from 'fs'
import { resolve, relative, normalize, basename } from 'path'
import { exec, execSync } from 'child_process'

const ROOT = resolve(process.cwd(), '..')

function wslPath(p) {
  const rest = p.slice(4)
  const slash = rest.indexOf('/')
  const distro = slash > -1 ? rest.slice(0, slash) : rest
  const sub = slash > -1 ? rest.slice(slash + 1) : ''
  const full = resolve(`\\\\wsl.localhost\\${distro}`, normalize(sub || '.'))
  return { distro, full, sub: sub || '' }
}

function safePath(p) {
  if (p.startsWith('wsl:')) return wslPath(p).full
  const full = resolve(ROOT, normalize(p || '.'))
  if (!full.startsWith(ROOT)) return null
  return full
}

function getWslDistros() {
  try {
    const raw = execSync('wsl -l -q', { encoding: 'utf-8', timeout: 3000, shell: 'powershell' })
    return raw.split(/\r?\n/).map(s => s.replace(/\0/g, '').trim()).filter(s => s && !s.toLowerCase().includes('docker'))
  } catch { return [] }
}

function listDir(fullPath) {
  return readdirSync(fullPath, { withFileTypes: true }).map(d => ({
    name: d.name, isDir: d.isDirectory()
  }))
}

function fuzzyScore(query, name) {
  const q = query.toLowerCase(), n = name.toLowerCase()
  let qi = 0, score = 0, consecutive = 0, prev = -2
  for (let ni = 0; ni < n.length && qi < q.length; ni++) {
    if (n[ni] === q[qi]) {
      qi++
      if (ni === prev + 1) { consecutive++; score += consecutive * 3 }
      else { consecutive = 0; score += 1 }
      if (ni === 0 || n[ni-1] === '-' || n[ni-1] === '_' || n[ni-1] === '.' || n[ni-1] === '/' || n[ni-1] === ' ') score += 4
      prev = ni
    }
  }
  if (qi < q.length) return 0
  score += (n.length === q.length) * 10
  return score
}

function searchFiles(rootPath, query) {
  const results = []
  const skip = new Set(['.git', 'node_modules', '.venv', '__pycache__', '.next', 'dist', '.cache', 'build'])
  const queue = [rootPath]
  while (queue.length > 0) {
    const dir = queue.shift()
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        if (skip.has(e.name)) continue
        const score = fuzzyScore(query, e.name)
        if (score) results.push({ name: e.name, isDir: e.isDirectory(), score, path: relative(ROOT, resolve(dir, e.name)).replace(/\\/g, '/') })
        if (e.isDirectory()) queue.push(resolve(dir, e.name))
      }
    } catch {}
  }
  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 30)
}

export default function fsPlugin() {
  return {
    name: 'vite-plugin-fs',
    configureServer(server) {
      server.middlewares.use('/api/ls', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const rawPath = url.searchParams.get('path') || '.'
        const isWsl = rawPath.startsWith('wsl:')
        if (isWsl) {
          const wp = wslPath(rawPath)
          try {
            const entries = listDir(wp.full).map(d => ({
              name: d.name,
              isDir: d.isDir,
              path: 'wsl:' + wp.distro + '/' + (wp.sub ? wp.sub.replace(/\\/g, '/') + '/' : '') + d.name
            }))
            if (!wp.sub) {
              try {
                const home = execSync(`wsl -d ${wp.distro} -c 'echo $HOME'`, { encoding: 'utf-8', timeout: 3000, shell: 'powershell' }).trim()
                if (home && home.startsWith('/')) entries.unshift({ name: '~ (home)', isDir: true, path: 'wsl:' + wp.distro + home })
              } catch {}
            }
            entries.sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0) || a.name.localeCompare(b.name))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ root: 'wsl:' + wp.distro, entries }))
          } catch (e) {
            res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
          }
          return
        }
        const fullPath = safePath(rawPath)
        if (!fullPath) { res.statusCode = 403; res.end('forbidden'); return }
        try {
          const entries = listDir(fullPath).map(d => ({
            name: d.name,
            isDir: d.isDir,
            path: relative(ROOT, resolve(fullPath, d.name)).replace(/\\/g, '/')
          }))
          entries.sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0) || a.name.localeCompare(b.name))
          if (fullPath === ROOT) {
            const distros = getWslDistros()
            distros.forEach(d => {
              const safe = d.replace(/\0/g, '').trim()
              if (safe) entries.push({ name: '[WSL] ' + safe, isDir: true, path: 'wsl:' + safe })
            })
            if (distros.length) {
              try {
                const home = execSync('wsl -c "echo $HOME"', { encoding: 'utf-8', timeout: 3000, shell: 'powershell' }).trim()
                if (home && home.startsWith('/')) entries.push({ name: '~ (WSL home)', isDir: true, path: 'wsl:' + distros[0] + home })
              } catch {}
            }
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ root: basename(ROOT), entries }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/open', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const rawPath = url.searchParams.get('path') || '.'
        if (rawPath.startsWith('wsl:')) {
          const wp = wslPath(rawPath)
          const wslPath2 = '/' + wp.sub.replace(/\\/g, '/')
          const cmd = `start "" wsl -d ${wp.distro} --cd "${wslPath2}"`
          exec(cmd, err => {
            if (err) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); return }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          })
          return
        }
        const path = safePath(rawPath)
        if (!path) { res.statusCode = 403; res.end('forbidden'); return }
        try {
          const cmd = `start "" pwsh -NoExit -Command "Set-Location '${path.replace(/'/g, "''")}'"`
          exec(cmd, err => {
            if (err) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); return }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          })
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/open-file', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const rawPath = url.searchParams.get('path') || '.'
        if (rawPath.startsWith('wsl:')) {
          const wp = wslPath(rawPath)
          exec(`start "" "${wp.full}"`, err => {
            if (err) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); return }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          })
          return
        }
        const path = safePath(rawPath)
        if (!path) { res.statusCode = 403; res.end('forbidden'); return }
        try {
          exec(`start "" "${path}"`, err => {
            if (err) { res.statusCode = 500; res.end(JSON.stringify({ error: err.message })); return }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          })
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      server.middlewares.use('/api/search', (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const q = (url.searchParams.get('q') || '').toLowerCase().trim()
        if (!q) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ results: [] })); return }
        try {
          const results = searchFiles(ROOT, q)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ results }))
        } catch (e) {
          res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}
