export type VisitorType = 'indian' | 'saarc' | 'foreign' | 'child'

export type TicketMonument = {
  id: string
  name: string
  nameHi: string
  city: string
  state: string
  category: 'UNESCO' | 'Fort' | 'Palace' | 'Temple' | 'Landmark'
  emoji: string
  prices: Record<VisitorType, number>
  note?: string
  noteHi?: string
  officialUrl: string
}

const asiBookingUrl = 'https://asi.payumoney.com/'

export const ticketMonuments: TicketMonument[] = [
  {
    id: 'taj-mahal', name: 'Taj Mahal', nameHi: 'ताज महल', city: 'Agra', state: 'Uttar Pradesh',
    category: 'UNESCO', emoji: '🕌', prices: { indian: 50, saarc: 540, foreign: 1100, child: 0 },
    note: 'Main mausoleum entry costs ₹200 extra per visitor.',
    noteHi: 'मुख्य मकबरे के प्रवेश के लिए प्रति व्यक्ति ₹200 अतिरिक्त है।',
    officialUrl: 'https://tajmahal.gov.in/ticketing.aspx/',
  },
  {
    id: 'agra-fort', name: 'Agra Fort', nameHi: 'आगरा किला', city: 'Agra', state: 'Uttar Pradesh',
    category: 'UNESCO', emoji: '🏰', prices: { indian: 50, saarc: 90, foreign: 650, child: 0 },
    officialUrl: 'https://tajmahal.gov.in/ticketing.aspx/',
  },
  {
    id: 'fatehpur-sikri', name: 'Fatehpur Sikri', nameHi: 'फतेहपुर सीकरी', city: 'Agra', state: 'Uttar Pradesh',
    category: 'UNESCO', emoji: '🏯', prices: { indian: 50, saarc: 50, foreign: 610, child: 0 },
    officialUrl: 'https://tajmahal.gov.in/ticketing.aspx/',
  },
  {
    id: 'qutub-minar', name: 'Qutub Minar', nameHi: 'कुतुब मीनार', city: 'Delhi', state: 'Delhi',
    category: 'UNESCO', emoji: '🗼', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'red-fort', name: 'Red Fort', nameHi: 'लाल किला', city: 'Delhi', state: 'Delhi',
    category: 'UNESCO', emoji: '🏰', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'humayuns-tomb', name: "Humayun's Tomb", nameHi: 'हुमायूँ का मकबरा', city: 'Delhi', state: 'Delhi',
    category: 'UNESCO', emoji: '🕌', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'purana-qila', name: 'Purana Qila', nameHi: 'पुराना किला', city: 'Delhi', state: 'Delhi',
    category: 'Fort', emoji: '🏯', prices: { indian: 20, saarc: 20, foreign: 250, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'hampi', name: 'Group of Monuments at Hampi', nameHi: 'हम्पी स्मारक समूह', city: 'Hampi', state: 'Karnataka',
    category: 'UNESCO', emoji: '🛕', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'konark', name: 'Konark Sun Temple', nameHi: 'कोणार्क सूर्य मंदिर', city: 'Konark', state: 'Odisha',
    category: 'UNESCO', emoji: '☀️', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'khajuraho', name: 'Khajuraho Temples', nameHi: 'खजुराहो मंदिर समूह', city: 'Khajuraho', state: 'Madhya Pradesh',
    category: 'UNESCO', emoji: '🛕', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'sanchi', name: 'Sanchi Stupa', nameHi: 'साँची स्तूप', city: 'Sanchi', state: 'Madhya Pradesh',
    category: 'UNESCO', emoji: '☸️', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'ajanta', name: 'Ajanta Caves', nameHi: 'अजंता गुफाएँ', city: 'Aurangabad', state: 'Maharashtra',
    category: 'UNESCO', emoji: '🪨', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'ellora', name: 'Ellora Caves', nameHi: 'एलोरा गुफाएँ', city: 'Aurangabad', state: 'Maharashtra',
    category: 'UNESCO', emoji: '🪨', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'elephanta', name: 'Elephanta Caves', nameHi: 'एलीफेंटा गुफाएँ', city: 'Mumbai', state: 'Maharashtra',
    category: 'UNESCO', emoji: '🗿', prices: { indian: 35, saarc: 35, foreign: 550, child: 0 },
    note: 'Ferry and local body charges are separate.', noteHi: 'फेरी और स्थानीय निकाय शुल्क अलग हैं।', officialUrl: asiBookingUrl,
  },
  {
    id: 'charminar', name: 'Charminar', nameHi: 'चारमीनार', city: 'Hyderabad', state: 'Telangana',
    category: 'Landmark', emoji: '🕌', prices: { indian: 20, saarc: 20, foreign: 250, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'golconda', name: 'Golconda Fort', nameHi: 'गोलकोंडा किला', city: 'Hyderabad', state: 'Telangana',
    category: 'Fort', emoji: '🏰', prices: { indian: 20, saarc: 20, foreign: 250, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'amer-fort', name: 'Amer Palace', nameHi: 'आमेर महल', city: 'Jaipur', state: 'Rajasthan',
    category: 'Palace', emoji: '👑', prices: { indian: 200, saarc: 200, foreign: 1000, child: 50 },
    note: 'Student concession shown under Child / Student.', noteHi: 'बाल / छात्र विकल्प में छात्र रियायत दिखाई गई है।',
    officialUrl: 'https://obms-tourist.rajasthan.gov.in/',
  },
  {
    id: 'hawa-mahal', name: 'Hawa Mahal', nameHi: 'हवा महल', city: 'Jaipur', state: 'Rajasthan',
    category: 'Palace', emoji: '🪟', prices: { indian: 100, saarc: 100, foreign: 600, child: 50 },
    note: 'Student concession shown under Child / Student.', noteHi: 'बाल / छात्र विकल्प में छात्र रियायत दिखाई गई है।',
    officialUrl: 'https://obms-tourist.rajasthan.gov.in/',
  },
  {
    id: 'jantar-mantar-jaipur', name: 'Jantar Mantar Jaipur', nameHi: 'जंतर मंतर जयपुर', city: 'Jaipur', state: 'Rajasthan',
    category: 'UNESCO', emoji: '🔭', prices: { indian: 100, saarc: 100, foreign: 600, child: 50 },
    officialUrl: 'https://obms-tourist.rajasthan.gov.in/',
  },
  {
    id: 'nahargarh', name: 'Nahargarh Fort', nameHi: 'नाहरगढ़ किला', city: 'Jaipur', state: 'Rajasthan',
    category: 'Fort', emoji: '🌄', prices: { indian: 100, saarc: 100, foreign: 600, child: 50 },
    officialUrl: 'https://obms-tourist.rajasthan.gov.in/',
  },
  {
    id: 'bibi-ka-maqbara', name: 'Bibi Ka Maqbara', nameHi: 'बीबी का मकबरा', city: 'Aurangabad', state: 'Maharashtra',
    category: 'Landmark', emoji: '🕌', prices: { indian: 20, saarc: 20, foreign: 250, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'daulatabad', name: 'Daulatabad Fort', nameHi: 'दौलताबाद किला', city: 'Aurangabad', state: 'Maharashtra',
    category: 'Fort', emoji: '🏔️', prices: { indian: 20, saarc: 20, foreign: 250, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'shaniwar-wada', name: 'Shaniwar Wada', nameHi: 'शनिवार वाड़ा', city: 'Pune', state: 'Maharashtra',
    category: 'Palace', emoji: '🏯', prices: { indian: 20, saarc: 20, foreign: 250, child: 0 }, officialUrl: asiBookingUrl,
  },
  {
    id: 'india-gate', name: 'India Gate', nameHi: 'इंडिया गेट', city: 'Delhi', state: 'Delhi',
    category: 'Landmark', emoji: '🇮🇳', prices: { indian: 0, saarc: 0, foreign: 0, child: 0 },
    note: 'Open public landmark; no entry ticket is required.', noteHi: 'खुला सार्वजनिक स्मारक; प्रवेश टिकट की आवश्यकता नहीं है।',
    officialUrl: 'https://www.delhitourism.gov.in/tourist_place/india_gate.html',
  },
  {
    id: 'gateway-of-india', name: 'Gateway of India', nameHi: 'गेटवे ऑफ इंडिया', city: 'Mumbai', state: 'Maharashtra',
    category: 'Landmark', emoji: '🌊', prices: { indian: 0, saarc: 0, foreign: 0, child: 0 },
    note: 'Open public landmark; ferry tickets are separate.', noteHi: 'खुला सार्वजनिक स्मारक; फेरी टिकट अलग हैं।',
    officialUrl: 'https://maharashtratourism.gov.in/districts/mumbai-city/',
  },
]

export const visitorLabels: Record<VisitorType, { en: string; hi: string }> = {
  indian: { en: 'Indian / OCI', hi: 'भारतीय / OCI' },
  saarc: { en: 'SAARC / BIMSTEC', hi: 'SAARC / BIMSTEC' },
  foreign: { en: 'Foreign visitor', hi: 'विदेशी पर्यटक' },
  child: { en: 'Child / Student', hi: 'बाल / छात्र' },
}
