-- ============================================================================
-- STRANGE MESSENGER - SEED DATA (COLD START & PROMPTS)
-- ============================================================================
-- This file populates:
-- 1. 30 Thoughtful English writing prompts
-- 2. 50 Kind, genuine, and positive seed letters from across India
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INSERT 30 DAILY WRITING PROMPTS
-- ----------------------------------------------------------------------------
TRUNCATE TABLE public.daily_prompts RESTART IDENTITY CASCADE;

INSERT INTO public.daily_prompts (prompt_text) VALUES
('Tell a stranger what you never had the courage to say in person.'),
('What is a small, quiet memory that still makes you smile on difficult days?'),
('Describe a moment when a complete stranger showed you unexpected kindness.'),
('If you could send a one-sentence message to your future self, what would it be?'),
('What is something you forgive yourself for, even if it took a long time?'),
('Write about the scent or sound that instantly takes you back to childhood.'),
('What is a secret dream you rarely speak out loud because you fear judgment?'),
('If your hometown had a personality, what would it say to a weary traveler?'),
('Write a letter to the person you used to be five years ago.'),
('What is the most comforting piece of advice anyone has ever given you?'),
('Describe a song that feels like it was written specifically for your soul.'),
('What made you feel genuinely grateful today, no matter how tiny it seemed?'),
('If tonight was your last quiet evening before a big journey, how would you spend it?'),
('What is something heavy you are carrying right now that you need to put down?'),
('Tell me about a friendship that ended without drama, just faded into memories.'),
('What does true peace feel like to you in physical terms?'),
('Describe the sky outside your window right now as if the reader is blind.'),
('What is a mistake you made that ended up leading you somewhere beautiful?'),
('If you could leave a note in a public library book for anyone to find, what would it say?'),
('What is something you wish people understood about you without having to explain?'),
('Write about an ordinary afternoon that somehow felt magical in retrospect.'),
('What is a promise you made to yourself that you intend to keep no matter what?'),
('How do you comfort yourself when the world feels too loud and fast?'),
('Write a thank you note to someone who will probably never know you wrote it.'),
('What is the bravest thing you have done recently that went unnoticed by everyone?'),
('If you could relive just one hour from your past without changing anything, which one?'),
('What does hope look like when everything else feels uncertain?'),
('Tell a stranger about a place on earth where you felt completely safe.'),
('What is a question you wish someone would ask you today?'),
('Leave one gentle reminder for whoever opens this letter on their screen.');

-- ----------------------------------------------------------------------------
-- 2. INSERT 50 SEED LETTERS (KIND, POSITIVE, DIVERSE MOODS & POSTMARKS)
-- ----------------------------------------------------------------------------
-- All letters are between 10 and 400 words.
-- They are marked as is_seed = true, sender_id = NULL so anyone can receive them.

INSERT INTO public.letters (sender_id, body, mood, postmark, status, is_seed) VALUES
-- 1. Calm - Himachal Pradesh
(NULL, 'Sitting on the wooden porch here as dusk slowly settles behind the pine hills. The cold wind smells like damp cedar and smoke from woodstoves down in the valley. If you are having a chaotic day, I hope you can close your eyes for a moment and take a deep breath with me. Things have a way of untangling themselves in time.', 'calm', 'From Himachal Pradesh', 'waiting', true),

-- 2. Happy - Lucknow
(NULL, 'I finally passed an examination today that had been keeping me awake for months. Walking back through Hazratganj, the evening lights felt twice as warm. I bought two extra plates of sweets for the street kids near the corner. I do not know what you are struggling with, stranger, but I am sending half of my happiness your way tonight.', 'happy', 'From Lucknow', 'waiting', true),

-- 3. Sad - Kolkata
(NULL, 'Rain has been falling against my window pane in North Kolkata all afternoon. The tram tracks glisten like wet silver. Sometimes grief arrives without an invitation, sitting quietly beside you like an old companion. If you are feeling lonely tonight, please know you are not alone in your quiet sorrow. We share this rain together.', 'sad', 'From Kolkata', 'waiting', true),

