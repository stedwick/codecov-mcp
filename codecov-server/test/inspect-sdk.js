#!/usr/bin/env node

/**
 * Script to inspect the MCP SDK and print out available methods
 */

import * as mcpTypes from '@modelcontextprotocol/sdk/types.js';

// Print out all exported types from the MCP SDK
console.log('MCP SDK Types:');
for (const key in mcpTypes) {
    console.log(`- ${key}`);

    // If it's a schema object, print out its properties
    if (key.endsWith('Schema') && typeof mcpTypes[key] === 'object') {
        const schema = mcpTypes[key];
        console.log(`  Properties:`);
        for (const prop in schema) {
            console.log(`  - ${prop}: ${schema[prop]}`);
        }
    }
}

// Specifically look for ListToolsRequestSchema and CallToolRequestSchema
console.log('\nListToolsRequestSchema:');
console.log(mcpTypes.ListToolsRequestSchema);

console.log('\nCallToolRequestSchema:');
console.log(mcpTypes.CallToolRequestSchema);
