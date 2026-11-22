import type { ItemInput } from "@/lib/content/schema";
import { boxChoice, choice, clue, matchChunks, parseVocab, vocabItems } from "../helpers";

const WB = (p: string) => `Workbook p. ${p}`;

/** Chapters 1–2: matching, fill-in and the crossword. */
export const giverVocab1to2: ItemInput[] = [
  ...matchChunks("giver.v1.match", "Match the words from Chapter 1 to their meanings.", [
    ["release (v)", "allow (a person, thing) to go free"],
    ["hatchery (n)", "place where eggs are hatched"],
    ["intrigued (adj)", "filled with curiosity or interest"],
    ["palpable (adj)", "that can be felt or touched"],
    ["overwhelming (adj)", "very large, too great to oppose"],
    ["distraught (adj)", "extremely troubled or upset"],
    ["nurture (v)", "give care to the growth of a person or plan"],
    ["anthem (n)", "formal song of loyalty"],
    ["in unison", "together, at the same time and pitch"],
    ["wheedle (v)", "be pleasant to someone to get what you want"],
  ], 5, { source: WB("22") }),
  choice("giver.v1.c1", "We bought bottles of mineral water as a ___ supply in case the regular water supply failed.", ["supplementary", "palpable", "distraught"], "supplementary", { source: WB("23"), he: "supplementary = נוסף, משלים" }),
  choice("giver.v1.c2", "The criminal had brought ___ on the whole family.", ["disgrace", "transgression", "ritual"], "disgrace", { source: WB("23"), he: "disgrace = חרפה, בושה" }),
  choice("giver.v1.c3", "Every Friday night, the family eats a festive meal together. This is a weekly ___.", ["anthem", "ritual", "transgression"], "ritual", { source: WB("23"), he: "ritual = טקס, מנהג קבוע" }),
  choice("giver.v1.c4", "Dalia could hardly wait to start her new school. She was ___ for the new term to begin.", ["apprehensive", "eager", "emotional"], "eager", { source: WB("23"), he: "eager = להוט, משתוקק" }),
  choice("giver.v1.c5", "He ___ with his finger, and the little boy came running to him.", ["released", "beckoned", "wheedled"], "beckoned", { source: WB("23"), he: "beckon = לסמן לבוא" }),
  choice("giver.v1.c6", "The baby always smiled and seemed happy. He had a cheerful ___.", ["disgrace", "ritual", "disposition"], "disposition", { source: WB("23"), he: "disposition = מזג, אופי" }),
  choice("giver.v1.c7", "The rules say what is allowed and what is not. If you do something which is not allowed, you have committed a ___.", ["transgression", "disgrace", "ritual"], "transgression", { source: WB("23"), he: "transgression = עבירה (על כלל)" }),
  choice("giver.v1.c8", "As his bar mitzvah approached, Ronen was excited but also nervous. He felt ___.", ["palpable", "apprehensive", "distraught"], "apprehensive", { source: WB("23"), he: "apprehensive = חושש, מודאג" }),
  choice("giver.v1.c9", "Parents take care of the ___ needs of their children by giving them love, support and encouragement.", ["apprehensive", "supplementary", "emotional"], "emotional", { source: WB("23"), he: "emotional = רגשי" }),
  choice("giver.v1.c10", "The sun was so bright that I had to ___. My eyes were almost closed.", ["beckon", "wheedle", "squint"], "squint", { source: WB("23"), he: "squint = לצמצם עיניים" }),
  clue("giver.v2.x1", "listening carefully (adj)", "attentive", { source: WB("24"), he: "attentive = קשוב" }),
  clue("giver.v2.x2", "factor, quality (n)", "element", { source: WB("24"), he: "element = רכיב, גורם" }),
  clue("giver.v2.x3", "gain (v)", "acquire", { source: WB("24"), he: "acquire = לרכוש, להשיג" }),
  clue("giver.v2.x4", "group of people working together (n)", "crew", { source: WB("24"), he: "crew = צוות" }),
  clue("giver.v2.x5", "leisure time (n)", "recreation", { source: WB("24"), he: "recreation = פנאי, בילוי" }),
  clue("giver.v2.x6", "clap hands (v)", "applaud", { source: WB("24"), he: "applaud = למחוא כפיים" }),
  clue("giver.v2.x7", "She rolled her ___ in exasperation.", "eyes", { source: WB("24"), he: "roll your eyes = לגלגל עיניים" }),
  clue("giver.v2.x8", "I was so involved that I ___ track of time.", "lost", { source: WB("24"), he: "lose track of time = לאבד תחושת זמן" }),
  clue("giver.v2.x9", "worry about unnecessary things (v)", "fret", { source: WB("24"), he: "fret = לדאוג, להתייסר בדאגות" }),
  clue("giver.v2.x10", "something not seen clearly (n)", "blur", { source: WB("24"), he: "blur = טשטוש" }),
  clue("giver.v2.x11", "admit (v)", "confess", { source: WB("24"), he: "confess = להודות" }),
  clue("giver.v2.x12", "sticking to (rules) (n)", "adherence", { source: WB("24"), he: "adherence = היצמדות, ציות" }),
  clue("giver.v2.x13", "attracted (adj)", "drawn", { source: WB("24"), he: "drawn to = נמשך אל" }),
  clue("giver.v2.x14", "full of strong feelings of expectation and happiness (adj)", "excited", { source: WB("24"), he: "excited = נרגש" }),
  clue("giver.v2.x15", "be filled with respect and wonder (v)", "awe", { source: WB("24"), he: "awe = יראת כבוד, התפעמות" }),
  clue("giver.v2.x16", "comfort, make free from worry (v)", "reassure", { source: WB("24"), he: "reassure = להרגיע" }),
  clue("giver.v2.x17", "move the body restlessly and annoyingly (v)", "fidget", { source: WB("24"), he: "fidget = להתנועע בחוסר מנוחה" }),
  clue("giver.v2.x18", "increase in strength or amount, improve (v)", "enhance", { source: WB("24"), he: "enhance = לשפר, להגביר" }),
  clue("giver.v2.x19", "bend head forward and down (v)", "nod", { source: WB("24"), he: "nod = להנהן" }),
  clue("giver.v2.x20", "group of people or things forming a complete whole (n)", "unit", { source: WB("24"), he: "unit = יחידה" }),
  clue("giver.v2.x21", "existing only in the mind, not real (adj)", "imaginary", { source: WB("24"), he: "imaginary = דמיוני" }),
  clue("giver.v2.x22", "see and notice (v)", "observe", { source: WB("24"), he: "observe = להתבונן, לשים לב" }),
  clue("giver.v2.x23", "firmly settled (adj)", "established", { source: WB("24"), he: "established = מבוסס, קבוע" }),
  clue("giver.v2.x24", "place or time in fixed order (n) — \"It's your ___.\"", "turn", { source: WB("24"), he: "turn = תור" }),
  clue("giver.v2.x25", "natural ability or skill (n)", "aptitude", { source: WB("24"), he: "aptitude = כישרון, נטייה טבעית" }),
];

