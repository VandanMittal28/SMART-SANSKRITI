'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'en' | 'hi'

export const TRANSLATIONS: Record<string, { en: string; hi: string }> = {
  // Navigation
  nav_home: { en: 'Home', hi: 'होम' }, nav_map: { en: 'Map', hi: 'नक्शा' },
  nav_recognition: { en: 'Recognition', hi: 'पहचान' }, nav_chatbot: { en: 'Chatbot', hi: 'चैटबॉट' },
  nav_quiz: { en: 'Quiz', hi: 'क्विज़' }, nav_hunt: { en: 'Hunt', hi: 'खोज' },
  nav_explore: { en: 'Explore', hi: 'खोजें' },
  nav_achievements: { en: 'Achievements', hi: 'उपलब्धियाँ' }, nav_festivals: { en: 'Festivals', hi: 'उत्सव' },
  nav_itinerary: { en: 'Itinerary', hi: 'यात्रा योजना' },
  // Language toggle
  lang_toggle_to_hi: { en: '🇮🇳 हिंदी', hi: '🇬🇧 EN' },
  // User types
  student_label: { en: '🎓 Student', hi: '🎓 छात्र' }, tourist_label: { en: '🧳 Tourist', hi: '🧳 पर्यटक' },
  student_subtitle: { en: 'Curriculum-aligned learning with quizzes & XP', hi: 'पाठ्यक्रम आधारित शिक्षण क्विज़ और XP के साथ' },
  tourist_subtitle: { en: 'Story-driven exploration with photography & culture tips', hi: 'कहानी आधारित अन्वेषण फ़ोटोग्राफ़ी और संस्कृति सुझावों के साथ' },
  switch_to_tourist: { en: 'Switch to 🧳 Tourist', hi: '🧳 पर्यटक बनें' },
  switch_to_student: { en: 'Switch to 🎓 Student', hi: '🎓 छात्र बनें' },
  continue_as: { en: 'Continue as', hi: 'जारी रखें' },
  skip_for_now: { en: '⟶ Skip for now (continue as Tourist)', hi: '⟶ अभी छोड़ें (पर्यटक के रूप में जारी रखें)' },
  welcome_title: { en: 'Welcome to Sanskriti AI', hi: 'संस्कृति AI में आपका स्वागत है' },
  welcome_subtitle: { en: 'Tell us who you are so we can personalise your experience', hi: 'बताएं आप कौन हैं ताकि हम आपका अनुभव व्यक्तिगत बना सकें' },
  // Home page
  hero_badge: { en: 'AI-Powered Heritage Guide', hi: 'AI-संचालित विरासत गाइड' },
  hero_title_1: { en: "Discover India's", hi: 'भारत की' },
  hero_title_2: { en: 'Living Heritage', hi: 'जीवित विरासत खोजें' },
  hero_desc: { en: "AI-powered monument guide for students and tourists. Explore, learn, and connect with India's rich cultural legacy.", hi: 'छात्रों और पर्यटकों के लिए AI-संचालित स्मारक गाइड। भारत की समृद्ध सांस्कृतिक विरासत को खोजें और जानें।' },
  start_exploring: { en: 'Start Exploring', hi: 'खोज शुरू करें' },
  view_map: { en: 'View Map', hi: 'नक्शा देखें' },
  smart_recognition: { en: 'Smart Recognition', hi: 'स्मार्ट पहचान' },
  smart_recognition_d: { en: 'Upload a photo, get instant AI identification of any Indian monument with detailed historical context.', hi: 'फ़ोटो अपलोड करें, किसी भी भारतीय स्मारक की विस्तृत ऐतिहासिक संदर्भ के साथ तुरंत AI पहचान पाएं।' },
  heritage_chatbot: { en: 'Heritage Chatbot', hi: 'विरासत चैटबॉट' },
  heritage_chatbot_d: { en: 'Ask anything about monuments, their history, architecture, or cultural significance.', hi: 'स्मारकों, उनके इतिहास, वास्तुकला या सांस्कृतिक महत्व के बारे में कुछ भी पूछें।' },
  time_travel: { en: 'Time Travel', hi: 'टाइम ट्रेवल' },
  time_travel_d: { en: 'See monuments across 4 historical eras — from construction to modern day.', hi: '4 ऐतिहासिक कालों में स्मारक देखें — निर्माण से आधुनिक काल तक।' },
  knowledge_quiz: { en: 'Knowledge Quiz', hi: 'ज्ञान क्विज़' },
  knowledge_quiz_d: { en: 'Test your knowledge about Indian heritage and earn XP to climb the leaderboard.', hi: 'भारतीय विरासत के बारे में अपने ज्ञान की परीक्षा लें और लीडरबोर्ड पर चढ़ने के लिए XP कमाएं।' },
  festival_calendar: { en: 'Festival Calendar', hi: 'उत्सव कैलेंडर' },
  festival_calendar_d: { en: 'Discover 30+ heritage festivals with historical context and visitor tips.', hi: '30+ विरासत उत्सव खोजें ऐतिहासिक संदर्भ और दर्शक सुझावों के साथ।' },
  identify_now: { en: 'Identify Now', hi: 'अभी पहचानें' },
  start_chat: { en: 'Start Chat', hi: 'चैट शुरू करें' },
  explore_eras: { en: 'Explore Eras', hi: 'युग खोजें' },
  take_quiz: { en: 'Take Quiz', hi: 'क्विज़ लें' },
  view_calendar: { en: 'View Calendar', hi: 'कैलेंडर देखें' },
  quote_1: { en: '"The World is One Family"', hi: '"विश्व एक परिवार है"' },
  quote_2: { en: '"Lead me from darkness to light"', hi: '"अंधकार से प्रकाश की ओर ले जाओ"' },
  monuments_label: { en: 'Monuments', hi: 'स्मारक' },
  nvidia_vision: { en: 'NVIDIA Vision AI', hi: 'NVIDIA विज़न AI' },
  sdg_label: { en: 'SDG 11 & 17', hi: 'SDG 11 & 17' },
  under_2_sec: { en: 'Under 2 sec', hi: '2 सेकंड से कम' },
  // Recognition page
  monument_recognition: { en: 'Monument Recognition', hi: 'स्मारक पहचान' },
  upload_photo: { en: '📂 Upload Photo', hi: '📂 फ़ोटो अपलोड' },
  use_camera: { en: '📷 Use Camera', hi: '📷 कैमरा उपयोग' },
  drag_drop: { en: 'Drag and drop file here', hi: 'यहाँ फ़ाइल खींचें और छोड़ें' },
  file_types: { en: 'JPG, JPEG, PNG accepted', hi: 'JPG, JPEG, PNG स्वीकार्य' },
  browse_files: { en: 'Browse files', hi: 'फ़ाइलें खोजें' },
  identifying: { en: '🔍 Identifying monument with AI Vision...', hi: '🔍 AI विज़न से स्मारक पहचाना जा रहा है...' },
  monument_identified: { en: '✅ Monument Identified!', hi: '✅ स्मारक पहचाना गया!' },
  not_identified: { en: '❓ Monument Not Identified', hi: '❓ स्मारक पहचाना नहीं गया' },
  try_clearer: { en: 'Try uploading a clearer image or different angle', hi: 'स्पष्ट छवि या अलग कोण से प्रयास करें' },
  category: { en: 'Category', hi: 'श्रेणी' }, religion: { en: 'Religion', hi: 'धर्म' },
  dynasty: { en: 'Dynasty / Period', hi: 'राजवंश / काल' }, architecture_style: { en: 'Architecture Style', hi: 'स्थापत्य शैली' },
  terrain: { en: 'Terrain', hi: 'भू-भाग' }, location: { en: 'Location', hi: 'स्थान' },
  confidence: { en: 'Confidence', hi: 'विश्वास' }, key_identifiers: { en: 'Key Identifiers', hi: 'मुख्य पहचानकर्ता' },
  ai_reasoning: { en: '📝 AI Reasoning', hi: '📝 AI तर्क' },
  eliminated_candidates: { en: '🧐 Eliminated Candidates', hi: '🧐 हटाए गए उम्मीदवार' },
  listen_emperor: { en: '🎙️ Listen to Emperor', hi: '🎙️ सम्राट को सुनें' },
  historical_narration: { en: 'Historical narration for', hi: 'ऐतिहासिक वर्णन' },
  select_monument: { en: 'Select a monument to explore', hi: 'खोजने के लिए स्मारक चुनें' },
  // Tabs
  tab_history: { en: '📖 History', hi: '📖 इतिहास' }, tab_architecture: { en: '🏛️ Architecture', hi: '🏛️ वास्तुकला' },
  tab_facts: { en: '📊 Key Facts', hi: '📊 मुख्य तथ्य' }, tab_fun: { en: '💡 Fun Facts', hi: '💡 रोचक तथ्य' },
  tab_visitor: { en: '🎯 Visitor Info', hi: '🎯 दर्शक जानकारी' }, tab_timetravel: { en: '⏳ Time Travel', hi: '⏳ टाइम ट्रेवल' },
  built_by: { en: 'Built By', hi: 'निर्माणकर्ता' }, year_built: { en: 'Year Built', hi: 'निर्माण वर्ष' },
  type: { en: 'Type', hi: 'प्रकार' }, cultural_importance: { en: 'Cultural Importance', hi: 'सांस्कृतिक महत्व' },
  best_time: { en: 'Best Time to Visit', hi: 'यात्रा का सर्वोत्तम समय' }, entry_fee: { en: 'Entry Fee', hi: 'प्रवेश शुल्क' },
  go_to_quiz: { en: 'Go to Quiz →', hi: 'क्विज़ पर जाएं →' },
  // Time travel eras
  era_construction: { en: '🏗️ Construction', hi: '🏗️ निर्माण काल' }, era_peak: { en: '✨ Peak Glory', hi: '✨ स्वर्णिम काल' },
  era_colonial: { en: '🇬🇧 Colonial Era', hi: '🇬🇧 औपनिवेशिक काल' }, era_modern: { en: '📸 Modern Day', hi: '📸 आधुनिक काल' },
  // Chat page
  ai_chatbot: { en: 'Heritage Guide AI', hi: 'विरासत गाइड AI' },
  chatting_about: { en: '🏛️ Chatting about', hi: '🏛️ बातचीत हो रही है' },
  ask_placeholder: { en: 'Ask anything about Indian heritage...', hi: 'भारतीय विरासत के बारे में कुछ भी पूछें...' },
  send: { en: 'Send', hi: 'भेजें' }, ask_by_voice: { en: 'Voice', hi: 'आवाज़' },
  listening: { en: 'Listening...', hi: 'सुन रहे हैं...' },
  heritage_guide: { en: 'Heritage Guide', hi: 'विरासत गाइड' },
  student_mode: { en: 'Student Mode', hi: 'छात्र मोड' },
  namaste_greeting: { en: "Namaste! I am your AI Heritage Guide. Ask me anything about Indian monuments — their history, architecture, or legends!", hi: 'नमस्ते! मैं आपका AI विरासत गाइड हूँ। भारतीय स्मारकों के बारे में कुछ भी पूछें — उनका इतिहास, वास्तुकला, या किंवदंतियाँ!' },
  sorry_trouble: { en: 'Sorry, I am having trouble connecting. Please try again.', hi: 'क्षमा करें, कनेक्ट करने में समस्या हो रही है। कृपया पुनः प्रयास करें।' },
  when_built: { en: 'When was it built?', hi: 'यह कब बना था?' }, who_built: { en: 'Who built it?', hi: 'इसे किसने बनाया?' },
  what_legend: { en: 'What is the legend?', hi: 'इसकी किंवदंती क्या है?' }, best_time_visit: { en: 'Best time to visit?', hi: 'दर्शन का सर्वोत्तम समय?' },
  entry_fee_q: { en: 'Entry fee?', hi: 'प्रवेश शुल्क?' },
  // Quiz page
  heritage_quiz: { en: '🧠 Heritage Quiz', hi: '🧠 विरासत क्विज़' },
  select_monument_first: { en: 'Select a Monument First', hi: 'पहले स्मारक चुनें' },
  scan_monument_msg: { en: 'Scan a monument using Recognition or choose one below', hi: 'पहचान से स्मारक स्कैन करें या नीचे से चुनें' },
  choose_monument: { en: 'Choose a monument...', hi: 'स्मारक चुनें...' },
  question_of: { en: 'Question', hi: 'प्रश्न' }, of: { en: 'of', hi: 'में से' },
  xp_earned: { en: 'XP earned', hi: 'XP अर्जित' },
  correct: { en: '✅ Correct!', hi: '✅ सही जवाब!' }, wrong: { en: '❌ Wrong answer', hi: '❌ गलत जवाब' },
  quiz_complete: { en: '🎉 Quiz Complete!', hi: '🎉 क्विज़ पूरा!' },
  score: { en: 'Score', hi: 'स्कोर' }, accuracy: { en: 'Accuracy', hi: 'सटीकता' },
  play_again: { en: 'Play Again', hi: 'फिर खेलें' }, view_leaderboard: { en: 'View Leaderboard', hi: 'लीडरबोर्ड देखें' },
  // Treasure Hunt
  treasure_hunt: { en: '🗺️ Treasure Hunt', hi: '🗺️ खजाना खोज' },
  follow_clues: { en: "Follow the clues to unlock the monument's secrets", hi: 'स्मारक के रहस्यों को उजागर करने के लिए सुरागों का पालन करें' },
  select_monument_hunt: { en: 'Select a Monument to Hunt', hi: 'खोज के लिए स्मारक चुनें' },
  choose_monument_hunt: { en: 'Choose a monument to begin your treasure hunt adventure', hi: 'अपनी खजाना खोज शुरू करने के लिए स्मारक चुनें' },
  step_of: { en: 'Step', hi: 'चरण' }, i_am_here: { en: '📍 I Am Here!', hi: '📍 मैं यहाँ हूँ!' },
  heritage_hunter: { en: 'Heritage Hunter!', hi: 'विरासत खोजी!' },
  share_achievement: { en: 'Share Achievement', hi: 'उपलब्धि साझा करें' },
  explore_more: { en: 'Explore More Monuments', hi: 'अधिक स्मारक खोजें' },
  // Achievements
  explorer_hub: { en: '🏆 Explorer Hub', hi: '🏆 एक्सप्लोरर हब' },
  achievements_subtitle: { en: 'Your achievements, badges and global leaderboard', hi: 'आपकी उपलब्धियाँ, बैज और वैश्विक लीडरबोर्ड' },
  explorer_progress: { en: 'Explorer Progress', hi: 'एक्सप्लोरर प्रगति' },
  my_badges: { en: '🏅 My Badges', hi: '🏅 मेरे बैज' }, leaderboard: { en: '🏆 Leaderboard', hi: '🏆 लीडरबोर्ड' },
  monuments_visited: { en: 'Monuments Visited', hi: 'देखे स्मारक' }, badges_earned: { en: 'Badges Earned', hi: 'अर्जित बैज' },
  leaderboard_rank: { en: 'Leaderboard Rank', hi: 'लीडरबोर्ड रैंक' },
  refresh: { en: '🔄 Refresh', hi: '🔄 ताज़ा करें' }, refreshing: { en: '⏳ Refreshing...', hi: '⏳ ताज़ा हो रहा है...' },
  you_are_ranked: { en: 'You are ranked', hi: 'आपकी रैंक है' }, out_of: { en: 'out of', hi: 'में से' }, explorers: { en: 'explorers', hi: 'एक्सप्लोरर' },
  you: { en: '(You)', hi: '(आप)' },
  monuments_explored: { en: '🗺️ Monuments Explored', hi: '🗺️ खोजे गए स्मारक' },
  level_beginner: { en: '🌱 Beginner Explorer', hi: '🌱 नौसिखिया खोजी' },
  level_heritage: { en: '🏛️ Heritage Explorer', hi: '🏛️ विरासत खोजी' },
  level_cultural: { en: '🎓 Cultural Pro', hi: '🎓 सांस्कृतिक विशेषज्ञ' },
  level_legend: { en: '👑 Sanskriti Legend', hi: '👑 संस्कृति किंवदंती' },
  to_max_level: { en: '% to max level', hi: '% अधिकतम स्तर तक' },
  badge_earned: { en: '✅ Earned', hi: '✅ अर्जित' }, badge_locked: { en: '🔒 Locked', hi: '🔒 बंद' },
  badge_unlocked: { en: '🎉 Achievement unlocked!', hi: '🎉 उपलब्धि मिली!' },
  requires_xp: { en: 'Requires', hi: 'आवश्यक' }, xp: { en: 'XP', hi: 'XP' },
  // Festivals
  festival_header: { en: '🗓️ Heritage Festival Calendar', hi: '🗓️ विरासत उत्सव कैलेंडर' },
  festival_subtitle: { en: 'Plan your visit around history coming alive', hi: 'इतिहास के जीवंत होने पर अपनी यात्रा की योजना बनाएं' },
  filter_type: { en: 'Filter by type', hi: 'प्रकार से फ़िल्टर' }, all: { en: 'All', hi: 'सभी' },
  coming_soon: { en: '🔥 Coming Soon (within 30 days)', hi: '🔥 जल्द आ रहा है (30 दिनों में)' },
  this_season: { en: '📅 This Season', hi: '📅 इस मौसम में' },
  later_year: { en: '📆 Later this year', hi: '📆 इस साल बाद में' },
  days_away: { en: 'days away', hi: 'दिन बाकी' }, today: { en: '🔴 Today!', hi: '🔴 आज!' },
  historical_context: { en: 'HISTORICAL CONTEXT', hi: 'ऐतिहासिक संदर्भ' },
  visitor_tip: { en: '💡 Visitor Tip:', hi: '💡 दर्शक सुझाव:' },
  significance: { en: 'Significance', hi: 'महत्व' }, duration: { en: 'Duration', hi: 'अवधि' },
  more_festivals: { en: 'more festivals', hi: 'और उत्सव' },
  // Itinerary
  itinerary_title: { en: '🗺️ AI City Itinerary Planner', hi: '🗺️ AI शहर यात्रा योजनाकार' },
  itinerary_subtitle: { en: 'Choose any city in India and get a personalised heritage travel plan', hi: 'भारत का कोई भी शहर चुनें और व्यक्तिगत विरासत यात्रा योजना पाएं' },
  num_days: { en: 'Number of Days', hi: 'दिनों की संख्या' },
  search_city: { en: 'Search City', hi: 'शहर खोजें' },
  search_city_placeholder: { en: 'Search city or state...', hi: 'शहर या राज्य खोजें...' },
  select_city: { en: 'Select City', hi: 'शहर चुनें' }, selected: { en: 'selected ✓', hi: 'चुना गया ✓' },
  city_highlights: { en: 'Highlights', hi: 'मुख्य आकर्षण' },
  generate_itinerary: { en: 'Generate Itinerary', hi: 'यात्रा योजना बनाएं' },
  generating: { en: '⏳ Crafting your perfect itinerary...', hi: '⏳ आपकी यात्रा योजना बना रहे हैं...' },
  select_city_first: { en: 'Select a city to generate itinerary', hi: 'यात्रा योजना के लिए शहर चुनें' },
  day: { en: 'day', hi: 'दिन' }, days_word: { en: 'days', hi: 'दिन' },
  heritage_itinerary: { en: 'Heritage Itinerary', hi: 'विरासत यात्रा योजना' },
  planning_journey: { en: 'AI is planning your heritage journey...', hi: 'AI आपकी विरासत यात्रा की योजना बना रहा है...' },
  synthetic_review: { en: 'Synthetic Review', hi: 'कृत्रिम समीक्षा' },
  out_of_five: { en: 'out of 5', hi: '5 में से' },
  review_strengths: { en: 'Strengths', hi: 'मजबूतियाँ' },
  review_notes: { en: 'Review Notes', hi: 'समीक्षा नोट्स' },
  generated_by: { en: '❖ ─── Generated by Sanskriti AI ─── ❖', hi: '❖ ─── संस्कृति AI द्वारा निर्मित ─── ❖' },
  // Auth page
  sign_in: { en: '🔑 Sign In', hi: '🔑 साइन इन' }, sign_up: { en: '✨ Sign Up', hi: '✨ साइन अप' },
  full_name: { en: 'Full Name', hi: 'पूरा नाम' }, full_name_placeholder: { en: 'Enter your full name', hi: 'अपना पूरा नाम दर्ज करें' },
  email: { en: 'Email Address', hi: 'ईमेल पता' }, email_placeholder: { en: 'your@email.com', hi: 'आपका@ईमेल.com' },
  phone: { en: 'Phone Number', hi: 'फ़ोन नंबर' }, phone_placeholder: { en: '+91 98765 43210', hi: '+91 98765 43210' },
  password: { en: 'Password', hi: 'पासवर्ड' }, password_placeholder: { en: 'Minimum 6 characters', hi: 'न्यूनतम 6 अक्षर' },
  confirm_password: { en: 'Confirm Password', hi: 'पासवर्ड की पुष्टि करें' },
  confirm_placeholder: { en: 'Repeat your password', hi: 'पासवर्ड दोहराएं' },
  create_account: { en: '✨ Create Account', hi: '✨ खाता बनाएं' },
  please_wait: { en: '⏳ Please wait...', hi: '⏳ कृपया प्रतीक्षा करें...' },
  no_account: { en: "Don't have an account? Sign up free", hi: 'खाता नहीं है? मुफ़्त में साइन अप करें' },
  terms: { en: 'By continuing you agree to our terms of service', hi: 'जारी रखकर आप हमारी सेवा शर्तों से सहमत हैं' },
  account_created: { en: '🎉 Account created! Check your email to verify, then sign in.', hi: '🎉 खाता बना! सत्यापन के लिए ईमेल जांचें, फिर साइन इन करें।' },
  heritage_guide_india: { en: 'Heritage Guide for India', hi: 'भारत के लिए विरासत गाइड' },
  enter_password: { en: 'Enter your password', hi: 'अपना पासवर्ड दर्ज करें' },
  // Map page
  heritage_map: { en: 'Heritage Map', hi: 'विरासत नक्शा' },
  monuments_across: { en: 'monuments across India — hover to see details', hi: 'भारत भर में स्मारक — विवरण देखने के लिए होवर करें' },
  simulate_arrival: { en: '✈️ Simulate Arrival', hi: '✈️ आगमन सिम्युलेट' },
  try_again: { en: 'Try Again', hi: 'दोबारा प्रयास करें' },
  could_not_load: { en: 'Could not load monuments. Check your connection.', hi: 'स्मारक लोड नहीं हो सके। अपना कनेक्शन जांचें।' },
  // Sidebar / user info
  sign_out: { en: '🚪 Sign Out', hi: '🚪 साइन आउट' },
  my_achievements: { en: '🏅 Achievements', hi: '🏅 उपलब्धियाँ' },
  my_itinerary: { en: '🗺️ My Itinerary', hi: '🗺️ मेरी यात्रा योजना' },
  student: { en: 'Student', hi: 'छात्र' }, tourist: { en: 'Tourist', hi: 'पर्यटक' },
  // Profile Page
  profile_title: { en: 'Profile', hi: 'प्रोफ़ाइल' },
  profile_subtitle: { en: 'Your XP, badges, and settings live here.', hi: 'आपके XP, बैज और सेटिंग्स यहाँ हैं।' },
  visited_label: { en: 'Visited', hi: 'देखे गए' },
  badges_label: { en: 'Badges', hi: 'बैज' },
  rank_label: { en: 'Rank', hi: 'रैंक' },
  current_level: { en: 'Current level', hi: 'वर्तमान स्तर' },
  language_label: { en: 'Language', hi: 'भाषा' },
  mode_title: { en: 'Mode', hi: 'मोड' },
  mode_switch: { en: 'Switch', hi: 'बदलें' },
  mode_subtitle: { en: 'Toggle between learning and travel-focused guidance.', hi: 'सीखने और यात्रा-आधारित मार्गदर्शन के बीच टॉगल करें।' },
  offline_ui_title: { en: 'Offline-first UI', hi: 'ऑफ़लाइन-फर्स्ट UI' },
  offline_ui_desc: { en: 'Core screens stay usable with cached data and local state.', hi: 'कैश किए गए डेटा और स्थानीय स्थिति के साथ मुख्य स्क्रीन उपयोग योग्य रहते हैं।' },
  continue_exploring: { en: 'Continue exploring', hi: 'अन्वेषण जारी रखें' },
  // Common
  loading: { en: 'Loading Sanskriti AI...', hi: 'संस्कृति AI लोड हो रहा है...' },
  // Home Page new
  good_evening: { en: 'Good evening', hi: 'शुभ संध्या' },
  explorer: { en: 'Explorer', hi: 'अन्वेषणकर्ता' },
  hero_caption_default: { en: 'Explore India through monuments, hunts, and live scans.', hi: 'स्मारकों, खोजों और लाइव स्कैन के माध्यम से भारत का अन्वेषण करें।' },
  offline_ready: { en: 'Offline ready', hi: 'ऑफ़लाइन एक्सेस' },
  nav_scan: { en: 'Scan', hi: 'स्कैन' },
  quick_actions: { en: 'Quick actions', hi: 'त्वरित कार्य' },
  view_profile: { en: 'View profile', hi: 'प्रोफ़ाइल देखें' },
  scan_monument: { en: 'Scan Monument', hi: 'स्मारक स्कैन करें' },
  scan_monument_desc: { en: 'Camera-first recognition with narration', hi: 'विवरण के साथ कैमरा-आधारित पहचान' },
  explore_title: { en: 'Explore', hi: 'अन्वेषण करें' },
  explore_desc: { en: 'Discover monuments, routes, and live map guidance', hi: 'स्मारक, मार्ग और मैप मार्गदर्शन खोजें' },
  start_hunt: { en: 'Start Treasure Hunt', hi: 'खजाना खोज शुरू करें' },
  start_hunt_desc: { en: 'Checkpoints, XP, and reward bursts', hi: 'चेकपॉइंट, XP और पुरस्कार' },
  plan_itinerary: { en: 'Plan Itinerary', hi: 'यात्रा की योजना बनाएं' },
  plan_itinerary_desc: { en: 'Create route across Delhi, Agra, Jaipur', hi: 'दिल्ली, आगरा, जयपुर के पार मार्ग बनाएं' },
  explore_now: { en: 'Explore now', hi: 'अभी खोजें' },
  festivals_title: { en: 'Festivals', hi: 'उत्सव' },
  calendar_link: { en: 'Calendar', hi: 'कैलेंडर' },
  continue_learning: { en: 'Continue learning', hi: 'सीखना जारी रखें' },
  quiz_link: { en: 'Quiz', hi: 'क्विज़' },
}

type LangUpdater = Lang | ((prev: Lang) => Lang)

interface LangContextType {
  lang: Lang
  setLang: (l: LangUpdater) => void
  toggleLang: () => void
  t: (key: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => TRANSLATIONS[k]?.en || k,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('sanskriti_lang') as Lang
    if (saved === 'en' || saved === 'hi') {
      setLangState(saved)
      document.documentElement.lang = saved
      document.documentElement.setAttribute('data-lang', saved)
      return
    }
    document.documentElement.lang = 'en'
    document.documentElement.setAttribute('data-lang', 'en')
  }, [])

  const setLang = (next: LangUpdater) => {
    const resolved = typeof next === 'function' ? next(lang) : next
    const safeLang: Lang = resolved === 'hi' ? 'hi' : 'en'
    setLangState(safeLang)
    localStorage.setItem('sanskriti_lang', safeLang)
    document.documentElement.lang = safeLang
    document.documentElement.setAttribute('data-lang', safeLang)
  }

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'))
  }

  const t = (key: string): string => {
    const entry = TRANSLATIONS[key]
    if (!entry) return key
    return entry[lang] || entry.en || key
  }

  return <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>{children}</LangContext.Provider>
}

export function useLang() { return useContext(LangContext) }
