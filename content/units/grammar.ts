import type { ItemInput, UnitInput } from "@/lib/content/schema";
import { choice, mcq, proofread, rewrite, sort, typed, verbGap } from "../helpers";

const WB = (p: string) => `Workbook p. ${p}`;

/** Accept the full form and the usual contractions ("is not" ↔ "isn't", "will not" ↔ "won't" …). */
function forms(answer: string): string[] {
  const out = new Set([answer]);
  const pairs: [RegExp, string][] = [
    [/\bis not\b/, "isn't"],
    [/\bare not\b/, "aren't"],
    [/\bdo not\b/, "don't"],
    [/\bdoes not\b/, "doesn't"],
    [/\bdid not\b/, "didn't"],
    [/\bwas not\b/, "wasn't"],
    [/\bwere not\b/, "weren't"],
    [/\bwill not\b/, "won't"],
    [/\bcannot\b/, "can't"],
  ];
  for (const [re, short] of pairs) {
    if (re.test(answer)) out.add(answer.replace(re, short));
    const long = re.source.replace(/\\b/g, "");
    if (answer.includes(short)) out.add(answer.replace(short, long));
  }
  return [...out];
}

const gap = (id: string, sentence: string, answer: string | string[], source: string, he?: string): ItemInput =>
  verbGap(id, sentence, (Array.isArray(answer) ? answer : [answer]).flatMap(forms), { source, he });

/** Present simple vs. progressive (p. 141). */
const presentChoice: ItemInput[] = (
  [
    ["Listen! The crowd ___.", ["cheers", "is cheering"], "is cheering", "Listen! = it is happening now → present progressive"],
    ["He rarely ___ in exams.", ["succeeds", "is succeeding"], "succeeds", "rarely = a habit → present simple"],
    ["They ___ abroad every summer.", ["travel", "are travelling"], "travel", "every summer = a routine → present simple"],
    ["They ___ for the show now.", ["rehearse", "are rehearsing"], "are rehearsing", "now → present progressive"],
    ["That judge usually ___ a hard sentence.", ["gives", "is giving"], "gives", "usually → present simple"],
    ["Policemen ___ traffic right now.", ["direct", "are directing"], "are directing", "right now → present progressive"],
    ["Earthquakes often ___ damage.", ["cause", "are causing"], "cause", "a general fact → present simple"],
    ["The film crew ___ today's race.", ["photographs", "is photographing"], "is photographing", "today = happening now → present progressive"],
    ["The Cohen family frequently ___ visitors.", ["has", "is having"], "has", "frequently → present simple"],
    ["Listen! The weather reporter ___ more rain.", ["forecasts", "is forecasting"], "is forecasting", "Listen! → present progressive"],
  ] as [string, string[], string, string][]
).map(([s, o, r, why], i) => choice(`gr.pres.c${i + 1}`, s, o, r, { prompt: "Choose the correct verb form.", source: WB("141"), explanation: why }));

const halloween: [string, string | string[]][] = [
  ["Halloween is my favourite holiday. I ___ (look forward to) it every year.", "look forward to"],
  ["It is a holiday that Americans ___ (celebrate) every autumn.", "celebrate"],
  ["The children ___ (dress up) in costumes.", "dress up"],
  ["They ___ (have) a lot of fun choosing what they are going to wear.", "have"],
  ["They also ___ (wear) scary masks.", "wear"],
  ["There are plenty of masks in the shops, but some children ___ (enjoy) making their own.", "enjoy"],
  ["They ___ (go) to neighbours' homes…", "go"],
  ["…and ___ (ask for) treats.", "ask for"],
  ["People always ___ (give) something special to the children.", "give"],
  ["It is Halloween today. Some children ___ (decorate) pumpkins…", "are decorating"],
  ["…and ___ (make) faces on them.", "are making"],
  ["They ___ (work) very hard.", "are working"],
  ["Children ___ (love) Halloween.", "love"],
];

