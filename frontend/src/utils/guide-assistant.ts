import { guides as defaultGuides } from './content';
import type { Guide } from '../../../shared/src/types';
import { helpSuggestions, helpTopics, type HelpTopic } from './assistant-knowledge';
import { isFilipino } from '@shared/language.mjs';

export type GuideReply = {
  text: string;
  guide?: Guide;
  choices?: string[];
  link?: { href: string; label: string };
  topic?: string;
  steps?: string[];
  // Built-in help has no answer; the page may ask the local AI instead.
  fallback?: boolean;
  source?: 'verified' | 'generated';
  // The question was in Filipino, so labels around an AI answer are shown in Filipino.
  filipino?: boolean;
  pending?: boolean;
};

// Help topics describe TechCare itself. A question about a device or another service that does
// not mention a TechCare feature skips them (and the follow-up shortcut) so the AI can answer.
const deviceOrService =
  /\b(gmail|google|facebook|messenger|instagram|tiktok|youtube|microsoft|outlook|windows|apple|icloud|yahoo|zoom|teams|canvas|portal|laptop|computer|pc|phone|cellphone|tablet|ipad|iphone|android|mac|wi ?fi|wifi|internet|router|bluetooth|printer|scanner|monitor|screen|keyboard|mouse|speakers?|sound|audio|mic|microphone|camera|webcam|headphones|earbuds|battery|charger|usb|hdmi|projector|virus|malware|chrome|browser|excel|powerpoint|storage|fan|screenshot)\b/;
const techcareFeature =
  /\b(techcare|question|questions|post|posts|comment|comments|reply|replies|profile|dashboard|friend|friends|member|members|discussion|booth|moderator|feedback|lost and found)\b/;
const isDeviceQuestion = (text: string) =>
  deviceOrService.test(text) && !techcareFeature.test(text);

const topics = [
  {
    icon: 'desktop',
    pattern: /\b(slow|sluggish|startup|performance|lag|lagging|storage|windows)\b/,
  },
  {
    icon: 'wifi',
    pattern: /\b(wi[ -]?fi|internet|network|connection|connectivity|router|offline)\b/,
  },
  {
    icon: 'laptop',
    pattern: /\b(turn on|power|charger|charging|battery|black screen|won t start)\b/,
  },
  { icon: 'shield', pattern: /\b(suspicious|phishing|scam|fraud|spam|safety|hacked|malicious)\b/ },
];

function topicReply(topic: HelpTopic, detailed = false, fil = false): GuideReply {
  return {
    text: (fil && topic.answerFil) || topic.answer,
    topic: topic.id,
    link: topic.link,
    steps: detailed ? topic.steps : undefined,
    choices: detailed ? undefined : ['Show me the steps'],
  };
}

