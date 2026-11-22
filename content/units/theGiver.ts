import type { ItemInput, UnitInput } from "@/lib/content/schema";
import { open } from "../helpers";
import {
  giverSameness,
  giverVocab1to2,
  giverVocab3to4,
  giverVocab5to7,
  giverVocab8to9,
  giverVocab10to12,
  giverVocab13to15,
  giverVocab16to17,
  giverVocab18to19,
} from "./theGiverVocab";

const WB = (p: string) => `Workbook p. ${p}`;

/** Compact question list: [question, expected answer, key points]. */
type Q = [string, string, string[]];

function questions(prefix: string, chapter: string, list: Q[], opts: { draft?: boolean; page?: string } = {}): ItemInput[] {
  return list.map(([question, expected, keyPoints], i) =>
    open(`${prefix}.q${i + 1}`, question, expected, keyPoints, {
      source: `The Giver, ${chapter}${opts.page ? ` · ${WB(opts.page)}` : ""}`,
      reviewStatus: opts.draft === false ? "ok" : "draft",
    }),
  );
}

const ch1to2: Q[] = [
  ["Why does Jonas feel apprehensive at the start of the story?", "He is nervous about the coming Ceremony of Twelve in December, when he will get his Assignment.", ["the Ceremony of Twelve / getting his Assignment"]],
  ["How many children is each family unit allowed?", "Two children — one male and one female.", ["two", "one boy and one girl"]],
  ["Who takes care of the newchildren?", "Special Nurturers in the Nurturing Center.", ["Nurturers", "in the Nurturing Center"]],
  ["What does the family do every evening?", "They share their feelings — each person tells about the feelings they had during the day.", ["the telling of feelings", "each person shares their feelings from the day"]],
  ["Name three ways \"release\" is used in the community.", "As a reward for the elderly, for newchildren who don't develop well enough, and as a punishment for people who break rules many times.", ["for the Old (a reward)", "for newchildren who don't 'make the grade'", "as a punishment"]],
  ["What happens at the Ceremonies of One, Nine and Twelve?", "At One, newchildren are given names and assigned to family units. At Nine, children get their bicycles. At Twelve, each child receives an Assignment (a job) and begins training.", ["One: newchildren get names / families", "Nine: bicycles", "Twelve: Assignments / training"]],
  ["Why have the children done volunteer hours before they become Twelves?", "To try different places in the community and see what they enjoy and are suited to.", ["to discover what they enjoy / are good at", "it helps the Elders choose Assignments"]],
];

const ch3to4: Q[] = [
  ["Why does Jonas's father bring Gabriel home at night?", "Gabriel isn't growing or sleeping as well as he should, so he gets extra (supplementary) nurturing at Jonas's home at night.", ["Gabriel isn't developing / sleeping well", "extra nurturing at home"]],
  ["What do Jonas and Gabriel have in common?", "They both have pale (light) eyes, which is unusual in the community.", ["pale / light eyes"]],
  ["What is the job of a Birthmother?", "To give birth to three babies in three years; afterwards she becomes a Laborer.", ["three births in three years", "then she becomes a Laborer"]],
  ["What strange thing happens to the apple, and what happens when Jonas takes it home?", "While playing catch with Asher, Jonas sees the apple change in mid-air. He takes it home to examine it, and a public announcement about taking food from the recreation area humiliates him.", ["the apple changed in the air", "he took it home", "an announcement embarrassed / humiliated him"]],
  ["How are the Old treated in the community?", "They are greatly respected and well cared for in the calm, comfortable House of the Old.", ["respected", "cared for in the House of the Old"]],
  ["What does Larissa tell Jonas about Roberto's release?", "That it was a happy, meaningful Ceremony celebrating a life well lived — but children are not allowed to attend.", ["it was a celebration of his life", "children can't attend release ceremonies"]],
];