-- 4. Calm - Kerala
(NULL, 'The backwaters are still as glass this morning. Coconut palms lean over the water as if admiring their own reflections. It is easy to forget how much rushing we do for things that do not truly matter. May your evening be as steady and unhurried as these slow houseboats drifting towards the horizon.', 'calm', 'From Kerala', 'waiting', true),

-- 5. Strange - Rajasthan
(NULL, 'I saw an elderly man speaking softly to an ancient banyan tree outside a ruined stepwell in Bundi today. He bowed to the roots and placed a single jasmine flower. It made me wonder about all the silent conversations the world holds that no one ever records. What mysterious rituals keep your heart grounded?', 'strange', 'From Rajasthan', 'waiting', true),

-- 6. Angry - Delhi
(NULL, 'I was furious earlier because someone took credit for months of my hard work at the office. My hands were shaking with indignation on the metro ride home. But sitting here writing this, I realize their deceit defines them, not my worth. I will build again, stronger and wiser. Never let dishonest people steal your spark.', 'angry', 'From Delhi', 'waiting', true),

-- 7. Happy - Mumbai
(NULL, 'Marine Drive on a breezy October night has magic in its salt air. Strangers sitting on tetrapods, sharing roasted corn and quiet laughter. I watched an old couple holding hands while their granddaughter chased bubbles. Life can be overwhelming in a city of millions, but small tendernesses save us every single day.', 'happy', 'From Mumbai', 'waiting', true),

-- 8. Calm - Assam
(NULL, 'The tea gardens stretch like an emerald ocean under the morning mist here in Jorhat. Drinking fresh green tea while birds wake up in the bamboo groves. Remind yourself today: you do not need to figure out your entire life before sunset. Just make it through today with kindness.', 'calm', 'From Assam', 'waiting', true),

-- 9. Strange - Varanasi
(NULL, 'Fires burning gently at the ghats while brass bells ring in the evening aarti across the river. It is a surreal feeling to watch life and departure occur in the very same frame of vision. It makes your daily anxieties feel so small, like dust caught in lantern light. Stay gentle with yourself.', 'strange', 'From Varanasi', 'waiting', true),

-- 10. Happy - Punjab
(NULL, 'The mustard fields are in full bloom, bright yellow as far as the eye can see! My grandmother made fresh makki ki roti and white butter for the entire neighborhood. If I could pack some of this warmth and send it through your phone screen, I truly would. Eat something comforting today!', 'happy', 'From Punjab', 'waiting', true),

-- 11. Sad - Bengaluru
(NULL, 'Surrounded by millions of tech workers rushing through traffic under cold neon boards, and yet I have never felt more isolated. It is strange how a crowded city can amplify your silence. If you feel invisible wherever you are reading this: I see you, stranger. Your existence matters.', 'sad', 'From Bengaluru', 'waiting', true),

-- 12. Calm - Goa
(NULL, 'Not the party side of Goa, but a sleepy village in the south. The sound of the waves rolling onto golden sand at midnight is the best lullaby ever composed. The ocean has survived storms for millions of years. Whatever wave is hitting you right now will also recede.', 'calm', 'From Goa', 'waiting', true),

-- 13. Strange - Ladakh
(NULL, 'Up here at twelve thousand feet, the night sky is crowded with so many stars that darkness almost disappears. The Milky Way looks like spilled milk on dark velvet. Looking up at infinity, it hit me how miraculous it is that you and I exist at the exact same moment in time.', 'strange', 'From Ladakh', 'waiting', true),

-- 14. Angry - Hyderabad
(NULL, 'Why is it so hard for people to say a simple sorry when they hurt you? Pride ruins the sweetest relationships. I am trying to let go of the anger burning in my chest tonight, not because they apologized, but because my peace is too precious to burn for someone else’s arrogance.', 'angry', 'From Hyderabad', 'waiting', true),

