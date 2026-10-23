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

Claude Code prints the resume hint before plugins' exit hooks run. The mod reads the title and recap from the session transcript, moves the cursor up two lines, inserts the summary, and moves back down. If a future Claude Code version prints something else after the resume hint, the summary may land in the wrong place.