const ch5: Q[] = [
  ["What was the morning ritual?", "The telling of dreams.", ["sharing / telling dreams"]],
  ["What was Lily's dream?", "She dreamed she rode her mother's bicycle, which is against the rules, and was caught.", ["she rode her mother's bicycle", "against the rules"]],
  ["What do you think was the warning that the dream contained?", "That she should follow the rules and wait until she is Nine to ride a bicycle.", ["follow the rules", "wait until Nine for a bicycle"]],
  ["What did Mother dream?", "That she was punished (chastised) for breaking a rule she didn't understand.", ["chastised / punished", "for a rule she didn't understand"]],
  ["What did the others think was the reason for her dream?", "Her feelings about the citizen she had to punish for a second offense.", ["she had punished a citizen a second time / a repeat offender"]],
  ["Did Gabe take part in the dream-telling? Why or why not?", "No — he was not yet a Three, so he was too young.", ["no", "too young / not yet a Three"]],
  ["Describe Jonas's dream.", "He was alone with Fiona in the bathing room at the House of the Old. He wanted her to take off her clothes and get into the tub so he could bathe her, but she refused.", ["with Fiona in the bathing room", "he wanted her to get into the tub", "she refused / laughed"]],
  ["What was Jonas's strongest feeling in the dream?", "The wanting — a strong desire.", ["wanting / desire"]],
  ["Did the family discuss Jonas's dream? Why or why not?", "Not all together. The others left, and Mother (with Father) spoke to Jonas privately, because the dream showed the Stirrings.", ["no, not as a family", "Mother spoke to him privately", "because it was the Stirrings"]],
  ["How did Mother explain the meaning of Jonas's dream?", "She said it was his first Stirrings.", ["the Stirrings"]],
  ["What were the Stirrings?", "The first feelings of attraction and desire toward another person.", ["feelings of attraction / desire"]],
  ["What was the treatment for the Stirrings?", "Taking a pill every morning.", ["a pill every morning"]],
  ["How long does the treatment continue?", "Until he enters the House of the Old — basically for the rest of his life.", ["until the House of the Old / for life"]],
  ["Did Jonas find the feelings he had in the dream pleasurable?", "Yes, he liked the feeling.", ["yes"]],
  ["At the end of the chapter, did Jonas still remember the feelings? Why or why not?", "No. After taking the pill, the feelings disappeared and he could no longer remember them.", ["no", "the pill took the feelings away"]],
];

const ch6: Q[] = [
  ["What is special about the day described in Chapter 6?", "It is the first day of the December Ceremony, which the whole community attends, with a ceremony for each age group.", ["the yearly Ceremony", "the whole community attends"]],
  ["What rules are mentioned about hair ribbons, volunteer hours, jackets, haircuts and the clothing of Elevens?", "Girls wear hair ribbons until Nine; volunteer hours begin at Eight; Sevens get jackets that button in front; younger children's jackets button at the back; Eights get jackets with smaller buttons and pockets; Tens get haircuts; Elevens get new undergarments (and longer trousers for boys).", ["hair ribbons until Nine", "volunteer hours from Eight", "front-buttoned jackets at Seven", "haircuts at Ten / new clothing at Eleven"]],
  ["What is the reason for jackets that fasten at the back and at the front?", "Jackets that fasten at the back make small children help each other (interdependence). A front-buttoned jacket at Seven is a sign of independence.", ["back: children must help each other", "front: a sign of independence"]],
  ["Who attended the Ceremony and how long did it go on for?", "The whole community attended. It lasted two days.", ["everyone in the community", "two days"]],
  ["Describe the Naming Ceremony.", "The newchildren become Ones: each is given a name and handed to its new family unit by the Nurturers.", ["newchildren get names", "they are given to their family units"]],
  ["What happened to Gabriel? What was unusual about this?", "He was not named or given to a family. He got an extra year at the Nurturing Center — a reprieve. Usually such a newchild would be released.", ["he was given an extra year / reprieve", "normally he would have been released"]],
  ["What did each of Jonas's family members have to promise? How did they do this?", "They signed a pledge not to become attached to Gabriel and to give him up when the time came.", ["not to become attached", "signed a pledge"]],
  ["Why would a newchild be considered inadequate, and what would happen to that child?", "If it didn't grow or develop properly (for example, didn't sleep well or gain weight). It would be released.", ["didn't develop / thrive well", "it would be released"]],
  ["Describe what happened to Caleb.", "A four-year-old named Caleb had drowned in the river (a Loss). His family received a new newchild, also named Caleb.", ["Caleb drowned / was lost in the river", "the family got a new child named Caleb"]],
  ["Explain the difference between Release and Loss.", "Release is a planned, official sending-away; the person's name is not used again. Loss is an accident, like drowning; there is a Ceremony of Loss, and the name may be given to a new child.", ["Release is planned / decided", "Loss is an accident", "a lost person's name can be given again"]],
  ["Describe Fritz and how his behavior reflected on his parents.", "Fritz was messy and careless and often broke small rules. His parents received many notices and were embarrassed — it made them look like poor parents.", ["Fritz was careless / broke rules", "his parents were embarrassed / it looked bad for them"]],
  ["What was mentioned about the Matching of Spouses?", "The Committee of Elders matches spouses very carefully (by personality, intelligence and interests). A couple must wait and be watched for some time before they can apply for children.", ["the Committee of Elders chooses", "carefully, by personality and interests", "they wait before applying for children"]],
];