/** Chapters 3–4. */
export const giverVocab3to4: ItemInput[] = [
  choice("giver.v3.c1", "Karen didn't hear Jonathan come into the room. When he spoke to her, she gave a ___ jump.", ["bewildered", "nondescript", "startled"], "startled", { source: WB("28"), he: "startled = נבהל, מופתע" }),
  choice("giver.v3.c2", "\"Please go take a shower, Julie.\" \"I won't!\" answered Julie ___.", ["startled", "petulantly", "reluctantly"], "petulantly", { source: WB("28"), he: "petulantly = בעצבנות ילדותית" }),
  choice("giver.v3.c3", "If you disobey your parents, they will ___ you.", ["chastise", "lurk", "hoard"], "chastise", { source: WB("28"), he: "chastise = לנזוף, להעניש" }),
  choice("giver.v3.c4", "\"I'm absolutely sure,\" John said, but he didn't sound sure. His voice lacked ___.", ["remorse", "conviction", "humiliation"], "conviction", { source: WB("28"), he: "conviction = ביטחון, שכנוע עצמי" }),
  choice("giver.v3.c5", "The teacher told him off in front of the whole class, which caused him to feel tremendous ___.", ["humiliation", "delight", "conviction"], "humiliation", { source: WB("28"), he: "humiliation = השפלה" }),
  choice("giver.v3.c6", "Before the millennium, some people bought a few bottles of water and others ___ it, buying far too many.", ["shrugged", "stirred", "hoarded"], "hoarded", { source: WB("28"), he: "hoard = לאגור" }),
  choice("giver.v3.c7", "The teenager felt very ___ about wearing his new glasses. He thought everyone would think he looked strange.", ["reflective", "bewildered", "self-conscious"], "self-conscious", { source: WB("28"), he: "self-conscious = נבוך, מודע לעצמו" }),
  choice("giver.v3.c8", "Michael read the book with great ___. He really enjoyed it.", ["delight", "remorse", "conviction"], "delight", { source: WB("28"), he: "delight = הנאה רבה" }),
  choice("giver.v3.c9", "His face was so ___ that I couldn't remember what he looked like.", ["startled", "reflective", "nondescript"], "nondescript", { source: WB("28"), he: "nondescript = חסר ייחוד, אפרורי" }),
  choice("giver.v3.c10", "The driver ___ through the mist, trying to see the road ahead of him.", ["lurked", "peered", "stirred"], "peered", { source: WB("28"), he: "peer = להביט במאמץ" }),
  choice("giver.v3.c11", "Eddie was filled with ___ after he lied to his friend.", ["conviction", "delight", "remorse"], "remorse", { source: WB("28"), he: "remorse = חרטה" }),
  choice("giver.v3.c12", "Don't walk barefoot through the grass at night. You don't know what dangerous creatures might ___ there.", ["whimper", "lurk", "shrug"], "lurk", { source: WB("28"), he: "lurk = לארוב, להסתתר" }),
  choice("giver.v3.c13", "At the new year, he was in a ___ mood, thinking back over all that had happened.", ["reflective", "self-conscious", "nondescript"], "reflective", { source: WB("28"), he: "reflective = מהורהר" }),
  choice("giver.v3.c14", "The old lady didn't want my help. She only accepted it ___.", ["petulantly", "reluctantly", "bewilderedly"], "reluctantly", { source: WB("28"), he: "reluctantly = בחוסר רצון" }),
  choice("giver.v3.c15", "The baby ___ in his sleep. His eyes opened for a few seconds and then he carried on sleeping.", ["stirred", "lurked", "shrugged"], "stirred", { source: WB("28"), he: "stir = לזוז קלות" }),
  choice("giver.v3.c16", "Mary ___ and walked away. She obviously didn't care about what was happening.", ["stirred", "hoarded", "shrugged"], "shrugged", { source: WB("28"), he: "shrug = למשוך בכתפיים" }),
  choice("giver.v3.c17", "There were so many colours, I didn't know which to choose. I was totally ___.", ["startled", "bewildered", "nondescript"], "bewildered", { source: WB("28"), he: "bewildered = מבולבל" }),
  choice("giver.v3.c18", "James ___ with pain when I bathed his wound.", ["whimpered", "shrugged", "peered"], "whimpered", { source: WB("28"), he: "whimper = ליילל חלושות" }),
  choice("giver.v3.c19", "Helen ___ with excitement when she saw her birthday present.", ["whimpered", "shrugged", "squealed"], "squealed", { source: WB("28"), he: "squeal = לצווח (משמחה)" }),
  ...matchChunks("giver.v4.match", "Match the words from Chapter 4 to their meanings.", [
    ["gravitate (v)", "be attracted by and move gradually towards"],
    ["tabulate (v)", "arrange in the form of a table"],
    ["manufacture (n)", "making or producing, sometimes with machines"],
    ["distribution (n)", "dividing and giving out among several people"],
    ["glimpse (v)", "have a quick and incomplete view of"],
    ["motion (n)", "single or particular movement"],
    ["prim (adj)", "formal, easily shocked by something rude"],
    ["landscaping (n)", "arranging trees, plants and paths in gardens and parks"],
    ["sly (adj)", "clever at deceiving, dishonestly tricky"],
    ["chortle (v)", "give a laugh of pleasure and satisfaction"],
  ], 5, { source: WB("30") }),
  choice("giver.v4.c1", "People have strong feelings about politics. It is advisable to ___ political discussions with friends.", ["gravitate towards", "steer clear of", "brag about"], "steer clear of", { source: WB("31"), he: "steer clear of = להתרחק מ-" }),
  choice("giver.v4.c2", "\"May I tell you a secret?\" Jane whispered to Mary. \"I'm in love!\" she ___.", ["confided", "bragged", "chortled"], "confided", { source: WB("31"), he: "confide = לגלות סוד, לשתף" }),
  choice("giver.v4.c3", "When it was discovered that John took drugs, his future career was ___. He'd never get a good job.", ["glimpsed", "hastened", "clouded"], "clouded", { source: WB("31"), he: "cloud = להעיב על" }),
  choice("giver.v4.c4", "Mark ___ comes straight home after school. He never goes anywhere else.", ["invariably", "slyly", "primly"], "invariably", { source: WB("31"), he: "invariably = תמיד, ללא יוצא מן הכלל" }),
  choice("giver.v4.c5", "This box contains wine glasses. They are ___, so please put the box down carefully.", ["frail", "fragile", "serene"], "fragile", { source: WB("31"), he: "fragile = שביר" }),
  choice("giver.v4.c6", "After the road accident, David had to learn to walk again, so he spent time in a ___ centre.", ["distribution", "manufacture", "rehabilitation"], "rehabilitation", { source: WB("31"), he: "rehabilitation = שיקום" }),
  choice("giver.v4.c7", "My brother was very ___ when he was young. He was always doing naughty things and getting into trouble.", ["mischievous", "serene", "frail"], "mischievous", { source: WB("31"), he: "mischievous = שובב" }),
  choice("giver.v4.c8", "My grandmother is 86. Her mind is still active, but physically she is very ___.", ["serene", "frail", "fragile"], "frail", { source: WB("31"), he: "frail = חלש, תשוש (אדם)" }),
  choice("giver.v4.c9", "The other children always ___ Luke because he was fat. Sometimes they made him cry.", ["bragged about", "glimpsed", "teased"], "teased", { source: WB("31"), he: "tease = להקניט" }),
  choice("giver.v4.c10", "She ___ home when it started to rain. She didn't want to get wet.", ["hastened", "chortled", "gravitated"], "hastened", { source: WB("31"), he: "hasten = למהר" }),
  choice("giver.v4.c11", "Our teacher is very ___. She never shouts or gets angry.", ["fragile", "serene", "frail"], "serene", { source: WB("31"), he: "serene = שליו, רגוע" }),
  choice("giver.v4.c12", "Martin never stops talking about how well he does in school. He constantly ___ about his accomplishments.", ["brags", "chortles", "teases"], "brags", { source: WB("31"), he: "brag = להתרברב" }),
];

