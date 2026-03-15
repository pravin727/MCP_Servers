## MCP Testing Agent

Enterprise-style MCP server for automated REST, SOAP, UI, and code-centric testing. It is designed to run as a Model Context Protocol (MCP) server in Cursor and expose a rich set of tools for API and UI testing.

### Capabilities

- **Code analysis**
  - `analyze_codebase`: scan a local codebase to find REST endpoints and UI components in JS/TS/Java/Python.
  - `generate_test_plan`: turn the analysis output into high-level API and UI test scenarios.

- **REST / OpenAPI**
  - `execute_rest`: execute individual REST calls (GET/POST/PUT/DELETE) with headers, body, files and authentication.
    - Supports **templating** in `url`, `headers`, `body` and `files` using `{{var}}` from the active environment.
    - Supports multipart **file upload** via the new `files` parameter.
    - Supports **HTTP sessions** via `session` (cookie jar persisted across calls).
    - Returns `durationMs` and an exportable **`curl`** command (secrets masked best-effort).
  - `import_openapi`: load an OpenAPI/Swagger JSON from a URL and extract all operations.
  - `generate_rest_tests_from_openapi`: convert operations + baseUrl into concrete REST test cases.
  - `run_rest_test_suite`: execute a suite of REST tests and return a summary + per-test results.

- **SOAP / WSDL**
  - `execute_soap`: execute a SOAP method from a WSDL with arguments and optional endpoint/headers.
    - Supports **templating** in `wsdl`, `method`, `args`, and `options`.
  - `import_wsdl`: load a WSDL and list available SOAP operations (service/port/method).
  - `generate_soap_tests_from_wsdl`: build basic SOAP test cases from imported operations.
  - `run_soap_test_suite`: execute a suite of SOAP tests and return a summary + per-test results.

- **UI / AJAX**
  - `execute_ui_test`: run Playwright-based browser flows (goto, click, type, waitForSelector, screenshot, download) to drive web UIs and AJAX behaviour.
    - Supports **templating** in step `url`, `selector`, `value`, and download `path`.
    - New `download` action allows clicks that trigger file downloads and saves the file locally.

- **Test data, validation, reporting, and visualization**
  - (mocking feature removed; no built-in stub support)
  - `poll_endpoint`: poll an endpoint until a specified JSONPath condition is met, useful for asynchronous workflows (job processing, report generation).
  - `run_docker_container` / `stop_docker_container`: simple helpers to spin up and tear down Docker images for test environment orchestration (databases, message brokers, etc.).
  - `create_test_data`: generate synthetic but realistic test data (numbers, strings, emails, dates, booleans) using faker.
  - `manage_state`: placeholder for setup/teardown of databases or session state.
  - `validate_results`: compare actual vs expected (JSON/XML/UI) and report differences.
  - `export_results`: write test results to JSON/CSV/Excel/HTML files.
  - `generate_visual_summary`: build chart configuration data (bar/pie/line) for pass/fail and latency.
  - `extract_to_env`: extract values from a JSON object using dot paths (e.g. `token.access`, `items.0.id`) and store them into environment variables (supports secrets).

- **Database / Data Gathering**
  - `connect_database`: establish connections to MySQL, PostgreSQL, Oracle, Cassandra, or SQL Server databases.
    - Supports multiple simultaneous connections with unique identifiers.
    - Configurable host, port, username, password, and database/keyspace selection.
  - `query_database`: execute SELECT queries against connected databases to retrieve test data.
    - Supports **templating** in queries using `{{varName}}` from environment variables.
    - Returns actual row data with execution metrics (row count, execution time).
  - `close_database`: cleanly close individual or all database connections.
  - `get_database_status`: check the status and type of all active connections.

- **Automatic Query Generation (Schema Analysis)**
  - `get_database_schema`: analyze and list all available tables and views in the connected database.
  - `get_table_structure`: retrieve detailed column information (names, types, constraints) for a specific table.
  - `get_table_relationships`: detect foreign key relationships to understand how to JOIN tables.
  - `generate_select_query`: **auto-generate SELECT queries** based on high-level descriptions with support for:
    - **JOINs** (automatic or explicit)
    - **WHERE filters** (equality, ranges, IN clauses)
    - **Aggregations** (COUNT, SUM, AVG, MIN, MAX with GROUP BY)
    - **Views** (query any defined view like a table)
    - **ORDER BY and LIMIT**
    - Returns executable SQL that can be passed directly to `query_database`.