const ch7: Q[] = [
  ["What was the importance of the original numbers? When were they used?", "Each newchild got a number at birth. It was used before the Naming and to line the children up in order at the Ceremonies — Jonas is Nineteen.", ["a birth number for each child", "used before the Naming / to call them in order"]],
  ["At what age did developmental differences even out?", "By about Twelve — after that, age matters very little.", ["about Twelve"]],
  ["What did the Chief Elder talk about in her opening speech?", "She looked back on their childhood and spoke about the responsibilities and training to come.", ["looking back at childhood", "the coming responsibilities / training"]],
  ["How did the Chief Elder talk about the about-to-become Twelves?", "She said they had been carefully observed, and that this Ceremony is where their differences are acknowledged and honored.", ["they were watched carefully", "their differences are now honored"]],
  ["How was each new Twelve's Assignment announced?", "The Chief Elder said something personal about the child's qualities and explained why the Assignment suited them; then the community applauded.", ["the Chief Elder described their qualities", "explained why the Assignment fits"]],
  ["What was the job of an Instructor of Threes?", "To teach the Threes — especially to use precise language — and to discipline them when they made mistakes.", ["teach the Threes", "precise language", "discipline"]],
  ["Describe the punishment for small children.", "They were smacked with the discipline wand.", ["smacked with the discipline wand"]],
  ["Describe the incident where Asher confused \"snack\" and \"smack\".", "As a Three, Asher asked for a \"smack\" when he meant a \"snack\", so he was smacked with the discipline wand each time. He stopped talking for a while until he learned to say it correctly.", ["he said smack instead of snack", "he was smacked each time", "he stopped speaking for a while"]],
  ["What Assignment does Asher get? Is it suitable for him? Why or why not?", "Assistant Director of Recreation. Yes — he is fun-loving and good at organizing games.", ["Assistant Director of Recreation", "suits him because he is playful / fun"]],
  ["What happened when Jonas's turn came to be called for his Assignment?", "The Chief Elder skipped him and went on to the next child.", ["he was skipped"]],
  ["Did anyone really think a mistake had been made? Why or why not?", "No. The Committee never makes mistakes, so people thought Jonas must have done something wrong.", ["no", "the Committee doesn't make mistakes"]],
  ["How did Jonas feel?", "Ashamed, confused and frightened — he didn't know what he had done wrong.", ["ashamed / humiliated", "confused / scared"]],
  ["How did the audience feel?", "Uncomfortable and embarrassed; they avoided looking at him.", ["uncomfortable / uneasy", "embarrassed for him"]],
];

const ch8to9: Q[] = [
  ["Why was the audience feeling ill at ease at the beginning of Chapter 8?", "Because Jonas had been skipped and they didn't know why.", ["Jonas had been skipped"]],
  ["How did Jonas feel?", "Humiliated, frightened and confused.", ["ashamed / humiliated", "frightened"]],
  ["Why had Jonas been skipped when Assignments were given?", "He had not been assigned — he had been selected, which is different and very rare.", ["he was selected, not assigned"]],
  ["What has Jonas been selected for?", "To be the next Receiver of Memory.", ["Receiver of Memory"]],
  ["What happened the last time a Receiver was selected?", "It ended in failure, about ten years ago. People felt terrible about it and don't talk about it.", ["it failed", "ten years ago", "it is not spoken about"]],
  ["What does the Committee of Elders continue to do to those in training? Why?", "They keep observing them, to make sure they are suited to their Assignments.", ["they keep watching them", "to check they're suitable"]],
  ["With whom does the Receiver train?", "Alone, with the current Receiver — an old man (the Giver).", ["the current Receiver / the old man"]],
  ["When was Jonas identified as a possible Receiver?", "Many years earlier — the Elders had been watching him for a long time.", ["many years ago"]],
  ["List the qualities a Receiver must have.", "Intelligence, integrity, courage, wisdom and the Capacity to See Beyond.", ["intelligence", "integrity", "courage", "wisdom", "Capacity to See Beyond"]],
  ["What unpleasant experience is involved in Jonas's training?", "Physical pain.", ["pain"]],
  ["What is the final quality that Jonas has, which can only be named but not described?", "The Capacity to See Beyond.", ["the Capacity to See Beyond"]],
  ["What was the meaning of the audience chanting his name?", "It showed that the community accepted him and honored him in his new role.", ["acceptance", "honor / respect"]],
  ["After the Ceremony, how did Jonas feel about his selection and his relationship with the others?", "Proud but also frightened, and separated from the others — his friends already treated him differently.", ["proud", "afraid / worried", "apart from his friends"]],
  ["What do Jonas's parents tell him about the previous person selected?", "That she was a female, and that her name must never be spoken because the failure was so terrible.", ["it was a girl / female", "her name is not spoken"]],
  ["What were Jonas's new rules?", "Go straight to the Annex after school; he is exempt from rules about rudeness; no medication for anything related to training; he may not discuss his training or tell his dreams; he may not apply for release; and he may lie.", ["go to the Annex after school", "can't discuss training", "no pain medication", "may ask rude questions", "may lie"]],
  ["Which rules surprised him?", "The rule allowing him to lie, the rule against medication for pain, and being allowed to be rude.", ["he may lie", "no medication for pain"]],
  ["Which rules did he feel were acceptable?", "Going to the Annex after school and not discussing his training seemed manageable to him.", ["going to the Annex", "not discussing training / dreams"]],
  ["What were Jonas's thoughts about telling lies?", "He wondered whether other adults had also been told they may lie. If so, he could never be sure anyone was telling the truth.", ["maybe others are allowed to lie too", "then he could never know the truth"]],
];

