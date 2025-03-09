#!/usr/bin/env node

/**
 * Script to print out method names from MCP SDK schemas
 */

import * as mcpTypes from '@modelcontextprotocol/sdk/types.js';

// Print out all exported schemas from the MCP SDK
console.log('MCP SDK Schemas:');
for (const key in mcpTypes) {
    if (key.endsWith('Schema') && typeof mcpTypes[key] === 'object') {
        const schema = mcpTypes[key];
        console.log(`- ${key}`);

        // Try to access the method property
        if (schema._def && schema._def.shape) {
            try {
                const shape = schema._def.shape();
                if (shape.method) {
                    console.log(`  Method: ${shape.method._def.value}`);
                }
            } catch (e) {
                // Ignore errors
            }
        }
    }
}

// Try to access the method property directly
console.log('\nTrying to access method property directly:');
try {
    console.log('ListToolsRequestSchema method:', mcpTypes.ListToolsRequestSchema._def.shape().method._def.value);
} catch (e) {
    console.log('Error accessing ListToolsRequestSchema method:', e.message);
}

try {
    console.log('CallToolRequestSchema method:', mcpTypes.CallToolRequestSchema._def.shape().method._def.value);
} catch (e) {
    console.log('Error accessing CallToolRequestSchema method:', e.message);
}
