export interface MonumentData {
  name: string
  city: string
  description: string
  timePeriods: {
    construction: string
    colonial: string
    modern: string
  }
}

export const MONUMENTS: Record<string, MonumentData> = {
  'taj-mahal': {
    name: 'Taj Mahal',
    city: 'Agra, Uttar Pradesh',
    description: 'UNESCO ivory-white marble mausoleum built by Shah Jahan',
    timePeriods: {
      construction: 'Built between 1632 and 1653 by Mughal Emperor Shah Jahan in memory of his wife Mumtaz Mahal. Over 20,000 artisans worked on this ivory-white marble mausoleum in Agra.',
      colonial: 'During British rule, Lord Curzon ordered a major restoration in 1908, replacing missing gems and restoring the gardens to their original Mughal design.',
      modern: 'Today the Taj Mahal welcomes over 7 million visitors annually. It was declared a UNESCO World Heritage Site in 1983 and is one of the Seven Wonders of the World.',
    },
  },
  'agra-fort': {
    name: 'Agra Fort',
    city: 'Agra, Uttar Pradesh',
    description: 'UNESCO red sandstone fort, former seat of Mughal power',
    timePeriods: {
      construction: 'Emperor Akbar began construction in 1565, raising the massive red sandstone walls and gates. His grandson Shah Jahan later added white marble palaces inside, including the Khas Mahal and Sheesh Mahal, during the 1630s and 1640s.',
      colonial: 'After the 1857 uprising, British forces took control and converted large parts of the fort into a military garrison, demolishing many original Mughal buildings to make room for barracks.',
      modern: 'A UNESCO World Heritage Site since 1983. Visitors can see the Musamman Burj, the marble tower where Shah Jahan was later imprisoned by his own son Aurangzeb, gazing out at the Taj Mahal until his death in 1666.',
    },
  },
  'red-fort': {
    name: 'Red Fort',
    city: 'Delhi',
    description: 'Massive Mughal fort, Independence Day celebrated here',
    timePeriods: {
      construction: 'Constructed between 1638 and 1648 by Emperor Shah Jahan as the main residence of Mughal emperors. Built from red sandstone, it served as the political centre of the Mughal state.',
      colonial: 'After the 1857 uprising, the British took control and used it as a military garrison. Many original Mughal structures were demolished and replaced with barracks.',
      modern: 'Now a UNESCO World Heritage Site. Every Independence Day, the Prime Minister hoists the national flag here and addresses the nation.',
    },
  },
  'qutub-minar': {
    name: 'Qutub Minar',
    city: 'Delhi',
    description: 'Worlds tallest brick minaret at 72.5m built in 1193',
    timePeriods: {
      construction: 'Construction began in 1193 by Qutb ud-Din Aibak. Standing 73 metres tall, it was the tallest minaret in the world when built and remains the tallest brick minaret today.',
      colonial: 'British officers used the complex as a recreational area. Major Robert Smith restored the topmost storey in 1829 and added a cupola which was later removed.',
      modern: 'A UNESCO World Heritage Site visited by millions each year. Contains some of the earliest surviving examples of Islamic architecture in India.',
    },
  },
  'gateway-india': {
    name: 'Gateway of India',
    city: 'Mumbai, Maharashtra',
    description: '1924 basalt arch, last British troops left through it',
    timePeriods: {
      construction: 'Built in 1924 to commemorate the visit of King George V and Queen Mary to India in 1911. Designed in Indo-Saracenic style using yellow basalt stone by architect George Wittet.',
      colonial: 'Served as the ceremonial entrance to India for British viceroys and governors. The last British troops left India by passing through this gateway in 1948.',
      modern: 'Now one of Mumbai most iconic landmarks. Surrounded by ferry services to Elephanta Caves and overlooking the Arabian Sea. A major tourist hotspot.',
    },
  },
  'hampi': {
    name: 'Hampi',
    city: 'Hampi, Karnataka',
    description: 'Ruins of Vijayanagara Empire capital UNESCO site',
    timePeriods: {
      construction: 'Capital of the Vijayanagara Empire from 1336 to 1565. At its peak it was one of the largest cities in the world with a population of over 500,000 people.',
      colonial: 'After the empire fell in 1565, Hampi was largely abandoned. British surveyors rediscovered and documented the ruins in the 19th century.',
      modern: 'A UNESCO World Heritage Site since 1986. Spread across 4,100 hectares with over 1,600 surviving remains of temples, palaces, and market streets.',
    },
  },
  'golden-temple': {
    name: 'Golden Temple Amritsar',
    city: 'Amritsar, Punjab',
    description: 'Holiest Sikh shrine with gold-plated dome and sarovar',
    timePeriods: {
      construction: 'The foundation was laid in 1588 by Guru Arjan Dev Ji, the fifth Sikh Guru. The temple was built at a lower level than the surrounding land as a symbol of humility.',
      colonial: 'In 1984 the Indian Army launched Operation Blue Star to remove militants who had occupied the temple complex. The operation caused significant damage to the Akal Takht.',
      modern: 'The holiest shrine in Sikhism, visited by over 100,000 people daily. The community kitchen (langar) serves free meals to all visitors regardless of religion or background.',
    },
  },
  'kedarnath': {
    name: 'Kedarnath Temple',
    city: 'Kedarnath, Uttarakhand',
    description: 'One of 12 Jyotirlingas at 3583m in the Himalayas',
    timePeriods: {
      construction: 'The current temple is believed to have been built by Adi Shankaracharya in the 8th century AD, though the site is mentioned in ancient texts like the Mahabharata.',
      colonial: 'The temple remained largely untouched during British rule as it was considered a sacred Hindu site. Access was limited due to its extreme altitude and remote location.',
      modern: 'In 2013 a massive flash flood devastated the region but miraculously the temple structure survived. It is now one of the most visited pilgrimage sites in India.',
    },
  },
  'meenakshi': {
    name: 'Meenakshi Amman Temple',
    city: 'Madurai, Tamil Nadu',
    description: 'Ancient Dravidian temple with 14 towering gopurams',
    timePeriods: {
      construction: 'The temple was originally built around the 6th century BC though most of the current structure dates from the 16th and 17th centuries under the Nayak dynasty.',
      colonial: 'During British rule the temple continued to function as an active place of worship. The British generally did not interfere with major Hindu temples in South India.',
      modern: 'One of the largest Hindu temples in the world, covering 14 acres. Its 14 gopurams are covered with thousands of colorful sculptures. Attracts 15,000 to 25,000 visitors daily.',
    },
  },
  'mysore-palace': {
    name: 'Mysore Palace',
    city: 'Mysore, Karnataka',
    description: 'Indo-Saracenic royal palace lit by 100000 bulbs',
    timePeriods: {
      construction: 'The current palace was built between 1897 and 1912 after the previous wooden palace burned down. Designed by British architect Henry Irwin in the Indo-Saracenic style.',
      colonial: 'The palace was the official residence of the Wadiyar dynasty, who ruled Mysore as a princely state under British suzerainty. The kingdom was known for its progressive governance.',
      modern: 'The third most visited monument in India after the Taj Mahal and Red Fort. During Dasara festival the palace is illuminated by nearly 100,000 light bulbs.',
    },
  },
  'hawa-mahal': {
    name: 'Hawa Mahal',
    city: 'Jaipur, Rajasthan',
    description: 'Palace of Winds with 953 latticed windows built 1799',
    timePeriods: {
      construction: 'Built in 1799 by Maharaja Sawai Pratap Singh. Designed by Lal Chand Ustad in the form of the crown of Lord Krishna. The 953 small windows were designed to allow royal ladies to observe street life.',
      colonial: 'During the British Raj, Jaipur was a prominent princely state. The Hawa Mahal continued to be part of the City Palace complex and was maintained by the royal family.',
      modern: 'One of the most iconic symbols of Jaipur and Rajasthan. The unique five-storey facade is a favourite subject for photographers. It is now a protected monument under the Archaeological Survey of India.',
    },
  },
  'charminar': {
    name: 'Charminar',
    city: 'Hyderabad, Telangana',
    description: '1591 monument with 4 minarets symbol of Hyderabad',
    timePeriods: {
      construction: 'Built in 1591 by Muhammad Quli Qutb Shah to commemorate the end of a deadly plague. The four minarets each stand 56 metres tall and the structure contains a mosque on the top floor.',
      colonial: 'Hyderabad was a major princely state under the Nizams. The Charminar area became the heart of the old city with bustling bazaars around it including the famous Laad Bazaar.',
      modern: 'The defining landmark of Hyderabad. The surrounding Laad Bazaar is famous for bangles and pearls. Restoration work is ongoing by the Archaeological Survey of India.',
    },
  },
  'victoria-memorial': {
    name: 'Victoria Memorial',
    city: 'Kolkata, West Bengal',
    description: 'White marble colonial memorial to Queen Victoria',
    timePeriods: {
      construction: 'Built between 1906 and 1921 using white Makrana marble from Rajasthan. Designed by William Emerson in a mix of British and Mughal architectural styles.',
      colonial: 'Commissioned by Lord Curzon as a memorial to Queen Victoria after her death in 1901. It was intended to rival the Taj Mahal and serve as a symbol of British power in India.',
      modern: 'Now a museum with a collection of 28,000 artifacts documenting the colonial era. The surrounding gardens are a popular public space in Kolkata.',
    },
  },
  'ajanta': {
    name: 'Ajanta Caves',
    city: 'Aurangabad, Maharashtra',
    description: '30 rock-cut Buddhist caves with worlds finest murals',
    timePeriods: {
      construction: 'Carved between the 2nd century BC and 6th century AD by Buddhist monks. The 30 rock-cut caves contain some of the finest surviving examples of ancient Indian art and sculpture.',
      colonial: 'Rediscovered by British officer John Smith in 1819 during a tiger hunt. The caves had been abandoned for centuries and were hidden by jungle growth.',
      modern: 'A UNESCO World Heritage Site since 1983. The paintings inside are considered masterpieces of Buddhist religious art. Conservation efforts are ongoing to preserve the fragile murals.',
    },
  },
  'konark': {
    name: 'Konark Sun Temple',
    city: 'Konark, Odisha',
    description: '13th century Sun God temple shaped as giant chariot',
    timePeriods: {
      construction: 'Built in the 13th century by King Narasimhadeva I of the Eastern Ganga dynasty. The entire temple is designed as a giant chariot of the Sun God with 24 intricately carved stone wheels.',
      colonial: 'The temple fell into disrepair over centuries. The main tower collapsed before the colonial era. The British Archaeological Survey undertook preservation work in the early 20th century.',
      modern: 'A UNESCO World Heritage Site. The 24 wheels of the chariot are often used as a symbol of India and one wheel appears on the state emblem of Odisha.',
    },
  },
  'india-gate': {
    name: 'India Gate',
    city: 'New Delhi, Delhi',
    description: '42 metre war memorial for 70000 Indian soldiers of WWI',
    timePeriods: {
      construction: 'Designed by Edwin Lutyens and completed in 1931. Built as a memorial to 70,000 Indian soldiers who died fighting for the British Army during World War I. Names of 13,300 soldiers are inscribed on it.',
      colonial: 'Originally called the All India War Memorial. It was the centrepiece of the ceremonial axis of New Delhi designed by Lutyens as the new imperial capital of British India.',
      modern: 'Now the site of the Amar Jawan Jyoti, an eternal flame honoring soldiers killed in the 1971 Indo-Pakistani War. A major landmark and evening gathering spot in Delhi.',
    },
  },
}

