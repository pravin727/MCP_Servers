/**
 * ParallelQueryTool
 * Execute queries across multiple database connections in parallel
 * Merge results and create composite test data for API testing
 */

import DatabaseEngine from '../engines/DatabaseEngine.js';

interface ParallelQuery {
  connectionId: string;
  query: string;
  alias?: string;
}

interface ExecuteParallelQueriesArgs {
  queries: ParallelQuery[];
  timeout?: number;
}

interface MergeResultsArgs {
  results: Record<string, any[]>;
  joinKey?: string;
  strategy?: 'inner' | 'left' | 'cross';
  filters?: Record<string, any>;
}

interface CreateCompositeDataArgs {
  mergedData: any[];
  mapping: Record<string, string>;
  batchSize?: number;
}

const executeParallelQueriesTool = {
  name: 'execute_parallel_queries',
  description:
    'Execute SELECT queries across multiple database connections in parallel (e.g., DB1, DB2, DB3). Returns all results concurrently for fast data gathering from multiple sources.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      queries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            connectionId: {
              type: 'string',
              description: 'Connection ID (from previous connect_database calls)',
            },
            query: {
              type: 'string',
              description: 'SELECT query to execute on this connection',
            },
            alias: {
              type: 'string',
              description: 'Optional alias for this result set (e.g., "users", "preferences")',
            },
          },
          required: ['connectionId', 'query'],
        },
        description: 'Array of queries to execute in parallel across different DB connections',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds for the entire parallel execution (default: 30000)',
      },
    },
    required: ['queries'],
  },
  handler: async (args: ExecuteParallelQueriesArgs) => {
    try {
      const timeout = args.timeout || 30000;
      const startTime = Date.now();

      // Execute all queries in parallel
      const queryPromises = args.queries.map(async (q) => {
        try {
          const result = await DatabaseEngine.executeSelect(q.connectionId, q.query);
          return {
            alias: q.alias || q.connectionId,
            connectionId: q.connectionId,
            success: result.success,
            data: result.data || [],
            rowCount: result.rowCount || 0,
            error: result.error,
            executionTime: result.executionTime,
          };
        } catch (error: any) {
          return {
            alias: q.alias || q.connectionId,
            connectionId: q.connectionId,
            success: false,
            data: [],
            rowCount: 0,
            error: error.message,
          };
        }
      });

      // Wait for all queries with timeout
      const results = await Promise.race([
        Promise.all(queryPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Parallel query timeout after ${timeout}ms`)), timeout)
        ),
      ]);

      const totalTime = Date.now() - startTime;
      const successCount = (results as any[]).filter((r) => r.success).length;
      const totalRows = (results as any[]).reduce((sum, r) => sum + (r.rowCount || 0), 0);

      return {
        success: true,
        results: results,
        summary: {
          totalQueries: args.queries.length,
          successCount: successCount,
          failureCount: args.queries.length - successCount,
          totalRows: totalRows,
          executionTime: totalTime,
        },
        message: `Executed ${args.queries.length} queries in parallel in ${totalTime}ms. Retrieved ${totalRows} total rows.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const mergeQueryResultsTool = {
  name: 'merge_query_results',
  description:
    'Merge/correlate data from multiple query results. Supports INNER JOIN, LEFT JOIN, and CROSS JOIN logic. Returns combined dataset ready for test payload generation.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'object',
        description:
          'Object with alias keys and array values (e.g., {"users": [...], "preferences": [...]}). Usually output from execute_parallel_queries.',
      },
      joinKey: {
        type: 'string',
        description:
          'Key/column to join on (e.g., "user_id", "customerId"). Must exist in all result sets for INNER/LEFT joins.',
      },
      strategy: {
        type: 'string',
        enum: ['inner', 'left', 'cross'],
        description:
          'Join strategy: "inner" (only matching), "left" (keep all from first), "cross" (all combinations)',
      },
      filters: {
        type: 'object',
        description: 'Optional post-merge filters (e.g., {"status": "active", "balance": {">": 100}})',
      },
    },
    required: ['results'],
  },
  handler: async (args: MergeResultsArgs) => {
    try {
      const strategy = args.strategy || 'left';
      const joinKey = args.joinKey;

      const resultKeys = Object.keys(args.results);
      if (resultKeys.length === 0) {
        return {
          success: false,
          error: 'No result sets provided',
        };
      }

      if (resultKeys.length === 1) {
        // Single result set - just filter and return
        let merged = args.results[resultKeys[0]] || [];
        if (args.filters) {
          merged = applyFilters(merged, args.filters);
        }
        return {
          success: true,
          mergedCount: merged.length,
          data: merged,
          message: `Single result set with ${merged.length} rows after filtering`,
        };
      }

      let mergedData: any[] = [];

      if (!joinKey && strategy !== 'cross') {
        return {
          success: false,
          error: `joinKey is required for "${strategy}" join strategy`,
        };
      }

      if (strategy === 'inner') {
        // INNER JOIN logic
        if (!joinKey) {
          return {
            success: false,
            error: 'joinKey is required for inner join strategy',
          };
        }
        const [firstKey, ...otherKeys] = resultKeys;
        mergedData = args.results[firstKey];

        for (const key of otherKeys) {
          const rightData = args.results[key];
          mergedData = innerJoin(mergedData, rightData, joinKey);
        }
      } else if (strategy === 'left') {
        // LEFT JOIN logic
        if (!joinKey) {
          return {
            success: false,
            error: 'joinKey is required for left join strategy',
          };
        }
        const [firstKey, ...otherKeys] = resultKeys;
        mergedData = args.results[firstKey];

        for (const key of otherKeys) {
          const rightData = args.results[key];
          mergedData = leftJoin(mergedData, rightData, joinKey, key);
        }
      } else if (strategy === 'cross') {
        // CROSS JOIN (Cartesian product)
        mergedData = args.results[resultKeys[0]];
        for (const key of resultKeys.slice(1)) {
          const rightData = args.results[key];
          mergedData = crossJoin(mergedData, rightData, key);
        }
      }

      // Apply filters
      if (args.filters) {
        mergedData = applyFilters(mergedData, args.filters);
      }

      return {
        success: true,
        mergedCount: mergedData.length,
        data: mergedData,
        strategy: strategy,
        joinKey: joinKey,
        message: `Merged ${resultKeys.length} result sets using ${strategy} join. Result: ${mergedData.length} rows.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

const createCompositeTestDataTool = {
  name: 'create_composite_test_data',
  description:
    'Transform merged database results into API test payloads. Maps database columns to API request fields and batches data for concurrent testing.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mergedData: {
        type: 'array',
        description: 'Array of merged rows (output from merge_query_results)',
      },
      mapping: {
        type: 'object',
        description:
          'Maps database columns to API payload fields (e.g., {"userId": "user_id", "userName": "name", "preferredCategory": "category"})',
      },
      batchSize: {
        type: 'number',
        description: 'Batch test data into groups (e.g., 100 per batch for parallel testing)',
      },
    },
    required: ['mergedData', 'mapping'],
  },
  handler: async (args: CreateCompositeDataArgs) => {
    try {
      const testPayloads = args.mergedData.map((row) => {
        const payload: Record<string, any> = {};

        for (const [apiField, dbColumn] of Object.entries(args.mapping)) {
          // Support nested paths: "user.id" → row["user.id"]
          payload[apiField] = getNestedValue(row, dbColumn as string);
        }

        return payload;
      });

      // Batch if requested
      const batches: any[][] = [];
      if (args.batchSize && args.batchSize > 0) {
        for (let i = 0; i < testPayloads.length; i += args.batchSize) {
          batches.push(testPayloads.slice(i, i + args.batchSize));
        }
      } else {
        batches.push(testPayloads);
      }

      return {
        success: true,
        totalPayloads: testPayloads.length,
        batchCount: batches.length,
        batchSize: args.batchSize || testPayloads.length,
        batches: batches,
        samplePayload: testPayloads[0] || null,
        message: `Created ${testPayloads.length} test payloads in ${batches.length} batch(es)`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// Helper functions

function innerJoin(left: any[], right: any[], joinKey: string): any[] {
  return left
    .filter((l) => right.some((r) => r[joinKey] === l[joinKey]))
    .map((l) => {
      const rightMatch = right.find((r) => r[joinKey] === l[joinKey]);
      return { ...l, ...rightMatch };
    });
}

function leftJoin(left: any[], right: any[], joinKey: string, rightAlias: string): any[] {
  return left.map((l) => {
    const rightMatch = right.find((r) => r[joinKey] === l[joinKey]);
    if (rightMatch) {
      return { ...l, [rightAlias]: rightMatch };
    }
    return { ...l, [rightAlias]: null };
  });
}

function crossJoin(left: any[], right: any[], rightAlias: string): any[] {
  const result: any[] = [];
  for (const l of left) {
    for (const r of right) {
      result.push({ ...l, [rightAlias]: r });
    }
  }
  return result;
}

function applyFilters(data: any[], filters: Record<string, any>): any[] {
  return data.filter((row) => {
    for (const [key, condition] of Object.entries(filters)) {
      const value = getNestedValue(row, key);

      if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
        // Complex operators: {">": 100}, {"!=": "inactive"}
        for (const [op, opValue] of Object.entries(condition)) {
          const opVal = opValue as any;
          if (op === '>' && !(value > opVal)) return false;
          if (op === '<' && !(value < opVal)) return false;
          if (op === '>=' && !(value >= opVal)) return false;
          if (op === '<=' && !(value <= opVal)) return false;
          if (op === '!=' && value === opVal) return false;
          if (op === 'in' && !Array.isArray(opVal)) return false;
          if (op === 'in' && !opVal.includes(value)) return false;
        }
      } else if (Array.isArray(condition)) {
        if (!condition.includes(value)) return false;
      } else {
        // Simple equality
        if (value !== condition) return false;
      }
    }
    return true;
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export {
  executeParallelQueriesTool,
  mergeQueryResultsTool,
  createCompositeTestDataTool,
};
