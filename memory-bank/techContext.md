# Codecov MCP Server Technical Context

## Technologies Used

### Core Technologies
- **TypeScript**: Strongly typed programming language that builds on JavaScript
- **Node.js**: JavaScript runtime for server-side execution
- **MCP SDK**: Model Context Protocol Software Development Kit (version 0.6.0)
- **Axios**: Promise-based HTTP client for making API requests

### Development Tools
- **Jest**: JavaScript testing framework
- **Babel**: JavaScript compiler for using next generation JavaScript
- **TypeScript Compiler**: Converts TypeScript code to JavaScript
- **npm**: Package manager for JavaScript

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd codecov-mcp

# Install dependencies
npm install

# Build the server
cd codecov-server
npm run build
```

### Environment Variables
- **CODECOV_API_URL**: (Optional) Override the default Codecov API URL for testing

### Development Commands
- **npm run build**: Compile TypeScript code to JavaScript
- **npm run prepare**: Run build script before publishing
- **npm run watch**: Watch for changes and recompile automatically
- **npm run inspector**: Run the MCP inspector for debugging
- **npm test**: Run Jest tests

## Technical Constraints

### MCP Protocol Constraints
- Communication must follow the JSON-RPC 2.0 specification
- Method names must match the expected format (e.g., `tools/list`, `tools/call`)
- Responses must include the correct structure and fields

### Codecov API Constraints
- Requires an API token for authentication
- Rate limits may apply to API requests
- API structure and endpoints may change over time

### Git Detection Constraints
- Requires a valid Git repository with a remote named "origin"
- Must handle different remote URL formats (HTTPS, SSH)
- Limited to supported Git hosting services (GitHub, GitLab, Bitbucket)

### Node.js Constraints
- Limited to features available in the target Node.js version
- Asynchronous operations must be properly handled

## Dependencies

### Production Dependencies

#### @modelcontextprotocol/sdk (v0.6.0)
- **Purpose**: Provides the core functionality for creating and managing MCP servers
- **Features Used**:
  - Server class for creating MCP servers
  - StdioServerTransport for communication via standard I/O
  - Request schema definitions for handling JSON-RPC requests
  - Error handling utilities

#### axios (v1.8.2)
- **Purpose**: Makes HTTP requests to the Codecov API
- **Features Used**:
  - Promise-based API for asynchronous requests
  - Request configuration for headers and parameters
  - Error handling for HTTP errors
  - Instance creation for consistent configuration

### Development Dependencies

#### TypeScript (v5.3.3)
- **Purpose**: Provides static typing and modern JavaScript features
- **Features Used**:
  - Type definitions for improved code quality
  - Interface definitions for data structures
  - Type checking during compilation
  - Modern JavaScript syntax

#### Jest (v29.7.0)
- **Purpose**: Testing framework for unit and integration tests
- **Features Used**:
  - Test runners for executing tests
  - Assertion utilities for verifying behavior
  - Mocking capabilities for isolating components
  - Coverage reporting for measuring test coverage

#### Babel (v7.26.9)
- **Purpose**: JavaScript compiler for using next generation JavaScript
- **Features Used**:
  - Transpilation of modern JavaScript to compatible versions
  - Support for TypeScript through presets
  - Integration with Jest for testing

## File Structure

```
codecov-server/
├── build/              # Compiled JavaScript files
├── src/                # TypeScript source files
│   └── index.ts        # Main server implementation
├── test/               # Test files
│   ├── check-methods.js       # Script to check method names
│   ├── inspect-sdk.js         # Script to inspect SDK properties
│   ├── method-test.js         # Script to test method names
│   ├── print-methods.js       # Script to print method names
│   ├── sdk-test.js            # Script to test with SDK
│   ├── simple-test.js         # Simple test script
│   └── test-server.js         # Server test script
├── package.json        # Project metadata and dependencies
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Technical Decisions

### Why TypeScript?
TypeScript was chosen for its strong typing system, which helps catch errors at compile time and provides better tooling support. It also offers good compatibility with JavaScript libraries and tools.

### Why MCP SDK?
The MCP SDK was used to simplify the implementation of the MCP protocol. It provides a consistent interface for handling JSON-RPC requests and responses, reducing the amount of boilerplate code needed.

### Why Axios?
Axios was chosen for HTTP requests due to its promise-based API, wide browser support, and features like request/response interception and automatic JSON transformation.

### Why Child Process for Git?
The `child_process` module was used to execute Git commands, allowing the server to detect repository information from the local Git configuration. This approach avoids the need for users to manually provide this information.

## Integration Points

### Codecov API
- **Endpoint**: `https://api.codecov.io/api/v2`
- **Authentication**: Bearer token in Authorization header
- **Key Endpoints**:
  - `/{service}/{owner}/repos/{repo}/report/tree`: Get coverage data for a repository

### Git Repository
- **Command**: `git remote -v`
- **Purpose**: Get remote URL information
- **Output Format**: Text output with remote names and URLs

### MCP Client (Claude)
- **Protocol**: JSON-RPC 2.0
- **Transport**: Standard I/O
- **Methods**:
  - `tools/list`: List available tools
  - `tools/call`: Call a specific tool with arguments

## Security Considerations

### API Token Handling
- API tokens are provided by the user and not stored by the server
- Tokens are transmitted securely to the Codecov API using HTTPS
- Tokens are not logged or exposed in error messages

### Error Handling
- Error messages are designed to be informative without exposing sensitive information
- Stack traces are not exposed to clients
- Input validation is performed to prevent injection attacks

### Rate Limiting
- Future versions may implement rate limiting to prevent abuse
- Currently relies on Codecov's own rate limiting

## Performance Considerations

### API Request Optimization
- Minimizes the number of API requests
- Uses appropriate parameters (like depth) to limit data retrieval

### Data Processing
- Processes data efficiently using appropriate data structures
- Sorts and filters data on the server to reduce client-side processing

### Future Optimizations
- Caching could be implemented to reduce API calls
- Pagination could be added for large repositories
- Parallel processing could be used for analyzing multiple repositories
