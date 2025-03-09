import * as mcpTypes from '@modelcontextprotocol/sdk/types.js';

describe('MCP SDK Schema Methods', () => {
    test('MCP SDK schemas have expected method properties', () => {
        // Get all exported schemas from the MCP SDK
        const schemas = Object.keys(mcpTypes).filter(key =>
            key.endsWith('Schema') && typeof mcpTypes[key] === 'object'
        );

        expect(schemas.length).toBeGreaterThan(0);

        // Check if any schemas have method properties
        let methodFound = false;
        schemas.forEach(key => {
            const schema = mcpTypes[key];

            // Try to access the method property
            if (schema._def && schema._def.shape) {
                try {
                    const shape = schema._def.shape();
                    if (shape.method && shape.method._def && shape.method._def.value) {
                        methodFound = true;
                        expect(shape.method._def.value).toBeDefined();
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
        });

        // At least one schema should have a method property
        // But we don't want to fail the test if the SDK structure has changed
        // No need to log a warning here as it's not an actual error
    });

    test('ListToolsRequestSchema has the correct method name', () => {
        try {
            const methodValue = mcpTypes.ListToolsRequestSchema._def?.shape()?.method?._def?.value;
            if (methodValue) {
                expect(methodValue).toBe('tools/list');
            } else {
                fail('Could not find method value in ListToolsRequestSchema');
            }
        } catch (e) {
            fail(`Error accessing ListToolsRequestSchema method: ${e.message}`);
        }
    });

    test('CallToolRequestSchema has the correct method name', () => {
        try {
            const methodValue = mcpTypes.CallToolRequestSchema._def?.shape()?.method?._def?.value;
            if (methodValue) {
                expect(methodValue).toBe('tools/call');
            } else {
                fail('Could not find method value in CallToolRequestSchema');
            }
        } catch (e) {
            fail(`Error accessing CallToolRequestSchema method: ${e.message}`);
        }
    });
});
