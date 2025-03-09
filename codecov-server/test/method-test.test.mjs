import { spawn } from 'child_process';
import path from 'path';
import http from 'http';

describe('MCP Server Method Tests', () => {
    let mockServer;
    let mcpServer;
    let serverOutput = [];
    let serverErrors = [];
    const mockServerPort = 8084;

    // Setup function to start the MCP server before tests
    beforeAll(async () => {
        // Create a mock server for Codecov API
        mockServer = http.createServer((req, res) => {
            // Parse the URL
            const url = new URL(req.url, `http://localhost:${mockServerPort}`);

            // Check if this is a request for coverage data
            if (url.pathname.includes('/repos/') && url.pathname.includes('/report/tree')) {
                // Return sample coverage data
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

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(sampleCoverageData));
                return;
            }

            // Default response for unhandled routes
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        });

        // Start the mock server
        await new Promise(resolve => {
            mockServer.listen(mockServerPort, () => {
                resolve();
            });
        });

        // Get the path to the MCP server executable
        const mcpServerPath = path.resolve(__dirname, '../build/index.js');

        // Spawn the MCP server process with environment variables
        mcpServer = spawn('node', [mcpServerPath], {
            env: {
                ...process.env,
                CODECOV_API_URL: `http://localhost:${mockServerPort}`
            }
        });

        // Set up event handlers
        mcpServer.stdout.on('data', (data) => {
            const response = data.toString().trim();
            if (response) {
                serverOutput.push(response);
            }
        });

        mcpServer.stderr.on('data', (data) => {
            const error = data.toString().trim();
            serverErrors.push(error);
            // Only log actual errors from the server
        });

        mcpServer.on('error', (error) => {
            // This is an actual error, so we keep this console.error
            console.error('[Error] Error spawning MCP server:', error);
            throw error;
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Cleanup function to stop the MCP server and mock server after tests
    afterAll(() => {
        if (mcpServer) {
            mcpServer.kill();
        }

        if (mockServer) {
            mockServer.close();
        }
    });

    // Increase timeout for all tests in this file
    jest.setTimeout(15000);

    // Test correct method name for listing tools
    test('Server responds to correct tools/list method name', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Use the correct method name for listing tools
        const correctRequest = {
            jsonrpc: "2.0",
            id: "correct-list-method",
            method: "tools/list",
            params: {}
        };

        mcpServer.stdin.write(JSON.stringify(correctRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check that we got a response
        expect(serverOutput.length).toBeGreaterThan(0);

        // Try to find a successful response
        let successfulResponse = false;
        for (const output of serverOutput) {
            try {
                const parsed = JSON.parse(output);
                if (parsed.id === "correct-list-method" && parsed.result && !parsed.error) {
                    successfulResponse = true;
                    break;
                }
            } catch (e) {
                // Not JSON or not the response we're looking for
            }
        }

        // We should have received a successful response
        expect(successfulResponse).toBe(true);
    });

    // Test correct method name for calling tools
    test('Server responds to correct tools/call method name', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Use the correct method name for calling tools
        const correctRequest = {
            jsonrpc: "2.0",
            id: "correct-call-method",
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

        mcpServer.stdin.write(JSON.stringify(correctRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check that we got a response
        expect(serverOutput.length).toBeGreaterThan(0);

        // Try to find a successful response
        let successfulResponse = false;
        for (const output of serverOutput) {
            try {
                const parsed = JSON.parse(output);
                if (parsed.id === "correct-call-method" && parsed.result && !parsed.error) {
                    successfulResponse = true;
                    break;
                }
            } catch (e) {
                // Not JSON or not the response we're looking for
            }
        }

        // We should have received a successful response
        expect(successfulResponse).toBe(true);
    });

    // Test incorrect method names
    test('Server rejects incorrect method names', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Try an incorrect method name
        const incorrectRequest = {
            jsonrpc: "2.0",
            id: "incorrect-method",
            method: "list_tools", // Incorrect method name
            params: {}
        };

        mcpServer.stdin.write(JSON.stringify(incorrectRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check that we got a response
        expect(serverOutput.length).toBeGreaterThan(0);

        // Try to find an error response
        let errorResponse = false;
        for (const output of serverOutput) {
            try {
                const parsed = JSON.parse(output);
                if (parsed.id === "incorrect-method" && parsed.error) {
                    errorResponse = true;
                    break;
                }
            } catch (e) {
                // Not JSON or not the response we're looking for
            }
        }

        // We should have received an error response
        expect(errorResponse).toBe(true);
    });
});
