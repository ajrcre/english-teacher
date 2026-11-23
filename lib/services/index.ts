import "server-only";
import { getCatalog } from "@/lib/content/catalog";
import { getDb } from "@/lib/db";
import { createRepositories, type Repositories } from "@/lib/db/repositories";
import { gamification } from "@/lib/gamification/engine";
import { graderRegistry } from "@/lib/grading/registry";
import { defaultScheduler } from "@/lib/scheduling/leitner";
import { PracticeService } from "./practice";
import { RewardsService } from "./rewards";

export interface Services {
  repos: Repositories;
  practice: PracticeService;
  rewards: RewardsService;
}

/** Composition root: wires repositories, content, graders, scheduler and rewards. */
export async function getServices(): Promise<Services> {
  const repos = createRepositories(await getDb());
  return { repos, practice: new PracticeService(repos, getCatalog(), graderRegistry, defaultScheduler, gamification), rewards: new RewardsService(repos) };
}
