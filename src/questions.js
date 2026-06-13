/**
 * The Roster's vibe check.
 * Order matters — these go one at a time.
 *
 * To change the survey: just edit this array. The Discord embed is built
 * dynamically from these prompts, so you never need to touch the Worker.
 */
export const QUESTIONS = [
  {
    id: 'israel',
    prompt: 'What are your thoughts on Israel and the Jewish community?',
    placeholder: 'Take your time. There may be more to this question than it lets on.',
    type: 'textarea',
    subtitle: 'Read it carefully.',
  },
  {
    id: 'top_three_games',
    prompt: 'What are your top three games? No order necessary.',
    placeholder: 'Three. That\u2019s the limit. Choose with conviction.',
    type: 'textarea',
  },
  {
    id: 'cartoon_reboot',
    prompt: 'If you could reboot any cartoon, which one would it be and why?',
    placeholder: 'The "why" matters more than the "what."',
    type: 'textarea',
  },
  {
    id: 'controversial_run',
    prompt: 'What controversial storyline/run do you find enjoyable in Marvel or DC? Why?',
    placeholder: 'Defend the indefensible.',
    type: 'textarea',
  },
  {
    id: 'overrated_run',
    prompt: 'What widely renowned storyline/run do you find overrated for Marvel or DC? Why?',
    placeholder: 'Be brave. Someone here loves it.',
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