const ch10: Q[] = [
  ["Jonas says, \"Well, everything's different now.\" Name some differences.", "He goes to the Annex for training instead of recreation, he can't talk about his training, he is allowed to lie and ask rude questions, and his friends treat him differently.", ["training at the Annex", "secrecy / can't discuss it", "new rules (lying, rudeness)"]],
  ["What did the Attendant do when Jonas entered that was different?", "She stood up to show respect and unlocked the door for him.", ["stood up (respect)", "unlocked the door"]],
  ["What is special about the doors in the Annex? Why?", "They are locked — the only locked doors in the community — to protect the Receiver's privacy.", ["they are locked", "privacy"]],
  ["Describe the differences between the Annex and family dwelling units.", "The Annex has locked doors, richer furniture with soft upholstery and carvings, a speaker that can be turned off, and walls covered with books.", ["locked doors", "nicer furniture", "books", "speaker can be turned off"]],
  ["Which difference impresses Jonas the most?", "The books — shelves full of them, when families only have a dictionary, a community book and the Book of Rules.", ["the books"]],
  ["Describe the Receiver.", "An old, tired-looking man with a beard and pale eyes like Jonas's.", ["old and tired", "pale eyes like Jonas"]],
  ["What is the difference between the way the Community views old age and the way we do today?", "In the community the Old live apart in the House of the Old and are released; we usually live with or visit older family members, and they are part of family life.", ["community: the Old live separately / are released", "today: the old stay part of families"]],
  ["Why is the Receiver tired?", "Carrying all the memories of the world is a heavy burden.", ["the memories are a heavy burden"]],
  ["Whose memories does Jonas think he will receive, and whose will he really receive?", "He thinks he will hear the old man's own memories, but he will receive the memories of the whole world, going back generations.", ["he thinks: the old man's own life", "really: the whole world's / past generations' memories"]],
  ["What doesn't Jonas understand about the concept of \"the whole world\"?", "He only knows his own community. He has no idea there is anything beyond it, or what came before.", ["he only knows the community", "he doesn't know about anything beyond / before"]],
  ["What things does the Receiver mention that Jonas doesn't know about?", "Snow, sleds, hills, and sunshine.", ["snow / sled / hill"]],
  ["How does the Receiver transmit a memory to Jonas?", "He places his hands on Jonas's bare back.", ["hands on Jonas's bare back"]],
  ["What was different about the speaker in the Annex?", "The Receiver could turn it off, so they had privacy.", ["it could be turned off"]],
];

const ch11: Q[] = [
  ["What is the first memory that is transmitted to Jonas?", "A sled ride down a snowy hill.", ["sledding downhill in the snow"]],
  ["Why does Jonas not know what snow is?", "Snow no longer exists — Climate Control got rid of it when the community chose Sameness.", ["no snow because of Climate Control / Sameness"]],
  ["Describe what Jonas experiences.", "He feels cold air and snowflakes, sits on a sled at the top of a hill and slides down fast, feeling joy and excitement.", ["cold and snowflakes", "sliding down a hill on a sled", "excitement / joy"]],
  ["How did Jonas feel after the experience?", "Breathless, delighted and amazed — he wanted to do it again.", ["excited / delighted", "wanted more"]],
  ["How did the Receiver feel after the experience?", "A little lighter, because the memory was no longer his — but tired.", ["lighter (he gave the memory away)", "tired"]],
  ["Why was snow got rid of?", "It made growing food difficult and made transport hard.", ["bad for growing food", "made transport difficult"]],
  ["What is Climate Control and why was it introduced?", "Control of the weather, part of Sameness, so the weather is always the same and crops and transport are not disturbed.", ["controlling the weather", "for farming and transport / Sameness"]],
  ["Why were hills a problem?", "They made it hard to move goods — trucks and buses went slowly — so they were got rid of.", ["they slowed transport of goods"]],
  ["What was the second memory transmitted to Jonas?", "Sunshine — warmth on his face.", ["sunshine / warmth"]],
  ["How did Jonas find the first two experiences?", "Wonderful and pleasant.", ["wonderful / enjoyable"]],
  ["What painful memory does Jonas receive?", "Sunburn.", ["sunburn"]],
  ["What are the new names for Jonas and the old man?", "Jonas is now the Receiver, and the old man asks to be called the Giver.", ["Jonas = the Receiver", "the old man = the Giver"]],
];

