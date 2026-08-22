export interface ItineraryActivity {
  time: string
  activity: string
  tip: string
}

export interface ItineraryDay {
  day: number
  title: string
  activities: ItineraryActivity[]
}

export interface HeritageItinerary {
  city?: string
  monument?: string
  days: ItineraryDay[]
  source?: 'nvidia' | 'local'
}

export function generateLocalItinerary(
  city: string,
  highlights: string,
  numberOfDays: number,
): HeritageItinerary {
  const highlightList = highlights
    .split(',')
    .map((highlight) => highlight.trim())
    .filter(Boolean)
  const fallbackHighlight = `${city} heritage district`
  const days: ItineraryDay[] = []

  for (let index = 0; index < numberOfDays; index += 1) {
    const firstHighlight =
      highlightList[(index * 2) % Math.max(1, highlightList.length)] ||
      fallbackHighlight
    const secondHighlight =
      highlightList[(index * 2 + 1) % Math.max(1, highlightList.length)] ||
      'local markets and cultural quarters'
    const dayNumber = index + 1

    days.push({
      day: dayNumber,
      title:
        dayNumber === 1
          ? `Arrival & First Impressions of ${city}`
          : dayNumber === numberOfDays
            ? `Final Day — Hidden Gems of ${city}`
            : `Exploring ${firstHighlight}`,
      activities: [
        {
          time: '8:00 AM',
          activity: `Morning visit to ${firstHighlight}`,
          tip: 'Arrive early for lighter crowds and better photographs.',
        },
        {
          time: '12:00 PM',
          activity: `Lunch at a well-rated local restaurant in ${city}`,
          tip: 'Ask for a regional speciality and confirm dietary preferences.',
        },
        {
          time: '2:30 PM',
          activity: `Explore ${secondHighlight}`,
          tip: 'Keep water handy and allow extra time for local crafts and exhibits.',
        },
        {
          time: '5:30 PM',
          activity: 'Sunset walk and relaxed cultural exploration',
          tip: 'Check local closing times before setting out.',
        },
      ],
    })
  }

  return { city, days, source: 'local' }
}