const saraCake: [string, string | string[]][] = [
  ["Sara always ___ (bake) the same cake.", "bakes"],
  ["Her children ___ (like) only chocolate cake…", "like"],
  ["…so she ___ (bake) one every Friday afternoon.", "bakes"],
  ["This week she ___ (want) a change.", "wants"],
  ["So she ___ (bake) a different cake.", "is baking"],
  ["Look! Her children ___ (come) into the house.", "are coming"],
  ["One of them ___ (say): \"Hey, Mom…\"", ["says", "is saying"]],
  ["\"…I ___ (smell) something strange.\"", "smell"],
  ["\"What ___ (go) on?\"", "is going"],
  ["But Sara ___ (not answer) him.", "is not answering"],
  ["She ___ (want) it to be a surprise.", "wants"],
];

const presentMixed: [string, string | string[]][] = [
  ["I usually ___ (go) to school by bus…", "go"],
  ["…but today my father ___ (drive) me to school in his car…", "is driving"],
  ["…because it ___ (rain) and it is very cold.", "is raining"],
  ["She usually ___ (do) that when she washes the dishes.", "does"],
  ["A lot of people ___ (buy) television sets now because the prices are going down.", "are buying"],
  ["Mark never ___ (swim) in the sea…", "swims"],
  ["…but today he ___ (swim) there because they are cleaning the pool.", "is swimming"],
  ["I ___ (hope) she understands the new material.", "hope"],
  ["Once a week we ___ (meet) in Danny's house.", "meet"],
  ["Today we ___ (do) something special.", "are doing"],
  ["I ___ (think) Ron lives in Ramat Gan nowadays, but I'm not sure.", "think"],
  ["Thank you, but I ___ (not need) your help any more.", "do not need"],
  ["Riki ___ (work) hard every day.", "works"],
  ["Today she ___ (have) a day off.", "is having"],
  ["Dana ___ (take) her medicine now…", "is taking"],
  ["…but I can see she ___ (hate) it.", "hates"],
  ["Dan ___ (try) to find a solution. He is thinking hard.", "is trying"],
  ["\"What time ___ you usually ___ (have) supper?\" (write both words: e.g. do … have)", ["do have", "do … have", "do...have", "do ... have"]],
  ["\"I always ___ (have) supper at 8:00.\"", "have"],
  ["\"Some people ___ (not have) supper at all.\"", "do not have"],
];

const pastSimple: [string, string | string[]][] = [
  ["Sara ___ (bring) me some flowers last night.", "brought"],
  ["They ___ (be) beautiful roses.", "were"],
  ["She ___ (not pay) much for them.", "did not pay"],
  ["Sara also ___ (send) some flowers to Hanna last week.", "sent"],
  ["She ___ (hear) that Hanna was sick.", "heard"],
  ["She ___ (want) to make her feel happy.", "wanted"],
  ["We ___ (find) a little bird in the garden yesterday.", "found"],
  ["It ___ (look) sick…", "looked"],
  ["…so we ___ (feed) it some bread and water.", "fed"],
  ["We ___ (not want) it to die.", "did not want"],
  ["We ___ (build) a box for it…", "built"],
  ["…but last night it ___ (fly) away.", "flew"],
  ["We ___ (see) that it wasn't in the box.", "saw"],
  ["I ___ (forget) to go to the store last night.", "forgot"],
  ["My mother ___ (tell) me to buy some bread.", "told"],
  ["…but I ___ (not remember) what she asked me to buy.", "did not remember"],
  ["…so we ___ (eat) breakfast without bread.", "ate"],
  ["Dora ___ (close) the door of her room last night.", "closed"],
  ["She ___ (put) her books on the table.", "put"],
  ["Soon afterwards she ___ (feel) hungry.", "felt"],
  ["She ___ (make) herself a few sandwiches…", "made"],
  ["…and ___ (take) them to her room.", "took"],
  ["A few minutes later she ___ (run) back to the kitchen.", "ran"],
];

const pastMixed: [string, string][] = [
  ["The boys ___ (play) football when the bell rang.", "were playing"],
  ["The boys were playing football when the bell ___ (ring).", "rang"],
  ["They were already sitting in class when the teacher ___ (walk) in.", "walked"],
  ["When Eran ___ (arrive), the boys were listening quietly.", "arrived"],
  ["When Eran arrived, the boys ___ (listen) quietly to the teacher.", "were listening"],
  ["…the teacher, who ___ (explain) something to them.", "was explaining"],
  ["Eran said something funny while he ___ (read) his homework.", "was reading"],
  ["Itamar ___ (sit) next to Eran when this happened.", "was sitting"],
];

