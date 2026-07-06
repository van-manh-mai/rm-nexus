#!/usr/bin/env python3
"""PreToolUse hook: enforce Stage B (specs/001-rm-clientnexus/process.md).

Blocks any Bash/PowerShell call that would push directly to `main` or commit
while `main` is checked out. Session-level belt to GitHub's branch-protection
suspenders: branch -> push -> PR -> CI -> human approval -> human merges.

Tokenizes with shlex (respecting quotes) so a `git ...` invocation is only
recognised when it's actually the command being run -- not when that text
merely appears inside a quoted string/JSON blob passed to some other program
(e.g. `echo '{"command":"git push origin main"}' | some-script`).

No third-party deps (this machine has no `jq`) -- stdlib only.
"""
import json
import re
import shlex
import subprocess
import sys

WORKFLOW = (
    "Required workflow: branch -> push -> open PR -> wait for CI -> "
    "wait for human approval -> human merges. The agent never pushes or "
    "commits directly to main (Stage B, specs/001-rm-clientnexus/process.md)."
)

GIT_WORD_RE = re.compile(r"\bgit\b")
STATEMENT_OPS = {"&&", "||", ";", "|"}
ENV_ASSIGN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
WRAPPERS = {"sudo", "env"}


def split_statements(command):
    """Tokenize respecting quotes, then split into statements at shell operators.

    Returns None if the command can't be safely tokenized (caller should fall
    back to a conservative whole-string check).
    """
    try:
        tokens = shlex.split(command, posix=True)
    except ValueError:
        return None

    statements, current = [], []
    for tok in tokens:
        if tok in STATEMENT_OPS:
            if current:
                statements.append(current)
            current = []
        else:
            current.append(tok)
    if current:
        statements.append(current)
    return statements


def git_argv(tokens):
    """If `tokens` is a `git ...` invocation (past env-assignments/sudo/env
    wrappers), return the arguments after `git`. Otherwise return None."""
    i = 0
    while i < len(tokens) and ENV_ASSIGN_RE.match(tokens[i]):
        i += 1
    while i < len(tokens) and tokens[i] in WRAPPERS:
        i += 1
    if i < len(tokens) and tokens[i] == "git":
        return tokens[i + 1 :]
    return None


def current_branch(cwd):
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return out.stdout.strip() or None
    except Exception:
        return None


def is_bare_push(args):
    if not args or args[0] != "push":
        return False
    return all(a.startswith("-") for a in args[1:])


def is_push_to_main(args):
    return bool(args) and args[0] == "push" and "main" in args[1:]


def is_commit(args):
    return bool(args) and args[0] == "commit"


def block(reason):
    print(f"Blocked: {reason}\n{WORKFLOW}", file=sys.stderr)
    sys.exit(2)


def check_git_argv(args, cwd, branch_cache):
    if is_push_to_main(args):
        block("git push targeting main.")
    if branch_cache["value"] is None:
        branch_cache["value"] = current_branch(cwd) or ""
    if branch_cache["value"] == "main":
        if is_commit(args):
            block("git commit while checked out on main.")
        if is_bare_push(args):
            block("bare `git push` while on main (would push main).")


def main():
    payload = json.load(sys.stdin)
    command = (payload.get("tool_input") or {}).get("command") or ""
    cwd = payload.get("cwd") or "."

    if not GIT_WORD_RE.search(command):
        sys.exit(0)

    branch_cache = {"value": None}
    statements = split_statements(command)

    if statements is None:
        # Couldn't safely tokenize (unbalanced quotes, PowerShell-specific
        # syntax, etc). Fail closed with a conservative whole-string check
        # rather than silently letting an unparseable command through.
        if re.search(r"\bgit\s+push\b.*\bmain\b", command):
            block("git push targeting main (unparsed command, conservative match).")
        branch_cache["value"] = current_branch(cwd) or ""
        if branch_cache["value"] == "main" and re.search(r"\bgit\s+commit\b", command):
            block("git commit while on main (unparsed command, conservative match).")
        sys.exit(0)

    for tokens in statements:
        args = git_argv(tokens)
        if args is not None:
            check_git_argv(args, cwd, branch_cache)

    sys.exit(0)


if __name__ == "__main__":
    main()