const ch12: Q[] = [
  ["How did Gabriel behave at night?", "He was restless and fretful and woke up crying.", ["restless", "cried / woke up"]],
  ["How had Jonas slept and what had he dreamed about?", "He slept deeply and dreamed about the sled ride — feeling that something important and good was waiting beyond the bottom of the hill.", ["the sled ride", "something important beyond"]],
  ["How did Jonas feel at school the next day?", "Different and apart from the others, because he couldn't talk about his training like they did.", ["apart / different", "couldn't share his training"]],
  ["Why didn't Jonas tell Fiona why he had stayed late at the Annex?", "His rules forbid him to talk about his training.", ["not allowed to discuss training"]],
  ["What did Fiona have to learn about caring for the Old?", "Things like bathing and feeding them — and that the Old are disciplined with the discipline wand, like small children.", ["caring tasks (bathing, feeding)", "the Old are smacked with the discipline wand"]],
  ["Why was Jonas late for the Giver?", "He stayed to talk with Fiona.", ["talking with Fiona"]],
  ["Describe what happened to Fiona.", "Jonas saw her hair change for a moment, the way the apple had changed.", ["her hair changed / looked different"]],
  ["How does the Giver confirm what he thinks is happening to Jonas?", "He asks Jonas to recall the sled ride and to look at the sled closely.", ["he makes Jonas remember the sled"]],
  ["What happens when Jonas recalls the sled ride?", "He sees that the sled has the same quality — it is red.", ["the sled is red"]],
  ["How does the Giver explain what is happening to Jonas?", "Jonas is beginning to see the color red — his way of Seeing Beyond.", ["seeing the color red", "Seeing Beyond"]],
  ["Why did colors disappear?", "When the people chose Sameness, they gave up color (and differences) to have control.", ["Sameness", "people chose to give up differences"]],
  ["Jonas says, \"We shouldn't have!\" What is he referring to, and what is the Giver's reaction?", "To giving up colors and choice for Sameness. The Giver is surprised he understood so quickly; it took the Giver much longer.", ["giving up color / choice", "the Giver is impressed he understood so fast"]],
  ["What memory does the Giver transmit to help Jonas understand color?", "A rainbow.", ["a rainbow"]],
];

const ch13: Q[] = [
  ["What did Jonas mean when he said, \"It isn't fair that nothing has color!\"?", "That people miss out on beauty and on the chance to choose; he wants everyone to have color.", ["people miss beauty", "they should be able to choose"]],
  ["Why is choosing not safe, according to the community?", "People might make the wrong choices — for example choosing the wrong spouse or job.", ["people could choose wrong"]],
  ["Why was Jonas often angry with his groupmates?", "They were happy with a life without color or real feelings and couldn't understand what they were missing.", ["they're satisfied / don't understand", "they lack feelings and color"]],
  ["Describe the startling and disturbing memory the Giver transmitted to Jonas.", "Men killing an elephant for its tusks, and another elephant grieving over the body.", ["an elephant killed for its tusks", "another elephant mourning"]],
  ["What did Jonas try to do to his father and sister one night?", "He tried to give them a memory (of color) by touching them, but nothing happened.", ["tried to transmit a memory", "it didn't work"]],
  ["What happens to parents when their children grow up?", "They go to live with the Childless Adults.", ["live with the Childless Adults"]],
  ["What problems will Jonas have if he receives a spouse?", "He won't be able to share his memories or books with them, because he must keep his training secret.", ["can't share memories / training"]],
  ["Why are books forbidden to citizens?", "Books hold knowledge and memories of the past, which could make people question their life.", ["they contain the past / knowledge", "could make people question things"]],
  ["When is the Receiver called upon to give advice?", "When the Committee of Elders faces something new that they have no experience of.", ["when the Elders face something new"]],
  ["What is the Giver's opinion about giving advice?", "He says they seldom ask, because people don't want change.", ["they rarely ask", "people don't want change"]],
  ["What happened when the failed Receiver's memories were released?", "They went back to the people, who suffered from them and couldn't cope — it was chaos.", ["memories returned to the people", "people suffered / chaos"]],
  ["What does the Giver say about the Instructors?", "They know facts, but they have no memories, so they have no real wisdom.", ["they know facts, not real memories / wisdom"]],
  ["What do you think the Giver means when he says, \"A great honor\"?", "He says it bitterly. It is called an honor, but it is really a painful, lonely burden.", ["said with irony / bitterness", "it is really a burden"]],
  ["Why did the Giver sometimes send Jonas away?", "He was in too much pain himself to train him.", ["the Giver was in pain"]],
  ["What did Jonas do on those days and what did he think about?", "He walked alone by the river and thought about the memories and what he was learning.", ["walked by the river", "thought about the memories"]],
];

