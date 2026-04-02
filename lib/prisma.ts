import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function normalizeDatabaseUrl(rawUrl: string) {
    try {
        const parsed = new URL(rawUrl);
        const isSupabaseHost =
            parsed.hostname.endsWith(".supabase.co") || parsed.hostname.endsWith(".pooler.supabase.com");

        if (isSupabaseHost && !parsed.searchParams.has("sslmode")) {
            parsed.searchParams.set("sslmode", "verify-full");
        }

        return parsed.toString();
    } catch {
        return rawUrl;
    }
}

function getRuntimeDatabaseUrl() {
    const rawUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL ?? "";

    if (!rawUrl) {
        throw new Error("DATABASE_URL is not configured.");
    }

    try {
        const parsed = new URL(rawUrl);
        const isDirectSupabaseHost = parsed.hostname.startsWith("db.") && parsed.hostname.endsWith(".supabase.co");

        if (process.env.NODE_ENV === "production" && isDirectSupabaseHost) {
            console.warn(
                "[prisma] DATABASE_URL is using a direct Supabase host. For deployed/serverless runtimes, use the Supabase transaction pooler URL on port 6543 instead."
            );
        }
    } catch {
        // Ignore URL parsing failures here and let the underlying driver report the real connection issue.
    }

    return normalizeDatabaseUrl(rawUrl);
}

function createPrismaClient() {
    const pool = new Pool({ connectionString: getRuntimeDatabaseUrl() });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
