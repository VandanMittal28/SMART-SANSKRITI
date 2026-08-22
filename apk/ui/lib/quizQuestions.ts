export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_index: number
}

const QUIZ_BANK: Record<string, QuizQuestion[]> = {
  'taj-mahal': [
    { id: 'taj-1', question: 'Who commissioned the Taj Mahal?', options: ['Akbar', 'Shah Jahan', 'Humayun', 'Babur'], correct_index: 1 },
    { id: 'taj-2', question: 'Which river flows beside the Taj Mahal?', options: ['Ganga', 'Yamuna', 'Narmada', 'Godavari'], correct_index: 1 },
    { id: 'taj-3', question: 'Which material dominates the Taj Mahal’s exterior?', options: ['Red sandstone', 'White marble', 'Granite', 'Limestone'], correct_index: 1 },
  ],
  'red-fort': [
    { id: 'red-fort-1', question: 'In which city is the Red Fort located?', options: ['Agra', 'Jaipur', 'New Delhi', 'Lucknow'], correct_index: 2 },
    { id: 'red-fort-2', question: 'Who commissioned the Red Fort in Delhi?', options: ['Aurangzeb', 'Akbar', 'Shah Jahan', 'Jahangir'], correct_index: 2 },
    { id: 'red-fort-3', question: 'India’s Prime Minister hoists the national flag at the Red Fort on which occasion?', options: ['Republic Day', 'Independence Day', 'Gandhi Jayanti', 'Constitution Day'], correct_index: 1 },
  ],
  'qutub-minar': [
    { id: 'qutub-1', question: 'Qutub Minar is primarily a what?', options: ['Minaret', 'Palace', 'Temple', 'Stepwell'], correct_index: 0 },
    { id: 'qutub-2', question: 'In which city is the Qutub Minar complex?', options: ['Kolkata', 'Delhi', 'Agra', 'Hyderabad'], correct_index: 1 },
    { id: 'qutub-3', question: 'Which famous ancient object stands in the Qutub complex?', options: ['Ashoka Lion', 'Iron Pillar', 'Vijay Stambha', 'Stone Chariot'], correct_index: 1 },
  ],
  'gateway-india': [
    { id: 'gateway-1', question: 'In which city is the Gateway of India?', options: ['Chennai', 'Mumbai', 'Kochi', 'Surat'], correct_index: 1 },
    { id: 'gateway-2', question: 'The Gateway of India overlooks which body of water?', options: ['Bay of Bengal', 'Arabian Sea', 'Indian Ocean', 'Gulf of Kutch'], correct_index: 1 },
    { id: 'gateway-3', question: 'The Gateway commemorated the 1911 visit of which royal couple?', options: ['Queen Victoria and Prince Albert', 'George V and Queen Mary', 'Edward VIII and Wallis Simpson', 'George VI and Queen Elizabeth'], correct_index: 1 },
  ],
  hampi: [
    { id: 'hampi-1', question: 'Hampi was the capital of which empire?', options: ['Maurya Empire', 'Vijayanagara Empire', 'Gupta Empire', 'Mughal Empire'], correct_index: 1 },
    { id: 'hampi-2', question: 'Hampi is located in which state?', options: ['Karnataka', 'Kerala', 'Telangana', 'Tamil Nadu'], correct_index: 0 },
    { id: 'hampi-3', question: 'Which river flows beside Hampi?', options: ['Krishna', 'Kaveri', 'Tungabhadra', 'Godavari'], correct_index: 2 },
  ],
  'golden-temple': [
    { id: 'golden-1', question: 'The Golden Temple is in which city?', options: ['Patiala', 'Amritsar', 'Chandigarh', 'Ludhiana'], correct_index: 1 },
    { id: 'golden-2', question: 'The Golden Temple is the foremost sacred site of which faith?', options: ['Jainism', 'Buddhism', 'Sikhism', 'Zoroastrianism'], correct_index: 2 },
    { id: 'golden-3', question: 'What is the sacred pool surrounding the Golden Temple called?', options: ['Pushkar Sarovar', 'Amrit Sarovar', 'Mansarovar', 'Bindu Sagar'], correct_index: 1 },
  ],
  kedarnath: [
    { id: 'kedarnath-1', question: 'Kedarnath Temple is in which state?', options: ['Himachal Pradesh', 'Uttarakhand', 'Sikkim', 'Jammu and Kashmir'], correct_index: 1 },
    { id: 'kedarnath-2', question: 'Kedarnath Temple is primarily dedicated to which deity?', options: ['Vishnu', 'Shiva', 'Brahma', 'Ganesha'], correct_index: 1 },
    { id: 'kedarnath-3', question: 'Kedarnath lies near the headwaters of which river?', options: ['Mandakini', 'Yamuna', 'Sutlej', 'Teesta'], correct_index: 0 },
  ],
  meenakshi: [
    { id: 'meenakshi-1', question: 'Meenakshi Amman Temple is in which city?', options: ['Madurai', 'Thanjavur', 'Mysuru', 'Tirupati'], correct_index: 0 },
    { id: 'meenakshi-2', question: 'The temple’s towering, sculpted gateways are called what?', options: ['Toranas', 'Gopurams', 'Stupas', 'Chhatris'], correct_index: 1 },
    { id: 'meenakshi-3', question: 'Meenakshi is worshipped as a form of which goddess?', options: ['Lakshmi', 'Saraswati', 'Parvati', 'Ganga'], correct_index: 2 },
  ],
  'mysore-palace': [
    { id: 'mysore-1', question: 'Mysore Palace is in which state?', options: ['Karnataka', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh'], correct_index: 0 },
    { id: 'mysore-2', question: 'Which royal dynasty is closely associated with Mysore Palace?', options: ['Wadiyar', 'Chola', 'Pala', 'Ahom'], correct_index: 0 },
    { id: 'mysore-3', question: 'Mysore Palace is especially famous for its illumination during which festival?', options: ['Onam', 'Bihu', 'Dasara', 'Holi'], correct_index: 2 },
  ],
  'hawa-mahal': [
    { id: 'hawa-1', question: 'Hawa Mahal is located in which city?', options: ['Jodhpur', 'Udaipur', 'Jaipur', 'Bikaner'], correct_index: 2 },
    { id: 'hawa-2', question: 'What does “Hawa Mahal” mean?', options: ['Palace of Winds', 'Palace of Lakes', 'Palace of Mirrors', 'Palace of Victory'], correct_index: 0 },
    { id: 'hawa-3', question: 'Its many small screened windows are commonly called what?', options: ['Jharokhas', 'Mandapas', 'Minarets', 'Baolis'], correct_index: 0 },
  ],
  charminar: [
    { id: 'charminar-1', question: 'Charminar is the best-known landmark of which city?', options: ['Hyderabad', 'Pune', 'Bhopal', 'Ahmedabad'], correct_index: 0 },
    { id: 'charminar-2', question: 'How many minarets does Charminar have?', options: ['Two', 'Three', 'Four', 'Six'], correct_index: 2 },
    { id: 'charminar-3', question: 'Who commissioned Charminar?', options: ['Ibrahim Adil Shah II', 'Muhammad Quli Qutb Shah', 'Krishnadevaraya', 'Nizam-ul-Mulk'], correct_index: 1 },
  ],
  'victoria-memorial': [
    { id: 'victoria-1', question: 'Victoria Memorial is located in which city?', options: ['Mumbai', 'Kolkata', 'Delhi', 'Chennai'], correct_index: 1 },
    { id: 'victoria-2', question: 'The memorial was built in memory of which British monarch?', options: ['Queen Anne', 'Queen Victoria', 'Elizabeth I', 'Mary I'], correct_index: 1 },
    { id: 'victoria-3', question: 'Which material gives Victoria Memorial its white appearance?', options: ['Makrana marble', 'Granite', 'Soapstone', 'Quartzite'], correct_index: 0 },
  ],
  ajanta: [
    { id: 'ajanta-1', question: 'Ajanta Caves are located in which state?', options: ['Maharashtra', 'Odisha', 'Gujarat', 'Bihar'], correct_index: 0 },
    { id: 'ajanta-2', question: 'Ajanta’s caves are primarily associated with which religion?', options: ['Sikhism', 'Buddhism', 'Islam', 'Zoroastrianism'], correct_index: 1 },
    { id: 'ajanta-3', question: 'Ajanta is especially celebrated for which art form?', options: ['Bronze casting', 'Mural paintings', 'Blue pottery', 'Marble inlay'], correct_index: 1 },
  ],
  konark: [
    { id: 'konark-1', question: 'Konark Sun Temple is in which state?', options: ['West Bengal', 'Odisha', 'Andhra Pradesh', 'Jharkhand'], correct_index: 1 },
    { id: 'konark-2', question: 'The temple is dedicated to which deity?', options: ['Surya', 'Shiva', 'Vishnu', 'Agni'], correct_index: 0 },
    { id: 'konark-3', question: 'The temple was designed as a monumental version of what?', options: ['Lotus', 'Mountain', 'Chariot', 'Ship'], correct_index: 2 },
  ],
  'india-gate': [
    { id: 'india-gate-1', question: 'India Gate is located in which city?', options: ['New Delhi', 'Mumbai', 'Kolkata', 'Jaipur'], correct_index: 0 },
    { id: 'india-gate-2', question: 'Who designed India Gate?', options: ['Le Corbusier', 'Edwin Lutyens', 'Charles Correa', 'Herbert Baker'], correct_index: 1 },
    { id: 'india-gate-3', question: 'India Gate was originally built to commemorate soldiers who died in which conflict?', options: ['First World War', 'Second World War', 'Revolt of 1857', 'Kargil War'], correct_index: 0 },
  ],
}

const QUIZ_ALIASES: Record<string, string> = {
  'gateway-of-india': 'gateway-india',
  'golden-temple-amritsar': 'golden-temple',
  'hampi-chariot': 'hampi',
  'stone-chariot': 'hampi',
  'stone-chariot-hampi': 'hampi',
  'vittala-temple': 'hampi',
  'vittala-temple-hampi': 'hampi',
  'kedarnath-temple': 'kedarnath',
  'meenakshi-amman-temple': 'meenakshi',
  'meenakshi-temple': 'meenakshi',
  'mysuru-palace': 'mysore-palace',
  'hawa-mahal-jaipur': 'hawa-mahal',
  'charminar-hyderabad': 'charminar',
  'victoria-memorial-kolkata': 'victoria-memorial',
  'konark-sun-temple': 'konark',
  'india-gate-delhi': 'india-gate',
}

export function resolveQuizMonumentId(monumentId: string) {
  const normalized = monumentId
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const usableId = /[a-z0-9]/.test(normalized) ? normalized : ''
  if (usableId in QUIZ_BANK) return usableId
  if (usableId in QUIZ_ALIASES) return QUIZ_ALIASES[usableId]

  const partialMatch = usableId
    ? Object.keys(QUIZ_BANK).find(
    (id) => usableId.includes(id) || id.includes(usableId),
      )
    : undefined

  return partialMatch || usableId || 'taj-mahal'
}

export function getQuizQuestions(monumentId: string) {
  return QUIZ_BANK[resolveQuizMonumentId(monumentId)] || []
}

export function hasCuratedQuiz(monumentId: string) {
  return getQuizQuestions(monumentId).length > 0
}
