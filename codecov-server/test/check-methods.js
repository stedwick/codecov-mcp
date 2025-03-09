#!/usr/bin/env node

/**
 * Script to check the method names in the MCP SDK
 */

import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

console.log('ListToolsRequestSchema method:', ListToolsRequestSchema.method);
console.log('CallToolRequestSchema method:', CallToolRequestSchema.method);
