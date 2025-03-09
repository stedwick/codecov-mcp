const mcpTypes = require('@modelcontextprotocol/sdk/types.js');

describe('MCP SDK Types Inspection', () => {
    test('MCP SDK exports expected types', () => {
        // Check that we have access to the SDK types
        expect(mcpTypes).toBeDefined();

        // Get all exported types
        const exportedTypes = Object.keys(mcpTypes);

        // Verify that we have the expected schemas
        expect(exportedTypes).toContain('ListToolsRequestSchema');
        expect(exportedTypes).toContain('CallToolRequestSchema');
    });

    test('ListToolsRequestSchema is properly defined', () => {
        expect(mcpTypes.ListToolsRequestSchema).toBeDefined();
    });

    test('CallToolRequestSchema is properly defined', () => {
        expect(mcpTypes.CallToolRequestSchema).toBeDefined();
    });
});
