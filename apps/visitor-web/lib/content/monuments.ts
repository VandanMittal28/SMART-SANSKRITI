// Monument guide content.
//
// Source: apk/ui/lib/monumentData.ts (copied 2026-10-14; the original is not
// modified). Edits: typographic fixes (apostrophes, thousands separators,
// British spelling), and two unsupported claims softened rather than
// repeated: Mysore Palace "the third most visited monument in India" became
// "one of India's most visited monuments", and Kedarnath "miraculously
// survived" became "survived". No facts were added. The text has not been
// independently reviewed; pages say so and point visitors to the
// Archaeological Survey of India for visiting details.
//
// The three passages are labelled "Origins", "Later history" and "Today"
// rather than the source's construction/colonial/modern keys, because some
// "colonial" passages describe later events (e.g. 1984 at the Golden Temple).

export type MonumentId =
  | "taj-mahal"
  | "agra-fort"
  | "red-fort"
  | "qutub-minar"
  | "gateway-india"
  | "hampi"
  | "golden-temple"
  | "kedarnath"
  | "meenakshi"
  | "mysore-palace"
  | "hawa-mahal"
  | "charminar"
  | "victoria-memorial"
  | "ajanta"
  | "konark"
  | "india-gate";

export type Monument = {
  id: MonumentId;
  name: string;
  /** Hindi name, used for matching Hindi questions and as a label. */
  nameHi: string;
  /** City and state as written in the source. */
  place: string;
  summary: string;
  origins: string;
  laterHistory: string;
  today: string;
  /** Other names visitors or the recognition model may use (lower case). */
  aliases: string[];
  /** Narration recordings copied from apk/ui/public/audio, if any. */
  audio?: { en: string; hi: string };
};

