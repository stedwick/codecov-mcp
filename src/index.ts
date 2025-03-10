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
import { parseGitUrl } from "./tools/git.js";

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
          properties: {
            gitUrl: {
              type: "string",
              description: "The URL of the git repository"
            }
          },
          required: ["gitUrl"]
        },
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
      const gitUrl = String(request.params.arguments?.gitUrl);
      if (!gitUrl) {
        throw new Error("gitUrl is required");
      }

      const gitInfo = parseGitUrl(gitUrl);
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
    // TODO
    case "suggest_tests": {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `
    Using the Codecov MCP, analyze the test coverage data by calling get_commit_coverage_totals. 

    Please examine the results and provide:
    1. A list of up to 10 critical files with the lowest test coverage percentages
    2. For each identified file with low coverage:
       - A bulleted list of suggested test cases that would improve coverage

    Focus on critical paths and complex logic that would benefit most from additional testing.

    Please format the response as a clear, actionable list of test recommendations.`
            }
          }
        ],
        tools: ["get_commit_coverage_totals"]
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