/** Future: main clause with will, time clause in the present simple (p. 152). */
const futureItems: ItemInput[] = (
  [
    ["Gilad ___ as soon as it ___ raining.", "will leave / stops", ["leaves / will stop", "will leave / will stop"]],
    ["We ___ you up as soon as you ___ ready to leave.", "will pick / are", ["pick / will be", "will pick / will be"]],
    ["My boyfriend says he ___ me go until I ___ him what happened.", "won't let / tell", ["doesn't let / will tell", "won't let / will tell"]],
    ["You ___ surprised when you ___ her story.", "will be / hear", ["are / will hear", "will be / will hear"]],
    ["I ___ you back the book as soon as you ___ for it.", "will give / ask", ["give / will ask", "will give / will ask"]],
    ["The car ___ fixed by the time you ___ work.", "will be / finish", ["is / will finish", "will be / will finish"]],
    ["She ___ it when she ___ it with her own eyes.", "will believe / sees", ["believes / will see", "will believe / will see"]],
    ["Phillip ___ you the joke before he ___.", "will tell / leaves", ["tells / will leave", "will tell / will leave"]],
    ["The apartment ___ empty till we ___ from our holiday.", "will stay / return", ["stays / will return", "will stay / will return"]],
    ["Michael ___ lunch when he ___ serving these customers.", "will eat / finishes", ["eats / will finish", "will eat / will finish"]],
    ["The teacher ___ back the tests once she ___ them.", "will give / corrects", ["gives / will correct", "will give / will correct"]],
    ["We ___ you about the matter as soon as we ___ home.", "will tell / get", ["tell / will get", "will tell / will get"]],
    ["She ___ you when she ___ time.", "will help / has", ["helps / will have", "will help / will have"]],
    ["Danny and Linda ___ plums until the summer ___.", "will eat / ends", ["eat / will end", "will eat / will end"]],
  ] as [string, string, string[]][]
).map(([s, right, wrong], i) =>
  mcq(`gr.fut.m${i + 1}`, "Choose the correct verbs for the two blanks.", [right, ...wrong].sort(), right, {
    sentence: s,
    source: WB("152"),
    explanation: "After when / as soon as / until / before / once, use the present simple — even about the future. The main clause uses will.",
    he: "במשפט זמן (when, as soon as, until) משתמשים בהווה פשוט גם על העתיד",
  }),
);
futureItems.push(
  gap("gr.fut.g1", "Please wait here until the doctor ___ (arrive).", "arrives", WB("152")),
  gap("gr.fut.g2", "Wait until the bell ___ (ring).", "rings", WB("152")),
  gap("gr.fut.g3", "You should wait until the police ___ (arrive).", "arrive", WB("152")),
  mcq("gr.fut.m-will", "Which form do we use to make a prediction about the future?", ["will", "be going to", "present progressive"], "will", { source: WB("151"), sentence: "I ___ pass my driving test first time round." }),
  mcq("gr.fut.m-going", "Which form do we usually use for plans we have already made?", ["be going to", "will", "past simple"], "be going to", { source: WB("151"), sentence: "We're ___ the beach tomorrow." }),
);

/** Comparative and superlative forms (p. 155). */
const comparisonForms: [string, string, string][] = [
  ["ugly", "uglier", "ugliest"],
  ["attractive", "more attractive", "most attractive"],
  ["famous", "more famous", "most famous"],
  ["fat", "fatter", "fattest"],
  ["bad", "worse", "worst"],
  ["busy", "busier", "busiest"],
  ["expensive", "more expensive", "most expensive"],
  ["determined", "more determined", "most determined"],
  ["painful", "more painful", "most painful"],
  ["wonderful", "more wonderful", "most wonderful"],
  ["cruel", "crueller", "cruellest"],
  ["heavy", "heavier", "heaviest"],
  ["dry", "drier", "driest"],
  ["horrible", "more horrible", "most horrible"],
  ["happy", "happier", "happiest"],
  ["big", "bigger", "biggest"],
  ["rich", "richer", "richest"],
  ["grey", "greyer", "greyest"],
];

