export type QualityFixture = {
  id: string;
  title: string;
  prompt: string;
  medium: "art" | "code";
  expected: {
    occasion: string;
    mustInclude: string[];
    visualIntent: string;
    interaction?: "reaction" | "rsvp";
  };
};

export const QUALITY_FIXTURES: QualityFixture[] = [
  {
    id: "birthday-dawn-fishing",
    title: "Specific birthday memory",
    prompt:
      "A birthday card for my dad, Luis. He loves fishing at dawn on the Hudson. Make it warm, quiet, and a little cinematic. From Addy.",
    medium: "code",
    expected: {
      occasion: "Birthday",
      mustInclude: ["Luis", "fishing", "dawn"],
      visualIntent: "quiet water, early light, a restrained celebratory moment",
      interaction: "reaction",
    },
  },
  {
    id: "birthday-long-message",
    title: "Birthday with long copy",
    prompt:
      "Create a joyful birthday card for my sister Marisol. Include this note: You make every family room brighter, every dinner louder, and every hard season feel survivable. I am proud of the life you are building and grateful I get to call you my sister. Love, Addy.",
    medium: "code",
    expected: {
      occasion: "Birthday",
      mustInclude: ["Marisol", "sister", "grateful"],
      visualIntent: "celebratory with generous readable space for a long note",
      interaction: "reaction",
    },
  },
  {
    id: "thank-you-neighbor",
    title: "Everyday thank you",
    prompt:
      "Thank my neighbor Amina for feeding my cat while I was away. She is thoughtful, funny, and made a stressful trip feel easy. Use sage, cream, and an editorial feel.",
    medium: "code",
    expected: {
      occasion: "Thank you",
      mustInclude: ["Amina", "cat", "thoughtful"],
      visualIntent: "calm editorial gratitude, not generic confetti",
      interaction: "reaction",
    },
  },
  {
    id: "thank-you-mentor",
    title: "Professional gratitude",
    prompt:
      "A polished thank-you card for my mentor Dr. Chen after she reviewed my fellowship application. It should feel respectful, modern, and personal without looking corporate.",
    medium: "code",
    expected: {
      occasion: "Thank you",
      mustInclude: ["Dr. Chen", "fellowship", "mentor"],
      visualIntent: "quiet authority with a personal note",
      interaction: "reaction",
    },
  },
  {
    id: "congrats-marathon",
    title: "High-energy congratulations",
    prompt:
      "Congratulate my best friend Jay on finishing his first marathon in Brooklyn. He trained through winter mornings and almost quit twice. Make it energetic without looking like a sports ad.",
    medium: "code",
    expected: {
      occasion: "Congrats",
      mustInclude: ["Jay", "marathon", "Brooklyn"],
      visualIntent: "earned momentum and motion with a personal payoff",
      interaction: "reaction",
    },
  },
  {
    id: "congrats-new-job",
    title: "Career milestone",
    prompt:
      "A congratulations card for Nia who just accepted her first product management job. She has worked toward this for years. Make it sleek, optimistic, and not overly formal.",
    medium: "code",
    expected: {
      occasion: "Congrats",
      mustInclude: ["Nia", "product management", "years"],
      visualIntent: "modern momentum with confidence",
      interaction: "reaction",
    },
  },
  {
    id: "anniversary-jazz",
    title: "Romantic anniversary",
    prompt:
      "An anniversary card for my partner, Sam. Think jazz records, late dinners in Harlem, warm wine, and the feeling of choosing each other again. No cheesy hearts everywhere.",
    medium: "code",
    expected: {
      occasion: "Anniversary",
      mustInclude: ["Sam", "jazz", "Harlem"],
      visualIntent: "intimate, sophisticated, and romantic without cliches",
      interaction: "reaction",
    },
  },
  {
    id: "love-long-distance",
    title: "Long-distance love",
    prompt:
      "A soft card for my girlfriend who is in London this month. Tell her that the distance is temporary but the ordinary moments I want to share with her are the point. Use night blue and a single warm light.",
    medium: "code",
    expected: {
      occasion: "Love",
      mustInclude: ["London", "distance", "ordinary"],
      visualIntent: "quiet longing with one strong visual metaphor",
      interaction: "reaction",
    },
  },
  {
    id: "get-well-after-surgery",
    title: "Gentle recovery",
    prompt:
      "A get-well card for Tasha after surgery. Keep it hopeful and calm. She loves plants, early morning sun, and hates being fussed over.",
    medium: "code",
    expected: {
      occasion: "Get well",
      mustInclude: ["Tasha", "plants", "morning"],
      visualIntent: "gentle recovery, no frantic motion or loud celebration",
      interaction: "reaction",
    },
  },
  {
    id: "thinking-of-you-loss",
    title: "Support during loss",
    prompt:
      "A thinking-of-you card for Omar after the loss of his grandmother. It should be simple, dignified, and leave room to breathe. No religious language.",
    medium: "code",
    expected: {
      occasion: "Thinking of you",
      mustInclude: ["Omar", "grandmother", "thinking"],
      visualIntent: "dignified stillness and generous negative space",
      interaction: "reaction",
    },
  },
  {
    id: "holiday-family",
    title: "Holiday greeting",
    prompt:
      "A holiday card from the De La Cruz family to our friends. We want it to feel like a warm apartment, good food, music, and a full table rather than generic snowflakes.",
    medium: "code",
    expected: {
      occasion: "Holiday",
      mustInclude: ["De La Cruz", "food", "music"],
      visualIntent: "warm, communal, and culturally specific",
      interaction: "reaction",
    },
  },
  {
    id: "just-because-voice-note",
    title: "Unexpected care",
    prompt:
      "Send a just-because card to my friend Dani. She left me a voice note when I was overwhelmed last week and I want her to know it mattered.",
    medium: "code",
    expected: {
      occasion: "Just because",
      mustInclude: ["Dani", "voice note", "mattered"],
      visualIntent: "surprising and intimate rather than a named holiday template",
      interaction: "reaction",
    },
  },
  {
    id: "invitation-dinner",
    title: "Dinner invitation",
    prompt:
      "Invite Priya to dinner at Lilia in Williamsburg on September 18 at 7:30 PM. It is a small celebration after her book launch. Make it elegant and clearly show the details.",
    medium: "code",
    expected: {
      occasion: "Invitation",
      mustInclude: ["Priya", "Lilia", "Williamsburg", "September 18", "7:30 PM"],
      visualIntent: "editorial dinner invitation with clear event hierarchy",
      interaction: "rsvp",
    },
  },
  {
    id: "rsvp-birthday-party",
    title: "Birthday RSVP",
    prompt:
      "Create an RSVP card for Andre's 30th birthday party. Saturday, October 4, 8 PM, at 241 Wythe Avenue, Brooklyn. Dress code: something you would wear to dance all night.",
    medium: "code",
    expected: {
      occasion: "RSVP",
      mustInclude: ["Andre", "30th", "October 4", "8 PM", "241 Wythe Avenue"],
      visualIntent: "party invitation with an unmistakable RSVP action",
      interaction: "rsvp",
    },
  },
  {
    id: "wedding-save-date",
    title: "Wedding save the date",
    prompt:
      "Save the date for Maya and Jordan's wedding: June 14, 2027 in Hudson, New York. They love wildflowers, vinyl records, and long summer evenings. Keep it sophisticated.",
    medium: "code",
    expected: {
      occasion: "Wedding",
      mustInclude: ["Maya", "Jordan", "June 14, 2027", "Hudson"],
      visualIntent: "sophisticated save-the-date with clear date and place",
      interaction: "rsvp",
    },
  },
  {
    id: "baby-shower",
    title: "Baby shower invitation",
    prompt:
      "Invite Lena to baby shower brunch for Monica on Sunday, May 17 at 11 AM in Prospect Heights. The parents love books and want it sweet but not cartoonish.",
    medium: "code",
    expected: {
      occasion: "Baby shower",
      mustInclude: ["Lena", "Monica", "May 17", "11 AM", "Prospect Heights"],
      visualIntent: "soft, literary invitation with readable details",
      interaction: "rsvp",
    },
  },
  {
    id: "graduation",
    title: "Graduation milestone",
    prompt:
      "Congratulate my cousin Elias on graduating from nursing school. He worked nights while studying and is about to start at Bellevue. Make it proud, grounded, and full of forward motion.",
    medium: "code",
    expected: {
      occasion: "Graduation",
      mustInclude: ["Elias", "nursing", "Bellevue"],
      visualIntent: "earned achievement and care, not stock graduation imagery",
      interaction: "reaction",
    },
  },
  {
    id: "art-birthday-portrait",
    title: "Art-mode birthday",
    prompt:
      "Paint a birthday card for my aunt Rosa: citrus cake, yellow kitchen light, a blue apron, and a table full of nieces and nephews. Keep the image editorial and joyful.",
    medium: "art",
    expected: {
      occasion: "Birthday",
      mustInclude: ["Rosa", "citrus", "kitchen"],
      visualIntent: "editorial family image with a specific visual story",
      interaction: "reaction",
    },
  },
  {
    id: "art-thank-you",
    title: "Art-mode thank you",
    prompt:
      "Make an illustrated thank-you card for the teachers who hosted our AI workshop. Show notebooks, curiosity, and a room full of ideas without making it look like a corporate stock image.",
    medium: "art",
    expected: {
      occasion: "Thank you",
      mustInclude: ["teachers", "AI workshop", "ideas"],
      visualIntent: "human classroom energy with editorial restraint",
      interaction: "reaction",
    },
  },
  {
    id: "new-home-housewarming",
    title: "New-home celebration",
    prompt:
      "Congratulate Devon and Kira on their first apartment in Crown Heights. They painted the walls themselves, host everyone for Sunday dinner, and finally have room for a real dining table.",
    medium: "code",
    expected: {
      occasion: "Congrats",
      mustInclude: ["Devon", "Kira", "Crown Heights", "Sunday dinner"],
      visualIntent: "warm domestic celebration with a sense of place",
      interaction: "reaction",
    },
  },
  {
    id: "ambiguous-prompt",
    title: "Insufficient detail",
    prompt: "Make something nice for my friend.",
    medium: "code",
    expected: {
      occasion: "Unknown",
      mustInclude: [],
      visualIntent: "the planner should ask one useful follow-up before building",
    },
  },
  {
    id: "long-name-and-emoji",
    title: "Long content stress case",
    prompt:
      "A congratulations card for María-José Alexandra Hernández-Ramírez 🎓, who just defended her PhD in environmental engineering. Mention that her abuela would be proud and keep every name readable on a phone.",
    medium: "code",
    expected: {
      occasion: "Congrats",
      mustInclude: ["María-José", "PhD", "abuela"],
      visualIntent: "mobile-safe typography for a long accented name",
      interaction: "reaction",
    },
  },
  {
    id: "minimal-copy",
    title: "Minimal copy",
    prompt: "A quiet card for Theo. Just say: I am here.",
    medium: "code",
    expected: {
      occasion: "Thinking of you",
      mustInclude: ["Theo", "I am here"],
      visualIntent: "strong negative space and one meaningful visual gesture",
      interaction: "reaction",
    },
  },
  {
    id: "event-missing-details",
    title: "Event with missing details",
    prompt:
      "Make an invitation for our studio dinner next month. It should feel like a secret supper club.",
    medium: "code",
    expected: {
      occasion: "Invitation",
      mustInclude: [],
      visualIntent: "the planner should request date, time, and location before publish",
      interaction: "rsvp",
    },
  },
];
