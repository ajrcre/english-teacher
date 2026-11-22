import type { UnitInput } from "@/lib/content/schema";
import { choice, matchChunks, mcq, open, parseVocab, sequence, sort, vocabItems } from "../helpers";

const WB = (p: string) => `Workbook p. ${p}`;
const book = (ch: string) => `Number the Stars, ${ch}`;
const draft = { reviewStatus: "draft" as const };

const rescueVocab = parseVocab(`
rescue | n/v | saving someone from danger | הצלה / להציל | The Danes organized the *rescue* of almost all of their Jewish neighbors.
resistance | n | fighting back against an enemy who controls your country | התנגדות, מחתרת | Denmark's *resistance* to the Germans was especially effective.
occupation | n | when an army takes control of another country | כיבוש | During the German *occupation*, soldiers stood on every corner.
unique | adj | the only one of its kind; very special | ייחודי | Denmark's resistance was *unique* in Europe.
population | n | all the people who live in a place | אוכלוסייה | The Danes saved 95% of their Jewish *population*.
protect | v | keep someone safe from harm | להגן | The Danes *protected* and hid their Jewish neighbors.
deport | v | force people to leave a country | לגרש | The Germans planned to *deport* the Jews to camps.
underground group | n | a secret group that fights against those in power | קבוצת מחתרת | The Elsinore Sewing Club was really an *underground group*.
refugee | n | a person who escapes from danger to another country | פליט | Elsinore was the best place for the *refugees* to cross to Sweden.
torture | v | hurt someone badly on purpose, often to get information | לענות (עינויים) | Kaier was captured and *tortured*, but he said nothing.
reveal | v | tell or show something secret | לחשוף, לגלות | Kaier never *revealed* any information.
congregation | n | the people who pray together at a synagogue or church | קהל המתפללים, קהילה | Rabbi Melchior warned his *congregation* of 150 people.
warn | v | tell someone about a danger before it happens | להזהיר | The ambulance driver drove through the city to *warn* Jewish families.
concentration camp | n | a prison camp where the Nazis held and killed people | מחנה ריכוז | The Germans planned to send the Jews to a *concentration camp*.
`);

const ameBre: [string, string][] = [
  ["casket", "coffin"],
  ["store", "shop"],
  ["to nurse (a baby)", "to breastfeed"],
  ["sidewalk", "pavement"],
  ["faucet", "tap"],
  ["mantel", "mantelpiece"],
  ["trip", "journey"],
  ["vacation", "holiday"],
  ["apartment", "flat"],
  ["turtleneck", "polo neck"],
  ["to figure out", "to work out"],
  ["braids", "plaits"],
  ["flashlight", "torch"],
  ["crib", "cot"],
  ["napkin", "serviette"],
  ["cupcake", "fairy cake"],
  ["oatmeal", "porridge"],
  ["frosting", "icing"],
  ["carousel", "roundabout"],
  ["truck", "lorry"],
  ["pail", "bucket"],
  ["closet", "wardrobe"],
];