const comparisonItems: ItemInput[] = comparisonForms.map(([adj, c, s], i) => {
  const variants = [`${c}, ${s}`, `${c} ${s}`, `${c} / ${s}`, `${c}, the ${s}`, `${c} the ${s}`];
  if (adj === "cruel") variants.push("crueler, cruelest", "crueler cruelest", "more cruel, most cruel");
  return typed(`gr.comp.f${i + 1}`, `Write the comparative and superlative of “${adj}” (e.g. small → smaller, smallest).`, variants, {
    source: WB("155"),
    allowTypo: false,
    explanation: `${adj} → ${c} → ${s}`,
  });
});

const comparisonGaps: [string, string[]][] = [
  ["Yael is ___ girl in the class. (clever)", ["the cleverest", "the most clever"]],
  ["Ben is ___ than his brother. (fat)", ["fatter"]],
  ["My parents are ___ people in the world. (understanding)", ["the most understanding"]],
  ["This movie is ___ than the one we saw last week. (disappointing)", ["more disappointing"]],
  ["Mr. Levi is ___ teacher I have ever met. (bad)", ["the worst"]],
  ["I am ___ than you. (short)", ["shorter"]],
  ["Mrs. Smith is ___ woman I know. (busy)", ["the busiest"]],
  ["My socks are ___ than yours. (white)", ["whiter"]],
  ["The Bible is ___ book for the Jews. (important)", ["the most important"]],
  ["This is ___ cake I have ever seen. (big)", ["the biggest"]],
];

const comparisonRewrites: [string, string, string[]][] = [
  ["Today is hot. Yesterday was hotter.", "Today is not", ["Today is not as hot as yesterday.", "Today is not as hot as yesterday was.", "Today isn't as hot as yesterday."]],
  ["My teacher is good but he can't be compared with yours.", "Your teacher", ["Your teacher is better than mine.", "Your teacher is better than my teacher."]],
  ["Doron's homework assignment was good but it couldn't be compared with mine.", "My homework", ["My homework was better than Doron's.", "My homework was better than Doron's homework."]],
  ["I have many friends but not as many as you have.", "You have", ["You have more friends than I have.", "You have more friends than me.", "You have more friends than I do."]],
  ["I eat a lot of chocolate, but not as much as you eat.", "You eat", ["You eat more chocolate than I do.", "You eat more chocolate than me.", "You eat more chocolate than I eat."]],
  ["The show we saw last week was bad but not as bad as the one we saw yesterday.", "The show we saw yesterday", ["The show we saw yesterday was worse than the one we saw last week.", "The show we saw yesterday was worse than the show we saw last week."]],
  ["You arrived late, but I arrived even later.", "You did not arrive", ["You did not arrive as late as I did.", "You did not arrive as late as me."]],
  ["My lawyer is clever. Your lawyer is not as clever.", "My lawyer is", ["My lawyer is cleverer than yours.", "My lawyer is cleverer than your lawyer.", "My lawyer is more clever than yours."]],
  ["My car was expensive. Your car was cheaper.", "Your car is not", ["Your car is not as expensive as mine.", "Your car is not as expensive as my car."]],
  ["Living in an igloo is less convenient than any other style of living.", "Living in an igloo is the", ["Living in an igloo is the least convenient style of living.", "Living in an igloo is the least convenient way of living."]],
];

const symbolRewrites: [string, string, string[]][] = [
  ["(+) Miri / short / Amir", "+ means “more … than”", ["Miri is shorter than Amir."]],
  ["(=) Rinat / tall / her sister", "= means “as … as”", ["Rinat is as tall as her sister."]],
  ["(≠) I / smart / my girlfriend", "≠ means “not as … as”", ["I am not as smart as my girlfriend.", "I'm not as smart as my girlfriend."]],
  ["(Ω) Sigal / good pupil / our class", "Ω means “the most … / the …est”", ["Sigal is the best pupil in our class."]],
  ["(+) My teacher / bad / yours", "+ means “more … than”", ["My teacher is worse than yours."]],
  ["(Ω) Dana / intelligent / all my friends", "Ω means “the most …”", ["Dana is the most intelligent of all my friends."]],
  ["(+) Your composition / interesting / mine", "+ means “more … than”", ["Your composition is more interesting than mine."]],
  ["(≠) We / rich / your family", "≠ means “not as … as”", ["We are not as rich as your family.", "We aren't as rich as your family."]],
];

