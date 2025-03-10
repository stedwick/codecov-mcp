#!/usr/bin/env node

/**
 * This is an MCP server for Codecov
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { getCommitCoverageTotals } from './coverage.js';
import { apiKey } from './tools/args.js';
import { gitInfo } from './tools/git.js';

/**
 * Create an MCP server
 */
const server = new Server(
  {
    name: "codecov-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      // resources: {},
      tools: {},
      prompts: {},
    },
  }
);

/**
 * Handler that lists available tools.
 * Exposes tools for working with test coverage data.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_commit_coverage_totals",
        description: "Returns the Codecov coverage totals for a given commit and the coverage totals broken down by file",
        inputSchema: {
          type: "object",
          properties: {},
        }
      }
    ]
  };
});


/**
 * Handler for tool execution.
 * Implements the tools for working with test coverage data.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_commit_coverage_totals": {
      const data = await getCommitCoverageTotals({
        gitInfo,
        apiKey
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Handler that lists available prompts.
 * Exposes prompts for working with test coverage.
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "suggest_tests",
        description: "Suggests tests to write based on Codecov report"
      },
    ]
  };
});

/**
 * Handler for getting specific prompts.
 * Returns prompts for working with test coverage.
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  switch (request.params.name) {
    case "suggest_tests": {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please suggest tests that should be written for these files with low test coverag. First, run the get_commit_coverage_totals tool. Then, for the 10 most important files, suggest specific test cases that would help improve coverage.`
            }
          }
        ]
      };
    }

    default:
      throw new Error("Unknown prompt");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Codecov MCP Server started.");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
