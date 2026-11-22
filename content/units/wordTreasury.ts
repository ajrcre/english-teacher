import type { UnitInput } from "@/lib/content/schema";
import { matchChunks } from "../helpers";

const WB = (p: string) => `Workbook p. ${p}`;

export const wordTreasury: UnitInput = {
  id: "word-treasury",
  title: "Word Treasury",
  tagline: "Special words for places and groups",
  accent: "sand",
  lessons: [
    {
      id: "wt-places",
      title: "Words Denoting Places",
      subtitle: "Where things are kept, made or done",
      source: WB("165"),
      items: [
        ...matchChunks("wt.places", "Which word means…? Match.", [
          ["a place where fish are kept", "aquarium"],
          ["a place where rabbits are kept", "hutch"],
          ["a place where pigs are kept", "sty"],
          ["a house or shelter for a dog", "kennel"],
          ["a house or shelter for a horse", "stable"],
          ["an animal's home underground", "burrow"],
          ["the home of a lion", "den"],
          ["a place where medicines are made up", "dispensary"],
          ["a place where milk products are made", "dairy"],
          ["a place where bread and cakes are made", "bakery"],
          ["a place where clothes are washed and ironed", "laundry"],
          ["a place for housing aeroplanes", "hangar"],
          ["a place where books are kept", "library"],
          ["a place where scientific experiments are done", "laboratory"],
          ["a place where money is coined", "mint"],
          ["a place where fruit trees are grown", "orchard"],
          ["a place where water is collected and stored", "reservoir"],
          ["a place where ships are loaded and unloaded", "quay"],
          ["a place where treasure or weapons are hidden", "cache"],
          ["an enclosure for a cow (or sheep)", "pen"],
        ], 5, { source: WB("165") }),
      ],
    },
    {
      id: "wt-collective",
      title: "Collective Nouns",
      subtitle: "A flock of sheep, a swarm of bees…",
      source: WB("166"),
      items: [
        ...matchChunks("wt.groups", "Which word means a group of…? Match.", [
          ["sheep", "flock"],
          ["fish (swimming)", "shoal"],
          ["fish (in a net)", "catch / haul"],
          ["geese", "gaggle"],
          ["bees, locusts", "swarm"],
          ["wolves", "pack"],
          ["cats", "clowder"],
          ["puppies or kittens born at the same time", "litter"],
          ["wild animals kept for show", "zoo / menagerie"],
          ["birds or insects moving together (in the air)", "flight"],
          ["dancers", "troupe"],
          ["actors", "company"],
          ["singers", "choir"],
          ["people watching a match", "spectators"],
          ["people following a funeral", "cortege"],
        ], 5, { source: WB("166") }),
        ...matchChunks("wt.groups-b", "Which word means a group of…? Match.", [
          ["cattle feeding together", "herd"],
          ["horses or cattle being driven together", "drove"],
          ["horses kept for breeding or racing", "stud"],
          ["monkeys", "troop"],
          ["a wild, noisy crowd", "horde"],
        ], 5, { source: WB("166"), reviewStatus: "draft", explanation: "Some of these words have more than one use; check with your teacher's answers." }),
      ],
    },
  ],
};
