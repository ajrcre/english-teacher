import type { UnitInput } from "@/lib/content/schema";
import { boxChoice, match, mcq, open, parseVocab, proofread, typed, vocabItems } from "../helpers";

const WB = (p: string) => `Workbook p. ${p}`;

const elevenBox = ["alley", "skinny", "spit", "raggedy", "itchy", "invisible", "toss", "pretend", "scared", "lap", "hiccups", "squeeze"];

const faceVocab = parseVocab(`
disappear | v | go out of sight; stop existing | להיעלם | When Mr. Wall died, the face on the wall *disappeared*.
curious | adj | strange and unusual | מוזר, משונה | There was a *curious* curve to the nose.
communicate | v | share information with someone | לתקשר, ליצור קשר | "I have a very important reason for wishing to *communicate* with you."
neglect | v | not give enough care or attention to | להזניח | The search became a madness; he *neglected* everything else.
suspicious | adj | thinking that someone may have done something wrong | חשדן | The police began to know him and be *suspicious*.
evidently | adv | clearly; it can be seen that | כנראה, ניכר ש- | *Evidently* he was a rich man.
determined | adj | having decided firmly to do something | נחוש | He was *determined* to cross to France too.
extraordinary | adj | very unusual and surprising | יוצא דופן | "Most *extraordinary*," the listeners said.
remarkable | adj | unusual and worth noticing | מרשים, בולט | The forehead was *remarkable* — the face of a man in a thousand.
connection | n | a link between two things | קשר | Was there a *connection* between the name and the wall?
`);