/** Plurals sort (p. 138): three groups of nouns. */
const plurals1 = sort("gr.plur.s1", "How does each noun make its plural? Sort them.", {
  "-s": ["key", "toy", "stamp", "tree"],
  "-es": ["box", "glass", "dish"],
  "-ies": ["cherry", "story"],
  "-ves": ["knife", "shelf"],
  irregular: ["child"],
}, { source: WB("137–138") });
const plurals2 = sort("gr.plur.s2", "How does each noun make its plural? Sort them.", {
  "-s": ["day", "orange", "pencil", "shoe"],
  "-es": ["sandwich", "potato", "tomato"],
  "-ves": ["scarf"],
  irregular: ["mouse", "foot", "sheep", "fish"],
}, { source: WB("137–138"), explanation: "Sheep and fish stay the same in the plural; mouse → mice, foot → feet." });

const pluralTyped: [string, string[], string][] = [
  ["potato", ["potatoes"], "consonant + o → usually -es (potato, tomato, hero, volcano)"],
  ["country", ["countries"], "consonant + y → -ies"],
  ["journey", ["journeys"], "vowel + y → just add -s"],
  ["life", ["lives"], "some words in -f/-fe → -ves"],
  ["roof", ["roofs"], "exception: roof → roofs"],
  ["church", ["churches"], "-ch → -es"],
  ["stomach", ["stomachs"], "-ch pronounced 'k' → just -s"],
  ["woman", ["women"], "irregular"],
  ["tooth", ["teeth"], "irregular"],
  ["person", ["people"], "irregular"],
  ["deer", ["deer"], "no change"],
  ["photo", ["photos"], "photo → photos (no -es)"],
  ["cliff", ["cliffs"], "-ff → just -s"],
  ["business", ["businesses"], "-s → -es"],
];

/** Prefixes (p. 159): only one of three prefixes fits. */
const prefixChoose: [string, string[], string][] = [
  ["fraud", ["de", "im", "un"], "defraud"],
  ["legal", ["il", "in", "re"], "illegal"],
  ["even", ["mis", "trans", "un"], "uneven"],
  ["play", ["anti", "re", "in"], "replay"],
  ["certain", ["in", "dis", "un"], "uncertain"],
  ["fortune", ["un", "in", "mis"], "misfortune"],
  ["direct", ["il", "un", "in"], "indirect"],
  ["behave", ["de", "pre", "mis"], "misbehave"],
  ["possible", ["re", "mis", "im"], "impossible"],
  ["wrap", ["il", "un", "in"], "unwrap"],
  ["regular", ["ir", "im", "in"], "irregular"],
  ["name", ["dis", "de", "re"], "rename"],
  ["view", ["inter", "mis", "un"], "interview"],
  ["afraid", ["un", "in", "dis"], "unafraid"],
  ["moral", ["in", "il", "im"], "immoral"],
  ["equal", ["il", "un", "im"], "unequal"],
  ["honest", ["un", "dis", "re"], "dishonest"],
  ["use", ["de", "mis", "un"], "misuse"],
];

const opposites: Record<string, string[]>[] = [
  { "dis-": ["courteous", "honor", "service"], "im-": ["patient", "polite", "possible"], "in-": ["accurate", "conspicuous"], "un-": ["comfortable", "happy"] },
  { "dis-": ["associate"], "im-": ["practical"], "in-": ["convenient", "decisive", "dependent", "sincere"], "un-": ["conscious", "easy", "necessary", "usual"] },
  { "in-": ["conceivable", "conclusive", "describable", "distinct", "sufficient", "variable"], "un-": ["endurable", "exciting", "identified", "important"] },
  { "in-": ["offensive"], "un-": ["interesting", "noticed", "pleasurable", "predictable", "remarkable", "steady", "wise"] },
];

