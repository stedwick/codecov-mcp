#!/usr/bin/env node

/**
 * Test script for the Codecov MCP server using the MCP SDK
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

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
                        }
                    ]
                }
            ]
        }
    ]
};

// Start a mock Codecov API server
function startMockServer(port = 8080) {
    const server = http.createServer((req, res) => {
        // Parse the URL
        const url = new URL(req.url, `http://localhost:${port}`);

        // Check if this is a request for coverage data
        if (url.pathname.includes('/repos/') && url.pathname.includes('/report/tree')) {
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

        // Set environment variable for the mock server
        process.env.CODECOV_API_URL = 'http://localhost:8080';

        // Spawn the MCP server process with environment variables
        const mcpServer = spawn('node', [mcpServerPath], {
            env: {
                ...process.env,
                CODECOV_API_URL: 'http://localhost:8080'
            }
        });

        // Set up event handlers
        mcpServer.stdout.on('data', (data) => {
            const response = data.toString().trim();
            if (response) {
                try {
                    console.log(`[MCP Server Output] ${response}`);

                    // Try to parse as JSON
                    try {
                        const parsedResponse = JSON.parse(response);
                        console.log('[Test] Parsed response:', JSON.stringify(parsedResponse, null, 2));
                    } catch (e) {
                        // Not JSON, that's fine
                    }
                } catch (error) {
                    // This is an actual error, so we keep the console.error
                    console.error('[Test] Error processing response:', error);
                }
            }
        });

        mcpServer.stderr.on('data', (data) => {
            // Only log actual errors from the server
        });

        mcpServer.on('error', (error) => {
            // This is an actual error, so we keep the console.error
            console.error('[Test] Error spawning MCP server:', error);
            mockServer.close();
            process.exit(1);
        });

        mcpServer.on('close', (code) => {
            console.log(`[Test] MCP server process exited with code ${code}`);
            mockServer.close();
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Initialize the server
        console.log('\n[Test] Step 1: Initializing server');
        const initializeRequest = {
            jsonrpc: "2.0",
            id: "initialize",
            method: "initialize",
            params: {
                capabilities: {},
                clientInfo: {
                    name: "test-client",
                    version: "1.0.0"
                },
                protocolVersion: "0.1.0"
            }
        };

        console.log('[Test] Sending initialize request:');
        console.log(JSON.stringify(initializeRequest, null, 2));
        mcpServer.stdin.write(JSON.stringify(initializeRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Send initialized notification
        console.log('\n[Test] Step 2: Sending initialized notification');
        const initializedNotification = {
            jsonrpc: "2.0",
            method: "initialized",
            params: {}
        };

        console.log('[Test] Sending initialized notification:');
        console.log(JSON.stringify(initializedNotification, null, 2));
        mcpServer.stdin.write(JSON.stringify(initializedNotification) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));

        // List tools
        console.log('\n[Test] Step 3: Listing tools');
        const listToolsRequest = {
            jsonrpc: "2.0",
            id: "list-tools",
            method: "tools/list",
            params: {}
        };

        console.log('[Test] Sending tools/list request:');
        console.log(JSON.stringify(listToolsRequest, null, 2));
        mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Call the find_low_coverage_files tool
        console.log('\n[Test] Step 4: Calling find_low_coverage_files tool');
        const callToolRequest = {
            jsonrpc: "2.0",
            id: "call-tool",
            method: "tools/call",
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

        console.log('[Test] Sending call_tool request:');
        console.log(JSON.stringify(callToolRequest, null, 2));
        mcpServer.stdin.write(JSON.stringify(callToolRequest) + '\n');

        // Wait for response and then clean up
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('\n[Test] Test completed, cleaning up');
        mcpServer.kill();
        mockServer.close();
    } catch (error) {
        // This is an actual error, so we keep the console.error
        console.error('[Test] Error:', error);
        process.exit(1);
    }
}

// Run the test
testMcpServer();
