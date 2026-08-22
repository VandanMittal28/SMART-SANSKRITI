const TAJ_FACTS = {
  built: 'The Taj Mahal was commissioned by Shah Jahan in 1632 and the main mausoleum was completed in 1648.',
  builder: 'Mughal emperor Shah Jahan commissioned the Taj Mahal in memory of Mumtaz Mahal.',
  legend: 'A popular legend says Shah Jahan planned a black-marble twin across the Yamuna, but historians have not found reliable evidence that it was ever an approved project.',
  visit: 'For a calmer visit, arrive near opening time. Sunrise usually offers softer light and fewer crowds; the monument is normally closed to general visitors on Fridays.',
  ticket: 'Ticket prices and entry rules can change, so check the Archaeological Survey of India ticket portal before visiting.',
}

const HERITAGE_TERMS = /\b(monument|heritage|temple|fort|palace|mahal|minar|mosque|masjid|tomb|mausoleum|cave|museum|archaeolog|architect|dynasty|emperor|king|queen|built|builder|history|historic|legend|conservation|unesco|ticket|entry|timing|visit|taj|qutub|red fort|hampi|konark|charminar|kedarnath|meenakshi|india gate|gateway of india)\b|स्मारक|विरासत|मंदिर|किला|महल|इतिहास|किसने बनाया|निर्माण|टिकट|प्रवेश|ताजमहल|क़ुतुब|कुतुब/i
const CONTEXTUAL_FOLLOW_UP = /^(who|when|where|why|how|what).{0,45}\b(it|this|that)\b|^(who built|when built|entry fee|best time|what legend)|^(इसे|यह|ये|उसका|इसका).{0,45}(किसने|कब|कहाँ|क्यों|कैसे)|^(किसने बनाया|कब बना|प्रवेश शुल्क)/i

export function isMonumentQuestion(question: string): boolean {
  const normalized = question.trim()
  return normalized.length > 0
    && (HERITAGE_TERMS.test(normalized) || CONTEXTUAL_FOLLOW_UP.test(normalized))
}

export function monumentOnlyRefusal(language = 'en') {
  return language === 'hi'
    ? 'मैं केवल स्मारक और विरासत स्थल से जुड़े सवालों के जवाब देता हूँ।'
    : 'I only answer questions about monuments and heritage sites.'
}

export function offlineHeritageAnswer(question: string, monumentId = 'taj-mahal', language = 'en') {
  const normalized = question.toLowerCase()
  let answer: string

  if (monumentId === 'taj-mahal' && /when|built|year|बना|निर्माण/.test(normalized)) answer = TAJ_FACTS.built
  else if (monumentId === 'taj-mahal' && /who|builder|commission|किसने/.test(normalized)) answer = TAJ_FACTS.builder
  else if (monumentId === 'taj-mahal' && /legend|story|कहानी|किंवदंती/.test(normalized)) answer = TAJ_FACTS.legend
  else if (/best time|visit|crowd|कब|समय/.test(normalized)) answer = TAJ_FACTS.visit
  else if (/ticket|entry|fee|price|टिकट|शुल्क/.test(normalized)) answer = TAJ_FACTS.ticket
  else if (/sustain|responsible|environment|eco|पर्यावरण/.test(normalized)) {
    answer = 'Carry a reusable bottle, use marked bins, avoid touching historic surfaces, follow photography rules, choose local guides and crafts, and use public transport where practical.'
  } else {
    const monumentName = monumentId.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    answer = `${monumentName} is part of India’s living heritage. The offline guide has essential facts available; connect the future Sanskriti AI service for a detailed answer to this specific question.`
  }

  if (language === 'hi') {
    if (answer === TAJ_FACTS.built) return 'ताजमहल का निर्माण शाहजहाँ ने 1632 में शुरू करवाया था और मुख्य मकबरा 1648 में पूरा हुआ।'
    if (answer === TAJ_FACTS.builder) return 'मुग़ल सम्राट शाहजहाँ ने मुमताज़ महल की याद में ताजमहल बनवाया था।'
    if (answer === TAJ_FACTS.visit) return 'कम भीड़ और मुलायम रोशनी के लिए खुलने के समय या सूर्योदय के आसपास जाएँ। ताजमहल आम तौर पर शुक्रवार को सामान्य दर्शकों के लिए बंद रहता है।'
    if (answer === TAJ_FACTS.ticket) return 'टिकट की कीमत और प्रवेश नियम बदल सकते हैं, इसलिए जाने से पहले भारतीय पुरातत्व सर्वेक्षण के आधिकारिक टिकट पोर्टल पर जाँच करें।'
  }

  return answer
}
