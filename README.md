# exit-summary

A Claude Code mod. When you exit a session, it prints what the session was about right above the `claude --resume <id>` hint:

```
Avo dependency updates on main and lc
Updated all Avo gems on main and lc and pushed both branches.
Resume this session with:
claude --resume 56221e9f-b607-4bb8-8b17-7382f6c970fd
```

The first line is the session title. The second is the latest recap Claude wrote for the session, if it wrote one. Nothing prints on `/clear`.

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

When the session ends, the mod reads the session's transcript (`~/.claude/projects/<project>/<session id>.jsonl`) to find the newest title and recap. Claude Code has already printed the resume hint by then, so the mod moves the cursor up two lines, clears them, prints the summary, and prints the resume hint again. If a future Claude Code version prints something else after the resume hint, the summary may land in the wrong place.

Claude Code lets a mod read files up to 4 MB. For a longer transcript the mod shows only a recap Claude wrote while the mod was running, and no title.

## What it runs and sends

- It runs one program, `tee /dev/tty`, with those fixed arguments. It writes the summary to your terminal, because Claude Code has no API for writing to the terminal after the session closes.
- It reads one file, the session's transcript, and one environment variable, `HOME`, to find it.
- It sends nothing over the network. The summary goes to your own terminal and nowhere else.