export const MONUMENTS: readonly Monument[] = [
  {
    id: "taj-mahal",
    name: "Taj Mahal",
    nameHi: "ताज महल",
    place: "Agra, Uttar Pradesh",
    summary: "UNESCO ivory-white marble mausoleum built by Shah Jahan.",
    origins:
      "Built between 1632 and 1653 by Mughal Emperor Shah Jahan in memory of his wife Mumtaz Mahal. Over 20,000 artisans worked on this ivory-white marble mausoleum in Agra.",
    laterHistory:
      "During British rule, Lord Curzon ordered a major restoration in 1908, replacing missing gems and restoring the gardens to their original Mughal design.",
    today:
      "Today the Taj Mahal welcomes over 7 million visitors annually. It was declared a UNESCO World Heritage Site in 1983 and is one of the Seven Wonders of the World.",
    aliases: ["taj mahal", "ताजमहल", "ताज महल"],
    audio: { en: "/audio/taj-mahal-en.mp3", hi: "/audio/taj-mahal-hi.mp3" },
  },
  {
    id: "agra-fort",
    name: "Agra Fort",
    nameHi: "आगरा का किला",
    place: "Agra, Uttar Pradesh",
    summary: "UNESCO red sandstone fort, former seat of Mughal power.",
    origins:
      "Emperor Akbar began construction in 1565, raising the massive red sandstone walls and gates. His grandson Shah Jahan later added white marble palaces inside, including the Khas Mahal and Sheesh Mahal, during the 1630s and 1640s.",
    laterHistory:
      "After the 1857 uprising, British forces took control and converted large parts of the fort into a military garrison, demolishing many original Mughal buildings to make room for barracks.",
    today:
      "A UNESCO World Heritage Site since 1983. Visitors can see the Musamman Burj, the marble tower where Shah Jahan was later imprisoned by his own son Aurangzeb, gazing out at the Taj Mahal until his death in 1666.",
    aliases: ["agra fort", "red fort of agra", "red fort agra", "lal qila agra", "आगरा किला", "आगरा का किला"],
  },
  {
    id: "red-fort",
    name: "Red Fort",
    nameHi: "लाल किला",
    place: "Delhi",
    summary: "Massive Mughal fort where Independence Day is celebrated.",
    origins:
      "Constructed between 1638 and 1648 by Emperor Shah Jahan as the main residence of Mughal emperors. Built from red sandstone, it served as the political centre of the Mughal state.",
    laterHistory:
      "After the 1857 uprising, the British took control and used it as a military garrison. Many original Mughal structures were demolished and replaced with barracks.",
    today:
      "Now a UNESCO World Heritage Site. Every Independence Day, the Prime Minister hoists the national flag here and addresses the nation.",
    aliases: ["red fort", "lal qila", "lal quila", "lal kila", "लाल किला"],
    audio: { en: "/audio/red-fort-en.mp3", hi: "/audio/red-fort-hi.mp3" },
  },
  {
    id: "qutub-minar",
    name: "Qutub Minar",
    nameHi: "क़ुतुब मीनार",
    place: "Delhi",
    summary: "World's tallest brick minaret, begun in 1193.",
    origins:
      "Construction began in 1193 by Qutb ud-Din Aibak. Standing 73 metres tall, it was the tallest minaret in the world when built and remains the tallest brick minaret today.",
    laterHistory:
      "British officers used the complex as a recreational area. Major Robert Smith restored the topmost storey in 1829 and added a cupola which was later removed.",
    today:
      "A UNESCO World Heritage Site visited by millions each year. Contains some of the earliest surviving examples of Islamic architecture in India.",
    aliases: ["qutub minar", "qutb minar", "qutab minar", "kutub minar", "qutub", "क़ुतुब मीनार", "कुतुब मीनार", "कुतुब"],
    audio: { en: "/audio/qutub-minar-en.mp3", hi: "/audio/qutub-minar-hi.mp3" },
  },
  {
    id: "gateway-india",
    name: "Gateway of India",
    nameHi: "गेटवे ऑफ़ इंडिया",
    place: "Mumbai, Maharashtra",
    summary: "1924 basalt arch; the last British troops left India through it.",
    origins:
      "Built in 1924 to commemorate the visit of King George V and Queen Mary to India in 1911. Designed in Indo-Saracenic style using yellow basalt stone by architect George Wittet.",
    laterHistory:
      "Served as the ceremonial entrance to India for British viceroys and governors. The last British troops left India by passing through this gateway in 1948.",
    today:
      "Now one of Mumbai's most iconic landmarks. Surrounded by ferry services to Elephanta Caves and overlooking the Arabian Sea. A major tourist hotspot.",
    aliases: ["gateway of india", "gateway india", "गेटवे ऑफ़ इंडिया", "गेटवे ऑफ इंडिया"],
  },
  {
    id: "hampi",
    name: "Hampi",
    nameHi: "हम्पी",
    place: "Hampi, Karnataka",
    summary: "Ruins of the Vijayanagara Empire's capital, a UNESCO site.",
    origins:
      "Capital of the Vijayanagara Empire from 1336 to 1565. At its peak it was one of the largest cities in the world with a population of over 500,000 people.",
    laterHistory:
      "After the empire fell in 1565, Hampi was largely abandoned. British surveyors rediscovered and documented the ruins in the 19th century.",
    today:
      "A UNESCO World Heritage Site since 1986. Spread across 4,100 hectares with over 1,600 surviving remains of temples, palaces, and market streets.",
    aliases: ["hampi", "group of monuments at hampi", "virupaksha temple", "vittala temple", "vittala temple hampi", "stone chariot", "hampi chariot", "vijayanagara", "हम्पी"],
    audio: { en: "/audio/hampi-en.mp3", hi: "/audio/hampi-hi.mp3" },
  },
  {
    id: "golden-temple",
    name: "Golden Temple",
    nameHi: "स्वर्ण मंदिर",
    place: "Amritsar, Punjab",
    summary: "Holiest Sikh shrine, with a gold-plated dome and sacred pool.",
    origins:
      "The foundation was laid in 1588 by Guru Arjan Dev Ji, the fifth Sikh Guru. The temple was built at a lower level than the surrounding land as a symbol of humility.",
    laterHistory:
      "In 1984 the Indian Army launched Operation Blue Star to remove militants who had occupied the temple complex. The operation caused significant damage to the Akal Takht.",
    today:
      "The holiest shrine in Sikhism, visited by over 100,000 people daily. The community kitchen (langar) serves free meals to all visitors regardless of religion or background.",
    aliases: ["golden temple", "golden temple amritsar", "harmandir sahib", "darbar sahib", "स्वर्ण मंदिर", "हरमंदिर साहिब"],
  },
  {
    id: "kedarnath",
    name: "Kedarnath Temple",
    nameHi: "केदारनाथ मंदिर",
    place: "Kedarnath, Uttarakhand",
    summary: "One of the 12 Jyotirlingas, at 3,583 m in the Himalayas.",
    origins:
      "The current temple is believed to have been built by Adi Shankaracharya in the 8th century AD, though the site is mentioned in ancient texts like the Mahabharata.",
    laterHistory:
      "The temple remained largely untouched during British rule as it was considered a sacred Hindu site. Access was limited due to its extreme altitude and remote location.",
    today:
      "In 2013 a massive flash flood devastated the region but the temple structure survived. It is now one of the most visited pilgrimage sites in India.",
    aliases: ["kedarnath", "kedarnath temple", "केदारनाथ"],
  },
  {
    id: "meenakshi",
    name: "Meenakshi Amman Temple",
    nameHi: "मीनाक्षी अम्मन मंदिर",
    place: "Madurai, Tamil Nadu",
    summary: "Dravidian temple complex with 14 towering gopurams.",
    origins:
      "The temple was originally built around the 6th century BC though most of the current structure dates from the 16th and 17th centuries under the Nayak dynasty.",
    laterHistory:
      "During British rule the temple continued to function as an active place of worship. The British generally did not interfere with major Hindu temples in South India.",
    today:
      "One of the largest Hindu temples in the world, covering 14 acres. Its 14 gopurams are covered with thousands of colourful sculptures. Attracts 15,000 to 25,000 visitors daily.",
    aliases: ["meenakshi amman temple", "meenakshi temple", "meenakshi", "madurai temple", "मीनाक्षी"],
  },
  {
    id: "mysore-palace",
    name: "Mysore Palace",
    nameHi: "मैसूर पैलेस",
    place: "Mysore, Karnataka",
    summary: "Indo-Saracenic royal palace lit by nearly 100,000 bulbs.",
    origins:
      "The current palace was built between 1897 and 1912 after the previous wooden palace burned down. Designed by British architect Henry Irwin in the Indo-Saracenic style.",
    laterHistory:
      "The palace was the official residence of the Wadiyar dynasty, who ruled Mysore as a princely state under British suzerainty. The kingdom was known for its progressive governance.",
    today:
      "One of India's most visited monuments. During the Dasara festival the palace is illuminated by nearly 100,000 light bulbs.",
    aliases: ["mysore palace", "mysuru palace", "amba vilas", "मैसूर पैलेस", "मैसूर महल"],
  },
  {
    id: "hawa-mahal",
    name: "Hawa Mahal",
    nameHi: "हवा महल",
    place: "Jaipur, Rajasthan",
    summary: "The Palace of Winds, with 953 latticed windows, built in 1799.",
    origins:
      "Built in 1799 by Maharaja Sawai Pratap Singh. Designed by Lal Chand Ustad in the form of the crown of Lord Krishna. The 953 small windows were designed to allow royal ladies to observe street life.",
    laterHistory:
      "During the British Raj, Jaipur was a prominent princely state. The Hawa Mahal continued to be part of the City Palace complex and was maintained by the royal family.",
    today:
      "One of the most iconic symbols of Jaipur and Rajasthan. The unique five-storey facade is a favourite subject for photographers. It is now a protected monument under the Archaeological Survey of India.",
    aliases: ["hawa mahal", "hawa mahal jaipur", "palace of winds", "हवा महल"],
    audio: { en: "/audio/hawa-mahal-en.mp3", hi: "/audio/hawa-mahal-hi.mp3" },
  },
  {
    id: "charminar",
    name: "Charminar",
    nameHi: "चारमीनार",
    place: "Hyderabad, Telangana",
    summary: "1591 monument with four minarets, the symbol of Hyderabad.",
    origins:
      "Built in 1591 by Muhammad Quli Qutb Shah to commemorate the end of a deadly plague. The four minarets each stand 56 metres tall and the structure contains a mosque on the top floor.",
    laterHistory:
      "Hyderabad was a major princely state under the Nizams. The Charminar area became the heart of the old city with bustling bazaars around it including the famous Laad Bazaar.",
    today:
      "The defining landmark of Hyderabad. The surrounding Laad Bazaar is famous for bangles and pearls. Restoration work is ongoing by the Archaeological Survey of India.",
    aliases: ["charminar", "char minar", "चारमीनार", "चार मीनार"],
  },
  {
    id: "victoria-memorial",
    name: "Victoria Memorial",
    nameHi: "विक्टोरिया मेमोरियल",
    place: "Kolkata, West Bengal",
    summary: "White marble memorial to Queen Victoria, now a museum.",
    origins:
      "Built between 1906 and 1921 using white Makrana marble from Rajasthan. Designed by William Emerson in a mix of British and Mughal architectural styles.",
    laterHistory:
      "Commissioned by Lord Curzon as a memorial to Queen Victoria after her death in 1901. It was intended to rival the Taj Mahal and serve as a symbol of British power in India.",
    today:
      "Now a museum with a collection of 28,000 artefacts documenting the colonial era. The surrounding gardens are a popular public space in Kolkata.",
    aliases: ["victoria memorial", "victoria memorial kolkata", "विक्टोरिया मेमोरियल"],
  },
  {
    id: "ajanta",
    name: "Ajanta Caves",
    nameHi: "अजंता की गुफाएँ",
    place: "Aurangabad, Maharashtra",
    summary: "30 rock-cut Buddhist caves with celebrated ancient murals.",
    origins:
      "Carved between the 2nd century BC and 6th century AD by Buddhist monks. The 30 rock-cut caves contain some of the finest surviving examples of ancient Indian art and sculpture.",
    laterHistory:
      "Rediscovered by British officer John Smith in 1819 during a tiger hunt. The caves had been abandoned for centuries and were hidden by jungle growth.",
    today:
      "A UNESCO World Heritage Site since 1983. The paintings inside are considered masterpieces of Buddhist religious art. Conservation efforts are ongoing to preserve the fragile murals.",
    aliases: ["ajanta caves", "ajanta", "अजंता", "अजंता की गुफाएँ"],
    audio: { en: "/audio/ajanta-en.mp3", hi: "/audio/ajanta-hi.mp3" },
  },
  {
    id: "konark",
    name: "Konark Sun Temple",
    nameHi: "कोणार्क सूर्य मंदिर",
    place: "Konark, Odisha",
    summary: "13th-century temple to the Sun God, shaped as a giant chariot.",
    origins:
      "Built in the 13th century by King Narasimhadeva I of the Eastern Ganga dynasty. The entire temple is designed as a giant chariot of the Sun God with 24 intricately carved stone wheels.",
    laterHistory:
      "The temple fell into disrepair over centuries. The main tower collapsed before the colonial era. The British Archaeological Survey undertook preservation work in the early 20th century.",
    today:
      "A UNESCO World Heritage Site. The 24 wheels of the chariot are often used as a symbol of India and one wheel appears on the state emblem of Odisha.",
    aliases: ["konark sun temple", "konark", "konarak", "sun temple konark", "कोणार्क", "कोणार्क सूर्य मंदिर"],
    audio: { en: "/audio/konark-en.mp3", hi: "/audio/konark-hi.mp3" },
  },
  {
    id: "india-gate",
    name: "India Gate",
    nameHi: "इंडिया गेट",
    place: "New Delhi, Delhi",
    summary: "42-metre war memorial to 70,000 Indian soldiers of the First World War.",
    origins:
      "Designed by Edwin Lutyens and completed in 1931. Built as a memorial to 70,000 Indian soldiers who died fighting for the British Army during World War I. Names of 13,300 soldiers are inscribed on it.",
    laterHistory:
      "Originally called the All India War Memorial. It was the centrepiece of the ceremonial axis of New Delhi designed by Lutyens as the new imperial capital of British India.",
    today:
      "Now the site of the Amar Jawan Jyoti, an eternal flame honouring soldiers killed in the 1971 Indo-Pakistani War. A major landmark and evening gathering spot in Delhi.",
    aliases: ["india gate", "all india war memorial", "इंडिया गेट"],
  },
];

const BY_ID = new Map<string, Monument>(MONUMENTS.map((monument) => [monument.id, monument]));

export function getMonument(id: string | null | undefined): Monument | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function isMonumentId(value: unknown): value is MonumentId {
  return typeof value === "string" && BY_ID.has(value);
}
