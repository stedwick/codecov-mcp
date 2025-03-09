import { spawn } from 'child_process';
import path from 'path';
import http from 'http';

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

describe('MCP Server SDK Integration Tests', () => {
    let mockServer;
    let mcpServer;
    let serverOutput = [];
    let serverErrors = [];
    const mockServerPort = 8082;

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

        // Get the path to the MCP server executable
        const mcpServerPath = path.resolve(__dirname, '../build/index.js');

        // Set environment variable for the mock server
        process.env.CODECOV_API_URL = `http://localhost:${mockServerPort}`;

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

    // Cleanup function to stop the servers after tests
    afterAll(() => {
        if (mcpServer) {
            mcpServer.kill();
        }

        if (mockServer) {
            mockServer.close();
        }
    });

    // Test the MCP server initialization
    test('MCP server initializes correctly', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Initialize the server
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

        mcpServer.stdin.write(JSON.stringify(initializeRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check that we got a response
        expect(serverOutput.length).toBeGreaterThan(0);

        // Check for successful initialization
        const initResponse = serverOutput.find(output => {
            try {
                const parsed = JSON.parse(output);
                return parsed.id === "initialize" && parsed.result;
            } catch (e) {
                return false;
            }
        });

        expect(initResponse).toBeDefined();
    });

    // Test sending initialized notification
    test('MCP server accepts initialized notification', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Send initialized notification
        const initializedNotification = {
            jsonrpc: "2.0",
            method: "initialized",
            params: {}
        };

        mcpServer.stdin.write(JSON.stringify(initializedNotification) + '\n');

        // Wait for any response (though there might not be one for a notification)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // No error should have occurred
        const initError = serverErrors.find(error =>
            error.includes("initialized") && error.includes("error")
        );

        expect(initError).toBeUndefined();
    });

    // Test listing tools
    test('MCP server lists available tools', async () => {
        // Clear previous outputs
        serverOutput = [];

        // List tools
        const listToolsRequest = {
            jsonrpc: "2.0",
            id: "list-tools",
            method: "tools/list",
            params: {}
        };

        mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check that we got a response
        expect(serverOutput.length).toBeGreaterThan(0);

        // Check for successful tools listing
        const toolsResponse = serverOutput.find(output => {
            try {
                const parsed = JSON.parse(output);
                return parsed.id === "list-tools" && parsed.result && parsed.result.tools;
            } catch (e) {
                return false;
            }
        });

        expect(toolsResponse).toBeDefined();

        // Parse the response to check for the expected tool
        const parsedResponse = JSON.parse(toolsResponse);
        expect(parsedResponse.result.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "find_low_coverage_files"
                })
            ])
        );
    });

    // Test calling the find_low_coverage_files tool
    test('MCP server executes find_low_coverage_files tool', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Call the find_low_coverage_files tool
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

        mcpServer.stdin.write(JSON.stringify(callToolRequest) + '\n');

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check that we got a response
        expect(serverOutput.length).toBeGreaterThan(0);

        // Check for successful tool execution
        const toolResponse = serverOutput.find(output => {
            try {
                const parsed = JSON.parse(output);
                return parsed.id === "call-tool" && parsed.result && parsed.result.content;
            } catch (e) {
                return false;
            }
        });

        expect(toolResponse).toBeDefined();

        // Parse the response to check for the expected result
        const parsedResponse = JSON.parse(toolResponse);
        expect(parsedResponse.result.content).toBeDefined();
        expect(parsedResponse.result.content.length).toBeGreaterThan(0);

        // The first content item should be text
        const firstContent = parsedResponse.result.content[0];
        expect(firstContent.type).toBe("text");
        expect(firstContent.text).toBeDefined();

        // Try to parse the text as JSON to check for low coverage files
        try {
            const resultData = JSON.parse(firstContent.text);
            expect(resultData.low_coverage_files).toBeDefined();
            expect(Array.isArray(resultData.low_coverage_files)).toBe(true);
            expect(resultData.low_coverage_files.length).toBeGreaterThan(0);
        } catch (e) {
            // This is an actual error in the test, so we keep the console.error
            console.error('Failed to parse tool result as JSON:', e.message);
            fail('Failed to parse tool result as JSON: ' + e.message);
        }
    });
});