- **Parallel Multi-Database Testing**
  - `execute_parallel_queries`: execute SELECT queries across multiple database connections **in parallel** (up to 30 seconds timeout).
    - Query 2, 3, or more databases simultaneously for 3-5x faster data gathering.
  - `merge_query_results`: combine/correlate results from multiple queries using JOIN logic:
    - **INNER JOIN** - only matching records
    - **LEFT JOIN** - keep all from first DB
    - **CROSS JOIN** - Cartesian product for stress testing
  - `create_composite_test_data`: transform merged results into API test payloads with field mapping and batching.
    - Maps database columns to API request structure.
    - Creates batches for concurrent API testing.

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
 - **Chaining: request A → extract → request B**
  1. Call `execute_rest` (optionally with a `session` name).
  2. Call `extract_to_env` with `source: <response.data>` and mappings like:
     - `key: "access_token"`, `path: "token"`, `secret: true`
  3. Call `execute_rest` again with headers/body using `{{access_token}}` and `{{baseUrl}}`.
  1. Call `analyze_codebase` with `{ "path": "D:/your-app" }`.
  2. Give its output to `generate_test_plan` to get structured API/UI scenarios.
  3. Convert those scenarios into concrete `execute_rest`, `execute_soap`, or `execute_ui_test` calls, and then aggregate results with `export_results` / `generate_visual_summary`.

- **Automatic Database Query Generation & Execution (NEW)**
  1. Call `connect_database` with your database credentials (MySQL, PostgreSQL, Oracle, Cassandra, or SQL Server).
  2. Call `get_database_schema` to list all available tables and views.
  3. Call `get_table_structure` on tables of interest to see columns and data types.
  4. Call `get_table_relationships` to discover foreign keys and JOIN paths.
  5. Call `generate_select_query` with a high-level description (e.g., "Get all active users with their order count and total spent"):
     - Tool auto-generates SQL with JOINs, WHERE conditions, aggregations, and ORDER BY
  6. Call `query_database` with the generated SQL to retrieve actual data.
  7. Use `extract_to_env` to store results in environment variables.
  8. Chain data into `execute_rest`, `execute_soap`, or `execute_ui_test` using templated values.
  9. Call `close_database` to clean up when done.

  **Supports:**
  - ✅ Automatic JOINs across related tables
  - ✅ WHERE filtering on any column
  - ✅ Aggregate functions (COUNT, SUM, AVG, MIN, MAX)
  - ✅ Queries against views (same as tables)
  - ✅ Complex conditions (IN, ranges, AND/OR logic)
  - ✅ ORDER BY and LIMIT clauses



### Asynchronous / Polling Workflows (New)

The `poll_endpoint` tool helps with ``fire-and-forget`` flows.  It repeatedly invokes an API and evaluates a JSONPath expression until a value matches or a timeout expires.

### Container Orchestration (Advanced)

For end‑to‑end or integration tests you can start services in Docker directly from the agent:

```json
{ "image": "postgres:15", "ports": ["5432:5432"], "env_vars": { "POSTGRES_PASSWORD": "secret" } }
```

and tear them down when finished.

### Example: Cursor Auto-Executing Database Queries

**Scenario:** Query customer data from database, then test an API with that data.

**Cursor prompt:**
```
I have an e-commerce database with customers, orders, and products tables.
Connect to MySQL at localhost:3306, find all high-value customers 
(who spent more than $1000), and test the GET /api/customer/{id} endpoint 
for each of them.
```

**Cursor will automatically:**

1. 📊 `connect_database` → Opens MySQL connection
2. 🔍 `get_database_schema` → Lists "customers, orders, products" tables  
3. 📋 `get_table_structure` → Checks "orders.total_spent" or "customers.balance" columns
4. 🔗 `get_table_relationships` → Discovers "orders.customer_id → customers.id" JOIN
5. ⚙️ `generate_select_query` → Auto-creates: 
   ```sql
   SELECT c.* FROM customers c 
   JOIN orders o ON c.id = o.customer_id 
   WHERE SUM(o.amount) > 1000
   ```
6. 🎯 `query_database` → Executes and returns 5,234 matching customer records
7. 📌 `extract_to_env` → Stores customer IDs into environment (`{{customerId}}`)
8. 🚀 `execute_rest` → Tests `/api/customer/{{customerId}}` for batch of customers
9. ✅ `validate_results` → Compares actual vs expected response structure
10. 📊 `export_results` → Saves test report with pass/fail stats
11. 🔌 `close_database` → Cleans up connection

**Result:** All done in one prompt—no manual SQL writing, no copy-paste of IDs!

### Example with Views & Aggregations

**Cursor prompt:**
```
Show me the top 10 products by revenue from the sales_summary view, 
then execute a stress test on the /api/products/{id}/inventory endpoint 
with those products.
```

**Auto-execution:**
```
get_database_schema → finds "sales_summary" view
get_table_structure → checks "revenue", "product_id" columns
generate_select_query → "SELECT * FROM sales_summary ORDER BY revenue DESC LIMIT 10"
query_database → retrieves top 10 products
extract_to_env → stores {{productId}} for each
execute_rest → stress tests /api/products/{{productId}}/inventory
export_results → reports latency and success rates
```

### Example: Parallel Multi-Database Test Data Creation