/** Capital letters (p. 135): the letter without capitals, in two parts. */
const letterTop = `7/5 herzl street
ramat gan 75243
5 october 2026

the editor
the jerusalem news
p.o. box 185
jerusalem 91007

dear sir,`;
const letterTopFixed = `7/5 Herzl Street
Ramat Gan 75243
5 October 2026

The Editor
The Jerusalem News
P.O. Box 185
Jerusalem 91007

Dear Sir,`;
const letterBody = `i am writing to you about the article entitled "the educational value of television" which was published in your 1 october 2026 edition. while there are some very informative programs shown on israeli television, i feel that the level of violence in tv programs is increasing, and i don't think you addressed this issue.

yours sincerely
charlie brown`;
const letterBodyFixed = `I am writing to you about the article entitled "The Educational Value of Television" which was published in your 1 October 2026 edition. While there are some very informative programs shown on Israeli television, I feel that the level of violence in TV programs is increasing, and I don't think you addressed this issue.

Yours sincerely,
Charlie Brown`;

export const grammar: UnitInput = {
  id: "grammar",
  title: "Grammar Lab",
  tagline: "Tenses, plurals, comparisons, prefixes and punctuation",
  accent: "sky",
  lessons: [
    {
      id: "gr-capitals",
      title: "Capital Letters & Punctuation",
      source: WB("133–135"),
      items: [
        mcq("gr.cap.m1", "Which sentence uses capital letters correctly?", ["Last Sunday, Dana visited London with Aunt Ann.", "last sunday, Dana visited london with aunt Ann.", "Last sunday, dana visited London with Aunt ann."], "Last Sunday, Dana visited London with Aunt Ann.", { source: WB("134"), explanation: "Names, places, days, months and titles like Aunt need capitals." }),
        mcq("gr.cap.m2", "Which title is written correctly?", ["Harry Potter and the Sorcerer's Stone", "harry potter and the sorcerer's stone", "Harry potter And The sorcerer's stone"], "Harry Potter and the Sorcerer's Stone", { source: WB("134"), explanation: "Capitalize the important words in a title; small words like 'and', 'the' stay lower case (except at the start)." }),
        mcq("gr.cap.m3", "Which punctuation mark introduces a list?", ["a colon (:)", "a semicolon (;)", "an apostrophe (')", "an exclamation mark (!)"], "a colon (:)", { source: WB("133"), sentence: "On the table was___ a spoon, a knife and a fork." }),
        mcq("gr.cap.m4", "Which is correct for the dresses that belong to the girls?", ["the girls' dresses", "the girl's dresses", "the girls dresses'", "the girls's dresses"], "the girls' dresses", { source: WB("133"), explanation: "Plural noun ending in -s: put the apostrophe after the s." }),
        mcq("gr.cap.m5", "Where do the commas go?", ["\"Is it possible,\" she asked, \"that he was here?\"", "\"Is it possible\" she asked \"that he was here?\"", "\"Is it possible,\" she asked \"that he was here?\""], "\"Is it possible,\" she asked, \"that he was here?\"", { source: WB("133") }),
        mcq("gr.cap.m6", "Which mark joins two related sentences without a conjunction? \"To err is human___ to forgive, divine.\"", ["a semicolon (;)", "a colon (:)", "a comma (,)", "a question mark (?)"], "a semicolon (;)", { source: WB("133") }),
        mcq("gr.cap.m7", "\"I'll\" is short for…", ["I will", "I all", "I ill", "I shall not"], "I will", { source: WB("133"), explanation: "The apostrophe shows that letters are missing." }),
        proofread("gr.cap.letter1", "Add the missing capital letters to the top of this letter.", letterTop, letterTopFixed, ["Herzl Street, Ramat Gan, Jerusalem (place names)", "October (month)", "The Editor, The Jerusalem News (titles)", "P.O. Box", "Dear Sir"], { source: WB("135") }),
        proofread("gr.cap.letter2", "Add the missing capital letters (and the comma after the closing).", letterBody, letterBodyFixed, ["I (twice)", "start of each sentence (I, While)", "title: The Educational Value of Television", "October, Israeli, TV", "Yours sincerely, Charlie Brown"], { source: WB("135"), difficulty: 2 }),
      ],
    },
    {
      id: "gr-plurals",
      title: "Singular and Plural",
      source: WB("137–138"),
      items: [
        plurals1,
        plurals2,
        ...pluralTyped.map(([noun, ans, rule], i) => typed(`gr.plur.t${i + 1}`, `Write the plural of “${noun}”.`, ans, { source: WB("137"), allowTypo: false, explanation: rule })),
      ],
    },
    {
      id: "gr-present",
      title: "Present Simple vs Present Progressive",
      source: WB("139–144"),
      items: [
        ...presentChoice,
        ...halloween.map(([s, a], i) => gap(`gr.pres.h${i + 1}`, s, a, WB("141"))),
        ...saraCake.map(([s, a], i) => gap(`gr.pres.s${i + 1}`, s, a, WB("142"))),
        ...presentMixed.map(([s, a], i) => gap(`gr.pres.x${i + 1}`, s, a, WB("143–144"))),
      ],
    },
    {
      id: "gr-stative",
      title: "Stative Verbs",
      source: WB("140"),
      items: [
        choice("gr.stat.1", "I ___ what you are saying, but I don't understand what you mean.", ["can hear", "am hearing"], "can hear", { source: WB("140"), explanation: "hear is a stative verb (senses)." }),
        choice("gr.stat.2", "This dress ___ too much.", ["costs", "is costing"], "costs", { source: WB("140"), explanation: "cost = possession/stative → present simple." }),
        choice("gr.stat.3", "We ___ dinner right now. Can I call you back?", ["are having", "have"], "are having", { source: WB("140"), explanation: "have = eat here, so the progressive is fine." }),
        choice("gr.stat.4", "I ___ a good excuse for being late.", ["have", "am having"], "have", { source: WB("140"), explanation: "have = possess → stative." }),
        choice("gr.stat.5", "I ___ about taking a long vacation.", ["am thinking", "think"], "am thinking", { source: WB("140"), explanation: "think = consider → can be progressive." }),
        choice("gr.stat.6", "I ___ you may be right!", ["think", "am thinking"], "think", { source: WB("140"), explanation: "think = believe/opinion → stative." }),
        choice("gr.stat.7", "He ___ the dentist at five.", ["is seeing", "sees"], "is seeing", { source: WB("140"), explanation: "see = have an appointment → progressive." }),
        choice("gr.stat.8", "I ___ that she has arrived.", ["see", "am seeing"], "see", { source: WB("140"), explanation: "see = notice → stative." }),
        choice("gr.stat.9", "This book ___ to my brother.", ["belongs", "is belonging"], "belongs", { source: WB("140") }),
        choice("gr.stat.10", "I'm not ___ very well at the moment.", ["feeling", "feel"], "feeling", { source: WB("140"), explanation: "feel = health → can be progressive." }),
      ],
    },
    {
      id: "gr-quantifiers",
      title: "Quantifiers",
      subtitle: "much, many, a few, a little, some, any, no",
      source: WB("145"),
      items: (
        [
          ["How ___ time do you spend on homework?", ["much", "many", "a few"], "much"],
          ["How ___ times a day do you drink coffee?", ["much", "many", "little"], "many"],
          ["There are ___ books on the shelf.", ["a lot of", "much", "a little"], "a lot of"],
          ["There aren't ___ toys on the shelf.", ["any", "some", "much"], "any"],
          ["I only invited ___ children to my party.", ["a few", "a little", "much"], "a few"],
          ["___ children have interesting jobs.", ["Some", "Much", "A little"], "Some"],
          ["Most children have very ___ free time.", ["little", "few", "many"], "little"],
          ["I need ___ help to do this exercise.", ["some", "many", "a few"], "some"],
          ["Did you have ___ luck with your project?", ["any", "many", "a few"], "any"],
          ["How ___ water do you drink in a day?", ["much", "many", "few"], "much"],
          ["I'm sorry. I have ___ time to do this today.", ["no", "any", "many"], "no"],
          ["She is very rich. She has ___ of money.", ["a lot", "much", "many"], "a lot"],
        ] as [string, string[], string][]
      ).map(([s, o, r], i) =>
        choice(`gr.quant.${i + 1}`, s, o, r, {
          source: WB("145"),
          explanation: "much / a little + uncountable (time, water, help); many / a few + countable (books, children).",
          he: "much / little לשמות לא ספירים; many / few לשמות ספירים",
        }),
      ),
    },
    {
      id: "gr-past",
      title: "Past Simple",
      source: WB("146–148"),
      items: pastSimple.map(([s, a], i) => gap(`gr.past.${i + 1}`, s, a, WB("148"))),
    },
    {
      id: "gr-past-progressive",
      title: "Past Simple vs Past Progressive",
      source: WB("146, 148"),
      items: [
        ...pastMixed.map(([s, a], i) => gap(`gr.pastp.${i + 1}`, s, a, WB("148"))),
        choice("gr.pastp.c1", "The phone rang while I ___ my homework.", ["was doing", "did"], "was doing", { source: WB("146"), explanation: "The long action → past progressive; the short action that interrupts it → past simple." }),
        choice("gr.pastp.c2", "I was watching TV while my mother ___ dinner.", ["was cooking", "cooked"], "was cooking", { source: WB("146"), explanation: "Two actions in progress at the same time → past progressive." }),
        choice("gr.pastp.c3", "First they ate dinner, then they ___ a movie.", ["watched", "were watching"], "watched", { source: WB("146"), explanation: "A sequence of finished actions → past simple." }),
      ],
    },
    {
      id: "gr-future",
      title: "Future and Time Clauses",
      source: WB("151–152"),
      items: futureItems,
    },
    {
      id: "gr-comparison",
      title: "Comparison of Adjectives",
      source: WB("153–156"),
      items: [
        ...comparisonItems,
        ...comparisonGaps.map(([s, a], i) => typed(`gr.comp.g${i + 1}`, "Write the adjective in its correct form.", a, { sentence: s, source: WB("155"), allowTypo: false })),
        ...symbolRewrites.map(([orig, hint, answers], i) => rewrite(`gr.comp.sym${i + 1}`, `Make a sentence from the symbols. (${hint})`, orig, answers, { source: WB("155") })),
        ...comparisonRewrites.map(([orig, starter, answers], i) => rewrite(`gr.comp.rw${i + 1}`, "Rewrite the sentence using the words given.", orig, answers, { starter, source: WB("156"), difficulty: 2 })),
      ],
    },
    {
      id: "gr-prefixes",
      title: "Prefixes",
      subtitle: "un-, dis-, im-, in-, il-, ir-, mis-, re- …",
      source: WB("157–160"),
      items: [
        ...prefixChoose.map(([root, prefixes, word], i) =>
          mcq(`gr.pre.c${i + 1}`, `Only one prefix fits “${root}”. Which word is correct?`, prefixes.map((p) => p + root), word, { source: WB("159"), speak: word }),
        ),
        ...opposites.map((groups, i) => sort(`gr.pre.opp${i + 1}`, "Which prefix makes the opposite of each word?", groups, { source: WB("160") })),
        mcq("gr.pre.m1", "What does the prefix \"mis-\" mean?", ["wrongly or badly", "again", "under", "against"], "wrongly or badly", { source: WB("157"), sentence: "misspelled, misfortune" }),
        mcq("gr.pre.m2", "What does the prefix \"re-\" mean?", ["again", "not", "before", "across"], "again", { source: WB("157"), sentence: "replay, rewrite" }),
        mcq("gr.pre.m3", "What does the prefix \"trans-\" mean?", ["across or through", "between", "after", "below"], "across or through", { source: WB("157"), sentence: "transatlantic" }),
        mcq("gr.pre.m4", "all + together = ?", ["altogether", "alltogether", "all-together"], "altogether", { source: WB("158"), explanation: "When 'all' is a prefix, drop one l: altogether, always." }),
      ],
    },
  ],
};
