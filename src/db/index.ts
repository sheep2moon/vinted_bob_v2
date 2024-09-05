import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import dotenv from "dotenv";
dotenv.config();

const queryClient = postgres(process.env.DATABASE_URL || "");
export const db = drizzle(queryClient);