-- 15. Happy - Tamil Nadu
(NULL, 'Woke up at 5 AM to the aroma of fresh filter coffee and roasted cardamom. My sister brought home a stray kitten with big green eyes and he fell asleep purring in my palm. Happiness does not ask for expensive things; it just asks us to pay attention when it arrives quietly.', 'happy', 'From Tamil Nadu', 'waiting', true),

-- 16. Calm - Uttarakhand
(NULL, 'Listening to the river Alaknanda rushing over cold white boulders. The water is glacial blue and relentless in its journey. Nature never hurries, yet everything is accomplished. Whenever you feel rushed to meet an artificial deadline of success, remember the rivers that carve mountains over centuries.', 'calm', 'From Uttarakhand', 'waiting', true),

-- 17. Sad - Bhopal
(NULL, 'Cleaning out an old wooden cupboard and found letters my late grandfather wrote in green ink forty years ago. His handwriting was so steady and affectionate. Tangible memories fade, but love leaves an indelible watermark on who we become. Treasure those who speak kindly to you today.', 'sad', 'From Bhopal', 'waiting', true),

-- 18. Strange - Meghalaya
(NULL, 'Walking through the living root bridges in Cherrapunji in dense fog. Bridges made not of concrete, but guided rubber tree roots woven together across generations. Some of the most beautiful creations take decades to grow and outlive their builders. Trust what you are patiently cultivating.', 'strange', 'From Meghalaya', 'waiting', true),

-- 19. Happy - Gujarat
(NULL, 'Danced garba under colorful lights until my feet were sore and my cheeks hurt from smiling! The energy of hundreds of strangers moving to the same beat is something unforgettable. I hope tomorrow brings you a reason to dance, even if it is just in your socks in your kitchen.', 'happy', 'From Gujarat', 'waiting', true),

-- 20. Calm - Odisha
(NULL, 'Early morning on the shores of Puri. The sunrise painted the Bay of Bengal in shades of peach and liquid gold. Fishermen setting out their wooden boats with quiet confidence. May the dawn bring clarity to whatever questions have been keeping you restless.', 'calm', 'From Odisha', 'waiting', true),

-- 21. Angry - Pune
(NULL, 'People tell you to compromise until there is nothing left of you to compromise with. Today I finally stood up and said a firm NO to an unfair demand. My voice trembled, but my spine was straight. If you need courage to set a boundary today, take this letter as your sign.', 'angry', 'From Pune', 'waiting', true),

-- 22. Sad - Kashmir
(NULL, 'Chinar leaves are turning crimson and falling one by one across the quiet pathways around Dal Lake. There is an ache in watching beauty surrender to winter. But the trees know that shedding is the only way to endure the coming cold. Let go of what you cannot carry into the next season.', 'sad', 'From Kashmir', 'waiting', true),

-- 23. Strange - Sikkim
(NULL, 'Prayer flags fluttering violently in the mountain pass near Nathu La. With every gust of wind, tradition says the prayers printed on the cloth travel across the earth to bless strangers. Consider this letter your personal prayer flag floating across wires and screens to wish you safety.', 'strange', 'From Sikkim', 'waiting', true),

-- 24. Happy - Chandigarh
(NULL, 'I finally planted a little rooftop garden! Tomatoes are peeking through, and little basil leaves smell incredible in the evening breeze. Watching tiny green sprouts push through dark soil is the best reminder that growth happens quietly in the dark before anyone sees it blossom.', 'happy', 'From Chandigarh', 'waiting', true),

-- 25. Calm - Mysore
(NULL, 'Incense smoke curling through the evening courtyards here near the palace. Jasmine garlands hanging in stalls, their fragrance sweet and intoxicating. When your thoughts feel tangled, simplify your surroundings. One cup of warm water, one quiet seat, one slow breath.', 'calm', 'From Mysore', 'waiting', true),

-- 26. Sad - Jaipur
(NULL, 'Visited the old palace courtyards where kings used to hold court. Now only pigeons roost in the carved jharokhas and wind whistles through empty marble arches. Everything temporary. That thought used to terrify me, but tonight it gives me comfort: our heartbreaks are temporary too.', 'sad', 'From Jaipur', 'waiting', true),

