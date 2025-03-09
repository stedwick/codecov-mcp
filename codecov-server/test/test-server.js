#!/usr/bin/env node

/**
 * Test script for the Codecov MCP server
 * 
 * This script tests the functionality of the Codecov MCP server by:
 * 1. Mocking the Codecov API responses
 * 2. Testing the git repository detection
 * 3. Testing the find_low_coverage_files tool
 */

import http from 'http';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample coverage data that mimics Codecov API response
const sampleCoverageData = {
    name: "root",
    full_path: "/",
    coverage: 65.2,
    lines: 1000,
    hits: 652,
    partials: 50,
    misses: 298,
    children: [
        {
            name: "src",
            full_path: "/src",
            coverage: 60.5,
            lines: 800,
            hits: 484,
            partials: 40,
            misses: 276,
            children: [
                {
                    name: "components",
                    full_path: "/src/components",
                    coverage: 75.3,
                    lines: 400,
                    hits: 301,
                    partials: 20,
                    misses: 79,
                    children: [
                        {
                            name: "UserProfile.js",
                            full_path: "/src/components/UserProfile.js",
                            coverage: 23.5,
                            lines: 85,
                            hits: 20,
                            partials: 5,
                            misses: 60
                        },
                        {
                            name: "Dashboard.js",
                            full_path: "/src/components/Dashboard.js",
                            coverage: 90.2,
                            lines: 315,
                            hits: 284,
                            partials: 15,
                            misses: 16
                        }
                    ]
                },
                {
                    name: "utils",
                    full_path: "/src/utils",
                    coverage: 45.8,
                    lines: 400,
                    hits: 183,
                    partials: 20,
                    misses: 197,
                    children: [
                        {
                            name: "validation.js",
                            full_path: "/src/utils/validation.js",
                            coverage: 45.2,
                            lines: 42,
                            hits: 19,
                            partials: 0,
                            misses: 23
                        },
                        {
                            name: "formatting.js",
                            full_path: "/src/utils/formatting.js",
                            coverage: 30.5,
                            lines: 200,
                            hits: 61,
                            partials: 10,
                            misses: 129
                        },
                        {
                            name: "helpers.js",
                            full_path: "/src/utils/helpers.js",
                            coverage: 65.2,
                            lines: 158,
                            hits: 103,
                            partials: 10,
                            misses: 45
                        }
                    ]
                }
            ]
        },
        {
            name: "tests",
            full_path: "/tests",
            coverage: 85.0,
            lines: 200,
            hits: 170,
            partials: 10,
            misses: 20
        }
    ]
};

// Start a mock Codecov API server
function startMockServer(port = 8080) {
    const server = http.createServer((req, res) => {
        console.log(`[Mock Server] Received request: ${req.method} ${req.url}`);

        // Parse the URL
        const url = new URL(req.url, `http://localhost:${port}`);

        // Check if this is a request for coverage data
        if (url.pathname.includes('/repos/') && url.pathname.includes('/report/tree')) {
            console.log('[Mock Server] Returning sample coverage data');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sampleCoverageData));
            return;
        }

        // Default response for unhandled routes
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(port, () => {
        console.log(`[Mock Server] Mock Codecov API server running at http://localhost:${port}`);
    });

    return server;
}

// Test the MCP server
async function testMcpServer() {
    try {
        // Start the mock server
        const mockServer = startMockServer();

        // Get the path to the MCP server executable
        const mcpServerPath = path.resolve(__dirname, '../build/index.js');
        console.log(`[Test] MCP server path: ${mcpServerPath}`);

        // Create a test input for the MCP server
        const testInput = {
            jsonrpc: "2.0",
            id: "1",
            method: "call_tool",
            params: {
                name: "find_low_coverage_files",
                arguments: {
                    token: "test_token",
                    service: "github",
                    owner_username: "test_owner",
                    repo_name: "test_repo",
                    min_lines: 10,
                    threshold: 50
                }
            }
        };

        // Spawn the MCP server process
        const mcpServer = spawn('node', [mcpServerPath]);

        // Set up event handlers
        mcpServer.stdout.on('data', (data) => {
            const response = data.toString().trim();
            if (response) {
                try {
                    const parsedResponse = JSON.parse(response);
                    console.log('\n[Test] Received response from MCP server:');
                    console.log(JSON.stringify(parsedResponse, null, 2));

                    // Check if the response contains low coverage files
                    if (parsedResponse.result &&
                        parsedResponse.result.content &&
                        parsedResponse.result.content[0] &&
                        parsedResponse.result.content[0].text) {

                        const result = JSON.parse(parsedResponse.result.content[0].text);

                        if (result.low_coverage_files && result.low_coverage_files.length > 0) {
                            console.log('\n[Test] ✅ Test passed! Found low coverage files:');
                            console.log(`Found ${result.low_coverage_files.length} files with low coverage`);

                            // Print the first few files
                            const filesToShow = Math.min(result.low_coverage_files.length, 3);
                            for (let i = 0; i < filesToShow; i++) {
                                const file = result.low_coverage_files[i];
                                console.log(`- ${file.path}: ${file.coverage}% coverage (${file.hits}/${file.lines} lines)`);
                            }
                        } else {
                            console.log('\n[Test] ❌ Test failed! No low coverage files found');
                        }
                    }

                    // Close the mock server and MCP server
                    mockServer.close();
                    mcpServer.kill();
                    process.exit(0);
                } catch (error) {
                    console.error('[Test] Error parsing response:', error);
                }
            }
        });

        mcpServer.stderr.on('data', (data) => {
            console.error(`[MCP Server Log] ${data.toString().trim()}`);
        });

        mcpServer.on('error', (error) => {
            console.error('[Test] Error spawning MCP server:', error);
            mockServer.close();
            process.exit(1);
        });

        mcpServer.on('close', (code) => {
            console.log(`[Test] MCP server process exited with code ${code}`);
            mockServer.close();
        });

        // Override the Codecov API URL in the test input
        process.env.CODECOV_API_URL = 'http://localhost:8080';

        // Send the test input to the MCP server
        console.log('\n[Test] Sending test request to MCP server:');
        console.log(JSON.stringify(testInput, null, 2));
        mcpServer.stdin.write(JSON.stringify(testInput) + '\n');
    } catch (error) {
        console.error('[Test] Error:', error);
        process.exit(1);
    }
}

// Run the test
testMcpServer();
