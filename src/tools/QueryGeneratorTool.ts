/**
 * QueryGeneratorTool
 * MCP Tool for analyzing database schema and auto-generating SELECT queries
 * Supports JOINs, views, aggregations, and filtering
 */

import DatabaseEngine from '../engines/DatabaseEngine.js';

interface GetSchemaArgs {
  connectionId: string;
}

interface GetTableStructureArgs {
  connectionId: string;
  tableName: string;
}

interface GetRelationshipsArgs {
  connectionId: string;
  tableName: string;
}

interface GenerateQueryArgs {
  connectionId: string;
  description: string;
  tables?: string[];
  filters?: Record<string, any>;
  joins?: { table: string; on: string }[];
  aggregations?: { function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; column: string; alias: string }[];
  orderBy?: string;
  limit?: number;
}

const getSchemaInfoTool = {
  name: 'get_database_schema',
  description:
    'Analyze database schema to list all available tables and views. Use this first to understand the database structure for query generation.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Connection identifier from a previous connect_database call',
      },
    },
    required: ['connectionId'],
  },
  handler: async (args: GetSchemaArgs) => {
    try {
      const result = await DatabaseEngine.getSchema(args.connectionId);
      return {
        success: result.success,
        tables: result.tables,
        views: result.views,
        totalTables: result.totalTables,
        totalViews: result.totalViews,
        message: result.success
          ? `Found ${result.totalTables} tables and ${result.totalViews} views`
          : result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const getTableStructureTool = {
  name: 'get_table_structure',
  description:
    'Get detailed structure of a specific table including columns, types, and constraints. Use this to understand what data is available.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Connection identifier',
      },
      tableName: {
        type: 'string',
        description: 'Name of the table to analyze',
      },
    },
    required: ['connectionId', 'tableName'],
  },
  handler: async (args: GetTableStructureArgs) => {
    try {
      const result = await DatabaseEngine.getTableStructure(args.connectionId, args.tableName);
      return {
        success: result.success,
        table: result.table,
        columns: result.columns,
        columnCount: result.columnCount,
        message: result.success ? `Table "${result.table}" has ${result.columnCount} columns` : result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const getTableRelationshipsTool = {
  name: 'get_table_relationships',
  description:
    'Get foreign key relationships for a table. Use this to understand how to JOIN tables together.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Connection identifier',
      },
      tableName: {
        type: 'string',
        description: 'Name of the table to check relationships for',
      },
    },
    required: ['connectionId', 'tableName'],
  },
  handler: async (args: GetRelationshipsArgs) => {
    try {
      const result = await DatabaseEngine.getTableRelationships(args.connectionId, args.tableName);
      return {
        success: result.success,
        table: result.table,
        relationships: result.relationships,
        relationshipCount: result.relationshipCount,
        message: result.success
          ? `Found ${result.relationshipCount} relationship(s) for table "${result.table}"`
          : result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const generateSelectQueryTool = {
  name: 'generate_select_query',
  description:
    'Auto-generate a SELECT query based on high-level description. Supports JOINs from foreign keys, aggregations, filtering, and ordering. Returns the SQL query which can be executed with query_database.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      connectionId: {
        type: 'string',
        description: 'Connection identifier',
      },
      description: {
        type: 'string',
        description:
          'High-level description of what data you want (e.g., "Get all customers with order count and total spending", "Find products priced over $100 with category names")',
      },
      tables: {
        type: 'array',
        items: { type: 'string' },
        description: 'Primary table(s) to query (e.g., ["users", "orders"])',
      },
      filters: {
        type: 'object',
        description: 'WHERE conditions as key-value pairs (e.g., {"status": "active", "country": "US"})',
      },
      joins: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table to join' },
            on: { type: 'string', description: 'JOIN condition (e.g., "orders.user_id = users.id")' },
          },
        },
        description: 'Explicit JOIN clauses if auto-detect is insufficient',
      },
      aggregations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            function: { type: 'string', enum: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'] },
            column: { type: 'string' },
            alias: { type: 'string' },
          },
        },
        description: 'Aggregate functions like COUNT(*), SUM(amount), AVG(price)',
      },
      orderBy: {
        type: 'string',
        description: 'ORDER BY clause (e.g., "created_at DESC")',
      },
      limit: {
        type: 'number',
        description: 'LIMIT clause to restrict result rows',
      },
    },
    required: ['connectionId', 'description', 'tables'],
  },
  handler: async (args: GenerateQueryArgs) => {
    try {
      // Build SELECT clause
      let selectClause = '*';
      if (args.aggregations && args.aggregations.length > 0) {
        const tables = args.tables || [];
        const aggs = args.aggregations.map((agg: any) => `${agg.function}(${agg.column}) AS ${agg.alias}`).join(', ');
        const groupBy = tables[0] ? `${tables[0]}.*` : '*';
        selectClause = `${groupBy}, ${aggs}`;
      }

      // Build FROM clause
      let fromClause = (args.tables || []).join(', ');

      // Build JOIN clause
      let joinClause = '';
      if (args.joins && args.joins.length > 0) {
        joinClause = args.joins.map((join: any) => `JOIN ${join.table} ON ${join.on}`).join(' ');
      }

      // Build WHERE clause
      let whereClause = '';
      if (args.filters && Object.keys(args.filters).length > 0) {
        const conditions = Object.entries(args.filters)
          .map(([key, value]) => {
            if (typeof value === 'string') {
              return `${key} = '${value.replace(/'/g, "''")}'`;
            } else if (typeof value === 'number') {
              return `${key} = ${value}`;
            } else if (typeof value === 'boolean') {
              return `${key} = ${value ? 1 : 0}`;
            } else if (Array.isArray(value)) {
              const vals = value.map((v) => (typeof v === 'string' ? `'${v}'` : v)).join(', ');
              return `${key} IN (${vals})`;
            }
            return '';
          })
          .filter((c) => c)
          .join(' AND ');
        whereClause = conditions ? `WHERE ${conditions}` : '';
      }

      // Build ORDER BY clause
      const orderByClause = args.orderBy ? `ORDER BY ${args.orderBy}` : '';

      // Build LIMIT clause
      const limitClause = args.limit ? `LIMIT ${args.limit}` : '';

      // Assemble final query
      const query = ['SELECT', selectClause, 'FROM', fromClause, joinClause, whereClause, orderByClause, limitClause]
        .filter((part) => part)
        .join(' ');

      return {
        success: true,
        query: query.trim(),
        description: args.description,
        tables: args.tables,
        note: 'This query has been auto-generated. Review and execute with query_database tool.',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export { getSchemaInfoTool, getTableStructureTool, getTableRelationshipsTool, generateSelectQueryTool };