export const shortStories: UnitInput = {
  id: "short-stories",
  title: "Short Stories",
  tagline: "Seven stories — birthdays, kindness, time travel, wine and a house that keeps going",
  note: "All seven stories are printed in your workbook (pp. 73–110). Read the story first, then practise.",
  accent: "rose",
  lessons: [
    {
      id: "ss-eleven",
      title: "Eleven",
      subtitle: "Sandra Cisneros",
      source: WB("73–77"),
      items: [
        open("ss.eleven.q1", "Where does the story take place?", "At school, in Mrs. Price's classroom.", ["at school / in the classroom"], { source: WB("75") }),
        open("ss.eleven.q2", "Who is the narrator? How old is she?", "Rachel. She is eleven — today is her eleventh birthday.", ["Rachel", "eleven"], { source: WB("75") }),
        open("ss.eleven.q3", "Why is the day special to the narrator?", "It is her birthday.", ["her birthday"], { source: WB("75") }),
        open("ss.eleven.q4", "Why does Mrs. Price give Rachel the sweater?", "Mrs. Price asks whose sweater it is, and Sylvia Saldivar says it belongs to Rachel. Mrs. Price believes her and puts it on Rachel's desk.", ["Sylvia Saldivar said it was Rachel's", "Mrs. Price believed her"], { source: WB("74") }),
        open("ss.eleven.q5", "What does the sweater look like?", "It is red, ugly and old, with stretched-out sleeves; it smells like cottage cheese and is itchy.", ["red", "old / ugly / stretched", "smells bad / itchy"], { source: WB("74") }),
        open("ss.eleven.q6", "What does Rachel plan to do with the sweater at lunchtime?", "Throw it over the schoolyard fence (or leave it hanging there) and get rid of it.", ["throw it over the fence / get rid of it"], { source: WB("74") }),
        open("ss.eleven.q7", "Why doesn't she do what she planned? What happens instead?", "Before lunch, Mrs. Price makes her put the sweater on in front of everyone. Rachel starts to cry like a small child.", ["Mrs. Price makes her put it on", "she cries in front of the class"], { source: WB("74–75") }),
        open("ss.eleven.q8", "How does Rachel finally get rid of the sweater?", "Phyllis Lopez remembers that the sweater is hers, so Rachel takes it off and gives it to her.", ["Phyllis Lopez says it is hers", "Rachel gives it back"], { source: WB("75") }),
        open("ss.eleven.q9", "How does she feel at the end of the story?", "Sad and embarrassed. Her birthday is spoiled; she wishes she were 102 and that the day were far away.", ["sad / humiliated", "her birthday is spoiled", "wants the day to be far away"], { source: WB("75") }),
        open("ss.eleven.q10", "According to Rachel, how is growing older like an onion or a tree with rings?", "Each new year grows around the years before it, so you are still all your younger ages inside — that's why at eleven you can still feel and act like you're three.", ["each year is a layer around the others", "your younger ages are still inside you"], { source: WB("73–75"), difficulty: 2 }),
        ...[
          ["A ___ is a part of the body that you only have when you are sitting down.", "lap"],
          ["To get juice from a lemon, you have to ___ the lemon.", "squeeze"],
          ["Children often get ___ when they hear stories about ghosts.", "scared"],
          ["The red sweater wasn't comfortable because it felt ___.", "itchy"],
          ["The red sweater looked old and ___.", "raggedy"],
          ["People who don't eat much are often ___.", "skinny"],
          ["With a microscope we can see many things that seem ___ to our eyes.", "invisible"],
          ["Rachel wanted to ___ the sweater over the fence.", "toss"],
          ["In cities, some buildings have an ___ between them.", "alley"],
          ["The water in our mouths is called ___.", "spit"],
          ["One way to stop ___ is to drink water and hold your breath.", "hiccups"],
          ["Rachel couldn't ___ that she felt OK.", "pretend"],
        ].map(([s, w], i) => boxChoice(`ss.eleven.v${i + 1}`, s, elevenBox, w, { source: WB("76") })),
        typed("ss.eleven.wf1", "Word forms: what is the adjective form of \"sadness\"?", "sad", { source: WB("76") }),
        typed("ss.eleven.wf2", "Word forms: what is the adverb form of \"sadness\"?", "sadly", { source: WB("76") }),
        typed("ss.eleven.wf3", "Word forms: what is the adjective form of \"stupidity\"?", "stupid", { source: WB("76") }),
        typed("ss.eleven.wf4", "Word forms: what is the adverb form of \"loudness\"?", "loudly", { source: WB("76") }),
        typed("ss.eleven.wf5", "Word forms: what adjective comes from the verb \"to scare\"? (how you feel)", ["scared", "scary"], { source: WB("76") }),
        typed("ss.eleven.wf6", "Word forms: what adjective comes from \"itch\"?", "itchy", { source: WB("76") }),
        typed("ss.eleven.wf7", "Word forms: what adjective comes from \"smell\"? (something that smells bad)", "smelly", { source: WB("76") }),
        typed("ss.eleven.wf8", "Complete with a form of \"wish\": Tina ___ she could be famous right away.", "wishes", { source: WB("76"), allowTypo: false }),
        ...[
          ["___ what I tell Mama when she's sad.", "That's", "That is"],
          ["I would've known how to tell her it ___ mine.", "wasn't", "was not"],
          ["___ maybe a thousand years old.", "It's", "It is"],
          ["Even if it belonged to me I ___ say so.", "wouldn't", "would not"],
          ["Maybe because ___ skinny, Sylvia says it belongs to me.", "I'm", "I am"],
          ["Maybe because she ___ like me…", "doesn't", "does not"],
          ["\"That's not, I ___ … you're not … Not mine,\" I finally say.", "don't", "do not"],
          ["The red ___ still sitting there like a big red mountain.", "sweater's", "sweater is"],
          ["___ a cake Mama's making for tonight.", "There's", "There is"],
          ["___ be candles and presents and everybody will sing.", "There'll", "There will"],
        ].map(([sentence, ans, full], i) =>
          typed(`ss.eleven.ct${i + 1}`, `Write the contraction for “${full}”.`, ans, {
            sentence,
            source: WB("77"),
            allowTypo: false,
            explanation: "An apostrophe replaces the letters that are left out.",
          }),
        ),
        mcq("ss.eleven.rbl1", "Rachel wishes she was 102 because…", ["at that age school and teachers like Mrs. Price would be far in the past.", "at that age she wouldn't have an 11-year-old inside her.", "at that age she would have many older ages inside her, and would know what to say."], "at that age she would have many older ages inside her, and would know what to say.", { source: WB("77"), difficulty: 2 }),
        mcq("ss.eleven.rbl2", "In the end, when Phyllis has the sweater, Mrs. Price pretends everything is OK because…", ["she doesn't want Rachel to be upset.", "she doesn't want to admit she made a mistake.", "she doesn't want her class to be late for lunch."], "she doesn't want to admit she made a mistake.", { source: WB("77"), difficulty: 2 }),
      ],
    },
    {
      id: "ss-thank-you-maam",
      title: "Thank You, Ma'am",
      subtitle: "Langston Hughes",
      source: WB("78–81"),
      items: [
        open("ss.tym.q1", "How old do you think Mrs. Jones is? Why?", "Any reasonable estimate with a reason — e.g. middle-aged or older (around 50–60): she is a large, strong woman with a job, who says she was young once.", ["gives an age", "gives a reason from the story"], { source: WB("80") }),
        open("ss.tym.q2", "How does Mrs. Jones feel about Roger? Is she angry at him? Does she like him?", "At first she is angry because he tried to steal her purse, but she quickly feels sorry for him, cares about him and wants to help him.", ["angry at first", "then caring / likes him / wants to help"], { source: WB("80") }),
        open("ss.tym.q3", "At what point does Mrs. Jones show that she cares about Roger?", "When she asks if he has had supper and takes him home to wash his face and eat — and when she tells him she also did things she isn't proud of.", ["she asks if he's hungry / takes him home", "washes his face / feeds him"], { source: WB("80") }),
        open("ss.tym.q4", "Describe Roger's physical appearance.", "He is about 14 or 15, thin and weak (frail and willow-wild), wearing tennis shoes and blue jeans, with a dirty face.", ["young teenager (14–15)", "thin / frail", "dirty face / jeans and tennis shoes"], { source: WB("79") }),
        open("ss.tym.q5", "Describe his behavior.", "He tries to snatch her purse and falls. At first he is scared and wants to escape, but later he doesn't run away when he could, sits where she can see him, and offers to go to the store — he wants to be trusted.", ["tries to steal, then is afraid", "later doesn't run away", "wants to be trusted / offers help"], { source: WB("79–80") }),
        open("ss.tym.q6", "How does Mrs. Jones treat Roger at first? How does her behavior change?", "At first she kicks him, shakes him and drags him home in a half nelson. Later she is kind: she lets him wash, feeds him, talks to him without embarrassing him and gives him ten dollars for shoes.", ["rough at first (kicks, drags him)", "then kind: food, washing, ten dollars"], { source: WB("79–80") }),
        open("ss.tym.q7", "Find an example that shows Mrs. Jones understands Roger very well.", "For example: \"I were young once and I wanted things I could not get\"; she doesn't ask about his family so as not to embarrass him; she knows he wanted the money for blue suede shoes.", ["quotes or describes a fitting example"], { source: WB("80") }),
        proofread(
          "ss.tym.edit",
          "Edit this paragraph: correct the mistakes in grammar, spelling and punctuation.",
          "I think mrs Jones teached the boy a good lesson she could of reported him to Police but instead she decided she would taught him a lesson herself. The boy who was lucky she was a good-hearted person done wrong when he stealed her purse. I bet he didn't espect this old lady to be strong enuf to knock him over and drag him to her house and he was afraid to run away and also he liked her. She cared more for him then his own family. The boy was lucky to meet someone like mrs jones.",
          "I think Mrs. Jones taught the boy a good lesson. She could have reported him to the police, but instead she decided she would teach him a lesson herself. The boy, who was lucky she was a good-hearted person, did wrong when he tried to steal her purse. I bet he didn't expect this old lady to be strong enough to knock him over and drag him to her house. He was afraid to run away, and also he liked her. She cared more for him than his own family did. The boy was lucky to meet someone like Mrs. Jones.",
          ["mrs → Mrs. (capital, twice)", "teached → taught", "could of → could have", "Police → the police", "would taught → would teach", "done wrong → did wrong", "stealed → stole / tried to steal", "espect → expect", "enuf → enough", "then → than", "split the run-on sentences"],
          { source: WB("81"), difficulty: 3 },
        ),
      ],
    },
    {
      id: "ss-the-choice",
      title: "The Choice",
      subtitle: "Wayland Hilton-Young",
      source: WB("82–83"),
      items: [
        open("ss.choice.q1", "How long was Williams gone from the room? How long do you think he stayed in the future?", "He was gone for no time at all — he landed back the very second he had left. In the future he may have stayed a long time (any reasonable guess).", ["no time / the same second", "a guess about time in the future"], { source: WB("82") }),
        open("ss.choice.q2", "Why do you think Williams decided to forget what he saw?", "Any reasonable idea, e.g. what he saw was frightening or sad, or knowing the future would spoil his life.", ["gives a reasonable reason"], { source: WB("83") }),
        open("ss.choice.q4", "Why does Williams take a camera and a tape recorder?", "To record what he saw in the future and bring back proof (he also learned shorthand to take notes).", ["to record / bring back evidence"], { source: WB("82") }),
        open("ss.choice.q5", "Who is the narrator of the story?", "Williams's friend, who waited for him to come back.", ["Williams's friend"], { source: WB("82") }),
        open("ss.choice.q6", "What might the author want you to think about the future by ending the story this way?", "That some things about the future might be better not to know — and to wonder what Williams saw.", ["maybe it's better not to know the future", "makes the reader wonder"], { source: WB("83"), difficulty: 2 }),
        open("ss.choice.q8", "There are two mysteries in this story. What are they?", "What Williams saw in the future, and why he chose not to remember it.", ["what he saw", "why he chose to forget"], { source: WB("83") }),
        mcq("ss.choice.m1", "What did the narrator and Williams prepare for his return?", ["Coffee, brandy and glasses", "A camera and a notebook", "A big dinner", "A newspaper"], "Coffee, brandy and glasses", { source: WB("82") }),
        mcq("ss.choice.m2", "What was on the camera and recorder when Williams came back?", ["Nothing — the camera was still at 1 and the tape wasn't loaded", "Hundreds of photographs", "A recording of voices", "A map of the future"], "Nothing — the camera was still at 1 and the tape wasn't loaded", { source: WB("82") }),
      ],
    },
    {
      id: "ss-watery-place",
      title: "The Watery Place",
      subtitle: "Isaac Asimov",
      source: WB("84–90"),
      items: [
        match("ss.watery.meant", "What did the visitors from Venus really MEAN?", [
          ["\"your people\"", "Earthmen"],
          ["\"you are the leader here\"", "the head of Earth"],
          ["\"to assume your appearance\"", "to look human"],
          ["\"We have also learned your language\"", "learned to speak as humans do"],
          ["\"Foreigners? Indeed we are.\"", "from outer space"],
          ["\"joining our great organization\"", "becoming part of an Inter-World Federation"],
          ["\"You wish us to leave?\"", "to leave Earth"],
        ], { source: WB("89") }),
        match("ss.watery.understood", "What did Sheriff Cameron UNDERSTAND?", [
          ["\"your people\"", "your family and relatives"],
          ["\"you are the leader here\"", "the sheriff"],
          ["\"to adopt your mode of dress\"", "to dress as if from the upper classes"],
          ["\"We have also learned your language\"", "learned English"],
          ["\"Foreigners? Indeed we are.\"", "from a different country, in Europe perhaps"],
          ["\"joining our great organization\"", "becoming members of some European group"],
          ["\"You wish us to leave?\"", "to go and bother someone else"],
        ], { source: WB("89") }),
        match("ss.watery.expressions", "Match each expression to its meaning.", [
          ["knock off", "stop working"],
          ["hit the sack", "go to sleep"],
          ["be taken up by", "be busy with"],
          ["spit it out", "say what you have to"],
          ["catch sight of", "see suddenly"],
          ["get out", "go away"],
        ], { source: WB("90"), he: "hit the sack = ללכת לישון · spit it out = תגיד כבר · knock off = לסיים לעבוד" }),
        open("ss.watery.q1", "Why didn't Sheriff Cameron pay attention to the visitors?", "It was April 14 and he was busy and angry doing his complicated income tax forms.", ["busy with his income tax", "impatient / bad mood"], { source: WB("84–85") }),
        open("ss.watery.q2", "What is \"the watery place\", and what did Cameron think it was?", "The visitors meant Venus, but Cameron thought they meant Venice in Italy — so he thought they were Italian foreigners.", ["they meant Venus", "Cameron thought Venice / Italy"], { source: WB("87") }),
        open("ss.watery.q3", "What is the result of Cameron's mistake?", "The visitors leave and promise never to return. They put a fence (a warning) around Earth, so humans will never have space travel or meet other worlds.", ["the aliens leave forever", "Earth is fenced off / no space travel"], { source: WB("86–87") }),
        open("ss.watery.q4", "Why didn't the narrator (the deputy) do anything while the visitors were in the office?", "He was so shocked and scared that he couldn't move or speak; he only got his voice back after they left.", ["shocked / scared", "couldn't move or speak"], { source: WB("84–87") }),
      ],
    },
    {
      id: "ss-face-on-the-wall",
      title: "The Face on the Wall",
      subtitle: "E. V. Lucas",
      source: WB("91–93"),
      items: [
        open("ss.face.q1", "What did the little man see on his bedroom wall?", "A damp patch that looked exactly like a human face — and it never changed shape.", ["a damp patch shaped like a face", "it didn't change"], { source: WB("91") }),
        open("ss.face.q2", "What did he do after he recovered from the flu?", "He searched everywhere for the real man with that face — at meetings, football matches and stations — until the police became suspicious.", ["searched crowds for the man", "neglected everything else"], { source: WB("91–92") }),
        open("ss.face.q3", "How did he finally meet the man?", "He saw him in a taxi in Piccadilly, followed him to Charing Cross station and onto the boat to France, and asked him for his card.", ["followed his taxi", "to the station / the boat", "asked for his card"], { source: WB("92") }),
        open("ss.face.q4", "Why did he faint when he read the card?", "The man's name was Ormond Wall — like Great Ormond Street and the wall where the face appeared.", ["the name was Ormond Wall", "it matched the street and the wall"], { source: WB("92") }),
        open("ss.face.q5", "What happened to the face when Mr. Wall had his accident?", "It faded and then disappeared completely at the moment he died.", ["it faded", "disappeared when he died"], { source: WB("93") }),
        open("ss.face.q6", "What was the third extraordinary thing about the story?", "He had made the whole story up half an hour earlier.", ["he invented the story"], { source: WB("93") }),
        ...vocabItems("ss.face.vocab", faceVocab, WB("93")),
      ],
    },
    {
      id: "ss-taste",
      title: "Taste",
      subtitle: "Roald Dahl",
      source: WB("94–106"),
      items: [
        open("ss.taste.q1", "Who is the narrator?", "A guest at the dinner — Mike's friend, who came with his wife.", ["a guest / Mike's friend"], { source: WB("94") }),
        open("ss.taste.q2", "Where does the dinner take place?", "At Mike Schofield's house in London.", ["Mike Schofield's house", "London"], { source: WB("94") }),
        open("ss.taste.q3", "What is the host's job? How does he feel about it?", "He is a stockbroker. He seems embarrassed, almost ashamed, to have made so much money with so little talent.", ["stockbroker", "embarrassed / ashamed"], { source: WB("95") }),
        open("ss.taste.q4", "What is Richard Pratt's favourite thing?", "Wine (and fine food) — he is a famous gourmet.", ["wine / food", "a gourmet"], { source: WB("94") }),
        open("ss.taste.q5", "Explain the bet that usually takes place between Mike and Richard. Who usually wins?", "Mike bets Richard a case of the wine that he can't name the claret and its year. Richard has won both times before.", ["guess the wine and its year", "a case of wine", "Richard wins"], { source: WB("95") }),
        open("ss.taste.q7", "How does Richard eat his fish and drink his wine? What is strange about this?", "He ignores his food while talking to Louise, then eats the fish very quickly and drinks the special wine in two quick swallows — strange for a gourmet who should taste it slowly.", ["he eats fast / gulps the wine", "not like a gourmet"], { source: WB("96") }),
        open("ss.taste.q8", "What is unusual about the bet this time? What are the stakes?", "Richard asks for the hand of Mike's daughter Louise in marriage; Mike stakes her against Richard's two houses.", ["Louise's hand in marriage", "against Richard's two houses"], { source: WB("98–99") }),
        open("ss.taste.q9", "Who wins the bet? What would this mean for Louise?", "Richard names the wine correctly (Château Branaire-Ducru 1934), so it seems he wins — Louise would have to marry him.", ["Richard guesses correctly", "Louise would have to marry him"], { source: WB("104–105") }),
        open("ss.taste.q10", "What did Richard leave in the study? How do we know?", "His spectacles. The maid brings them and says she found them on the green filing cabinet in Mr. Schofield's study, where he went alone before dinner.", ["his glasses / spectacles", "the maid found them on the filing cabinet in the study"], { source: WB("105") }),
        open("ss.taste.q11", "Why is this important? What does it tell us about Richard?", "The wine bottle was in the study. It shows Richard went in secretly and looked at the label — he cheated. He is dishonest.", ["he saw the bottle earlier", "he cheated / is dishonest"], { source: WB("105"), difficulty: 2 }),
        open("ss.taste.q12", "Explain the last sentence: \"Keep calm now, Michael, dear! Keep calm!\"", "Mike realizes Richard cheated and becomes furious — he looks like he might attack him — so his wife tries to calm him down.", ["Mike is furious / about to explode", "his wife tries to calm him"], { source: WB("105") }),
        typed("ss.taste.f1", "Find the word in the story that means \"expert on food\".", "gourmet", { source: WB("94"), he: "gourmet = אנין טעם" }),
        typed("ss.taste.f2", "Find the word Mike uses that means \"to destroy the taste of\" (a Rhine wine will ___ a delicate claret).", "kill", { source: WB("95") }),
        typed("ss.taste.f3", "Find the phrase that means \"to renege\" (to break a promise or an offer).", ["go back on", "go back on your offer"], { source: WB("98") }),
        typed("ss.taste.f4", "Find the phrase that describes the maid: \"employed by the family for many years\".", ["family retainer", "a faithful family retainer"], { source: WB("105") }),
      ],
    },
    {
      id: "ss-soft-rains",
      title: "There Will Come Soft Rains",
      subtitle: "Ray Bradbury",
      source: WB("107–110"),
      items: [
        open("ss.rains.q1", "How do you think Ray Bradbury feels about technology?", "He is worried about it: the clever house keeps working perfectly, but technology (nuclear war) has destroyed the people it was built for — it can't replace humans and can lead to destruction.", ["critical / worried", "technology goes on without people", "it destroyed humanity"], { source: WB("110"), difficulty: 2 }),
        open("ss.rains.q2", "In what ways does the house seem like a person?", "It talks, sings the time, cooks, cleans, reads poems, protects itself like a nervous old woman, and at the end it 'fights' the fire and 'dies' with voices crying out.", ["it speaks / sings", "it has routines and feelings", "it fights and 'dies'"], { source: WB("110") }),
        open("ss.rains.q3", "Why do you think Bradbury used the poem in his story?", "The poem says nature will go on and won't care if humans destroy themselves — exactly what has happened.", ["nature continues without humans", "matches the story's message"], { source: WB("110"), difficulty: 2 }),
        open("ss.rains.q4", "What has happened to the people who lived in the house?", "They were killed by a nuclear explosion; only their silhouettes are burned onto the west wall of the house.", ["killed in a nuclear blast", "silhouettes on the wall"], { source: WB("108") }),
        open("ss.rains.q5", "What are the \"soft rains\" falling outside?", "The garden sprinklers (and the radioactive dust/rain over the ruined city) — rain with no one left to enjoy it.", ["sprinklers / radioactive rain", "no one is left"], { source: WB("110"), difficulty: 2 }),
        mcq("ss.rains.m1", "Where and when does the story take place?", ["Allendale, California, August 2026", "London, April 1956", "Twin Gulch, Idaho, 1956", "Copenhagen, 1943"], "Allendale, California, August 2026", { source: WB("107") }),
        mcq("ss.rains.m2", "What happens to the family dog?", ["It comes home starving and sick, and dies", "It runs away", "It saves the house from the fire", "It reads a poem"], "It comes home starving and sick, and dies", { source: WB("108") }),
        mcq("ss.rains.m3", "What are the last words of the story?", ["\"Today is August 5, 2026\"", "\"Tick-tock, seven o'clock\"", "\"Fire! Fire!\"", "\"There will come soft rains\""], "\"Today is August 5, 2026\"", { source: WB("110") }),
      ],
    },
  ],
};