**Scenario:** You have production data split across multiple databases:
- **DB1 (User DB)**: Contains user profiles and account info
- **DB2 (Product DB)**: Contains product catalogs and inventory
- **DB3 (Preference DB)**: Contains user preferences and settings

You want to combine data from all 3 databases to create rich, realistic test payloads for an e-commerce API.

**Cursor prompt:**
```
I have three separate databases:
- MySQL (DB1): users with id, name, email, country
- PostgreSQL (DB2): products with id, name, price, stock
- PostgreSQL (DB3): user_preferences with user_id, preferred_category, max_budget

Create test payloads combining all three: user data + their preferred product category + max budget.
Then test POST /api/recommendations with these payloads.
```

**Cursor will automatically:**

1. 🔌 `connect_database` → Open 3 connections (db1_mysql, db2_postgres, db3_postgres)
2. 🚀 `execute_parallel_queries` → Run 3 queries in parallel:
   ```
   {
     "queries": [
       {
         "connectionId": "db1_mysql",
         "query": "SELECT id, name, email, country FROM users WHERE status = 'active'",
         "alias": "users"
       },
       {
         "connectionId": "db2_postgres",
         "query": "SELECT id, name, price, stock FROM products ORDER BY price DESC LIMIT 100",
         "alias": "products"
       },
       {
         "connectionId": "db3_postgres",
         "query": "SELECT user_id, preferred_category, max_budget FROM user_preferences",
         "alias": "preferences"
       }
     ]
   }
   ```
   Returns all results in ~200ms (parallel execution)

3. 🔗 `merge_query_results` → Combine results using joins:
   ```
   {
     "results": {
       "users": [...],
       "products": [...],
       "preferences": [...]
     },
     "joinKey": "user_id",
     "strategy": "left"
   }
   ```
   Creates merged rows: each user with their preferences and matching products

4. 🎯 `create_composite_test_data` → Transform merged data into API payloads:
   ```
   {
     "mergedData": [...merged rows...],
     "mapping": {
       "userId": "users.id",
       "userName": "users.name",
       "userEmail": "users.email",
       "country": "users.country",
       "preferredCategory": "preferences.preferred_category",
       "maxBudget": "preferences.max_budget",
       "recommendedProduct": "products.name",
       "productPrice": "products.price"
     },
     "batchSize": 50
   }
   ```
   Creates test batches:
   ```json
   [
     {
       "userId": 123,
       "userName": "John Doe",
       "userEmail": "john@example.com",
       "country": "US",
       "preferredCategory": "Electronics",
       "maxBudget": 5000,
       "recommendedProduct": "Laptop Pro",
       "productPrice": 2499
     },
     // ... 49 more payloads in batch 1
   ]
   ```

5. 🧪 `execute_rest` → Test API with batch payloads:
   ```bash
   POST /api/recommendations
   Body: [batch of 50 test payloads]
   ```

6. 📊 `validate_results` → Check response structure and values

7. 📈 `export_results` → Generate report with success rates per batch

### Key Capabilities for Multi-DB Testing:

✅ **Parallel Execution** - Query 3+ databases concurrently (~5x faster than sequential)  
✅ **Multiple Join Strategies:**
- **INNER JOIN** - Only matching records across all DBs
- **LEFT JOIN** - Keep all from first DB, nulls for missing matches  
- **CROSS JOIN** - All combinations (1000 users × 100 products = 100k test cases)

✅ **Post-Merge Filtering** - Filter merged results before payload creation:
```json
{
  "filters": {
    "status": "active",
    "maxBudget": {">": 1000, "<": 50000},
    "stock": {">": 0}
  }
}
```

✅ **Batching** - Split test data into configurable batches for parallel API testing

✅ **Field Mapping** - Map any database columns to API request structure

### Supported Multi-DB Scenarios:

| Scenario | DBs | Join | Use Case |
|----------|-----|------|----------|
| User + Preferences | DB1 + DB2 | LEFT | Personalized API testing |
| User + Orders + Products | DB1 + DB2 + DB3 | INNER | E-commerce checkout flows |
| Customers × Regions × Channels | DB1 × DB2 × DB3 | CROSS | Stress test all combinations |
| Active Users + Recent Orders | DB1 + DB2 | INNER | Load test with fresh data |



- The server uses a minimal, hand-rolled MCP implementation over stdio (initialize, tools/list, tools/call) rather than the official SDK.
- Generated REST/SOAP tests are intentionally basic starting points (happy-path/status checks). You can enrich them by modifying test definitions before running the suites.
- Some tools (like `manage_state`) are placeholders meant to be customized with project-specific logic.
- **Query Generation Notes:**
  - `generate_select_query` builds SQL syntactically but may need refinement for complex logic
  - JOINs are auto-detected from foreign keys; provide explicit `joins` parameter if needed
  - Always review generated SQL before execution in production

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