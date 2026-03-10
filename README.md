## MCP Testing Agent

Enterprise-style MCP server for automated REST, SOAP, UI, and code-centric testing. It is designed to run as a Model Context Protocol (MCP) server in Cursor and expose a rich set of tools for API and UI testing.

### Capabilities

- **Code analysis**
  - `analyze_codebase`: scan a local codebase to find REST endpoints and UI components in JS/TS/Java/Python.
  - `generate_test_plan`: turn the analysis output into high-level API and UI test scenarios.

- **REST / OpenAPI**
  - `execute_rest`: execute individual REST calls (GET/POST/PUT/DELETE) with headers, body, and auth.
  - `import_openapi`: load an OpenAPI/Swagger JSON from a URL and extract all operations.
  - `generate_rest_tests_from_openapi`: convert operations + baseUrl into concrete REST test cases.
  - `run_rest_test_suite`: execute a suite of REST tests and return a summary + per-test results.

- **SOAP / WSDL**
  - `execute_soap`: execute a SOAP method from a WSDL with arguments and optional endpoint/headers.
  - `import_wsdl`: load a WSDL and list available SOAP operations (service/port/method).
  - `generate_soap_tests_from_wsdl`: build basic SOAP test cases from imported operations.
  - `run_soap_test_suite`: execute a suite of SOAP tests and return a summary + per-test results.

- **UI / AJAX**
  - `execute_ui_test`: run Playwright-based browser flows (goto, click, type, waitForSelector, screenshot) to drive web UIs and AJAX behaviour.

- **Test data, validation, reporting, and visualization**
  - `create_test_data`: generate synthetic but realistic test data (numbers, strings, emails, dates, booleans) using faker.
  - `manage_state`: placeholder for setup/teardown of databases or session state.
  - `validate_results`: compare actual vs expected (JSON/XML/UI) and report differences.
  - `export_results`: write test results to JSON/CSV/Excel/HTML files.
  - `generate_visual_summary`: build chart configuration data (bar/pie/line) for pass/fail and latency.

### How to run the server locally

1. **Install dependencies**

```bash
npm install
```

2. **Build the server**

```bash
npm run build
```

This compiles TypeScript from `src` into JavaScript in `dist`.

3. **Run directly (for debugging)**

```bash
npm start
```

This runs `node dist/index.js` and listens for JSON-RPC requests on stdio.

### Cursor MCP configuration

In your global `mcp.json` (for example `C:\Users\<you>\.cursor\mcp.json`) configure the server as:

```json
{
  "mcpServers": {
    "testing-agent": {
      "command": "node",
      "args": ["D:/mcp_test/dist/index.js"],
      "cwd": "D:/mcp_test"
    }
  }
}
```

Restart Cursor or disable/re-enable the server in the MCP panel so Cursor picks up the process.

### Typical workflows

- **From OpenAPI to executed REST tests**
  1. Call `import_openapi` with `{ "specUrl": "https://api.example.com/openapi.json" }`.
  2. Feed the returned `operations` plus a `baseUrl` into `generate_rest_tests_from_openapi`.
  3. Call `run_rest_test_suite` with the generated `tests` array to execute them.
  4. (Optional) Use `export_results` and `generate_visual_summary` on the test results.

- **From WSDL to executed SOAP tests**
  1. Call `import_wsdl` with `{ "wsdlUrl": "https://example.com/service?wsdl" }`.
  2. Pass the returned `operations` and the same WSDL URL into `generate_soap_tests_from_wsdl`.
  3. Call `run_soap_test_suite` with the generated `tests` array to execute them.

- **Code-driven test planning**
  1. Call `analyze_codebase` with `{ "path": "D:/your-app" }`.
  2. Give its output to `generate_test_plan` to get structured API/UI scenarios.
  3. Convert those scenarios into concrete `execute_rest`, `execute_soap`, or `execute_ui_test` calls, and then aggregate results with `export_results` / `generate_visual_summary`.

### Notes and limitations

- The server uses a minimal, hand-rolled MCP implementation over stdio (initialize, tools/list, tools/call) rather than the official SDK.
- Generated REST/SOAP tests are intentionally basic starting points (happy-path/status checks). You can enrich them by modifying test definitions before running the suites.
- Some tools (like `manage_state`) are placeholders meant to be customized with project-specific logic.

# MCP Testing Agent Server

A Model Context Protocol (MCP) server that provides tools for autonomous testing of applications. This server enables LLMs to perform comprehensive testing workflows including code analysis, test generation, data management, multi-protocol execution, validation, and reporting.

## Features

- **Code Analysis**: Automatically scan Java/Spring, Node.js, and Python codebases to identify API endpoints and UI components
- **Test Plan Generation**: Derive test scenarios, edge cases, and flow sequences from analyzed code
- **Data Management**: Generate synthetic test data and manage database/session states
- **Multi-Protocol Execution**:
  - REST API testing (GET, POST, PUT, DELETE) with authentication
  - SOAP web service testing
  - UI testing with Playwright
- **Validation**: Deep-diffing of JSON/XML responses and UI state verification
- **Reporting**: Export results in JSON, CSV, Excel, and HTML formats
- **Visual Summaries**: Generate base64-encoded charts for pass/fail rates and latency

## Installation

```bash
npm install
npm run build
```

## Usage

Start the MCP server:

```bash
npm start
```

The server communicates via stdio and can be integrated with MCP-compatible clients.

## Architecture

- `src/index.ts`: Main MCP server setup and tool registration
- `src/engines/`: Execution engines for different protocols
  - `RestEngine.ts`: REST API execution
  - `SoapEngine.ts`: SOAP service execution
  - `UIEngine.ts`: Playwright-based UI testing
- `src/tools/`: MCP tool implementations
- `src/utils/`: Utility functions

## Security

- Sensitive data (passwords, tokens) are masked in logs
- Supports various authentication methods (Basic, Bearer, API Key)
- Input validation and error handling

## Sample System Prompt for Agent

```
You are an autonomous testing agent powered by MCP tools. Your goal is to thoroughly test applications by following this workflow:

1. Analyze the codebase using analyze_codebase to identify endpoints and components
2. Generate comprehensive test plans with generate_test_plan
3. Create realistic test data using create_test_data
4. Set up test environment with manage_state
5. Execute tests in parallel or sequence:
   - Use execute_rest for API endpoints
   - Use execute_soap for SOAP services
   - Use execute_ui_test for UI components
6. Validate results with validate_results
7. If validation fails, retry with different data or skip to cleanup
8. Export results using export_results
9. Generate visual summaries with generate_visual_summary
10. Clean up with manage_state teardown

Always handle errors gracefully and log masked sensitive information. Make decisions based on test results to optimize the testing flow.
```