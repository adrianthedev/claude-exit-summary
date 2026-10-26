import type { Register } from 'claude-code'

const RECAP_FOOTER = /\s*\(disable recaps in \/config\)\s*$/

// Pull the newest title and recap out of the transcript.
const fromTranscript = (jsonl: string) => {
  let title: string | undefined
  let recap: string | undefined
  for (const line of jsonl.split('\n')) {
    let row
    try { row = JSON.parse(line) } catch { continue }
    if (row.type === 'ai-title' || row.type === 'custom-title') title = row.customTitle ?? row.aiTitle ?? title
    if (row.subtype === 'away_summary') recap = String(row.content).replace(RECAP_FOOTER, '')
  }
  return { title, recap }
}

export const register: Register = (on) => {
  // Fallback for transcripts too big for $.fs.read (4 MiB): the newest recap written while this mod was loaded.
  // ponytail: a big transcript loses its title, which only lives in the file; add a range read if $.fs gets one.
  let liveRecap: string | undefined

  on('session.append', ($, e, next) => {
    if (e.message.type === 'system' && e.message.name === 'away_summary') {
      const block = e.message.content[0]
      if (block?.type === 'text') liveRecap = String(block.text).replace(RECAP_FOOTER, '')
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') return next(e)
    try {
      const home = await $.env.get('HOME')
      const cwd = await $.session.cwd()
      const file = `${home}/.claude/projects/${cwd.replace(/[^a-zA-Z0-9]/g, '-')}/${e.sessionId}.jsonl`
      const { title, recap } = await $.fs.read(file).then(fromTranscript, () => ({ title: undefined, recap: liveRecap }))
      const summary = [title && `\x1b[1m${title}\x1b[0m`, recap].filter(Boolean).join('\n')
      // Claude Code has already printed the 2-line resume hint, and no API writes to the exit screen.
      // So: go up 2 rows, clear to the end, then print the summary and the hint again.
      // ponytail: assumes the hint is the last 2 rows; if Claude Code changes its exit output, this lands in the wrong place.
      if (summary) {
        await $.process.run(['tee', '/dev/tty'], {
          stdin: `\x1b[2A\r\x1b[J${summary}\nResume this session with:\nclaude --resume ${e.resume.id}\n`,
          timeoutMs: 500,
        })
      }
    } catch {}
    return next(e)
  })
}
