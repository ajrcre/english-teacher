CREATE TABLE "boss_defeats" (
	"student_id" uuid NOT NULL,
	"lesson_id" text NOT NULL,
	"best_hearts" integer DEFAULT 0 NOT NULL,
	"battle_started_at" timestamp with time zone,
	"times_defeated" integer DEFAULT 0 NOT NULL,
	"last_reward_day" text,
	"first_defeated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "boss_defeats_student_id_lesson_id_pk" PRIMARY KEY("student_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"student_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"kind" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"acquired_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_student_id_item_id_pk" PRIMARY KEY("student_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "student_stats" ADD COLUMN "stars_spent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "student_stats" ADD COLUMN "bosses_defeated" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "frame" text;--> statement-breakpoint
ALTER TABLE "boss_defeats" ADD CONSTRAINT "boss_defeats_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;