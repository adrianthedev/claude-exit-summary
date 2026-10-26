# exit-summary

A Claude Code mod. When you exit a session, it prints what the session was about right above the `claude --resume <id>` hint:

```
Avo dependency updates on main and lc · 2026-10-23 15:05
Updated all Avo gems on main and lc and pushed both branches.

Resume this session with:
claude --resume 56221e9f-b607-4bb8-8b17-7382f6c970fd
```

The first line is the session title and when you closed it, in your local time. The second is the latest recap Claude wrote for the session, if it wrote one. Nothing prints on `/clear`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install exit-summary --marketplace adrianthedev/claude-exit-summary
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```sh
claude plugin install exit-summary --marketplace adrianthedev/claude-exit-summary
```

## How it works

When the session ends, the mod reads the last 256 KiB of the session's transcript (`~/.claude/projects/<project>/<session id>.jsonl`) to find the newest title and recap. Claude Code has already printed the resume hint by then, so the mod moves the cursor up two lines, clears them, prints the summary, and prints the resume hint again. If a future Claude Code version prints something else after the resume hint, the summary may land in the wrong place.

## What it runs and sends

- It runs one program: `sh`, with a fixed script. The script does one of two things, picked by the first line the mod sends on its standard input:
  - `tail`: runs `tail -c 262144` on the transcript path that follows, so the mod can read the end of a transcript that is too large to read whole.
  - `tty`: prints the title and the local time (from `date`) on one line, then copies the rest of its input to `/dev/tty`, because Claude Code has no API for writing to the terminal after the session closes.
- It reads one environment variable, `HOME`, to find the transcript.
- It sends nothing over the network. The summary goes to your own terminal and nowhere else.
