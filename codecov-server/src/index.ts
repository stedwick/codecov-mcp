#!/usr/bin/env node

/**
 * Codecov MCP Server
 * 
 * This server integrates with Codecov's API to identify files with low test coverage.
 * It provides tools to help developers find areas of their codebase that need additional testing.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import { exec } from "child_process";
import { promisify } from "util";

// Promisify exec for async/await usage
const execPromise = promisify(exec);

/**
 * Interface for Git repository information
 */
interface GitInfo {
  service?: string;
  owner?: string;
  repo?: string;
}

/**
 * Interface for Codecov coverage data
 */
interface CoverageData {
  name: string;
  full_path: string;
  coverage: number;
  lines: number;
  hits: number;
  partials: number;
  misses: number;
  children?: CoverageData[];
}

/**
 * Interface for low coverage file information
 */
interface LowCoverageFile {
  path: string;
  coverage: number;
  lines: number;
  hits: number;
  misses: number;
}

/**
 * Create an MCP server with capabilities for tools to interact with Codecov
 */
const server = new Server(
  {
    name: "codecov-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Detect Git repository information from the remote URL
 * 
 * @returns Promise with service, owner, and repo information
 */
async function detectGitInfo(): Promise<GitInfo> {
  try {
    console.error("[Git Detection] Executing git remote command");
    // Execute git command to get remote URL
    const { stdout } = await execPromise("git remote -v");

    // Parse the output to extract origin URL
    const remoteMatch = stdout.match(/origin\s+([^\s]+)/);
    if (!remoteMatch) {
      console.error("[Git Detection] No origin remote found");
      return {};
    }

    const remoteUrl = remoteMatch[1];
    console.error(`[Git Detection] Found remote URL: ${remoteUrl}`);

    // Parse different URL formats
    let service, owner, repo;

    if (remoteUrl.includes("github.com")) {
      service = "github";
    } else if (remoteUrl.includes("gitlab.com")) {
      service = "gitlab";
    } else if (remoteUrl.includes("bitbucket.org")) {
      service = "bitbucket";
    }

    // Extract owner and repo
    // HTTPS format: https://github.com/owner/repo.git
    const httpsMatch = remoteUrl.match(/https?:\/\/[^\/]+\/([^\/]+)\/([^\/\.]+)/);
    // SSH format: git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(/git@[^:]+:([^\/]+)\/([^\/\.]+)/);

    if (httpsMatch) {
      [, owner, repo] = httpsMatch;
    } else if (sshMatch) {
      [, owner, repo] = sshMatch;
    }

    if (repo && repo.endsWith(".git")) {
      repo = repo.slice(0, -4);
    }

    console.error(`[Git Detection] Detected: service=${service}, owner=${owner}, repo=${repo}`);
    return { service, owner, repo };
  } catch (error) {
    console.error("[Git Detection] Error:", error);
    return {};
  }
}

/**
 * Create Codecov API client
 * 
 * @param token Codecov API token
 * @returns Axios instance configured for Codecov API
 */
function createCodecovClient(token: string): AxiosInstance {
  // Allow overriding the API URL for testing
  const apiUrl = process.env.CODECOV_API_URL || "https://api.codecov.io/api/v2";
  console.error(`[API] Using Codecov API URL: ${apiUrl}`);

  return axios.create({
    baseURL: apiUrl,
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/json",
    },
  });
}

/**
 * Get coverage data from Codecov API
 * 
 * @param client Axios instance for Codecov API
 * @param service Git service provider (github, gitlab, bitbucket)
 * @param owner Repository owner or organization
 * @param repo Repository name
 * @param depth Depth of directory traversal
 * @returns Promise with coverage data
 */
async function getCoverageData(
  client: AxiosInstance,
  service: string,
  owner: string,
  repo: string,
  depth: number = 10
): Promise<CoverageData> {
  try {
    console.error(`[API] Requesting coverage data for ${service}/${owner}/${repo} with depth=${depth}`);
    const response = await client.get(`/${service}/${owner}/repos/${repo}/report/tree`, {
      params: { depth },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[API Error] ${error.message}`);
      console.error(`[API Error] Status: ${error.response?.status}`);
      console.error(`[API Error] Data:`, error.response?.data);

      throw new McpError(
        ErrorCode.InternalError,
        `Codecov API error: ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Find files with low coverage
 * 
 * @param data Coverage data from Codecov API
 * @param minLines Minimum number of lines a file must have to be included
 * @param threshold Coverage threshold percentage below which files are included
 * @returns Array of low coverage files
 */
function findLowCoverageFiles(
  data: CoverageData,
  minLines: number = 10,
  threshold: number = 80
): LowCoverageFile[] {
  const result: LowCoverageFile[] = [];

  // Process current node if it's a file (no children) and meets criteria
  if (!data.children && data.lines >= minLines && data.coverage < threshold) {
    result.push({
      path: data.full_path,
      coverage: data.coverage,
      lines: data.lines,
      hits: data.hits,
      misses: data.misses,
    });
  }

  // Process children recursively
  if (data.children) {
    for (const child of data.children) {
      result.push(...findLowCoverageFiles(child, minLines, threshold));
    }
  }

  return result;
}

/**
 * Handler that lists available tools.
 * Exposes a "find_low_coverage_files" tool that identifies files with low test coverage.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "find_low_coverage_files",
        description: "Identifies files with low test coverage in a repository",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Codecov API token"
            },
            service: {
              type: "string",
              description: "Git hosting service (github, gitlab, bitbucket). If not provided, will be detected from git remote.",
              enum: ["github", "gitlab", "bitbucket"]
            },
            owner_username: {
              type: "string",
              description: "Username or organization name. If not provided, will be detected from git remote."
            },
            repo_name: {
              type: "string",
              description: "Repository name. If not provided, will be detected from git remote."
            },
            min_lines: {
              type: "number",
              description: "Minimum number of lines a file must have to be included (default: 10)",
              default: 10
            },
            threshold: {
              type: "number",
              description: "Coverage threshold percentage below which files are included (default: 80)",
              default: 80
            },
            depth: {
              type: "number",
              description: "Depth of directory traversal (default: 10)",
              default: 10
            }
          },
          required: ["token"]
        }
      }
    ]
  };
});

/**
 * Handler for the find_low_coverage_files tool.
 * Gets coverage data from Codecov and identifies files with low coverage.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "find_low_coverage_files": {
      console.error("[Tool] Processing find_low_coverage_files request");

      // Extract parameters
      const token = String(request.params.arguments?.token);
      if (!token) {
        throw new McpError(ErrorCode.InvalidParams, "Codecov API token is required");
      }

      let service = request.params.arguments?.service as string | undefined;
      let owner = request.params.arguments?.owner_username as string | undefined;
      let repo = request.params.arguments?.repo_name as string | undefined;
      const minLines = Number(request.params.arguments?.min_lines || 10);
      const threshold = Number(request.params.arguments?.threshold || 80);
      const depth = Number(request.params.arguments?.depth || 10);

      // If any of service, owner, or repo is missing, try to detect from git
      if (!service || !owner || !repo) {
        console.error("[Tool] Detecting git info for missing parameters");
        const gitInfo = await detectGitInfo();

        service = service || gitInfo.service;
        owner = owner || gitInfo.owner;
        repo = repo || gitInfo.repo;
      }

      // Validate required parameters
      if (!service) {
        throw new McpError(ErrorCode.InvalidParams, "Git service provider is required (github, gitlab, bitbucket)");
      }
      if (!owner) {
        throw new McpError(ErrorCode.InvalidParams, "Repository owner/username is required");
      }
      if (!repo) {
        throw new McpError(ErrorCode.InvalidParams, "Repository name is required");
      }

      // Create Codecov API client
      const client = createCodecovClient(token);

      // Get coverage data
      const coverageData = await getCoverageData(client, service, owner, repo, depth);

      // Find files with low coverage
      const lowCoverageFiles = findLowCoverageFiles(coverageData, minLines, threshold)
        .sort((a, b) => a.coverage - b.coverage); // Sort by coverage (ascending)

      // Calculate summary statistics
      const totalFiles = lowCoverageFiles.length;
      const averageCoverage = totalFiles > 0
        ? lowCoverageFiles.reduce((sum, file) => sum + file.coverage, 0) / totalFiles
        : 0;

      // Prepare response
      const result = {
        low_coverage_files: lowCoverageFiles,
        summary: {
          total_files_with_low_coverage: totalFiles,
          average_coverage: averageCoverage.toFixed(2),
        }
      };

      console.error(`[Tool] Found ${totalFiles} files with low coverage`);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  console.error("[Setup] Starting Codecov MCP server");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Setup] Server connected and ready");
}

// Set up error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("[Error] Uncaught exception:", error);
});

// Set up error handling for unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("[Error] Unhandled rejection:", reason);
});

main().catch((error) => {
  console.error("[Fatal] Server error:", error);
  process.exit(1);
});