const ch14to15: Q[] = [
  ["Describe what happened this time when Jonas rode on the sled.", "The sled hit ice, he crashed and broke his leg — terrible pain.", ["he crashed", "broke his leg / great pain"]],
  ["How did Jonas feel after the experience?", "In great pain; he limped home.", ["in pain"]],
  ["How did Jonas feel that night in his sleepingroom, and why?", "His leg still hurt, but he wasn't allowed any relief-of-pain medication, and he felt alone because he couldn't tell anyone.", ["pain without medication", "lonely / couldn't tell anyone"]],
  ["For what issue did the Giver use his memory of hunger to advise the Community?", "When they wanted to increase the population (more births), he warned them it could lead to hunger and starvation.", ["the idea of more births / bigger population", "it could cause starvation"]],
  ["How did the Giver use his wisdom to advise the community?", "He used the memory of starvation to advise them not to increase the number of births.", ["used the hunger memory", "advised against more births"]],
  ["What does Jonas think is not fair?", "That the Giver has to carry all the painful memories alone while everyone else has none. The memories should be shared.", ["the Giver suffers alone", "memories should be shared"]],
  ["How was Gabriel progressing?", "Not well — he still didn't sleep through the night, and he might be released.", ["not sleeping through the night", "might be released"]],
  ["What was about to happen to the twins about to be born, and how was the decision made?", "The smaller twin would be released and the bigger one kept. The decision is made by weighing them.", ["the smaller twin is released", "by weighing them"]],
  ["What does Jonas suggest about Gabriel at night?", "That Gabriel's crib be moved into his own sleepingroom.", ["Gabe sleeps in Jonas's room"]],
  ["How does Jonas comfort Gabriel when he is restless during the night?", "He puts his hand on Gabe's back and transmits a calm, peaceful memory.", ["hand on his back", "gives him a soothing memory"]],
  ["What power did Jonas realize he had that frightened him, and what did he decide?", "He could transmit memories to Gabe. He decided not to tell anyone (and not to do it again).", ["he can give memories to Gabe", "keeps it secret"]],
  ["Why did Jonas not go away at the beginning of Chapter 15?", "The Giver was in terrible pain, and Jonas wanted to help him.", ["he wanted to help the Giver"]],
  ["What did Jonas do to help the Giver?", "He asked the Giver to give him some of the pain, to share the burden.", ["took some of the painful memory"]],
  ["Describe what Jonas experienced.", "A memory of war: a battlefield full of wounded and dying soldiers, and a dying boy begging for water.", ["war / battlefield", "wounded and dying soldiers", "a boy asking for water"]],
  ["How did the Giver feel after the experience?", "Sorry and ashamed; he asked Jonas to forgive him.", ["sorry / asked forgiveness"]],
];

const ch16to17: Q[] = [
  ["Describe Jonas's feelings at the beginning of Chapter 16.", "He didn't want to go back to the Annex — the pain had made training feel like a burden.", ["reluctant to go", "afraid of pain"]],
  ["Describe some of the good memories Jonas received.", "A birthday party, art in museums, riding a horse, camping, swimming and a family holiday celebration.", ["happy memories (e.g. birthday, museum, horses, camping)"]],
  ["What is the Giver's favorite memory?", "A family celebrating Christmas: grandparents, candles, a decorated tree, presents and a feeling of love.", ["a family holiday / Christmas", "grandparents", "love / warmth"]],
  ["Why did Jonas not understand what grandparents were?", "In the community there are no grandparents — adults lose contact with their parents.", ["no grandparents in the community"]],
  ["What happens to the contact between adults and their parents?", "It ends; parents go to live with the Childless Adults and later the House of the Old.", ["no contact after children grow up"]],
  ["What new feeling does Jonas experience?", "Love.", ["love"]],
  ["What does Jonas wish the Giver could be to him?", "His grandparent.", ["a grandfather"]],
  ["How is the impractical side of love and family explained?", "The Giver says that living like that was dangerous (open fires, risks) and that the community chose an orderly, safe life instead.", ["it was dangerous / less safe", "the community chose order and safety"]],
  ["How do Jonas's parents react when he asks them if they love him?", "They laugh gently and tell him to use precise language — \"love\" is too general and almost meaningless.", ["they laugh", "say 'love' is not precise language"]],
  ["Why does Jonas lie to his parents?", "To end the conversation — he says he understands, although he doesn't agree.", ["to stop the conversation / pretend to accept"]],
  ["Why does Jonas talk to Gabriel while he's asleep?", "To share feelings he can't tell anyone else, like wishing they could have love.", ["he can't say these things to anyone else", "love"]],
  ["Why does Jonas stop taking his pill?", "He wants to keep his feelings and dreams.", ["to keep his feelings"]],
  ["How did Jonas feel since he had stopped taking his pills?", "His feelings became much stronger and deeper.", ["stronger, deeper feelings"]],
  ["How were Jonas's feelings different from other citizens' feelings?", "His feelings were deep; theirs were shallow.", ["his deep, theirs shallow"]],
  ["What game were the children playing?", "A war game — good guys and bad guys.", ["a war game"]],
  ["How did the game affect Jonas?", "It upset him because of his memory of war. He told them not to play it and cried.", ["he was upset", "remembered the war", "told them to stop"]],
  ["Jonas was \"overwhelmed with feelings of loss\". What had he lost?", "His closeness with his friends — they couldn't understand him any more.", ["friendship / connection", "they can't understand him"]],
  ["Describe what happens when identical twins are born.", "The smaller twin is released and the other goes to the Nurturing Center.", ["the smaller one is released"]],
  ["What Assignment does Mother suggest for Lily and why?", "Storyteller, because Lily chatters so much.", ["Storyteller", "she talks a lot"]],
];

