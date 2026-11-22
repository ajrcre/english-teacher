import { boolean, integer, jsonb, pgTable, primaryKey, real, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  /** Short code a student types on a new device to find their family. */
  familyCode: text("family_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => parents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default("fox"),
  pinHash: text("pin_hash").notNull(),
  focusUnit: text("focus_unit"),
  soundOn: boolean("sound_on").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemProgress = pgTable(
  "item_progress",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    lessonId: text("lesson_id").notNull(),
    box: integer("box").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),
    lastVerdict: text("last_verdict"),
    /** Day (YYYY-MM-DD, school time zone) of the last correct answer that moved the box up. */
    lastPromotedDay: text("last_promoted_day"),
    isMistake: boolean("is_mistake").notNull().default(false),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    masteredAt: timestamp("mastered_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.itemId] })],
);

export const attempts = pgTable("attempts", {
  id: serial("id").primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  lessonId: text("lesson_id").notNull(),
  mode: text("mode").notNull(),
  response: jsonb("response").notNull(),
  verdict: text("verdict").notNull(),
  score: real("score").notNull(),
  feedback: jsonb("feedback"),
  seconds: integer("seconds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentStats = pgTable("student_stats", {
  studentId: uuid("student_id")
    .primaryKey()
    .references(() => students.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  stars: integer("stars").notNull().default(0),
  combo: integer("combo").notNull().default(0),
  bestCombo: integer("best_combo").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  /** Last day the daily goal (one round) was met. */
  lastGoalDay: text("last_goal_day"),
  shields: integer("shields").notNull().default(0),
  lastShieldWeek: text("last_shield_week"),
  mistakesFixed: integer("mistakes_fixed").notNull().default(0),
  itemsMastered: integer("items_mastered").notNull().default(0),
  answersTotal: integer("answers_total").notNull().default(0),
  answersCorrect: integer("answers_correct").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyActivity = pgTable(
  "daily_activity",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    seconds: integer("seconds").notNull().default(0),
    answers: integer("answers").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    xp: integer("xp").notNull().default(0),
    newItems: integer("new_items").notNull().default(0),
    roundsCompleted: integer("rounds_completed").notNull().default(0),
    llmCalls: integer("llm_calls").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.day] })],
);

export const badgesEarned = pgTable(
  "badges_earned",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.badgeId] })],
);

export const contentFlags = pgTable("content_flags", {
  id: serial("id").primaryKey(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => parents.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  status: text("status").notNull(), // "approved" | "flagged"
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const schemaTables = {
  parents,
  students,
  itemProgress,
  attempts,
  studentStats,
  dailyActivity,
  badgesEarned,
  contentFlags,
  rateLimits,
};
