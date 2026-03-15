/**
 * DatabaseTool
 * MCP Tool for executing SELECT queries against multiple database types
 */

import DatabaseEngine from '../engines/DatabaseEngine.js';
import type { DbConnectionConfig } from '../engines/DatabaseEngine.js';

interface ConnectDbArgs {
  connectionId: string;
  dbType: 'mysql' | 'postgresql' | 'oracle' | 'cassandra' | 'mssql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  options?: Record<string, any>;
}

interface QueryDbArgs {
  connectionId: string;
  query: string;
}

interface CloseDbArgs {
  connectionId: string;
}

const connectDatabaseTool = {
  name: 'connect_database',
  description:
    'Establish a connection to a database (MySQL, PostgreSQL, Oracle, Cassandra, SQL Server). Returns connection status.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Unique identifier for this connection (e.g., "db_main", "cache_db")',
      },
      dbType: {
        type: 'string',
        enum: ['mysql', 'postgresql', 'oracle', 'cassandra', 'mssql'],
        description: 'Type of database to connect to',
      },
      host: {
        type: 'string',
        description: 'Database server hostname or IP address',
      },
      port: {
        type: 'number',
        description: 'Database server port (MySQL: 3306, PostgreSQL: 5432, Oracle: 1521, Cassandra: 9042, MSSQL: 1433)',
      },
      username: {
        type: 'string',
        description: 'Database user username',
      },
      password: {
        type: 'string',
        description: 'Database user password (treat as secret)',
      },
      database: {
        type: 'string',
        description: 'Database/keyspace name to connect to',
      },
      options: {
        type: 'object',
        description: 'Optional connection-specific settings (e.g., localDataCenter for Cassandra, timeout settings)',
      },
    },
    required: ['connectionId', 'dbType', 'host', 'port', 'username', 'password', 'database'],
  },
  handler: async (args: ConnectDbArgs) => {
    try {
      const config: DbConnectionConfig = {
        type: args.dbType,
        host: args.host,
        port: args.port,
        username: args.username,
        password: args.password,
        database: args.database,
        options: args.options,
      };

      await DatabaseEngine.createConnection(config, args.connectionId);

      return {
        success: true,
        message: `Connected to ${args.dbType} database`,
        connectionId: args.connectionId,
        details: {
          type: args.dbType,
          host: args.host,
          database: args.database,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        connectionId: args.connectionId,
      };
    }
  },
};

const queryDatabaseTool = {
  name: 'query_database',
  description:
    'Execute a SELECT query against a database connection. Returns rows and execution metadata. Only SELECT queries are allowed for security.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Connection identifier from a previous connect_database call',
      },
      query: {
        type: 'string',
        description: 'SELECT SQL query to execute. Supports template variables like {{variableName}} from environment.',
      },
    },
    required: ['connectionId', 'query'],
  },
  handler: async (args: QueryDbArgs) => {
    try {
      // Support templating from environment variables if needed
      let query = args.query;
      const envVars = process.env;

      // Replace {{varName}} patterns with environment values
      query = query.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        return envVars[varName] || match;
      });

      const result = await DatabaseEngine.executeSelect(args.connectionId, query);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          rowCount: result.rowCount,
          executionTime: result.executionTime,
          message: `Query executed successfully. Retrieved ${result.rowCount} rows.`,
        };
      } else {
        return {
          success: false,
          error: result.error,
          executionTime: result.executionTime,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const closeDatabaseTool = {
  name: 'close_database',
  description: 'Close a specific database connection or all connections.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Connection identifier to close. Use "all" to close all connections.',
      },
    },
    required: ['connectionId'],
  },
  handler: async (args: CloseDbArgs) => {
    try {
      if (args.connectionId === 'all') {
        await DatabaseEngine.closeAllConnections();
        return {
          success: true,
          message: 'All database connections closed',
        };
      } else {
        await DatabaseEngine.closeConnection(args.connectionId);
        return {
          success: true,
          message: `Connection ${args.connectionId} closed`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const getConnectionStatusTool = {
  name: 'get_database_status',
  description: 'Check the status of all active database connections.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
  },
  handler: async () => {
    try {
      const status = DatabaseEngine.getConnectionStatus();
      return {
        success: true,
        connections: status,
        count: Object.keys(status).length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export { connectDatabaseTool, queryDatabaseTool, closeDatabaseTool, getConnectionStatusTool };
