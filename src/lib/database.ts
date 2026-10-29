import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

type DatabaseValue = string | number | boolean | Date | Buffer | null | undefined;
type QueryValue = Exclude<DatabaseValue, undefined>;

interface DatabaseResult {
    rows: RowDataPacket[];
    rowCount: number;
    insertId: number;
}

interface DatabaseConnection {
    query(sql: string, values?: readonly DatabaseValue[]): Promise<DatabaseResult>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
}

interface DatabasePool {
    query(sql: string, values?: readonly DatabaseValue[]): Promise<DatabaseResult>;
    connect(): Promise<DatabaseConnection>;
}

declare global {
    var __academicPool: Pool | undefined;
}

function prepareQuery(sql: string, values: readonly DatabaseValue[] = []) {
    const parameters: QueryValue[] = [];
    const statement = sql.replace(/\$(\d+)/g, (_match, index: string) => {
        const parameter = Number(index) - 1;
        if (parameter < 0 || parameter >= values.length) {
            throw new Error(`SQL parameter $${index} has no corresponding value.`);
        }
        parameters.push(values[parameter] ?? null);
        return "?";
    });
    return { statement, parameters };
}

async function execute(connection: Pool | PoolConnection, sql: string, values?: readonly DatabaseValue[]): Promise<DatabaseResult> {
    const { statement, parameters } = prepareQuery(sql, values);
    const [result] = await connection.execute(statement, parameters);
    if (Array.isArray(result)) {
        const rows = result as RowDataPacket[];
        return { rows, rowCount: rows.length, insertId: 0 };
    }

    const header = result as ResultSetHeader;
    return { rows: [], rowCount: header.affectedRows, insertId: header.insertId };
}

function wrapConnection(connection: PoolConnection): DatabaseConnection {
    return {
        query: (sql, values) => execute(connection, sql, values),
        beginTransaction: () => connection.beginTransaction(),
        commit: () => connection.commit(),
        rollback: () => connection.rollback(),
        release: () => connection.release()
    };
}

export function getPool(): DatabasePool {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("Set DATABASE_URL to a MySQL connection URL before using the application database.");
    }

    if (!url.startsWith("mysql://") && !url.startsWith("mysql2://")) {
        throw new Error("DATABASE_URL must use the mysql:// scheme.");
    }

    if (!global.__academicPool) {
        const connectionUrl = new URL(url);
        const database = decodeURIComponent(connectionUrl.pathname.slice(1));
        if (!connectionUrl.hostname || !connectionUrl.username || !database) {
            throw new Error("DATABASE_URL must include a MySQL host, username, and database name.");
        }

        global.__academicPool = mysql.createPool({
            host: connectionUrl.hostname,
            port: Number(connectionUrl.port || 3306),
            user: decodeURIComponent(connectionUrl.username),
            password: decodeURIComponent(connectionUrl.password),
            database,
            ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
            connectionLimit: 10,
            idleTimeout: 30_000,
            connectTimeout: 5_000,
            supportBigNumbers: true,
            bigNumberStrings: false
        });
    }

    const pool = global.__academicPool;
    return {
        query: (sql, values) => execute(pool, sql, values),
        connect: async () => wrapConnection(await pool.getConnection())
    };
}

export type { DatabaseConnection, DatabaseResult, DatabaseValue };