-- 27. Angry - Indore
(NULL, 'Sick of people pretending everything is fine on social media while treating real human beings like disposables. I deleted three apps today and went for a long walk in the rain instead. Reality may be messy, but at least it is authentic. Hold on to real conversations.', 'angry', 'From Indore', 'waiting', true),

-- 28. Strange - Hampi
(NULL, 'Sitting among giant golden boulders that look like a giant child piled them up in a game millions of years ago. As the sun sets, the rocks glow like embers. You realize human history is just the blink of an eye. What matters is how much kindness we left in our small blink.', 'strange', 'From Karnataka', 'waiting', true),

-- 29. Happy - Dehradun
(NULL, 'Found a second-hand copy of my favorite childhood mystery novel in a corner bookstore on Rajpur Road. Inside the cover, someone had written in 1994: To Rohan, may you always seek adventures. Now, thirty years later, it is in my hands. Stories never truly die.', 'happy', 'From Uttarakhand', 'waiting', true),

-- 30. Calm - Pondicherry
(NULL, 'Pastel yellow French colonial walls lined with bougainvillea in full magenta bloom. The sea breeze carries the sound of church bells. Life does not always have to be a race to the finish line. Sometimes sitting with an iced tea and watching bicycles pass by is the highest achievement.', 'calm', 'From Puducherry', 'waiting', true),

-- 31. Strange - Spiti Valley
(NULL, 'The silence in this cold desert is so deep that you can hear your own heartbeat thumping against your ribs. Monks chanting in Key Monastery create vibrations that feel like they travel straight through your bones. The universe has so much silence waiting for you when you are ready.', 'strange', 'From Himachal Pradesh', 'waiting', true),

-- 32. Sad - Lucknow
(NULL, 'An old friendship ended this week. No shouting, no fight, just unanswered messages and excuses until the distance became permanent. It hurts more than a dramatic argument because there is no closure. If you miss an old friend tonight, I understand the quiet lump in your throat.', 'sad', 'From Uttar Pradesh', 'waiting', true),

-- 33. Happy - Ahmedabad
(NULL, 'My mother laughed so hard today at a silly joke that she dropped her tea spoon and had tears running down her face. It has been such a tough year for our family, and hearing that pure, unfiltered laugh felt like the sun breaking through after months of gray clouds.', 'happy', 'From Gujarat', 'waiting', true),

-- 34. Calm - Darjeeling
(NULL, 'Fog rolling over the toy train tracks as the whistling steam engine puffs past. Steam rises from a hot bowl of vegetable thukpa. It is cold enough to see your breath, but my heart feels full. Wherever you are, stay warm and nourish yourself tonight.', 'calm', 'From West Bengal', 'waiting', true),

-- 35. Angry - Delhi
(NULL, 'Tired of watching good people get walked over because they are polite. Politeness is a virtue, but boundaries are survival. Do not let anyone mistake your gentleness for weakness. You are allowed to protect your time and energy with ferocity.', 'angry', 'From Delhi', 'waiting', true),

-- 36. Strange - Jaisalmer
(NULL, 'Sleeping on sand dunes under a sky so clear that shooting stars streak across every few minutes. The desert wind shifts the dunes quietly throughout the night; by morning, the entire landscape has rewritten itself. You can rewrite yourself whenever you need to as well.', 'strange', 'From Rajasthan', 'waiting', true),

-- 37. Happy - Kochi
(NULL, 'The Chinese fishing nets rising against the evening sky while ferry boats honk in the harbor. I ate roasted fish wrapped in banana leaf and sat listening to street musicians playing an old Malayalam tune. Gratitude is a muscle that gets stronger the more you use it.', 'happy', 'From Kerala', 'waiting', true),

-- 38. Calm - Coorg
(NULL, 'Surrounded by coffee plantations and the gentle hum of cicadas in the twilight. Rain drops clinging to dark glossy coffee leaves like crystal beads. There is no urgency here, only steady photosynthesis and deep earth. Take this calm into your sleep tonight.', 'calm', 'From Karnataka', 'waiting', true),