const ch18to20: Q[] = [
  ["At the end of Chapter 18, why does the Giver tell Jonas to stay away from the river?", "If Jonas were lost in the river, all his memories would return to the people, who would suffer. The Giver is thinking about how he could help them if that happened.", ["memories would go back to the people", "the Giver is thinking about a plan"]],
  ["Who was the previous Receiver and what happened to her?", "Rosemary, the Giver's daughter. After five weeks of training she asked to be released, and her memories went back to the people.", ["Rosemary", "the Giver's daughter", "asked to be released"]],
  ["What does Jonas see on the video of the twins' release?", "His father weighs the twins and injects the smaller one in the forehead, killing it, then puts the body down a chute.", ["his father kills the smaller twin with an injection", "puts the body in a chute"]],
  ["How does Jonas feel when he realizes what release really is?", "Horror, grief and anger — his father had lied, and the community kills people.", ["horror / shock", "anger at the lie"]],
  ["What does Jonas realize about Fiona?", "She is being trained to release the Old, and she will do it efficiently.", ["she will release (kill) the Old"]],
  ["What plan do Jonas and the Giver make?", "Jonas will escape to Elsewhere so that his memories return to the people; the Giver will stay to help them cope.", ["Jonas leaves the community", "memories return to the people", "the Giver stays to help"]],
  ["Why won't the Giver go with Jonas?", "He must stay to help the people bear the memories — and he is too weak for the journey.", ["help the community with the memories", "too weak"]],
  ["What did the Giver 'hear beyond'?", "Music.", ["music"]],
];

const ch21: Q[] = [
  ["When and why does Jonas flee?", "That same night, because his father says Gabriel will be released the next morning.", ["that night", "to save Gabriel from release"]],
  ["What emotions does Jonas feel when he leaves?", "Fear, sadness and determination.", ["fear", "determination", "sadness"]],
  ["What rules has Jonas broken?", "He left his dwelling at night, took food and his father's bicycle, and took Gabriel.", ["out at night", "took food", "took the bicycle / Gabe"]],
  ["When does Jonas plan to travel and when does he rest?", "He rides at night and hides and rests during the day.", ["travel at night", "rest by day"]],
  ["How do Jonas and Gabe hide from those looking for them?", "They hide under trees and bushes when the search planes fly over.", ["hide in trees / bushes"]],
  ["How does Jonas make sure Gabe doesn't make a noise when they are hiding?", "He transmits memories of sleep and exhaustion so Gabe sleeps.", ["gives him sleepy memories"]],
  ["What is Jonas most afraid of?", "The search planes finding them.", ["the planes / being caught"]],
  ["What does Jonas do to make it harder for the planes to find them?", "He transmits memories of snow and cold so their body heat can't be detected by the planes' heat-seeking sensors.", ["memories of cold / snow", "planes search for body heat"]],
];

const ch22: Q[] = [
  ["How does the landscape change?", "It becomes wild and uneven, with hills, waterfalls, birds and other wildlife.", ["hills / bumpy", "wildlife, waterfalls"]],
  ["Why does Jonas start to ride during daylight?", "The planes come less often.", ["fewer planes"]],
  ["What new things do Jonas and Gabe see?", "Birds, waterfalls, wildflowers and animals — things that don't exist in Sameness.", ["birds", "waterfalls", "animals"]],
  ["What is Jonas's main fear?", "That they will starve.", ["starvation / hunger"]],
  ["What do Jonas and Gabe eat?", "Fish he catches with a homemade net, and berries.", ["fish", "berries"]],
  ["Why does Jonas have mixed feelings about leaving?", "In the community he would have food, but no feelings or color, and Gabe would have been released.", ["food vs. feelings / freedom", "Gabe would have died"]],
  ["Why is it difficult for Jonas to ride the bicycle?", "The road is rough and hilly, and he has twisted his ankle.", ["rough, hilly road", "hurt ankle"]],
  ["What is different about the weather?", "It becomes cold, rainy, and then it snows.", ["cold", "rain / snow"]],
  ["Why do Jonas and Gabe cry?", "They are cold, hungry and exhausted.", ["cold", "hungry", "tired"]],
];

const ch23: Q[] = [
  ["Why is Jonas losing hope?", "He is freezing, starving and exhausted, and he fears Gabe will die.", ["cold", "hunger", "exhaustion"]],
  ["How does Jonas help Gabe cope with the extreme weather?", "He transmits a memory of sunshine and warmth to him.", ["memory of sunshine / warmth"]],
  ["Why does Jonas leave the bicycle?", "It can't go up the snowy hill.", ["can't ride up the snowy hill"]],
  ["What has happened to the memories?", "They are fading; he has almost none left.", ["fading / almost gone"]],
  ["What does the brief memory of warmth do to Jonas?", "It gives him a little strength and hope to go on.", ["strength / hope"]],
  ["What happens to Jonas as he gets closer to the top of the hill?", "He is numb with cold, but he remembers his family, friends and the Giver, and that happiness helps him reach the top.", ["numb with cold", "remembers loved ones", "it gives him strength"]],
  ["Why does he recognize the place?", "It is the hill from the very first memory the Giver gave him.", ["the hill from the sled memory"]],
  ["What does the sled waiting at the top of the hill represent?", "Hope — the memory becoming real and the way to Elsewhere.", ["hope", "the memory comes true / way to Elsewhere"]],
  ["What season is it?", "Winter (December, the time of the Ceremonies).", ["winter"]],
  ["Why do you think the author chose this time of the year for the Ceremony and the escape?", "Any reasonable idea, e.g. winter is a time of holidays, endings and new beginnings, light in the darkness and hope.", ["gives a reason (new beginnings / holidays / hope)"]],
  ["What happens to the boys when they reach the bottom of the hill?", "They see lights in windows and hear music and singing — it seems a loving home is waiting for them, but the ending is left open.", ["lights in houses", "music / singing", "open ending"]],
];

