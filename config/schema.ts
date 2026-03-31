import {
  integer,
  pgTable,
  varchar,
  timestamp,
  json,
  text,
} from "drizzle-orm/pg-core";

// users table
export const usersTable = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  credits: integer("credits").default(2),
});

// projects table
export const projectTable = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: varchar("project_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),  // ← ADDED
  createdBy: varchar("created_by", { length: 255 }).references(
    () => usersTable.email
  ),
  createdOn: timestamp("created_on").defaultNow(),
});

// frames table
export const frameTable = pgTable("frames", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  designCode: text(),
  frameId: varchar("frame_id", { length: 255 }).notNull().unique(),
  projectId: varchar("project_id", { length: 255 }).references(
    () => projectTable.projectId
  ),
  createdOn: timestamp("created_on").defaultNow(),
});

export const chatTable = pgTable("chats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  chatMessage: json(),
  frameId: varchar().references(() => frameTable.frameId),
  createdBy: varchar("created_by", { length: 255 }).references(() => usersTable.email),
  createdOn: timestamp("created_on").defaultNow(),
});