// Authored app knowledge and guides only: no account access, model, or remote request.
export function getGuideReply(
  message: string,
  previousTopic?: string,
  guides: Guide[] = defaultGuides,
): GuideReply {
  const text = message.toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
  // Conversational replies follow the person's language; guides and help topics stay in English.
  const fil = isFilipino(text);
  const say = (english: string, filipino: string) => (fil ? filipino : english);
  if (
    /\b(swollen|swelling|burning|smoke|sparks|overheating|too hot|namamaga|umuusok|nasusunog|sobrang init)\b/.test(
      text,
    )
  ) {
    return {
      text: say(
        'Stop using the device if its battery is swollen, it is unusually hot, or there is a burning smell. Seek qualified support instead of trying further troubleshooting.',
        'Itigil muna ang paggamit ng device kung namamaga ang battery, sobrang init nito, o may amoy na nasusunog. Magpatingin sa qualified na technician sa halip na subukan pang ayusin.',
      ),
      link: { href: '/booth', label: say('Find support', 'Humanap ng tulong') },
    };
  }
  // Small talk is matched with stretched letters collapsed ("hiiii" → "hi", "thank youuu" → "thank you").
  const casual = text.replace(/(.)\1+/g, '$1');
  if (/^(thanks?|thank ?(you|u)|thanx|tnx|ty|salamat)( (po|so much|a lot))?[!.~ ]*$/.test(casual)) {
    return {
      text: say(
        'You’re welcome! What else would you like to know about TechCare?',
        'Walang anuman! May iba ka pa bang gustong malaman tungkol sa TechCare?',
      ),
      topic: previousTopic,
    };
  }
  if (
    /^(hi|hiya|helo|hey|heya|hay|yo|sup|hola|help|god (morning|afternoon|evening|day)|kumusta|kamusta|musta)( (po|there|techcare|bot))?[!.?~ ]*$/.test(
      casual,
    )
  ) {
    return {
      text: say(
        'Hello! Ask me about using TechCare or troubleshooting a device. You can start with one of these questions.',
        'Kumusta! Magtanong ka tungkol sa paggamit ng TechCare o sa problema ng device mo. Puwede kang magsimula sa isa sa mga tanong na ito.',
      ),
      choices: helpSuggestions,
    };
  }
  if (
    /^(why|what|huh|ok|okay|oki|k|cool|nice|wow|lol|lmao|(ha|he)+|hm|ah|oh|eh|yes|yeah|ya|no|nope|sure|idk|bruh|test|testing|bakit|ano|sige|o|opo|hindi|di|talaga|weh|ayun|ganun)( po)?[!.?~ ]*$/.test(
      casual,
    )
  ) {
    return {
      text: say(
        'Could you tell me a bit more? Ask me about using TechCare or describe a device problem, or pick one of these questions.',
        'Puwede mo bang ikuwento nang mas detalyado? Magtanong tungkol sa TechCare o ilarawan ang problema ng device mo, o pumili ng isa sa mga tanong na ito.',
      ),
      choices: helpSuggestions,
    };
  }
  if (
    /^(show me (the )?steps|steps|tell me more|more details|how( do i do (that|it))?|what next|where( do i find (that|it))?)[!.? ]*$/.test(
      text,
    )
  ) {
    const topic = helpTopics.find((item) => item.id === previousTopic);
    if (topic) return topicReply(topic, true);
    const guide = guides.find((guide) => previousTopic === `guide-${guide.id}`);
    if (guide)
      return {
        text: 'Here are the guide steps again. Work through the checks in order:',
        guide,
        topic: previousTopic,
      };
    return { text: 'Which part of TechCare would you like help with?', choices: helpSuggestions };
  }
  if (
    !isDeviceQuestion(text) &&
    /\b(still|didn t|doesn t|did not|does not|not)\b.*\b(work|working|help|helped|fixed|solved)\b|no luck/.test(
      text,
    )
  ) {
    return {
      text: say(
        'Let’s get you more specific help. Use Ask the community and describe what you tried and what happened. I cannot inspect your account or device, so I cannot confirm the cause or make changes for you.',
        'Humingi tayo ng mas tiyak na tulong. Gamitin ang Ask the community at ikuwento kung ano ang nasubukan mo at ano ang nangyari. Hindi ko makikita ang account o device mo, kaya hindi ko makukumpirma ang dahilan o magagawa ang pagbabago para sa iyo.',
      ),
      link: { href: '/discussion', label: say('Open Discussion', 'Buksan ang Discussion') },
    };
  }
  const namedTopic = helpTopics.find((topic) => topic.question.toLowerCase() === text);
  if (namedTopic) return topicReply(namedTopic);
  const exact = guides.find((guide) => guide.title.toLowerCase() === message.trim().toLowerCase());
  const matchedIcons = topics
    .filter((topic) => topic.pattern.test(text))
    .map((topic) => topic.icon);
  const matches = guides.filter((guide) => matchedIcons.includes(guide.icon));
  if (exact || matches.length === 1) {
    const guide = exact || matches[0];
    return {
      text: say(
        'Here are the steps from our guide. Start with the first check:',
        'Ito ang mga hakbang mula sa guide namin (nasa English). Simulan sa unang check:',
      ),
      guide,
      topic: `guide-${guide.id}`,
      // Guides are English only, so a Filipino question asks the AI first: it has Filipino
      // verified fixes, and this guide is shown if the AI is off or has nothing better.
      fallback: fil || undefined,
    };
  }
  if (matches.length > 1)
    return {
      text: say(
        'I found a few possible guides. Which problem would you like to check first?',
        'May ilang guide na posibleng tugma. Alin ang gusto mong tingnan muna?',
      ),
      choices: matches.map((guide) => guide.title),
    };
  const topic = isDeviceQuestion(text)
    ? undefined
    : helpTopics.find((item) => item.matches.some((pattern) => pattern.test(text)));
  if (topic) return topicReply(topic, false, fil);
  return {
    text: say(
      'I don’t have a reliable answer for that in TechCare’s help content yet. I can explain the app’s features or share device guides. Try one of these questions, rephrase with a feature name, or ask the community for help.',
      'Wala pa akong maaasahang sagot diyan sa help content ng TechCare. Kaya kong ipaliwanag ang mga feature ng app o magbahagi ng device guides. Subukan ang isa sa mga tanong na ito, ulitin gamit ang pangalan ng feature, o magtanong sa community.',
    ),
    choices: helpSuggestions,
    link: {
      href: '/discussion',
      label: say('Browse community discussions', 'Tingnan ang community discussions'),
    },
    fallback: true,
  };
}
