/**
 * The Roster's vibe check.
 * Order matters — these go one at a time, building drama toward Top 5 Pokémon.
 */
export const QUESTIONS = [
  {
    id: 'shehulk',
    prompt: 'What are your thoughts about the show "She-Hulk"?',
    placeholder: 'Be honest. Defend your position.',
    type: 'textarea',
  },
  {
    id: 'steve_harvey',
    prompt: 'What are your thoughts about Steve Harvey?',
    placeholder: 'No context provided. None will be provided.',
    type: 'textarea',
    subtitle: 'No context. None given.',
  },
  {
    id: 'korra',
    prompt: 'Do you feel that Korra was a better show and/or avatar?',
    placeholder: 'Show, avatar, both, neither — defend your stance.',
    type: 'textarea',
  },
  {
    id: 'waifu',
    prompt: 'Who is the definitive waifu?',
    placeholder: "There can only be one. Choose wisely.",
    type: 'textarea',
  },
  {
    id: 'top_five',
    prompt: 'Top 5 Pokémon.',
    placeholder: 'In any order. The ranking will be questioned regardless.',
    type: 'textarea',
    subtitle: 'The final test.',
  },
];

export const APPLICANT_PROMPT = {
  id: 'applicant',
  prompt: "First — who's challenging The Roster?",
  placeholder: 'Your name or handle',
  type: 'text',
  subtitle: "We'll know who to look up.",
};
