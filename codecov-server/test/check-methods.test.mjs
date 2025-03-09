import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

describe('MCP SDK Method Names', () => {
    test('ListToolsRequestSchema has the correct method name', () => {
        // Try to access method property or related properties
        try {
            let methodValue;

            if (ListToolsRequestSchema.method) {
                methodValue = ListToolsRequestSchema.method;
            } else if (ListToolsRequestSchema._def && ListToolsRequestSchema._def.shape) {
                // Try to access through internal structure if available
                const shape = ListToolsRequestSchema._def.shape();
                if (shape.method && shape.method._def && shape.method._def.value) {
                    methodValue = shape.method._def.value;
                }
            }

            // Check if we found a method value
            if (methodValue) {
                expect(methodValue).toBe('tools/list');
            } else {
                // If we can't find the method value, fail the test
                fail('Could not find method value in ListToolsRequestSchema');
            }
        } catch (error) {
            console.error('Error accessing ListToolsRequestSchema method:', error);
            fail(`Error accessing ListToolsRequestSchema method: ${error.message}`);
        }
    });

    test('CallToolRequestSchema has the correct method name', () => {
        // Try to access method property or related properties
        try {
            let methodValue;

            if (CallToolRequestSchema.method) {
                methodValue = CallToolRequestSchema.method;
            } else if (CallToolRequestSchema._def && CallToolRequestSchema._def.shape) {
                // Try to access through internal structure if available
                const shape = CallToolRequestSchema._def.shape();
                if (shape.method && shape.method._def && shape.method._def.value) {
                    methodValue = shape.method._def.value;
                }
            }

            // Check if we found a method value
            if (methodValue) {
                expect(methodValue).toBe('tools/call');
            } else {
                // If we can't find the method value, fail the test
                fail('Could not find method value in CallToolRequestSchema');
            }
        } catch (error) {
            console.error('Error accessing CallToolRequestSchema method:', error);
            fail(`Error accessing CallToolRequestSchema method: ${error.message}`);
        }
    });
});
