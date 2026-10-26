import type { Hook, Register } from 'claude-code'

// The one program the mod runs: sh with a fixed script. What to do comes in on stdin.
//   "tail\n<transcript path>": print the transcript's last 256 KiB (the newest title and recap live there)
//   "tty\n<text>": write <text> to the terminal
const helper = ($: Parameters<Hook<'session.end'>>[0], stdin: string) =>
  $.process.run(
    ['sh', '-c', 'read -r mode; case "$mode" in tail) read -r path; tail -c 262144 "$path" ;; tty) cat > /dev/tty ;; esac'],
    { stdin, timeoutMs: 500 },
  )

// Pull the newest title and recap out of the transcript's tail. Its first line may be cut, so skip what won't parse.
const summarize = (jsonl: string) => {
  let title: string | undefined
  let recap: string | undefined
  for (const line of jsonl.split('\n')) {
    let row
    try { row = JSON.parse(line) } catch { continue }
    if (row.type === 'ai-title' || row.type === 'custom-title') title = row.customTitle ?? row.aiTitle ?? title
    if (row.subtype === 'away_summary') recap = String(row.content).replace(/\s*\(disable recaps in \/config\)\s*$/, '')
  }
  return [title && `\x1b[1m${title}\x1b[0m`, recap].filter(Boolean).join('\n')
}

export const register: Register = (on) => {
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') return next(e)
    try {
      const home = await $.env.get('HOME')
      const cwd = await $.session.cwd()
      const file = `${home}/.claude/projects/${cwd.replace(/[^a-zA-Z0-9]/g, '-')}/${e.sessionId}.jsonl`
      const summary = summarize((await helper($, `tail\n${file}\n`)).stdout)
      // Claude Code has already printed the 2-line resume hint, and no API writes to the exit screen.
      // So: go up 2 rows, clear to the end, then print the summary and the hint again.
      // ponytail: assumes the hint is the last 2 rows; if Claude Code changes its exit output, this lands in the wrong place.
      if (summary) await helper($, `tty\n\x1b[2A\r\x1b[J${summary}\nResume this session with:\nclaude --resume ${e.resume.id}\n`)
    } catch {}
    return next(e)
  })
}
