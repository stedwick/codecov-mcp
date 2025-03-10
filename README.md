# Codecov MCP Server

A Codecov Model Context Protocol server in TypeScript.

- Tools for finding where your codebase is lacking tests.
- Prompts for suggesting which tests to write.

## Features

### Resources
- None yet

### Tools
- `get_commit_coverage_totals` - Returns the coverage totals for a given commit and the
coverage totals broken down by file. Uses [this api](https://docs.codecov.com/reference/repos_totals_retrieve).

### Prompts
- `suggest_tests` - Suggests tests to write based on Codecov report.

## Installation

Usage: Ask your AI agent to "run the get_commit_coverage_totals tool" in your chat.

Configure: No need to install anything, just run with `npx` and put in your Codecov API key from [here](https://app.codecov.io/account/) - Go to Settings -> Access.

And git url: `git remote get-url origin`

Cursor command: `npx -y codecov-mcp-server --api-key XXX --git-url XXX`
(On Windows) Cursor command: `cmd.exe /c npx -y codecov-mcp-server --api-key XXX --git-url XXX`

To use with Claude (or any AI), add the server config:

```json
{
  "mcpServers": {
    "codecov-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "codecov-mcp-server",
      ],
      "env": {
        "CODECOV_API_KEY": "XXX",
        "GIT_URL": "XXX"
      }
    }
  }
}
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```