export const theGiver: UnitInput = {
  id: "the-giver",
  title: "The Giver",
  tagline: "Lois Lowry's community of Sameness — and the boy who remembers",
  note: "Vocabulary exercises come from your workbook. The guided questions are about the novel, so read the chapters first.",
  accent: "teal",
  lessons: [
    { id: "giver-ch1-2-vocab", title: "Chapters 1–2: Words", subtitle: "Matching, fill-in and the crossword", source: WB("22–24"), items: giverVocab1to2 },
    { id: "giver-ch1-4-questions", title: "Chapters 1–4: The Community", subtitle: "Rules, rituals and ceremonies", source: WB("21, 26"), items: [...questions("giver.ch1-2", "chapters 1–2", ch1to2, { draft: false, page: "21" }), ...questions("giver.ch3-4", "chapters 3–4", ch3to4, { draft: false, page: "26" })] },
    { id: "giver-ch3-4-vocab", title: "Chapters 3–4: Words", subtitle: "Feelings, sounds and movements", source: WB("28–31"), items: giverVocab3to4 },
    { id: "giver-ch5-7-vocab", title: "Chapters 5–7: Words", source: WB("38–39"), items: giverVocab5to7 },
    { id: "giver-ch5", title: "Chapter 5: Dreams and the Stirrings", source: WB("33"), items: questions("giver.ch5", "chapter 5", ch5, { page: "33" }) },
    { id: "giver-ch6-7", title: "Chapters 6–7: The Ceremony", source: WB("34–35"), items: [...questions("giver.ch6", "chapter 6", ch6, { page: "34" }), ...questions("giver.ch7", "chapter 7", ch7, { page: "35" })] },
    { id: "giver-ch8-9-vocab", title: "Chapters 8–9: Words", source: WB("42–44"), items: giverVocab8to9 },
    { id: "giver-ch8-9", title: "Chapters 8–9: The Receiver of Memory", source: WB("41"), items: questions("giver.ch8-9", "chapters 8–9", ch8to9, { page: "41" }) },
    { id: "giver-ch10-12-vocab", title: "Chapters 10–12: Words", subtitle: "Crossword and new words", source: WB("47–48"), items: giverVocab10to12 },
    { id: "giver-ch10-12", title: "Chapters 10–12: Snow, Sun and Red", source: WB("46–47"), items: [...questions("giver.ch10", "chapter 10", ch10, { page: "46" }), ...questions("giver.ch11", "chapter 11", ch11, { page: "46" }), ...questions("giver.ch12", "chapter 12", ch12, { page: "47" })] },
    { id: "giver-ch13-15-vocab", title: "Chapters 13–15: Words", source: WB("52–54"), items: giverVocab13to15 },
    { id: "giver-ch13-15", title: "Chapters 13–15: Pain and Wisdom", source: WB("51"), items: [...questions("giver.ch13", "chapter 13", ch13, { page: "51" }), ...questions("giver.ch14-15", "chapters 14–15", ch14to15, { page: "51" })] },
    { id: "giver-ch16-17-vocab", title: "Chapters 16–17: Words", source: WB("57–58"), items: giverVocab16to17 },
    { id: "giver-ch16-17", title: "Chapters 16–17: Love and Loss", source: WB("56"), items: questions("giver.ch16-17", "chapters 16–17", ch16to17, { page: "56" }) },
    { id: "giver-ch18-19-vocab", title: "Chapters 18–19: Words", source: WB("62–63"), items: giverVocab18to19 },
    { id: "giver-ch18-20", title: "Chapters 18–20: The Truth About Release", source: WB("64–66"), items: questions("giver.ch18-20", "chapters 18–20", ch18to20) },
    { id: "giver-ch21-23", title: "Chapters 21–23: Escape to Elsewhere", source: WB("67–68"), items: [...questions("giver.ch21", "chapter 21", ch21, { page: "67" }), ...questions("giver.ch22", "chapter 22", ch22, { page: "67" }), ...questions("giver.ch23", "chapter 23", ch23, { page: "68" })] },
    { id: "giver-sameness", title: "Dictionary of Sameness", subtitle: "The community's careful words", source: WB("70"), items: giverSameness },
  ],
};
