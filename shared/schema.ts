import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  cpf: varchar("cpf", { length: 11 }).unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  isAdmin: boolean("is_admin").default(false),
  workType: varchar("work_type", { enum: ["filetagem", "espinho"] }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Weight records table
export const weightRecords = pgTable("weight_records", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: serial("created_by").references(() => users.id).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  weightRecords: many(weightRecords),
  createdRecords: many(weightRecords, { relationName: "createdRecords" }),
}));

export const weightRecordsRelations = relations(weightRecords, ({ one }) => ({
  user: one(users, {
    fields: [weightRecords.userId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [weightRecords.createdBy],
    references: [users.id],
    relationName: "createdRecords",
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeightRecordSchema = createInsertSchema(weightRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  weight: z.coerce.number().positive("Peso deve ser um número positivo"),
});

export const updateUserSchema = insertUserSchema.partial();

export const loginSchema = z.object({
  cpf: z.string().length(11, "CPF deve ter 11 dígitos"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type WeightRecord = typeof weightRecords.$inferSelect;
export type InsertWeightRecord = z.infer<typeof insertWeightRecordSchema>;
export type LoginData = z.infer<typeof loginSchema>;
