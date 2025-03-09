#!/usr/bin/env node

/**
 * Test script to try different method names with the MCP server
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test the MCP server with different method names
async function testMethods() {
    try {
        // Get the path to the MCP server executable
        const mcpServerPath = path.resolve(__dirname, '../build/index.js');
        console.log(`[Test] MCP server path: ${mcpServerPath}`);

        // Spawn the MCP server process
        const mcpServer = spawn('node', [mcpServerPath]);

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
                    console.error('[Test] Error processing response:', error);
                }
            }
        });

        mcpServer.stderr.on('data', (data) => {
            console.error(`[MCP Server Log] ${data.toString().trim()}`);
        });

        mcpServer.on('error', (error) => {
            console.error('[Test] Error spawning MCP server:', error);
            process.exit(1);
        });

        mcpServer.on('close', (code) => {
            console.log(`[Test] MCP server process exited with code ${code}`);
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try different method names for listing tools
        const methodsToTry = [
            'tools/list',  // Correct method name
            'list_tools',  // Incorrect method name
            'listTools',   // Incorrect method name
            'list-tools',  // Incorrect method name
            'ListTools',   // Incorrect method name
            'get_tools',   // Incorrect method name
            'getTools',    // Incorrect method name
            'get-tools',   // Incorrect method name
            'GetTools'     // Incorrect method name
        ];

        for (const method of methodsToTry) {
            console.log(`\n[Test] Trying method: ${method}`);
            const request = {
                jsonrpc: "2.0",
                id: method,
                method: method,
                params: {}
            };

            console.log('[Test] Sending request:');
            console.log(JSON.stringify(request, null, 2));
            mcpServer.stdin.write(JSON.stringify(request) + '\n');

            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Try the correct method name for calling tools
        console.log(`\n[Test] Trying method: tools/call`);
        const callToolRequest = {
            jsonrpc: "2.0",
            id: "tools/call",
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

        console.log('[Test] Sending request:');
        console.log(JSON.stringify(callToolRequest, null, 2));
        mcpServer.stdin.write(JSON.stringify(callToolRequest) + '\n');

        // Wait for responses and then clean up
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('\n[Test] Test completed, cleaning up');
        mcpServer.kill();
    } catch (error) {
        console.error('[Test] Error:', error);
        process.exit(1);
    }
}

// Run the test
testMethods();