-- 39. Sad - Nagpur
(NULL, 'Watching my aging parents walk slowly ahead of me in the park. Their steps are smaller, their shoulders slightly bent. Time is a thief that takes little pieces so quietly you only notice when you stop running. Spend ten minutes talking to someone who raised you today.', 'sad', 'From Maharashtra', 'waiting', true),

-- 40. Strange - Kutch
(NULL, 'Standing in the Great Rann of Kutch on a full moon night. Miles of pure white salt reflecting moonlight until earth and sky look like one infinite mirror. It feels like walking on the surface of another planet. We live in such an extraordinary world, stranger.', 'strange', 'From Gujarat', 'waiting', true),

-- 41. Happy - Shillong
(NULL, 'Pine needles underfoot, guitar strumming coming from a neighbor’s balcony, and sweet warm bakery bread in my backpack. Meghalaya breathes music and mist. I hope whatever music you listen to tonight fills you with stubborn optimism.', 'happy', 'From Meghalaya', 'waiting', true),

-- 42. Calm - Rishikesh
(NULL, 'Sitting on the white sand banks of the Ganga as tiny clay lamps with marigold petals float down the current. The river carries them all, never holding on, never turning backward. Practice letting go of today’s mistakes just like this flowing water.', 'calm', 'From Uttarakhand', 'waiting', true),

-- 43. Angry - Bengaluru
(NULL, 'Another rejection email after three rounds of exhausting interviews. It stings, and I felt like tearing up my resume. But rejection is often just redirection from rooms where you would have had to shrink to fit in. We will find our rightful place. Do not give up.', 'angry', 'From Karnataka', 'waiting', true),

-- 44. Sad - Agra
(NULL, 'Looking at the Taj Mahal at sunrise. Everyone speaks of its majesty, but beneath the white marble is a profound tribute to longing and grief. It is proof that deep human love outlasts empires and centuries. May the love you give come back to you tenfold.', 'sad', 'From Uttar Pradesh', 'waiting', true),

-- 45. Strange - Majuli
(NULL, 'On the world’s largest river island in the middle of the mighty Brahmaputra. The river swallows pieces of the land every monsoon, yet the islanders craft beautiful clay masks and sing devotional songs without despair. Adaptability is humanity’s superpower.', 'strange', 'From Assam', 'waiting', true),

-- 46. Happy - Chennai
(NULL, 'Walked down Marina Beach eating spicy sundal while children flew colorful dragon kites against the pink sunset. The laughter was contagious. Even when bank balances are modest and careers are uncertain, joy can be found for twenty rupees and a warm evening breeze.', 'happy', 'From Tamil Nadu', 'waiting', true),

-- 47. Calm - Shimla
(NULL, 'Snow started falling softly thirty minutes ago. Big, quiet flakes settling on pine needles and lampposts. The whole town has gone silent under a white blanket. May quiet thoughts replace whatever loud worries have been troubling your mind.', 'calm', 'From Himachal Pradesh', 'waiting', true),

-- 48. Sad - Patna
(NULL, 'Packing my bags to leave home for college in another state. My mother keeps sneaking extra jars of homemade pickles into my luggage. Leaving the familiar is painful, but growth only happens when we step outside our comfortable borders.', 'sad', 'From Bihar', 'waiting', true),

-- 49. Strange - Dhanushkodi
(NULL, 'At the very tip of India where the Indian Ocean meets the Bay of Bengal. The ruins of a cyclone-destroyed town stand half-buried in white sand under beating sun. Ruins have their own dignity; they prove something survived the worst tempest.', 'strange', 'From Tamil Nadu', 'waiting', true),

-- 50. Happy - Delhi
(NULL, 'To the stranger reading this exact sentence: you have survived 100% of your worst days so far. You are stronger, kinder, and more resilient than you give yourself credit for. I am sending you a sincere hug from Delhi tonight. Have faith in tomorrow!', 'happy', 'From Delhi', 'waiting', true);