/** Chapters 5–7. */
export const giverVocab5to7: ItemInput[] = [
  ...matchChunks("giver.v5.match", "Match the words to their meanings.", [
    ["emblem", "sign"],
    ["reprieve", "delay, extra time"],
    ["perspire", "sweat"],
    ["suspect", "believe to be likely"],
    ["squirm", "twist the body about"],
    ["longingly", "showing a strong wish"],
    ["fragment", "small part"],
    ["infringe", "go against (a rule)"],
    ["throng", "large crowd"],
    ["prod", "push with a pointed object"],
    ["plea", "urgent request"],
    ["pledge", "promise"],
    ["ruefully", "regretfully"],
    ["retrieve", "find and bring back"],
    ["meticulously", "extremely carefully"],
  ], 5, { source: WB("38") }),
  choice("giver.v5.m1", "Michael had a **disquieting** dream the other night which still troubles him.", ["frightening", "unsettling", "sad"], "unsettling", { prompt: "What does the word in bold mean?", source: WB("38") }),
  choice("giver.v5.m2", "\"Leave me alone!\" she said **irritably** and slammed the door.", ["excitedly", "anxiously", "in an annoyed way"], "in an annoyed way", { prompt: "What does the word in bold mean?", source: WB("38") }),
  choice("giver.v5.m3", "Mark **stowed** his suitcases in the storeroom after his trip.", ["packed away", "hid", "left"], "packed away", { prompt: "What does the word in bold mean?", source: WB("38") }),
  choice("giver.v5.m4", "There was a **commotion** in the supermarket when someone attacked a shopper.", ["search", "excited activity", "investigation"], "excited activity", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m5", "The kitchen was **scrupulously** tidy — not a thing was out of place.", ["to the smallest detail", "exaggeratedly", "less than"], "to the smallest detail", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m6", "Jonas dreamed **vividly**. He could remember every detail afterwards.", ["often", "reluctantly", "clearly"], "clearly", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m7", "Any **infraction** of the rules will result in punishment.", ["bending", "enforcing", "breaking"], "breaking", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m8", "Grandparents often behave **indulgently** towards their grandchildren and spoil them.", ["leniently", "over-generously", "patiently"], "over-generously", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m9", "The first time David baked a cake, his mother **hovered** over him in case he needed help.", ["stayed near", "left alone", "interfered"], "stayed near", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m10", "Jane **cringed** when her brother started practising the violin. The noise was terrible.", ["felt discomfort", "ran away", "cried"], "felt discomfort", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m11", "Everyone was told to **congregate** on the lawn to hear the announcement.", ["run", "gather", "separate"], "gather", { prompt: "What does the word in bold mean?", source: WB("39") }),
  choice("giver.v5.m12", "Mary's ideas are so **profound** because she is such a spiritual person.", ["shallow", "a little interesting", "deep"], "deep", { prompt: "What does the word in bold mean?", source: WB("39") }),
];

const box89 = ["anguish", "cluster", "courtesy", "excruciating", "exempt", "fleeting", "integral", "modify", "painstaking", "piecemeal", "prohibit", "reel", "relish", "sliver", "stunned", "wisdom"];

/** Chapters 8–9. */
export const giverVocab8to9: ItemInput[] = [
  boxChoice("giver.v8.a1", "Instead of giving the secretary all the letters to type at once, the boss gave them to her ___.", box89, "piecemeal", { source: WB("43"), he: "piecemeal = חלק אחר חלק" }),
  boxChoice("giver.v8.a2", "Reading books is an ___ part of learning a language.", box89, "integral", { source: WB("43"), he: "integral = חיוני, בלתי נפרד" }),
  boxChoice("giver.v8.a3", "When the child was injured in an accident, his parents suffered tremendous ___.", box89, "anguish", { source: WB("43"), he: "anguish = ייסורים, צער עמוק" }),
  boxChoice("giver.v8.a3b", "It hurt them to see him in such ___ pain.", box89, "excruciating", { source: WB("43"), he: "excruciating = מייסר, נורא" }),
  boxChoice("giver.v8.a4", "Having a foreign driver's license does not necessarily ___ a new immigrant from taking a driving test.", box89, "exempt", { source: WB("43"), he: "exempt = לפטור" }),
  boxChoice("giver.v8.a5", "The pupils always behave with the utmost ___. They are very polite.", box89, "courtesy", { source: WB("43"), he: "courtesy = נימוס" }),
  boxChoice("giver.v8.a6", "That program doesn't really suit my purpose. I may have to ___ it.", box89, "modify", { source: WB("43"), he: "modify = לשנות, להתאים" }),
  boxChoice("giver.v8.a7", "Mary was on a diet, so she only ate a ___ of the cake.", box89, "sliver", { source: WB("43"), he: "sliver = פרוסה דקה" }),
  boxChoice("giver.v8.a8", "Everyone ___ around the computer to see the new game.", box89, "clustered", { base: "cluster", source: WB("43"), he: "cluster = להתקבץ" }),
  boxChoice("giver.v8.a9", "Ball games are ___ inside school buildings.", box89, "prohibited", { base: "prohibit", source: WB("43"), he: "prohibit = לאסור" }),
  boxChoice("giver.v8.a10", "When Lisa unexpectedly won first prize, she was ___.", box89, "stunned", { source: WB("43"), he: "stunned = המום" }),
  boxChoice("giver.v8.a11", "When the drunk man left the pub, he ___ from one side of the road to the other.", box89, "reeled", { base: "reel", source: WB("43"), he: "reel = להתנודד" }),
  boxChoice("giver.v8.a12", "The old man gained ___ from his many experiences, so he knows a lot.", box89, "wisdom", { source: WB("43"), he: "wisdom = חוכמה" }),
  boxChoice("giver.v8.a13", "That car was travelling so fast that I only caught a ___ glimpse of it.", box89, "fleeting", { source: WB("43"), he: "fleeting = חולף, רגעי" }),
  boxChoice("giver.v8.a14", "David checked all the amounts with ___ care, but couldn't find his mistake.", box89, "painstaking", { source: WB("43"), he: "painstaking = קפדני מאוד" }),
  boxChoice("giver.v8.a15", "Michael really enjoyed that ice cream — he ate it with ___!", box89, "relish", { source: WB("43"), he: "relish = הנאה, התענגות" }),
  choice("giver.v8.b1", "Working in groups helps pupils develop a feeling of **kinship** with each other.", ["identification", "understanding", "competition"], "identification", { prompt: "What does the word in bold mean?", source: WB("44"), he: "kinship = קרבה, תחושת שייכות" }),
  choice("giver.v8.b2", "The experience completely **unnerved** him. He became very anxious.", ["took away his confidence", "caused him mental pain", "gave him wisdom"], "took away his confidence", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b3", "The wound looked so sore that she had to **steel herself** to look at it.", ["trick herself", "force herself", "tease herself"], "force herself", { prompt: "What does the phrase in bold mean?", source: WB("44") }),
  choice("giver.v8.b4", "John hadn't done his homework again. Could he **conceivably** come up with a good excuse this time?", ["certainly", "probably", "possibly"], "possibly", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b5", "The noise grew louder and louder until it reached a **crescendo**.", ["record", "climax", "breaking point"], "climax", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b6", "The shirt was a **vibrant** colour. It almost hurt my eyes to look at it.", ["pale", "deep", "strong and bright"], "strong and bright", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b7", "Once they saw the **magnitude** of the problem, they realized it would take a while to sort out.", ["great size", "complexity", "seriousness"], "great size", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b8", "You are **compelled** to obey the school rules. You have no choice in the matter.", ["exempted", "excused", "forced"], "forced", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b9", "The school has **requisitioned** more computers. We hope they arrive soon.", ["bought", "officially requested", "sent"], "officially requested", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b10", "Jane had a **benign** nature. She was always kind.", ["cruel", "coarse", "gentle"], "gentle", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b11", "\"This is pure **indolence**,\" his mother said angrily. \"You could make more effort!\"", ["laziness", "stupidity", "nonsense"], "laziness", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b12", "They took their time deciding as they did not want to be too **hasty**.", ["slow", "careless", "quick"], "quick", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b13", "She listened to the teacher **intently**. She didn't want to miss anything.", ["hardly", "with great attention", "sporadically"], "with great attention", { prompt: "What does the word in bold mean?", source: WB("44") }),
  choice("giver.v8.b14", "He was a man of **integrity**. You could rely on him.", ["charm", "trustworthiness", "disposition"], "trustworthiness", { prompt: "What does the word in bold mean?", source: WB("44") }),
];

const v10extra = parseVocab(`
relocate | v | move to a new place | להעביר למקום אחר | The family had to *relocate* to a new dwelling.
upholstered | adj | (of furniture) covered with soft material | מרופד | The Annex had soft, *upholstered* chairs.
intricate | adj | having many small parts or details | מורכב, מסובך | The carpet had an *intricate* pattern.
diminish | v | become smaller or weaker | להצטמצם, לפחות | The pain began to *diminish*.
tentatively | adv | in a careful, unsure way | בהיסוס | Jonas *tentatively* touched the door.
consciousness | n | being aware of what is happening | מודעות, הכרה | The memory entered his *consciousness*.
torrent | n | a fast, strong flow | זרם עז, שטף | Words came out in a *torrent*.
propel | v | push something forward | להניע קדימה | The sled was *propelled* down the hill.
glee | n | great happiness and excitement | שמחה גדולה, עליזות | The children laughed with *glee*.
unpredictable | adj | you cannot know what will happen | בלתי צפוי | The weather used to be *unpredictable*.
conveyance | n | a vehicle; a way of carrying | כלי תחבורה | A sled is a kind of *conveyance*.
unwieldy | adj | difficult to carry or move | מסורבל | The box was big and *unwieldy*.
perceive | v | notice or become aware of | לתפוס, להבחין | Jonas began to *perceive* colors.
soundly | adv | deeply (of sleep) | עמוק (שינה) | Gabe finally slept *soundly*.
kink | n | a small painful twist (in a muscle) | עווית, תפס | He had a *kink* in his neck.
relinquish | v | give up; let go of | לוותר על | He had to *relinquish* the memory.
`);

/** Chapters 10–12: crossword plus the other words from the list. */
export const giverVocab10to12: ItemInput[] = [
  clue("giver.v10.x1", "show that one recognizes (someone) by waving, smiling, etc.", "acknowledge", { source: WB("48"), he: "acknowledge = להכיר ב-, לאשר" }),
  clue("giver.v10.x2", "decorated with a raised pattern or letters", "embossed", { source: WB("48"), he: "embossed = מובלט" }),
  clue("giver.v10.x3", "choose for a particular job or purpose", "designate", { source: WB("48"), he: "designate = למנות, לייעד" }),
  clue("giver.v10.x4", "no longer used, completely out of date", "obsolete", { source: WB("48"), he: "obsolete = מיושן, שאינו בשימוש" }),
  clue("giver.v10.x5", "small, partly enclosed space in a room", "alcove", { source: WB("48"), he: "alcove = גומחה" }),
  clue("giver.v10.x6", "making one cheerful and excited", "exhilarating", { source: WB("48"), he: "exhilarating = מרומם, מלהיב" }),
  clue("giver.v10.x7", "warning", "admonition", { source: WB("48"), he: "admonition = אזהרה, נזיפה" }),
  clue("giver.v10.x8", "strong and firm; not likely to break", "sturdy", { source: WB("48"), he: "sturdy = חסון, יציב" }),
  clue("giver.v10.x9", "noticeable", "conspicuous", { source: WB("48"), he: "conspicuous = בולט" }),
  clue("giver.v10.x10", "unable to speak because of shock or lack of understanding", "dumbfounded", { source: WB("48"), he: "dumbfounded = המום, נדהם" }),
  clue("giver.v10.x11", "skilfully", "deftly", { source: WB("48"), he: "deftly = במיומנות" }),
  clue("giver.v10.x12", "sit or lie in pleasant warmth", "bask", { source: WB("48"), he: "bask = להתחמם (בשמש)" }),
  clue("giver.v10.x13", "way of holding the body; position of the body", "posture", { source: WB("48"), he: "posture = יציבה" }),
  clue("giver.v10.x14", "the hidden word down the middle: being aware, understanding something", "consciousness", { source: WB("48"), he: "consciousness = מודעות" }),
  ...vocabItems("giver.v10.vocab", v10extra.filter((e) => e.word !== "consciousness"), WB("47")),
];

/** Chapters 13–15: meaning in context. */
export const giverVocab13to15: ItemInput[] = (
  [
    ["There are flowers of every **hue** in this garden.", ["size", "shape", "shade of colour"], "shade of colour", "hue = גוון"],
    ["Your behavior is **irrational**. You should listen to reason.", ["strange", "unreasonable", "reasonable"], "unreasonable", "irrational = לא הגיוני"],
    ["The details about what happened are still **sparse**. We hope to know more soon.", ["unclear", "few", "not reported"], "few", "sparse = דל, מועט"],
    ["The ball got lost in the **shrubbery**. We couldn't find it among all the bushes.", ["area of bushes", "area of flowers", "tall grass"], "area of bushes", "shrubbery = שיחים"],
    ["The **mutilated** body of the victim was found in a field. He was almost unidentifiable.", ["seriously damaged", "burnt", "naked"], "seriously damaged", "mutilated = מושחת, מרוטש"],
    ["A **sinuous** river flowed through the countryside. It was never straight for more than a few meters.", ["straight", "shallow", "winding"], "winding", "sinuous = מתפתל"],
    ["Too much lesson time is **consumed** in dealing with questions that are not connected to the topic.", ["used up", "saved", "left for"], "used up", "consume = לכלות, לצרוך"],
    ["We asked the wise old man for his **counsel**. He suggested that we wait and see.", ["opinion", "advice", "decision"], "advice", "counsel = עצה"],
    ["The new vocabulary has to be **assimilated**. You need to know what the words mean and how to use them.", ["studied", "absorbed", "practised"], "absorbed", "assimilate = להטמיע, לקלוט"],
    ["The splinter was **embedded** in his finger. We couldn't get it out.", ["stuck firmly", "lost", "visible"], "stuck firmly", "embedded = נעוץ, משובץ"],
    ["The doctors did not tell the patient how sick he was, to **shield** him from anguish.", ["prevent", "stop", "protect"], "protect", "shield = לגונן"],
    ["The cold water was **invigorating**. He felt fit and healthy after his swim.", ["freezing", "weakening", "strengthening"], "strengthening", "invigorating = ממריץ, מחזק"],
    ["The small animal **skittered** across the path and disappeared down a hole.", ["walked slowly", "ran quickly", "hopped"], "ran quickly", "skitter = לרוץ במהירות ובקלילות"],
    ["They were in a boat when the storm started. They were at the **mercy** of the weather.", ["in control of", "powerless against", "powerful against"], "powerless against", "at the mercy of = נתון לחסדי"],
    ["He fell down the stairs and **jarred** his shoulder, which was very painful.", ["shook unpleasantly", "broke", "moved"], "shook unpleasantly", "jar = לטלטל בכאב"],
    ["The teenager's moods were **unendurable**. He was driving the whole family crazy.", ["fun", "irritating", "unbearable"], "unbearable", "unendurable = בלתי נסבל"],
    ["The old woman enjoyed the **isolation** on the mountain. She liked being by herself.", ["company", "aloneness", "atmosphere"], "aloneness", "isolation = בידוד"],
    ["The starving children had **distended** stomachs.", ["thin", "empty", "swollen"], "swollen", "distended = נפוח"],
    ["The fire caused **destruction** in the building. Hardly any walls were left.", ["ruin", "injury", "collapse"], "ruin", "destruction = הרס"],
    ["The warning was **ominous**. We were worried about what would happen tomorrow.", ["a sign of something good", "a sign of something interesting", "a sign of something bad"], "a sign of something bad", "ominous = מבשר רעות"],
    ["The drowning man **flailed** his arms in the water. Then he disappeared.", ["waved about wildly", "swam", "kept still"], "waved about wildly", "flail = לנופף בפראות"],
    ["His face was **contorted** with pain. He was really suffering.", ["smiling", "crying", "twisted"], "twisted", "contorted = מעוות"],
    ["**Brace yourself** for a shock. David has dyed his hair blue!", ["Think about", "Prepare yourself", "Avoid"], "Prepare yourself", "brace yourself = התכונן"],
    ["He hadn't brushed his hair for weeks. It was all **matted**.", ["tangled", "dirty", "smooth"], "tangled", "matted = סבוך"],
    ["The battlefield was a scene of **carnage**. There were dead bodies everywhere.", ["slaughter", "mess", "wreckage"], "slaughter", "carnage = טבח"],
    ["We went out in the storm without an umbrella and were **drenched** by the rain.", ["caught", "soaked", "saved"], "soaked", "drenched = ספוג, רטוב לגמרי"],
    ["The crowd **surged** forward. Everyone wanted to reach the stage.", ["crept slowly", "leaned dangerously", "moved powerfully"], "moved powerfully", "surge = לנהור, להסתער"],
    ["\"I **implore** you to leave me alone. Just go away!\" he said.", ["order", "beg", "request"], "beg", "implore = להתחנן"],
    ["The monster had a **grotesque** face. It was quite ugly.", ["abnormal and ugly", "interesting", "handsome"], "abnormal and ugly", "grotesque = מעוות ומכוער, גרוטסקי"],
    ["The meat had been left out of the refrigerator for days. The **stench** was terrible.", ["smell", "taste", "colour"], "smell", "stench = צחנה"],
  ] as [string, string[], string, string][]
).map(([sentence, options, right, he], i) =>
  choice(`giver.v13.m${i + 1}`, sentence, options, right, { prompt: "What does the word in bold mean?", source: WB(i < 5 ? "52" : i < 17 ? "53" : "54"), he }),
);

const box1617 = ["ambush", "bearings", "blurt out", "burden", "clutch", "crouch", "ecstatic", "exaggerated", "exasperation", "freakish", "gesture", "glum", "heightened", "hesitate", "horde", "luxuriate", "nudge", "pervade", "plead", "pronounce", "reveal", "shallow", "solitude", "substitute", "trudge", "uneventful", "unique", "wisp"];

/** Chapters 16–17: word box. */
export const giverVocab16to17: ItemInput[] = (
  [
    ["The man waved his fist in an angry ___.", "gesture", "gesture", "gesture = מחווה, תנועה"],
    ["Although Mary tied her hair in a ponytail, a ___ of hair crept out and dangled in her eyes.", "wisp", "wisp", "wisp = קווצה, תלתל דק"],
    ["The doctor ___ the road accident victim dead on arrival at the hospital.", "pronounced", "pronounce", "pronounce dead = לקבוע מוות"],
    ["She took off her coat and ___ the elegant evening dress she was wearing underneath.", "revealed", "reveal", "reveal = לחשוף"],
    ["Claire decided to spend time alone away from everyone. She felt she needed some ___.", "solitude", "solitude", "solitude = בדידות (רצויה)"],
    ["The students behaved so badly that the teacher stopped teaching in ___.", "exasperation", "exasperation", "exasperation = רוגז, תסכול"],
    ["The soldiers hid from the enemy and planned their ___. At a given moment, they would jump out and surprise the enemy.", "ambush", "ambush", "ambush = מארב"],
    ["When he came out of the dark cinema, it took him a minute to get his ___. He wasn't sure which way to walk.", "bearings", "bearings", "get your bearings = להתמצא"],
    ["Bruce lost his wallet on the way home. He arrived home looking very ___.", "glum", "glum", "glum = עגום, מדוכדך"],
    ["He seemed to be a ___ sort of person. He didn't seem to feel deeply about anything.", "shallow", "shallow", "shallow = שטחי"],
    ["Such hot weather in the middle of January is ___. Never before have such temperatures been recorded.", "freakish", "freakish", "freakish = חריג, מוזר"],
    ["The responsibility of getting her brother to school on time every day was a heavy ___ for her.", "burden", "burden", "burden = נטל"],
    ["A ___ of children was running wild in the kindergarten playground.", "horde", "horde", "horde = המון, עדר"],
    ["He ___ home through the snow. It was difficult to walk because the snow was very deep.", "trudged", "trudge", "trudge = לצעוד בכבדות"],
    ["The children were ___ in their hiding place for so long that their legs began to ache.", "crouched", "crouch", "crouch = להתכופף"],
    ["Deborah ___ before making her final decision.", "hesitated", "hesitate", "hesitate = להסס"],
    ["The pop star let us ask him anything we wanted. This was a ___ opportunity.", "unique", "unique", "unique = ייחודי"],
    ["As he lay in the sun, he felt the warmth ___ his whole body.", "pervade", "pervade", "pervade = לחלחל, למלא"],
    ["As he lay in the sun, he ___ in the delightful feeling.", "luxuriated", "luxuriate", "luxuriate = להתענג"],
    ["He didn't want to tell his parents what had happened, but in the end he ___ the whole story.", "blurted out", "blurt out", "blurt out = לפלוט"],
    ["After the near accident, the boy had a ___ awareness of the dangers of crossing the road.", "heightened", "heightened", "heightened = מוגבר"],
    ["While the teacher was off sick, a ___ teacher taught the class.", "substitute", "substitute", "substitute = מחליף, ממלא מקום"],
    ["The journey home was ___. Nothing exciting or interesting happened.", "uneventful", "uneventful", "uneventful = שגרתי, בלי אירועים"],
    ["John ___ with his parents to buy him a motorbike.", "pleaded", "plead", "plead = להתחנן"],
    ["Michael felt he was going to faint. He ___ the table to steady himself.", "clutched", "clutch", "clutch = לאחוז בחוזקה"],
    ["When Lisa finally met her favourite singer she was ___. She'd never been so happy.", "ecstatic", "ecstatic", "ecstatic = באקסטזה, מאושר מאוד"],
    ["David seemed to be falling asleep, so I ___ him with my shoulder to wake him up.", "nudged", "nudge", "nudge = לדחוף קלות"],
    ["He has an ___ idea of his own importance. He should be more modest.", "exaggerated", "exaggerated", "exaggerated = מוגזם"],
  ] as [string, string, string, string][]
).map(([sentence, right, base, he], i) => boxChoice(`giver.v16.c${i + 1}`, sentence, box1617, right, { base, source: WB(i < 11 ? "57" : "58"), he }));

/** Chapters 18–19: circle the most suitable word. */
export const giverVocab18to19: ItemInput[] = (
  [
    ["The old and sick man ___ in his step. The nurse took his arm to help him walk.", ["flickered", "winced", "clawed", "faltered"], "faltered", "falter = למעוד, להסס"],
    ["He was given a local anaesthetic by the dentist and it made half of his face feel ___.", ["motionless", "limp", "numb", "luminous"], "numb", "numb = רדום, חסר תחושה"],
    ["Jane and her husband went away and ___ their children on Jane's mother. She wasn't happy about it.", ["faltered", "inflicted", "backed off", "winced"], "inflicted", "inflict on = לכפות על, להטיל על"],
    ["Mary has a ring left to her by her great-grandmother. She ___ it.", ["cradles", "inflicts", "winces", "treasures"], "treasures", "treasure = להוקיר, לשמור כאוצר"],
    ["The man lost a lot of hair and had a large bald patch where you could see his ___.", ["concept", "treasure", "scalp", "claw"], "scalp", "scalp = קרקפת"],
    ["The defendant was ___. He controlled his feelings and didn't show how sad and angry he was.", ["solemn", "devastated", "numb", "self-possessed"], "self-possessed", "self-possessed = שולט בעצמו"],
    ["John had severe toothache. He was in a lot of pain and feeling ___.", ["devastated", "wretched", "astonished", "solemn"], "wretched", "wretched = אומלל"],
    ["Michael ___ with pain as the nurse cleaned his wound.", ["clawed", "faltered", "winced", "punctured"], "winced", "wince = להתכווץ מכאב"],
    ["The dog looked at him ___. His eyes said: \"Don't punish me!\"", ["puzzled", "motionless", "devastated", "imploringly"], "imploringly", "imploringly = בתחינה"],
    ["The teacher could see that the pupil was sorry, so she ___ and stopped lecturing.", ["faltered", "backed off", "inflicted", "hammered out"], "backed off", "back off = לסגת"],
    ["He ___ went to bed later than 9:30 p.m. He was not a 'night person'.", ["seldom", "astonished", "despite", "imploringly"], "seldom", "seldom = לעיתים רחוקות"],
    ["The policeman looked at them ___ as he told them their son had been badly injured.", ["fascinatedly", "motionlessly", "gravely", "obediently"], "gravely", "gravely = ברצינות, בחומרה"],
    ["The lettuce was left out of the fridge and it went ___ instead of being crisp.", ["motionless", "numb", "limp", "solemn"], "limp", "limp = רפוי, נבול"],
    ["The Nurturer ___ the baby in her arms.", ["punctured", "cradled", "clawed", "backed off"], "cradled", "cradle = לערסל"],
    ["It is difficult to grasp the ___ of the size of the universe.", ["afterthought", "scalp", "puzzle", "concept"], "concept", "concept = מושג"],
    ["The candle ___ in the breeze and then went out.", ["flickered", "hammered out", "backed off", "faltered"], "flickered", "flicker = להבהב"],
    ["Road signs should be ___ so that they shine in the dark.", ["hammered out", "punctured", "luminous", "treasured"], "luminous", "luminous = זוהר"],
    ["He claimed the dog had bitten him, but the dog's teeth had not ___ his skin.", ["winced", "punctured", "clawed", "cradled"], "punctured", "puncture = לנקב"],
    ["Jerry didn't understand the question and stared at the teacher with a ___ look.", ["puzzled", "self-possessed", "devastated", "astonished"], "puzzled", "puzzled = מבולבל, תמה"],
    ["Laura watched, ___, as her grandmother made strudel. She'd never seen anyone handle dough like that.", ["numb", "limp", "wretched", "fascinated"], "fascinated", "fascinated = מוקסם"],
    ["He sat ___ throughout the ceremony. He never moved.", ["numb", "astonished", "motionless", "devastated"], "motionless", "motionless = ללא תנועה"],
    ["With the last of his strength, the climber ___ his way to the top of the mountain.", ["clawed", "winced", "flickered", "faltered"], "clawed", "claw one's way = לטפס בכוח, להיאחז"],
    ["The workers and management met to ___ a solution and end the strike.", ["back off", "hammer out", "inflict", "treasure"], "hammer out", "hammer out = לגבש (פתרון) במאמץ"],
    ["Lisa was ___ when she walked in and everyone shouted \"Surprise!\".", ["astonished", "wretched", "fascinated", "limp"], "astonished", "astonished = נדהם"],
    ["It rained all day, but ___ the weather, we enjoyed the picnic.", ["seldom", "despite", "imploringly", "falter"], "despite", "despite = למרות"],
    ["The conservatory was ___, added on to the building years later.", ["a concept", "a treasure", "an afterthought", "a scalp"], "an afterthought", "afterthought = מחשבה מאוחרת, תוספת"],
    ["Shelley was ___ when she found out that her father had died.", ["devastated", "self-possessed", "astonished", "motionless"], "devastated", "devastated = הרוס, שבור לב"],
    ["After his team lost the game, Tom came home looking ___.", ["puzzled", "self-possessed", "dejected", "numb"], "dejected", "dejected = מדוכדך"],
    ["The little boy sat ___ during the show. He did exactly as he was told.", ["wretchedly", "imploringly", "astonished", "obediently"], "obediently", "obediently = בצייתנות"],
    ["Yvonne was a very ___ child. She rarely smiled and took life very seriously.", ["limp", "solemn", "puzzled", "numb"], "solemn", "solemn = רציני, חגיגי"],
  ] as [string, string[], string, string][]
).map(([sentence, options, right, he], i) => choice(`giver.v18.c${i + 1}`, sentence, options, right, { prompt: "Choose the most suitable word.", source: WB(i < 15 ? "62" : "63"), he }));

/** Dictionary of Sameness (p. 70): the community's words and the everyday words we use. */
export const giverSameness: ItemInput[] = matchChunks(
  "giver.sameness",
  "Dictionary of Sameness: match the community's word to the word we would use.",
  [
    ["dwelling", "house / home"],
    ["family unit", "family"],
    ["newchild", "baby"],
    ["Nurturing Center", "nursery / day care"],
    ["sleepingroom", "bedroom"],
    ["morning meal", "breakfast"],
    ["midday meal", "lunch"],
    ["evening meal", "dinner / supper"],
    ["learning community", "school"],
    ["Instructor", "teacher"],
    ["groupmates", "classmates"],
    ["Assignment", "job / career"],
    ["the Old", "elderly people"],
    ["House of the Old", "old people's home"],
    ["released", "killed / put to death"],
    ["Ceremony of Loss", "memorial service"],
    ["spouse", "husband or wife"],
    ["comfort object", "teddy bear / soft toy"],
    ["discipline wand", "cane / stick for punishing"],
    ["relief-of-pain medication", "painkillers"],
    ["reference volumes", "encyclopedias"],
    ["Hall of Open Records", "library / archives"],
    ["Recreation Area", "playground / park"],
    ["recreation time", "free time"],
    ["undergarments", "underwear"],
    ["tunic", "shirt / top"],
    ["smock", "apron / overall"],
    ["Stirrings", "first romantic feelings"],
    ["citizen-in-training", "apprentice / trainee"],
    ["carrying container", "bag / lunch box"],
    ["Birthing Center", "maternity hospital"],
    ["an Eleven", "an eleven-year-old"],
    ["Elsewhere", "the outside world"],
    ["Inadequate", "not good enough / weak"],
    ["Nurturer", "nanny / nurse"],
  ],
  5,
  { source: WB("70"), explanation: "The community uses careful, impersonal words. Many of them hide what really happens — for example, “release” means killing.", reviewStatus: "draft" },
);
