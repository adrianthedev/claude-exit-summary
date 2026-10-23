import type { Register } from 'claude-code'

// Pull the newest title and recap out of the transcript; grep keeps us under fs.read's 4 MiB cap.
const summarize = (jsonl: string) => {
  let title: string | undefined
  let recap: string | undefined
  for (const line of jsonl.split('\n')) {
    if (!line) continue
    const row = JSON.parse(line)
    if (row.type === 'ai-title' || row.type === 'custom-title') title = row.customTitle ?? row.aiTitle ?? title
    if (row.subtype === 'away_summary') recap = String(row.content).replace(/\s*\(disable recaps in \/config\)\s*$/, '')
  }
  return [title && `\x1b[1m${title}\x1b[0m`, recap].filter(Boolean).join('\n')
}

// The engine prints the resume hint (2 lines) before session.end runs, and no API writes
// to the exit screen. So: go up 2 rows, insert room, write the summary, come back down.
// ponytail: assumes the hint is the last 2 rows; if the engine reorders exit output, this lands in the wrong place.
const SLIDE_IN = `
cols=$(stty size < /dev/tty | cut -d' ' -f2)
body=$(printf '%s\\n' "$1" | fold -s -w "\${cols:-80}")
n=$(( $(printf '%s\\n' "$body" | wc -l) + 1 ))
printf '\\033[2A\\r\\033[%dL%s\\n\\n\\033[2B\\r' "$n" "$body" > /dev/tty
`

export const register: Register = (on) => {
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') return next(e)
    try {
      const home = await $.env.get('HOME')
      const cwd = await $.session.cwd()
      const file = `${home}/.claude/projects/${cwd.replace(/[^a-zA-Z0-9]/g, '-')}/${e.sessionId}.jsonl`
      const { stdout } = await $.process.run(
        ['grep', '-h', '-e', '"type":"ai-title"', '-e', '"type":"custom-title"', '-e', '"subtype":"away_summary"', file],
        { timeoutMs: 500 },
      )
      const text = summarize(stdout)
      if (text) await $.process.run(['sh', '-c', SLIDE_IN, 'sh', text], { timeoutMs: 500 })
    } catch {}
    return next(e)
  })
}
