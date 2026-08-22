export type Lang = "en" | "hi";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MonumentZone {
  id: string;
  name: string;
  coordinates: Coordinates;
  radius: number;
  xp: number;
  arrivalFact: string;
  directionHint: string;
}

export interface Hunt {
  id: string;
  riddle: string;
  location: string;
  coordinates: Coordinates;
  radius: number;
  xp: number;
  answerIndex: number;
  options: string[];
}

export interface Monument {
  id: string;
  name: string;
  location: string;
  description: string;
  coordinates: Coordinates;
  zones: MonumentZone[];
  hunts: Hunt[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  user_type?: string;
  language?: Lang;
  total_xp: number;
  monuments_visited: string[];
  quiz_scores: Record<string, number>;
  chat_history: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
}

export interface LeaderboardEntry {
  id: string;
  full_name: string;
  total_xp: number;
}
