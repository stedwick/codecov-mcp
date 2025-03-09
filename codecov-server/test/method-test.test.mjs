const { spawn } = require('child_process');
const path = require('path');

describe('MCP Server Method Tests', () => {
    let mcpServer;
    let serverOutput = [];
    let serverErrors = [];

    // Setup function to start the MCP server before tests
    beforeAll(async () => {
        // Get the path to the MCP server executable
        const mcpServerPath = path.resolve(__dirname, '../build/index.js');

        // Spawn the MCP server process
        mcpServer = spawn('node', [mcpServerPath]);

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
            console.error(`[Error] MCP Server: ${error}`);
        });

        mcpServer.on('error', (error) => {
            console.error('[Error] Error spawning MCP server:', error);
            throw error;
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Cleanup function to stop the MCP server after tests
    afterAll(() => {
        if (mcpServer) {
            mcpServer.kill();
        }
    });

    // Increase timeout for all tests in this file
    jest.setTimeout(15000);

    // Test different method names
    test('Server responds to different method names', async () => {
        // Clear previous outputs
        serverOutput = [];

        // Try different method names for listing tools
        const methodsToTry = [
            'list_tools',
            'listTools',
            'list-tools',
            'ListTools',
            'get_tools',
            'getTools',
            'get-tools',
            'GetTools'
        ];

        for (const method of methodsToTry) {
            const request = {
                jsonrpc: "2.0",
                id: method,
                method: method,
                params: {}
            };

            mcpServer.stdin.write(JSON.stringify(request) + '\n');

            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for responses
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check that we got some responses
        expect(serverOutput.length).toBeGreaterThan(0);

        // At this point, we just want to make sure we got some output
        // We don't care if it's a successful response or not
        console.log("Got server output:", serverOutput);
        expect(serverOutput.length).toBeGreaterThan(0);
    });
});
