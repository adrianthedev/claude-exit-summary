import type { Hook, Register } from 'claude-code'

// The one program the mod runs: sh with a fixed script. What to do comes in on stdin.
//   "tail\n<transcript path>": print the transcript's last 256 KiB (the newest title and recap live there)
//   "tty\n<title>\n<text>": clear the 2-line resume hint, then write "<title> · <local time>" and <text> to the terminal
const helper = ($: Parameters<Hook<'session.end'>>[0], stdin: string) =>
  $.process.run(
    ['sh', '-c', 'read -r mode; case "$mode" in tail) read -r path; tail -c 262144 "$path" ;; tty) read -r title; { printf "\\033[2A\\r\\033[J%s\\033[2m%s\\033[0m\\n" "${title:+$title · }" "$(date "+%Y-%m-%d %H:%M")"; cat; } > /dev/tty ;; esac'],
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
  return { title: title ? `\x1b[1m${title.replace(/\s+/g, ' ')}\x1b[0m` : '', recap }
}

export const register: Register = (on) => {
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') return next(e)
    try {
      const home = await $.env.get('HOME')
      const cwd = await $.session.cwd()
      const file = `${home}/.claude/projects/${cwd.replace(/[^a-zA-Z0-9]/g, '-')}/${e.sessionId}.jsonl`
      const { title, recap } = summarize((await helper($, `tail\n${file}\n`)).stdout)
      // Claude Code has already printed the 2-line resume hint, and no API writes to the exit screen.
      // So the helper goes up 2 rows and clears to the end; then the title and time, the recap and the hint again.
      // ponytail: assumes the hint is the last 2 rows; if Claude Code changes its exit output, this lands in the wrong place.
      await helper($, `tty\n${title}\n${recap ? `${recap}\n` : ''}\nResume this session with:\nclaude --resume ${e.resume.id}\n`)
    } catch {}
    return next(e)
  })
}
