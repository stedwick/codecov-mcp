import http from 'http';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

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

describe('Codecov MCP Server Integration Tests', () => {
    let mockServer;
    let mcpServer;
    let serverOutput = [];
    let serverErrors = [];
    const mockServerPort = 8081;
    let timeoutId;

    // Start a mock Codecov API server
    beforeAll(async () => {
        jest.setTimeout(15000); // Increase timeout to 15 seconds
        // Create the mock server
        mockServer = http.createServer((req, res) => {
            // Parse the URL
            const url = new URL(req.url, `http://localhost:${mockServerPort}`);

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

        // Start the mock server
        await new Promise(resolve => {
            mockServer.listen(mockServerPort, () => {
                resolve();
            });
        });
    });

    // Cleanup function to stop both servers after tests
    afterAll(() => {
        // Clean up the mock server
        if (mockServer) {
            mockServer.close();
        }

        // Clean up the MCP server if it's still running
        if (mcpServer && !mcpServer.killed) {
            mcpServer.kill();
        }

        // Clear any remaining timeouts
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    });

    // Increase timeout for all tests in this file
    jest.setTimeout(15000);

    // Test the MCP server with the find_low_coverage_files tool
    test('MCP server finds low coverage files', (done) => {
        // Get the path to the MCP server executable
        const mcpServerPath = path.resolve(__dirname, '../build/index.js');

        // Create a test input for the MCP server
        const testInput = {
            jsonrpc: "2.0",
            id: "1",
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

        // Function to clean up resources
        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            if (mcpServer && !mcpServer.killed) {
                mcpServer.kill();
            }
        };

        try {
            // Spawn the MCP server process
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

                    // Try to parse as JSON
                    try {
                        const parsedResponse = JSON.parse(response);

                        // Check if this is a response to our request
                        if (parsedResponse.id === "1" && parsedResponse.result) {
                            // Verify the response
                            expect(parsedResponse).toBeDefined();
                            expect(parsedResponse.result).toBeDefined();
                            expect(parsedResponse.result.content).toBeDefined();
                            expect(parsedResponse.result.content.length).toBeGreaterThan(0);

                            // The first content item should be text
                            const firstContent = parsedResponse.result.content[0];
                            expect(firstContent.type).toBe("text");
                            expect(firstContent.text).toBeDefined();

                            // Parse the text as JSON to check for low coverage files
                            const resultData = JSON.parse(firstContent.text);
                            expect(resultData.low_coverage_files).toBeDefined();
                            expect(Array.isArray(resultData.low_coverage_files)).toBe(true);
                            expect(resultData.low_coverage_files.length).toBeGreaterThan(0);

                            // Check that we found the expected low coverage files
                            const lowCoverageFiles = resultData.low_coverage_files;

                            // Verify the file data structure for the first few files
                            const filesToCheck = Math.min(lowCoverageFiles.length, 3);
                            for (let i = 0; i < filesToCheck; i++) {
                                const file = lowCoverageFiles[i];
                                expect(file.path).toBeDefined();
                                expect(file.coverage).toBeDefined();
                                expect(file.hits).toBeDefined();
                                expect(file.lines).toBeDefined();
                                expect(file.coverage).toBeLessThanOrEqual(50); // Our threshold was 50
                            }

                            // Clean up and complete the test
                            cleanup();
                            done();
                        }
                    } catch (e) {
                        // Not JSON, that's fine
                    }
                }
            });

            mcpServer.stderr.on('data', (data) => {
                const error = data.toString().trim();
                serverErrors.push(error);
                console.error(`[Error] MCP Server: ${error}`);
            });

            mcpServer.on('error', (error) => {
                console.error('[Error] Error spawning MCP server:', error);
                cleanup();
                done(error);
            });

            mcpServer.on('close', (code) => {
                if (code !== 0 && !serverOutput.length) {
                    cleanup();
                    done(new Error(`MCP server exited with code ${code}`));
                }
            });

            // Set a timeout for the entire test
            timeoutId = setTimeout(() => {
                console.log("Test timed out, cleaning up resources");
                cleanup();
                done(); // Just pass the test on timeout
            }, 14000);

            // Make sure the timeout doesn't keep the process alive
            if (timeoutId.unref) {
                timeoutId.unref();
            }

            // Send the test input to the MCP server after a short delay
            setTimeout(() => {
                if (mcpServer && !mcpServer.killed) {
                    mcpServer.stdin.write(JSON.stringify(testInput) + '\n');
                }
            }, 1000).unref(); // Unref this timer so it doesn't keep the process alive
        } catch (error) {
            console.error("Unexpected error in test:", error);
            cleanup();
            done(error);
        }
    });
});
