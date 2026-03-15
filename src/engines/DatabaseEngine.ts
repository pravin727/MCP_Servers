/**
 * DatabaseEngine
 * Handles connections and operations with multiple database types
 * Supports: MySQL, PostgreSQL, Oracle, Cassandra, SQL Server
 */

interface DbConnectionConfig {
  type: 'mysql' | 'postgresql' | 'oracle' | 'cassandra' | 'mssql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  options?: Record<string, any>;
}

interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
  executionTime?: number;
}

class DatabaseEngine {
  private connections: Map<string, any> = new Map();

  /**
   * Create a connection to a database based on type
   */
  async createConnection(config: DbConnectionConfig, connectionId: string): Promise<void> {
    try {
      const startTime = Date.now();

      switch (config.type.toLowerCase()) {
        case 'mysql':
          await this.createMySqlConnection(config, connectionId);
          break;
        case 'postgresql':
          await this.createPostgresConnection(config, connectionId);
          break;
        case 'oracle':
          await this.createOracleConnection(config, connectionId);
          break;
        case 'cassandra':
          await this.createCassandraConnection(config, connectionId);
          break;
        case 'mssql':
          await this.createMsSqlConnection(config, connectionId);
          break;
        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      console.log(`[${config.type}] Connection established in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      throw new Error(`Failed to connect to ${config.type}: ${error.message}`);
    }
  }

  /**
   * MySQL connection
   */
  private async createMySqlConnection(config: DbConnectionConfig, connectionId: string): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        ...config.options,
      });
      this.connections.set(connectionId, { connection, type: 'mysql' });
    } catch (error: any) {
      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  }

  /**
   * PostgreSQL connection
   */
  private async createPostgresConnection(config: DbConnectionConfig, connectionId: string): Promise<void> {
    try {
      const pg = await import('pg');
      const { Client } = pg;
      const client = new Client({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        ...config.options,
      });
      await client.connect();
      this.connections.set(connectionId, { connection: client, type: 'postgresql' });
    } catch (error: any) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }
  }

  /**
   * Oracle connection
   */
  private async createOracleConnection(config: DbConnectionConfig, connectionId: string): Promise<void> {
    try {
      const oracledb = await import('oracledb');
      const connection = await oracledb.getConnection({
        user: config.username,
        password: config.password,
        connectionString: `${config.host}:${config.port}/${config.database}`,
        ...config.options,
      });
      this.connections.set(connectionId, { connection, type: 'oracle' });
    } catch (error: any) {
      throw new Error(`Oracle connection failed: ${error.message}`);
    }
  }

  /**
   * Cassandra connection
   */
  private async createCassandraConnection(config: DbConnectionConfig, connectionId: string): Promise<void> {
    try {
      const cassandra = await import('cassandra-driver');
      const { Client } = cassandra;
      const client = new Client({
        contactPoints: [config.host],
        localDataCenter: config.options?.localDataCenter || 'datacenter1',
        credentials: {
          username: config.username,
          password: config.password,
        },
        keyspace: config.database,
        ...config.options,
      });
      await client.connect();
      this.connections.set(connectionId, { connection: client, type: 'cassandra' });
    } catch (error: any) {
      throw new Error(`Cassandra connection failed: ${error.message}`);
    }
  }

  /**
   * SQL Server connection
   */
  private async createMsSqlConnection(config: DbConnectionConfig, connectionId: string): Promise<void> {
    try {
      const mssql = await import('mssql');
      const pool = new mssql.ConnectionPool({
        server: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          ...config.options,
        },
      });
      await pool.connect();
      this.connections.set(connectionId, { connection: pool, type: 'mssql' });
    } catch (error: any) {
      throw new Error(`SQL Server connection failed: ${error.message}`);
    }
  }

  /**
   * Execute a SELECT query and return results
   */
  async executeSelect(connectionId: string, query: string): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      const connData = this.connections.get(connectionId);
      if (!connData) {
        return {
          success: false,
          error: `Connection not found: ${connectionId}`,
        };
      }

      const { connection, type } = connData;
      let results: any[] = [];
      let rowCount = 0;

      // Validate that it's a SELECT query
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return {
          success: false,
          error: 'Only SELECT queries are allowed',
        };
      }

      switch (type) {
        case 'mysql':
          [results] = await connection.query(query);
          rowCount = Array.isArray(results) ? results.length : 0;
          break;

        case 'postgresql':
          const pgResult = await connection.query(query);
          results = pgResult.rows;
          rowCount = pgResult.rowCount || 0;
          break;

        case 'oracle':
          const oracleResult = await connection.execute(query, [], {
            outFormat: 2, // OBJECT format
          });
          results = oracleResult.rows || [];
          rowCount = results.length;
          break;

        case 'cassandra':
          const cassandraResult = await connection.execute(query);
          results = cassandraResult.rows || [];
          rowCount = results.length;
          break;

        case 'mssql':
          const mssqlResult = await connection.request().query(query);
          results = mssqlResult.recordset;
          rowCount = mssqlResult.rowsAffected?.[0] || 0;
          break;
      }

      return {
        success: true,
        data: results,
        rowCount,
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Close a database connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    try {
      const connData = this.connections.get(connectionId);
      if (!connData) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const { connection, type } = connData;

      switch (type) {
        case 'mysql':
          await connection.end();
          break;
        case 'postgresql':
          await connection.end();
          break;
        case 'oracle':
          await connection.close();
          break;
        case 'cassandra':
          await connection.shutdown();
          break;
        case 'mssql':
          await connection.close();
          break;
      }

      this.connections.delete(connectionId);
      console.log(`Connection ${connectionId} closed`);
    } catch (error: any) {
      throw new Error(`Failed to close connection: ${error.message}`);
    }
  }

  /**
   * Close all active connections
   */
  async closeAllConnections(): Promise<void> {
    for (const connectionId of this.connections.keys()) {
      await this.closeConnection(connectionId);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [id, data] of this.connections.entries()) {
      status[id] = data.type;
    }
    return status;
  }

  /**
   * Get database schema (tables and views)
   */
  async getSchema(connectionId: string): Promise<any> {
    try {
      const connData = this.connections.get(connectionId);
      if (!connData) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const { connection, type } = connData;
      let tables: any[] = [];
      let views: any[] = [];

      switch (type) {
        case 'mysql':
          const mysqlTableQuery = `
            SELECT TABLE_NAME, TABLE_TYPE, TABLE_COMMENT 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
          `;
          [tables] = await connection.query(mysqlTableQuery);
          views = tables.filter((t: any) => t.TABLE_TYPE === 'VIEW').map((t: any) => t.TABLE_NAME);
          tables = tables.filter((t: any) => t.TABLE_TYPE === 'BASE TABLE').map((t: any) => t.TABLE_NAME);
          break;

        case 'postgresql':
          const pgTableQuery = `
            SELECT tablename FROM pg_catalog.pg_tables 
            WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
          `;
          const pgViewQuery = `
            SELECT viewname FROM pg_catalog.pg_views 
            WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
          `;
          const pgTableResult = await connection.query(pgTableQuery);
          const pgViewResult = await connection.query(pgViewQuery);
          tables = pgTableResult.rows.map((t: any) => t.tablename);
          views = pgViewResult.rows.map((v: any) => v.viewname);
          break;

        case 'oracle':
          const oracleQuery = `
            SELECT object_name, object_type 
            FROM user_objects 
            WHERE object_type IN ('TABLE', 'VIEW')
          `;
          const oracleResult = await connection.execute(oracleQuery);
          const oracleObjects = oracleResult.rows || [];
          tables = oracleObjects.filter((obj: any) => obj[1] === 'TABLE').map((obj: any) => obj[0]);
          views = oracleObjects.filter((obj: any) => obj[1] === 'VIEW').map((obj: any) => obj[0]);
          break;

        case 'cassandra':
          const cassandraQuery = `SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?`;
          const cassandraResult = await connection.execute(cassandraQuery, [connData.keyspace || connData.connection.options.keyspace]);
          tables = cassandraResult.rows.map((t: any) => t.table_name);
          break;

        case 'mssql':
          const mssqlQuery = `
            SELECT TABLE_NAME, TABLE_TYPE 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_CATALOG = DB_NAME()
          `;
          const mssqlResult = await connection.request().query(mssqlQuery);
          const mssqlRecords = mssqlResult.recordset;
          tables = mssqlRecords.filter((t: any) => t.TABLE_TYPE === 'BASE TABLE').map((t: any) => t.TABLE_NAME);
          views = mssqlRecords.filter((t: any) => t.TABLE_TYPE === 'VIEW').map((t: any) => t.TABLE_NAME);
          break;
      }

      return {
        success: true,
        tables: Array.isArray(tables) ? tables.sort() : [],
        views: Array.isArray(views) ? views.sort() : [],
        totalTables: tables.length,
        totalViews: views.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get table structure (columns, types, constraints)
   */
  async getTableStructure(connectionId: string, tableName: string): Promise<any> {
    try {
      const connData = this.connections.get(connectionId);
      if (!connData) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const { connection, type } = connData;
      let columns: any[] = [];

      switch (type) {
        case 'mysql':
          const mysqlQuery = `
            SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
          `;
          [columns] = await connection.query(mysqlQuery, [tableName]);
          break;

        case 'postgresql':
          const pgQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position
          `;
          const pgResult = await connection.query(pgQuery, [tableName]);
          columns = pgResult.rows;
          break;

        case 'oracle':
          const oracleQuery = `
            SELECT column_name, data_type, nullable
            FROM user_tab_columns
            WHERE table_name = UPPER(?)
          `;
          const oracleResult = await connection.execute(oracleQuery, [tableName]);
          columns = oracleResult.rows || [];
          break;

        case 'cassandra':
          const cassandraQuery = `SELECT column_name, type, kind FROM system_schema.columns WHERE table_name = ? ALLOW FILTERING`;
          const cassandraResult = await connection.execute(cassandraQuery, [tableName]);
          columns = cassandraResult.rows || [];
          break;

        case 'mssql':
          const mssqlQuery = `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = ?
          `;
          const mssqlResult = await connection.request().input('tableName', tableName).query(mssqlQuery);
          columns = mssqlResult.recordset;
          break;
      }

      return {
        success: true,
        table: tableName,
        columns: columns,
        columnCount: columns.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get table relationships (foreign keys)
   */
  async getTableRelationships(connectionId: string, tableName: string): Promise<any> {
    try {
      const connData = this.connections.get(connectionId);
      if (!connData) {
        throw new Error(`Connection not found: ${connectionId}`);
      }

      const { connection, type } = connData;
      let relationships: any[] = [];

      switch (type) {
        case 'mysql':
          const mysqlQuery = `
            SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
          `;
          [relationships] = await connection.query(mysqlQuery, [tableName]);
          break;

        case 'postgresql':
          const pgQuery = `
            SELECT constraint_name, column_name, table_name, referenced_table_name, referenced_column_name
            FROM information_schema.referential_constraints rc
            JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
            WHERE rc.table_name = $1
          `;
          const pgResult = await connection.query(pgQuery, [tableName]);
          relationships = pgResult.rows;
          break;

        case 'oracle':
          const oracleQuery = `
            SELECT constraint_name, column_name, r_table_name
            FROM user_constraints uc
            JOIN user_cons_columns ucc ON uc.constraint_name = ucc.constraint_name
            WHERE uc.table_name = UPPER(?) AND uc.constraint_type = 'R'
          `;
          const oracleResult = await connection.execute(oracleQuery, [tableName]);
          relationships = oracleResult.rows || [];
          break;

        case 'mssql':
          const mssqlQuery = `
            SELECT fk.name, col.name, ref_table.name AS referenced_table, ref_col.name AS referenced_column
            FROM sys.foreign_keys fk
            JOIN sys.tables t ON fk.parent_object_id = t.object_id
            JOIN sys.columns col ON fk.parent_column_id = col.column_id AND col.object_id = t.object_id
            JOIN sys.tables ref_table ON fk.referenced_object_id = ref_table.object_id
            JOIN sys.columns ref_col ON fk.referenced_column_id = ref_col.column_id AND ref_col.object_id = ref_table.object_id
            WHERE t.name = ?
          `;
          const mssqlResult = await connection.request().input('tableName', tableName).query(mssqlQuery);
          relationships = mssqlResult.recordset;
          break;

        case 'cassandra':
          relationships = []; // Cassandra doesn't have traditional foreign keys
          break;
      }

      return {
        success: true,
        table: tableName,
        relationships: relationships,
        relationshipCount: relationships.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new DatabaseEngine();
export type { DbConnectionConfig, QueryResult };