export const numberTheStars: UnitInput = {
  id: "number-the-stars",
  title: "Number the Stars",
  tagline: "Lois Lowry's story of courage in occupied Denmark",
  note: "The quiz questions are about the novel itself, so keep your copy of the book handy. The background reading and vocabulary are in your workbook.",
  accent: "amber",
  lessons: [
    {
      id: "nts-rescue",
      title: "Before You Read: The Danish Rescue",
      subtitle: "Background reading and vocabulary",
      source: WB("5–7"),
      items: [
        ...vocabItems("nts.rescue.vocab", rescueVocab, WB("7")),
        open("nts.rescue.q1", "In which countries did the Germans meet resistance in World War II?", "In Holland and Denmark — two tiny countries that gave the Germans the most trouble.", ["Holland (the Netherlands)", "Denmark"], { source: WB("6, paragraph 1") }),
        open("nts.rescue.q2", "Which facts prove that the Danish resistance was effective?", "The Danes protected, hid and saved 95.5% of their Jewish population, about 8,000 people.", ["They saved 95.5% of Denmark's Jews", "about 8,000 people"], { source: WB("6, paragraph 1") }),
        open("nts.rescue.q3", "What was 'The Elsinore Sewing Club' and where was the town of Elsinore?", "It was an underground (resistance) group of fighters. Elsinore is a Danish town only two miles across the water from Sweden.", ["an underground / resistance group (not really a sewing club)", "Elsinore is in Denmark, close to Sweden (two miles of water)"], { source: WB("6, paragraphs 2–3") }),
        open("nts.rescue.q4", "Why did Dr. Gersfelt inject narcotics into young Jewish children?", "To keep the children quiet and asleep so they could get past the German checkpoints. Sleeping pills wore off too soon.", ["to keep them quiet / asleep", "so they could get past German checkpoints", "sleeping pills did not last long enough"], { source: WB("6, paragraph 2") }),
        open("nts.rescue.q5", "How did the Jewish refugees cross into neutral Sweden?", "Mostly on fishing boats across the narrow two-mile waterway from Elsinore.", ["by (fishing) boats", "across the short waterway from Elsinore"], { source: WB("6, paragraph 3") }),
        open("nts.rescue.q6", "What did Rabbi Melchior warn his congregation was going to happen?", "That the next day the Germans planned to ship all the Jews to concentration camps, so they should warn other Jews and go into hiding.", ["the Germans would deport / ship all Jews to concentration camps", "the next day (Rosh Hashanah 1943)", "they should hide and warn others"], { source: WB("6, paragraph 4") }),
        open("nts.rescue.q7", "Explain how the Danish ambulance driver helped the Jews.", "He circled Jewish names in a phone book and drove around the city warning them. He drove people who didn't know where to hide to a hospital, where Dr. Koster hid them.", ["he used the phone book to find Jewish names", "he drove around warning them", "he took people to the hospital to hide"], { source: WB("6, paragraph 4") }),
        open("nts.rescue.q8", "What happened when the Germans arrived?", "The Jews could not be found — they were already hiding, and slowly the Danes helped them get to Sweden.", ["the Jews were not found / had gone into hiding", "the Danes helped them escape to Sweden"], { source: WB("6, paragraph 4") }),
        open("nts.rescue.q9", "Why do you think the Danes acted differently from many other occupied countries? (Think about government, religion and history.)", "Any reasonable answer with a reason, e.g. Denmark's king and government stood up for all citizens; Danes saw Jews as fellow Danes, not outsiders; the country had a tradition of democracy and tolerance; Sweden was close by.", ["gives at least one reasonable reason", "e.g. Jews were seen as Danish citizens / tolerance / democracy / the king's example / Sweden was near"], { source: WB("7"), difficulty: 2 }),
        sort(
          "nts.rescue.paragraphs",
          "In which paragraph of 'Danish Rescue' is each idea found?",
          {
            "Paragraph 1": ["Holland and Denmark resisted the Germans."],
            "Paragraph 2": ["Dr. Gersfelt gave the children injections to keep them quiet."],
            "Paragraph 3": ["Kaier directed the boats from Denmark to Sweden.", "A narrow waterway separates Denmark from Sweden."],
            "Paragraph 4": ["An ambulance driver warned Jewish families.", "The Germans planned to send the Danish Jews to camps.", "Jews were hidden in a Danish hospital."],
          },
          { source: WB("7") },
        ),
      ],
    },
    {
      id: "nts-ch1-4",
      title: "Quiz Time: Chapters 1–4",
      subtitle: "Annemarie, Ellen and the soldiers on the corner",
      source: book("chapters 1–4"),
      items: [
        open("nts.ch1-4.q2", "Describe what happens to Annemarie, Ellen and Kirsti on their way home from school.", "They race each other home and are stopped by two German soldiers on the corner. The soldiers ask why they are running and what is in Annemarie's backpack, and one touches Kirsti's hair. Then they let the girls go and the girls walk home, frightened.", ["they were racing / running home", "German soldiers stopped them", "the soldiers questioned them (why running, schoolbooks)", "the soldiers let them go; the girls were scared"], { source: book("chapter 1"), ...draft }),
        open("nts.ch1-4.q3", "What is \"De Frie Danske\"? Who brought it and why?", "It is an illegal underground newspaper of the Danish Resistance (\"The Free Danes\"). Peter Neilsen brings it to the Johansens so they can read the real news about the war.", ["a secret / illegal Resistance newspaper", "Peter (Neilsen) brought it", "to give them news the Nazis don't allow"], { source: book("chapter 1"), ...draft }),
        open("nts.ch1-4.q4", "Who are the Resistance fighters?", "Danes who secretly fight against the Nazi occupation — for example by blowing up factories and railways, printing secret newspapers and helping people escape.", ["Danish people who secretly fight the Germans / Nazis", "e.g. sabotage, secret newspapers, helping Jews"], { source: book("chapter 1"), ...draft }),
        open("nts.ch1-4.q5", "Who is Lise and what happened to her?", "Lise was Annemarie's older sister, who was engaged to Peter. The family said she died in an accident (she was hit by a car) just before her wedding.", ["Annemarie's older sister", "engaged to Peter", "she died (in an accident) before her wedding"], { source: book("chapter 2"), ...draft }),
        open("nts.ch1-4.q6", "List three ways in which the Nazi occupation changed the lives of the people of Copenhagen.", "For example: German soldiers stand on every street corner; there is little food (no butter, sugar or coffee, so no cupcakes); electricity and fuel are rationed so they use candles; there is no leather for shoes; the Jewish Hirsch family's shop is closed.", ["gives three changes", "e.g. soldiers on the streets", "food shortages / rationing", "no electricity / candles, no leather", "Jewish shops closed"], { source: book("chapters 1–4"), difficulty: 2, ...draft }),
        open("nts.ch1-4.q7", "What religion do the Rosens practice? Why is that a problem?", "They are Jewish. It is a problem because the Nazis persecute Jews and are planning to arrest and \"relocate\" them.", ["they are Jewish", "the Nazis are arresting / relocating Jews"], { source: book("chapters 3–4"), ...draft }),
        open("nts.ch1-4.q8", "What is wrong with Kirsti's new shoes? How is this problem solved?", "There is no leather, so the shoes are made of fish skin and Kirsti thinks they are ugly. Mama promises to dye them black so they look nicer.", ["made of fish skin (no leather)", "Kirsti thinks they're ugly", "Mama colors / dyes them black"], { source: book("chapter 3"), ...draft }),
        open("nts.ch1-4.q9", "Why does Ellen spend the night with Annemarie?", "The Nazis are starting to round up Danish Jews (on the Jewish New Year). Ellen's parents have to go into hiding, so Ellen stays with the Johansens and pretends to be part of their family.", ["the Nazis are arresting / taking the Jews", "her parents go into hiding", "she pretends to be a Johansen daughter"], { source: book("chapter 4"), ...draft }),
        sequence("nts.ch1-4.order", "Put the events from Chapters 1 and 2 in the order they happened.", [
          "Annemarie, Ellen and Kirsti raced home from school.",
          "The girls were stopped by the German soldiers.",
          "Kirsti asked Mama for cupcakes.",
          "Annemarie told Kirsti a fairy tale.",
          "Annemarie thought about King Christian X.",
          "Annemarie thought about Lise and what happened to her.",
        ], { source: book("chapters 1–2"), ...draft }),
      ],
    },
    {
      id: "nts-ch5-8",
      title: "Quiz Time: Chapters 5–8",
      subtitle: "The night search and the trip to Uncle Henrik",
      source: book("chapters 5–8"),
      items: [
        open("nts.ch5-8.q1", "Describe what happens in the middle of the night when Ellen stays with Annemarie.", "German soldiers bang on the door and search the apartment for the Rosens. Just before they come into the bedroom, Annemarie pulls Ellen's Star of David necklace off her neck and hides it in her hand.", ["German soldiers come and search the apartment", "they are looking for the Rosens", "Annemarie rips off / hides Ellen's Star of David necklace"], { source: book("chapter 5"), ...draft }),
        open("nts.ch5-8.q2", "What makes the German soldiers suspicious of Ellen's identity?", "Ellen has dark hair, while everyone else in the Johansen family has blond hair.", ["Ellen has dark hair", "the Johansens are blond"], { source: book("chapter 5"), ...draft }),
        open("nts.ch5-8.q3", "What does Papa do to answer the soldier's questions about Ellen?", "He shows a baby photo of Lise from the family album, in which Lise has dark hair, and says it is Ellen. (He tears the name off the photo.)", ["shows a baby picture of Lise", "the baby in the picture has dark hair", "says it is 'Lise' / their daughter"], { source: book("chapter 5"), ...draft }),
        open("nts.ch5-8.q4", "Describe how the German soldiers treat the family.", "They are rude and threatening: they push in at night, shine flashlights in the girls' faces, search everywhere, and the officer tears the photos and grinds them under his boots.", ["rude / rough / threatening", "search the home at night", "tear the photograph and step on it"], { source: book("chapter 5"), ...draft }),
        open("nts.ch5-8.q5", "What does the code word \"cigarettes\" mean?", "On the phone Papa tells Uncle Henrik he is sending a carton of cigarettes. It is a secret code — he really means he is sending people (Ellen and the girls).", ["it is a code / secret message", "it means people (Ellen and the girls) are coming", "used on the telephone with Uncle Henrik"], { source: book("chapter 6"), ...draft }),
        open("nts.ch5-8.q6", "What is Annemarie afraid that Kirsti will do on the train ride to visit Uncle Henrik?", "She is afraid Kirsti will talk too much to the soldiers and say something that gives Ellen away (that Ellen is not their sister / is Jewish).", ["Kirsti might say too much", "and reveal Ellen's real identity"], { source: book("chapter 6"), ...draft }),
        open("nts.ch5-8.q7", "Describe Uncle Henrik's house and the land around it.", "An old farmhouse by the sea near Gilleleje, with a meadow, a barn, a cow called Blossom and a kitten. From there you can see across the water to Sweden.", ["old house / farmhouse by the sea", "meadow, barn, cow (Blossom)", "you can see Sweden across the water"], { source: book("chapter 7"), ...draft }),
        open("nts.ch5-8.q8", "What does Ellen say that her mother is afraid of?", "She says her mother is afraid of the ocean (the sea).", ["the ocean / the sea"], { source: book("chapter 7"), ...draft }),
        open("nts.ch5-8.q9", "What does Uncle Henrik say happened to Great-aunt Birte?", "He says she has died and that there will be a funeral (her casket will be in the living room). Annemarie knows there is no Great-aunt Birte.", ["she has died", "there will be a funeral / she will lie in the house", "(Annemarie knows she never existed)"], { source: book("chapter 8"), ...draft }),
      ],
    },
    {
      id: "nts-ch9-12",
      title: "Quiz Time: Chapters 9–12",
      subtitle: "The funeral, the Psalm and Peter's plan",
      source: book("chapters 9–12"),
      items: [
        open("nts.ch9-12.q1", "Why does Mama lie to Annemarie?", "To protect her. If Annemarie doesn't know the whole truth, she can't give anything away and it is easier for her to be brave.", ["to protect her", "it's safer / easier to be brave if she doesn't know"], { source: book("chapter 9"), ...draft }),
        open("nts.ch9-12.q2", "What is the surprise Ellen receives during the \"funeral\" of Great-aunt Birte? How does she react?", "Her parents arrive with Peter. Ellen runs into their arms, overjoyed and relieved.", ["her parents arrive", "she is very happy / runs to them"], { source: book("chapter 10"), ...draft }),
        open("nts.ch9-12.q3", "How does Mama keep the soldiers from opening the casket?", "She tells them the doctor said Great-aunt Birte died of typhus, which is very contagious, so they could catch it. The officer decides not to open it.", ["says Aunt Birte died of typhus", "the disease is contagious / they might catch it"], { source: book("chapter 10"), ...draft }),
        open("nts.ch9-12.q4", "What is the meaning of the Psalm read at the funeral?", "Psalm 147 says God heals broken hearts and \"numbers the stars\" one by one. It means God watches over His people — here it gives hope and comfort to the Jews in danger, and it gives the book its title.", ["God heals the broken-hearted / gives comfort and hope", "God counts the stars = cares for each person", "connects to the Jews' situation / the book's title"], { source: book("chapter 10"), difficulty: 2, ...draft }),
        open("nts.ch9-12.q5", "What is in the casket?", "Not a body — warm clothes and blankets for the Jews who will escape on the boat.", ["blankets and (warm) clothing", "no dead body"], { source: book("chapter 11"), ...draft }),
        open("nts.ch9-12.q6", "What does Peter give to the baby? Why?", "He gives the baby a few drops of a drug (medicine) so it will sleep and stay quiet during the escape.", ["drops of a drug / medicine / sedative", "so the baby sleeps and doesn't cry"], { source: book("chapter 11"), ...draft }),
        open("nts.ch9-12.q7", "Peter gives Mr. Rosen a paper-wrapped package. What instructions does Peter give him?", "To take the package to Henrik and make sure Henrik gets it — it is very important.", ["deliver it to Uncle Henrik", "it is very important"], { source: book("chapter 11"), ...draft }),
        open("nts.ch9-12.q8", "Describe the plan that Peter devises to get the group safely away.", "The Jews go in small groups through the dark woods to the harbor. Mama leads the Rosens to Henrik's boat. They will hide in a hidden space on the fishing boat and cross to Sweden.", ["go in small groups at night through the woods", "Mama takes the Rosens to the boat", "hide on Henrik's fishing boat and sail to Sweden"], { source: book("chapter 11"), ...draft }),
        open("nts.ch9-12.q9", "How long is Mama supposed to be gone? How long is she actually gone?", "She should be back in about an hour, but when Annemarie wakes at dawn, Mama still hasn't returned — she has been gone for hours.", ["supposed to be gone about an hour / a short time", "actually gone all night / until dawn"], { source: book("chapter 12"), ...draft }),
        open("nts.ch9-12.q10", "What do you think has happened to Mama? (Your prediction.)", "Any sensible prediction with a reason, e.g. she was hurt on the way back, or she was caught by soldiers.", ["gives a prediction", "gives a reason"], { source: book("chapter 12") }),
        mcq("nts.fig.1", "\"Blossom moved her wrinkled mouth like an old woman adjusting false teeth.\" What is this?", ["a simile", "a metaphor"], "a simile", { source: WB("11"), explanation: "A simile compares using “like” or “as”.", he: "דימוי (simile) משתמש ב-like / as" }),
        mcq("nts.fig.2", "\"He was a lion in battle.\" What is this?", ["a simile", "a metaphor"], "a metaphor", { source: WB("11"), explanation: "A metaphor says one thing IS another, without “like” or “as”.", he: "מטאפורה – השוואה ישירה בלי like / as" }),
        mcq("nts.fig.3", "\"Kirsti's hair was as yellow as butter.\" What is this?", ["a simile", "a metaphor"], "a simile", { source: WB("11"), explanation: "It uses “as … as”, so it is a simile." }),
        mcq("nts.fig.4", "\"The soldiers' boots were thunder on the stairs.\" What is this?", ["a simile", "a metaphor"], "a metaphor", { source: WB("11"), explanation: "The boots are called thunder directly — a metaphor." }),
        mcq("nts.fig.5", "Where does the title \"Number the Stars\" come from?", ["Psalm 147, read at the funeral", "A song Kirsti sings", "The name of Henrik's boat", "A code word used by the Resistance"], "Psalm 147, read at the funeral", { source: WB("11"), explanation: "Peter reads a Psalm about God, who “numbers the stars one by one”." }),
      ],
    },
    {
      id: "nts-ch13-15",
      title: "Quiz Time: Chapters 13–15",
      subtitle: "The basket, the path and the wolf",
      source: book("chapters 13–15"),
      items: [
        open("nts.ch13-15.q1", "Describe what happens to Mama on the way back from the boat.", "She trips over a tree root in the dark and breaks her ankle, and has to crawl back toward the house.", ["she falls / trips over a root", "breaks (hurts) her ankle", "crawls home"], { source: book("chapter 13"), ...draft }),
        open("nts.ch13-15.q2", "What does Annemarie find next to the house?", "The packet that Peter gave Mr. Rosen, lying on the ground near the steps — Mr. Rosen dropped it.", ["the (paper-wrapped) packet for Henrik", "Mr. Rosen dropped it"], { source: book("chapter 13"), ...draft }),
        open("nts.ch13-15.q3", "What instructions does Mama give Annemarie about the item she found?", "Put it in the bottom of a basket under apples, bread and cheese, and run to the boat as fast as she can to give it to Uncle Henrik.", ["hide it in a basket under food", "run to Henrik's boat", "give it to Uncle Henrik"], { source: book("chapter 13"), ...draft }),
        open("nts.ch13-15.q4", "What story does Annemarie think about on the path to the boat?", "Little Red Riding Hood.", ["Little Red Riding Hood"], { source: book("chapter 14"), ...draft }),
        open("nts.ch13-15.q5", "List the main characters in the story that Annemarie thought about.", "Little Red Riding Hood, the wolf and the grandmother (and the woodcutter).", ["Little Red Riding Hood", "the wolf", "the grandmother"], { source: book("chapter 14"), ...draft }),
        open("nts.ch13-15.q6", "How are those characters like the ones in Number the Stars?", "Annemarie is like Red Riding Hood, carrying a basket alone through the dark woods. The German soldiers (and their dogs) are like the wolf — dangerous and frightening.", ["Annemarie = Red Riding Hood with a basket in the woods", "the soldiers / dogs = the wolf"], { source: book("chapter 14"), difficulty: 2, ...draft }),
        open("nts.ch13-15.q7", "What are the instructions that Annemarie's mother gives her in case she is stopped?", "Act like a silly, empty-headed little girl who is just taking lunch to her fisherman uncle because he forgot it.", ["pretend to be a silly little girl", "say she is bringing lunch to her uncle"], { source: book("chapter 13"), ...draft }),
        open("nts.ch13-15.q9", "What does the German soldier find in the packet?", "Just a plain white handkerchief. He thinks it is nothing important and throws it down.", ["a (white) handkerchief", "he thinks it is unimportant"], { source: book("chapter 15"), ...draft }),
        open("nts.ch13-15.q10", "Predict what you think will happen next. Where are the Rosens and what is in the packet?", "Any logical prediction, e.g. the Rosens are hidden on Henrik's boat and the handkerchief is a special trick against the soldiers' dogs.", ["makes a logical prediction", "mentions where the Rosens are / what the packet is for"], { source: book("chapter 15") }),
      ],
    },
    {
      id: "nts-ch16-end",
      title: "Quiz Time: Chapter 16 – Afterword",
      subtitle: "Bravery, the handkerchief and the end of the war",
      source: book("chapter 16 – afterword"),
      items: [
        open("nts.ch16.q2", "What is Uncle Henrik's definition of bravery?", "Being brave means not thinking about the dangers — just thinking about what you have to do.", ["not thinking about the dangers", "thinking only about what you must do"], { source: book("chapter 16"), ...draft }),
        open("nts.ch16.q3", "Does Annemarie feel that she is brave? Why or why not?", "No. She says she was frightened and didn't even know enough to be brave. Uncle Henrik tells her she was brave anyway.", ["she doesn't feel brave", "she was scared / didn't understand everything"], { source: book("chapter 16"), ...draft }),
        open("nts.ch16.q4", "How does Uncle Henrik get the Rosens to Sweden?", "He hides them in a secret compartment under the deck of his fishing boat and sails across to Sweden.", ["hidden space under the boat's deck", "he sails his fishing boat to Sweden"], { source: book("chapter 16"), ...draft }),
        open("nts.ch16.q5", "What does Annemarie learn about Peter?", "That he is part of the Resistance and helps Jews escape. Later, she learns the Germans captured and executed him.", ["he works for the Resistance", "he was later caught and killed / shot by the Germans"], { source: book("chapters 16–17"), ...draft }),
        open("nts.ch16.q6", "What is the secret of the handkerchief?", "It has a special powder on it (dried rabbit's blood and a drug). The dogs are attracted to the smell, sniff it, and the drug stops them smelling the people hidden on the boat.", ["it was treated with a special substance", "it ruins / numbs the dogs' sense of smell", "so the dogs cannot find the hidden Jews"], { source: book("chapter 16"), ...draft }),
        open("nts.ch16.q7", "Describe the city of Copenhagen when the war ended.", "People celebrated: church bells rang, Danish flags flew from the windows, and people sang in the streets.", ["celebration / joy", "bells, flags, singing"], { source: book("chapter 17"), ...draft }),
        open("nts.ch16.q8", "What does Annemarie finally learn about Lise's death?", "Lise was in the Resistance too, and the Germans killed her — she was not killed in a simple accident.", ["Lise was in the Resistance", "she was killed by the Germans / Nazis"], { source: book("chapter 17"), ...draft }),
        open("nts.ch16.q9", "Ellen's Star of David was kept safe by Annemarie. Where has it been, and what will Annemarie do with it now?", "It was hidden in the pocket of Lise's yellow dress in the blue trunk. Annemarie asks Papa to fix the chain and decides to wear it until Ellen comes back.", ["hidden in Lise's yellow dress / the trunk", "Annemarie will wear it (until Ellen returns)"], { source: book("chapter 17"), ...draft }),
        open("nts.ch16.q10", "How much of the story is true? Mention the characters, the war, the dogs, the handkerchief and the King of Denmark.", "The characters are invented (Annemarie is based on a real Danish friend of the author), but the history is real: the German occupation, the rescue of almost all Danish Jews to Sweden, the special handkerchiefs against the police dogs, and King Christian X riding through Copenhagen.", ["characters are fictional (but based on real people)", "the occupation and the rescue are true", "the handkerchief and dogs are true", "King Christian X was real"], { source: book("afterword"), difficulty: 3, ...draft }),
      ],
    },
    {
      id: "nts-vocab",
      title: "Vocabulary from the Novel",
      subtitle: "Words for feelings, moves and manners",
      source: WB("15, 17–18"),
      items: [
        ...matchChunks("nts.vocab.match", "Match the words to their meanings.", [
          ["pout (v)", "push out the lips (in displeasure)"],
          ["hoodlums (n)", "dangerous criminals"],
          ["crochet (v)", "make cloth with a small hooked needle and thread"],
          ["scamper (v)", "run quickly (of animals or children, when scared)"],
          ["imperious (adj)", "showing too much pride in oneself"],
          ["pitcher (n)", "large jug"],
          ["pasture (n)", "grassland for cattle"],
          ["trousseau (n)", "outfit of clothing, etc., for a bride"],
          ["extinguish (v)", "put out (light, fire)"],
          ["stumble (v)", "hit the foot against something and (almost) fall"],
        ], 5, { source: WB("15") }),
        choice("nts.vocab.c1", "Laura didn't cry or show any emotion. Her expression was ___.", ["distracted", "impassive", "exasperated"], "impassive", { source: WB("17"), he: "impassive = חסר הבעה" }),
        choice("nts.vocab.c2", "Rachel is a true friend. I know I can count on her ___ support at all times.", ["imperious", "impassive", "unwavering"], "unwavering", { source: WB("17"), he: "unwavering = יציב, שאינו מתערער" }),
        choice("nts.vocab.c3", "Jamie's mother refused to buy him an ice-cream. He ___ all afternoon and didn't talk to anyone.", ["sulked", "sneered", "tormented"], "sulked", { source: WB("17"), he: "sulk = לכעוס בשתיקה, להתבכיין" }),
        choice("nts.vocab.c4", "Andy never walked quickly. He always ___ on his way to school and usually arrived late.", ["scampered", "tripped", "dawdled"], "dawdled", { source: WB("17"), he: "dawdle = להתמהמה, לזחול לאט" }),
        choice("nts.vocab.c5", "The fence ___ the garden, and it was completely closed in.", ["skirted", "scurried", "dawdled"], "skirted", { source: WB("17"), he: "skirt = להקיף, ללכת לאורך השוליים" }),
        choice("nts.vocab.c6", "The prisoner was only given bread and slept without blankets. He was ___ by cold and hunger.", ["tormented", "pouted", "deprived"], "tormented", { source: WB("17"), he: "torment = לייסר" }),
        choice("nts.vocab.c7", "Lucy couldn't open the tin. She put a knife under the lid and ___ it off.", ["tripped", "pried", "crocheted"], "pried", { source: WB("17"), he: "pry = לפתוח בכוח (במנוף)" }),
        choice("nts.vocab.c8", "He has been in captivity for 15 years. He has been ___ of his freedom.", ["tormented", "deprived", "extinguished"], "deprived", { source: WB("17"), he: "deprived of = נשלל ממנו" }),
        choice("nts.vocab.c9", "Anne was worried that Shelly wouldn't keep a secret. \"How do I know I can trust her?\" she asked ___.", ["disdainfully", "condescendingly", "dubiously"], "dubiously", { source: WB("17"), he: "dubiously = בספקנות" }),
        choice("nts.vocab.c10", "Tom sprained his ankle. It was so painful that he ___ all the way home.", ["hobbled", "pouted", "stumbled"], "hobbled", { source: WB("17"), he: "hobble = לצלוע" }),
        choice("nts.vocab.c11", "The old woman had ___ hands. Her fingers were wrinkled and twisted with age.", ["imperious", "exasperated", "gnarled"], "gnarled", { source: WB("17"), he: "gnarled = מעוות ומקומט (כמו ענף ישן)" }),
        choice("nts.vocab.c12", "The boy ___ at his parents' view that TV was a bad influence. How could they be so old-fashioned?", ["sulked", "sneered", "pouted"], "sneered", { source: WB("17"), he: "sneer = לגחך בבוז" }),
        choice("nts.vocab.c13", "\"How can you believe in such rubbish?\" he asked me ___.", ["dubiously", "disdainfully", "warily"], "disdainfully", { source: WB("18"), he: "disdainfully = בזלזול" }),
        choice("nts.vocab.c14", "Jenny is very sarcastic. She often makes ___ remarks which offend her friends.", ["impassive", "exasperated", "caustic"], "caustic", { source: WB("18"), he: "caustic = עוקצני, צורב" }),
        choice("nts.vocab.c15", "The ___ drove slowly through the streets carrying the coffin to the cemetery.", ["pitcher", "staccato", "hearse"], "hearse", { source: WB("18"), he: "hearse = רכב לוויה" }),
        choice("nts.vocab.c16", "It was so difficult to choose a library book that I just took one ___.", ["appliquéd", "at random", "impassive"], "at random", { source: WB("18"), he: "at random = באקראי" }),
        choice("nts.vocab.c17", "The striking workers damaged the machines to show how angry they were. This was an act of ___.", ["sabotage", "trousseau", "hoodlum"], "sabotage", { source: WB("18"), he: "sabotage = חבלה" }),
        choice("nts.vocab.c18", "I couldn't find what I wanted in any shop. My patience ran out, and I went home ___.", ["disdainfully", "condescendingly", "exasperated"], "exasperated", { source: WB("18"), he: "exasperated = מתוסכל, שנגמרה לו הסבלנות" }),
        choice("nts.vocab.c19", "Claire thought the short cut was too dark. She looked ___ down the dark path and then went the long way home.", ["condescendingly", "warily", "unwavering"], "warily", { source: WB("18"), he: "warily = בזהירות, בחשדנות" }),
        choice("nts.vocab.c20", "My big brother likes to show that he knows more than I do. When he explains something, he always acts ___.", ["condescendingly", "impassive", "caustic"], "condescendingly", { source: WB("18"), he: "condescendingly = בהתנשאות" }),
      ],
    },
    {
      id: "nts-ame-bre",
      title: "American vs British English",
      subtitle: "Same thing, different word",
      source: WB("16"),
      items: [
        ...matchChunks("nts.amebre.match", "Match the American English word to its British English equivalent.", ameBre, 5, {
          source: WB("16"),
          explanation: "Number the Stars was written in American English; in Britain different words are used for the same things.",
        }),
        mcq("nts.amebre.q1", "In British English, a \"flashlight\" is a…", ["torch", "lantern", "candle", "lamp"], "torch", { source: WB("16") }),
        mcq("nts.amebre.q2", "In British English, an \"apartment\" is a…", ["flat", "house", "block", "lodge"], "flat", { source: WB("16") }),
        mcq("nts.amebre.q3", "In Number the Stars, Kirsti wants pink \"cupcakes\" with \"frosting\". What is frosting in British English?", ["icing", "cream", "jam", "custard"], "icing", { source: WB("16") }),
        mcq("nts.amebre.q4", "A British person would call the \"sidewalk\" the…", ["pavement", "road", "path", "kerb"], "pavement", { source: WB("16") }),
        mcq("nts.amebre.q5", "Which word is American English?", ["truck", "lorry", "porridge", "serviette"], "truck", { source: WB("16") }),
      ],
    },
  ],
};