export const MONUMENT_FALLBACK: Record<string, string> = {
  'taj-mahal': 'The Taj Mahal was built by Emperor Shah Jahan between 1632 and 1653 in memory of his wife Mumtaz Mahal. It took over 20,000 artisans to complete and is made of white marble from Rajasthan.',
  'agra-fort': 'Agra Fort was begun by Emperor Akbar in 1565 using red sandstone, with Shah Jahan later adding white marble palaces inside. Shah Jahan himself was later imprisoned here by his son Aurangzeb, confined to a tower overlooking the Taj Mahal.',
  'red-fort': 'The Red Fort was built by Emperor Shah Jahan in 1638 and served as the main residence of Mughal emperors for nearly 200 years. It is built from red sandstone.',
  'qutub-minar': 'The Qutub Minar was built in 1193 by Qutb ud-Din Aibak. Standing 73 metres tall, it was the tallest minaret in the world when built.',
  'gateway-india': 'The Gateway of India was built in 1924 to commemorate King George Vs visit. It was the last point from which British troops left India in 1948.',
  'hampi': 'Hampi was the capital of the Vijayanagara Empire from 1336 to 1565. At its peak it was one of the largest cities in the world with over 500,000 people.',
  'golden-temple': 'The Golden Temple in Amritsar is the holiest shrine in Sikhism. It serves free meals to over 100,000 people daily regardless of religion.',
  'kedarnath': 'Kedarnath Temple sits at 3,583 metres in the Himalayas. It is one of the 12 Jyotirlingas and survived the devastating 2013 flash floods miraculously.',
  'meenakshi': 'The Meenakshi Amman Temple in Madurai is one of the largest Hindu temples in the world. Its 14 gopurams are covered with thousands of colorful sculptures.',
  'mysore-palace': 'Mysore Palace was built between 1897 and 1912. During the Dasara festival it is illuminated by nearly 100,000 light bulbs and is the third most visited monument in India.',
  'hawa-mahal': 'The Hawa Mahal in Jaipur was built in 1799 with 953 latticed windows. It was designed so royal ladies could observe street life without being seen.',
  'charminar': 'The Charminar was built in 1591 by Muhammad Quli Qutb Shah to commemorate the end of a plague. Its four minarets each stand 56 metres tall.',
  'victoria-memorial': 'The Victoria Memorial in Kolkata was built between 1906 and 1921 using white Makrana marble. It is now a museum with 28,000 artifacts from the colonial era.',
  'ajanta': 'The Ajanta Caves contain 30 rock-cut Buddhist caves carved between 2nd century BC and 6th century AD. They contain some of the finest surviving ancient Indian murals.',
  'konark': 'The Konark Sun Temple was built in the 13th century and designed as a giant chariot of the Sun God with 24 intricately carved stone wheels.',
  'india-gate': 'India Gate is a 42-metre war memorial built in 1931 to honor 70,000 Indian soldiers who died in World War I. Names of 13,300 soldiers are inscribed on it.',
}
