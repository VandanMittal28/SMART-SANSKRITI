import type { MarketplaceListing, WorkshopSlot } from '@/lib/marketplace/types'

function futureSlot(daysFromNow: number, hour: number, id: string): WorkshopSlot {
  const starts = new Date()
  starts.setDate(starts.getDate() + daysFromNow)
  starts.setHours(hour, 0, 0, 0)
  const ends = new Date(starts.getTime() + 90 * 60_000)
  return { id, startsAt: starts.toISOString(), endsAt: ends.toISOString(), capacity: 8, reservedQuantity: daysFromNow % 3, heldQuantity: 0 }
}

export function getDemoMarketplaceListings(): MarketplaceListing[] {
  return [
    {
      id: 'agra-marble-inlay-keepsake', kind: 'craft', siteId: 'taj-mahal', siteName: 'Taj Mahal', siteNameHi: 'ताज महल', city: 'Agra', state: 'Uttar Pradesh',
      craftType: 'Marble inlay', sourceLanguage: 'hi', title: 'Hand-cut marble inlay keepsake', titleHi: 'हाथ से बना संगमरमर पच्चीकारी स्मृति-चिह्न',
      description: 'A palm-sized floral motif set by hand using the pietra dura tradition practised by Agra families for generations.',
      descriptionHi: 'आगरा के परिवारों द्वारा पीढ़ियों से निभाई जा रही पच्चीकारी परंपरा में हाथ से जड़ा छोटा पुष्प स्मृति-चिह्न।',
      price: 2400, depositPercent: 20, stockQuantity: 6, distanceKm: 1.2, approximatePickupArea: 'Tajganj craft lane',
      imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=82', imageAlt: 'Handcrafted floral inlay work', active: true, slots: [],
      artisan: { id: 'safiya-agra', name: 'Safiya Begum', verified: true, city: 'Agra', craftTraditions: ['Pietra dura', 'Marble inlay'], languages: ['Hindi', 'Urdu', 'English'], story: 'Safiya works with a three-generation family studio and specialises in delicate floral inlay inspired by Mughal gardens.' },
    },
    {
      id: 'agra-inlay-workshop', kind: 'workshop', siteId: 'taj-mahal', siteName: 'Taj Mahal', siteNameHi: 'ताज महल', city: 'Agra', state: 'Uttar Pradesh',
      craftType: 'Marble inlay', sourceLanguage: 'en', title: 'Meet the makers: marble inlay workshop', titleHi: 'कारीगरों से मिलें: संगमरमर पच्चीकारी कार्यशाला',
      description: 'Learn how semi-precious stones are shaped and set into marble, then make a small motif to take home.',
      descriptionHi: 'जानें कि अर्ध-कीमती पत्थरों को कैसे आकार देकर संगमरमर में जड़ा जाता है और अपना छोटा नमूना बनाएं।',
      price: 1800, depositPercent: 20, stockQuantity: null, distanceKm: 1.4, approximatePickupArea: 'Taj East Gate neighbourhood',
      imageUrl: 'https://images.unsplash.com/photo-1459908676235-d5f02a50184b?auto=format&fit=crop&w=900&q=82', imageAlt: 'Artisan demonstrating detailed handwork', active: true,
      slots: [futureSlot(1, 11, 'agra-inlay-1'), futureSlot(2, 15, 'agra-inlay-2'), futureSlot(4, 11, 'agra-inlay-3')],
      artisan: { id: 'imran-agra', name: 'Imran Qureshi', verified: true, city: 'Agra', craftTraditions: ['Pietra dura'], languages: ['Hindi', 'English'], story: 'Imran learned stone cutting from his father and now teaches visitors why every tiny inlay piece is shaped entirely by hand.' },
    },
    {
      id: 'jaipur-blue-pottery', kind: 'craft', siteId: 'hawa-mahal', siteName: 'Hawa Mahal', siteNameHi: 'हवा महल', city: 'Jaipur', state: 'Rajasthan',
      craftType: 'Blue pottery', sourceLanguage: 'hi', title: 'Jaipur blue pottery serving bowl', titleHi: 'जयपुर ब्लू पॉटरी सर्विंग बाउल',
      description: 'A hand-painted quartz-clay bowl fired in the traditional Jaipur palette. Each piece carries natural variations.',
      descriptionHi: 'पारंपरिक जयपुरी रंगों में हाथ से चित्रित क्वार्ट्ज-मिट्टी का कटोरा। हर वस्तु अपने आप में अनूठी है।',
      price: 1250, depositPercent: 20, stockQuantity: 10, distanceKm: 2.6, approximatePickupArea: 'Ramganj Bazaar',
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=82', imageAlt: 'Blue and white handmade pottery', active: true, slots: [],
      artisan: { id: 'meera-jaipur', name: 'Meera Kumawat', verified: true, city: 'Jaipur', craftTraditions: ['Blue pottery'], languages: ['Hindi', 'Rajasthani', 'English'], story: 'Meera runs a women-led workshop that mixes classic floral patterns with contemporary forms.' },
    },
    {
      id: 'jaipur-block-printing', kind: 'workshop', siteId: 'hawa-mahal', siteName: 'Hawa Mahal', siteNameHi: 'हवा महल', city: 'Jaipur', state: 'Rajasthan',
      craftType: 'Block printing', sourceLanguage: 'hi', title: 'Print your own heritage scarf', titleHi: 'अपना हेरिटेज स्कार्फ़ ब्लॉक प्रिंट करें',
      description: 'Choose carved wooden blocks, mix natural colours, and print a cotton scarf with guidance from a master printer.',
      descriptionHi: 'लकड़ी के नक्काशीदार ब्लॉक चुनें, प्राकृतिक रंग मिलाएं और कारीगर के मार्गदर्शन में सूती स्कार्फ़ प्रिंट करें।',
      price: 1600, depositPercent: 20, stockQuantity: null, distanceKm: 3.8, approximatePickupArea: 'Sanganeri Gate studio',
      imageUrl: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=900&q=82', imageAlt: 'Traditional textile printing workshop', active: true,
      slots: [futureSlot(1, 10, 'jaipur-print-1'), futureSlot(3, 14, 'jaipur-print-2')],
      artisan: { id: 'arvind-jaipur', name: 'Arvind Chhipa', verified: true, city: 'Jaipur', craftTraditions: ['Bagru printing', 'Natural dyes'], languages: ['Hindi', 'English'], story: 'Arvind is a fourth-generation printer documenting old blocks while training young apprentices.' },
    },
    {
      id: 'delhi-zardozi-panel', kind: 'craft', siteId: 'red-fort', siteName: 'Red Fort', siteNameHi: 'लाल किला', city: 'Delhi', state: 'Delhi',
      craftType: 'Zardozi', sourceLanguage: 'hi', title: 'Zardozi heritage motif panel', titleHi: 'ज़रदोज़ी विरासत मोटिफ़ पैनल',
      description: 'A framed hand-embroidered motif in metallic thread, inspired by patterns found across Shahjahanabad.',
      descriptionHi: 'शाहजहानाबाद के नमूनों से प्रेरित धातु के तार से हाथ की कढ़ाई वाला फ़्रेमयुक्त पैनल।',
      price: 3200, depositPercent: 20, stockQuantity: 4, distanceKm: 1.7, approximatePickupArea: 'Chandni Chowk',
      imageUrl: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=900&q=82', imageAlt: 'Detailed metallic thread embroidery', active: true, slots: [],
      artisan: { id: 'saba-delhi', name: 'Saba Naqvi', verified: true, city: 'Delhi', craftTraditions: ['Zardozi embroidery'], languages: ['Hindi', 'Urdu', 'English'], story: 'Saba combines archival Mughal motifs with fair-wage work for home-based embroiderers in Old Delhi.' },
    },
    {
      id: 'hampi-stone-carving', kind: 'workshop', siteId: 'hampi', siteName: 'Hampi', siteNameHi: 'हम्पी', city: 'Hampi', state: 'Karnataka',
      craftType: 'Stone carving', sourceLanguage: 'en', title: 'Hampi stone-carving introduction', titleHi: 'हम्पी पत्थर नक्काशी परिचय',
      description: 'Try traditional chisels on soft practice stone while learning how Vijayanagara sculptors planned their forms.',
      descriptionHi: 'नरम अभ्यास पत्थर पर पारंपरिक छेनी आज़माएं और विजयनगर शिल्पियों की तकनीक जानें।',
      price: 900, depositPercent: 20, stockQuantity: null, distanceKm: 4.5, approximatePickupArea: 'Kamalapura artisan cluster',
      imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=82', imageAlt: 'Stone carving near an Indian heritage site', active: true,
      slots: [futureSlot(2, 9, 'hampi-stone-1'), futureSlot(5, 9, 'hampi-stone-2')],
      artisan: { id: 'ravi-hampi', name: 'Ravi Shilpi', verified: true, city: 'Hampi', craftTraditions: ['Stone carving'], languages: ['Kannada', 'Hindi', 'English'], story: 'Ravi belongs to a family of temple sculptors and introduces visitors to the geometry behind Hampi stonework.' },
    },
  ]
}
