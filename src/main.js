import './style.css';
import { QUESTIONS, APPLICANT_PROMPT } from './questions.js';
import { submitApplication, WEBHOOK_URL } from './discord.js';

// Combined step list: applicant name first, then the 5 questions
const STEPS = [APPLICANT_PROMPT, ...QUESTIONS];

// In-memory state
const state = {
  stepIndex: -1, // -1 = intro screen
  answers: {},
  applicant: '',
  submitted: false,
};

function init() {
  render();
  // Keyboard nav: Enter to advance from intro screen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.stepIndex === -1) {
      e.preventDefault();
      startEncounter();
    }
  });
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (state.stepIndex === -1) {
    app.appendChild(renderIntro());
  } else if (state.submitted) {
    app.appendChild(renderComplete());
  } else if (state.stepIndex >= STEPS.length) {
    app.appendChild(renderReview());
  } else {
    app.appendChild(renderStep(state.stepIndex));
  }
}

function renderIntro() {
  const el = document.createElement('div');
  el.className = 'screen intro-screen';
  el.innerHTML = `
    <div class="grass-banner"></div>
    <div class="intro-content">
      <p class="intro-eyebrow">A wild challenger appeared.</p>
      <h1 class="intro-title">Wild Encounter</h1>
      <p class="intro-tagline">
        You're being considered for <strong>The Roster</strong>. Before we welcome you in,
        there are five questions. Answer honestly. Answer with vibe.
      </p>
      <div class="intro-rules">
        <span class="rule">⚡  No wrong answers — only your real answers.</span>
        <span class="rule">🎯  Submissions go straight to The Roster.</span>
        <span class="rule">⏱️  Five questions. Five vibes. Let's go.</span>
      </div>
      <button class="primary-btn" id="start-btn">Begin Encounter →</button>
      ${!WEBHOOK_URL ? '<p class="dev-warning">⚠️ Test mode — submissions logged to console, not Discord.</p>' : ''}
    </div>
  `;
  el.querySelector('#start-btn').addEventListener('click', startEncounter);
  return el;
}

function startEncounter() {
  state.stepIndex = 0;
  render();
}

function renderStep(idx) {
  const step = STEPS[idx];
  const isApplicant = step.id === 'applicant';
  const progressNum = isApplicant ? 0 : idx; // applicant is step 0, questions are 1-5
  const totalQuestions = QUESTIONS.length;
  const progressLabel = isApplicant ? 'Trainer info' : `Question ${idx} of ${totalQuestions}`;
  const progressPct = isApplicant ? 0 : (idx / totalQuestions) * 100;

  const existing = state.answers[step.id] || (isApplicant ? state.applicant : '');

  const el = document.createElement('div');
  el.className = 'screen step-screen';
  el.innerHTML = `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${progressPct}%"></div>
    </div>
    <p class="progress-label">${progressLabel}</p>

    <div class="step-card">
      <h2 class="step-prompt">${step.prompt}</h2>
      ${step.subtitle ? `<p class="step-subtitle">${step.subtitle}</p>` : ''}
      ${step.type === 'textarea'
        ? `<textarea class="step-input" id="step-input" rows="4" placeholder="${step.placeholder}">${escapeHtml(existing)}</textarea>`
        : `<input class="step-input" id="step-input" type="text" placeholder="${step.placeholder}" value="${escapeHtml(existing)}" />`}

      <div class="step-actions">
        ${idx > 0 ? '<button class="ghost-btn" id="back-btn">← Back</button>' : '<span></span>'}
        <button class="primary-btn" id="next-btn">${idx === STEPS.length - 1 ? 'Review →' : 'Next →'}</button>
      </div>
    </div>
  `;

  const input = el.querySelector('#step-input');
  input.focus();
  // For text input: Enter advances. For textarea: Ctrl/Cmd+Enter advances (allow line breaks).
  input.addEventListener('keydown', (e) => {
    if (step.type === 'text' && e.key === 'Enter') {
      e.preventDefault();
      saveAndAdvance(input.value);
    } else if (step.type === 'textarea' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveAndAdvance(input.value);
    }
  });

  el.querySelector('#next-btn').addEventListener('click', () => saveAndAdvance(input.value));
  const backBtn = el.querySelector('#back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      saveCurrent(input.value);
      state.stepIndex--;
      render();
    });
  }

  // Animate in
  requestAnimationFrame(() => el.classList.add('enter'));
  return el;
}

function saveCurrent(value) {
  const step = STEPS[state.stepIndex];
  if (!step) return;
  if (step.id === 'applicant') {
    state.applicant = value.trim();
  } else {
    state.answers[step.id] = value.trim();
  }
}

function saveAndAdvance(value) {
  const step = STEPS[state.stepIndex];
  const trimmed = value.trim();

  // Applicant name is required; other questions allow blank but warn lightly
  if (step.id === 'applicant' && !trimmed) {
    flashInput();
    return;
  }

  saveCurrent(trimmed);
  state.stepIndex++;
  render();
}

function flashInput() {
  const input = document.getElementById('step-input');
  if (!input) return;
  input.classList.remove('flash');
  void input.offsetWidth; // force reflow to restart animation
  input.classList.add('flash');
}

function renderReview() {
  const el = document.createElement('div');
  el.className = 'screen review-screen';
  el.innerHTML = `
    <p class="progress-label">Final check</p>
    <div class="step-card review-card">
      <h2 class="step-prompt">Your submission</h2>
      <p class="step-subtitle">Take one last look. You can go back to edit anything.</p>

      <div class="review-list">
        <div class="review-item">
          <span class="review-label">Trainer</span>
          <span class="review-value">${escapeHtml(state.applicant)}</span>
        </div>
        ${QUESTIONS.map((q, i) => `
          <div class="review-item">
            <span class="review-label">${i + 1}. ${q.prompt}</span>
            <span class="review-value">${escapeHtml(state.answers[q.id] || '(skipped)')}</span>
          </div>
        `).join('')}
      </div>

      <div class="step-actions">
        <button class="ghost-btn" id="edit-btn">← Edit answers</button>
        <button class="primary-btn" id="submit-btn">Submit to The Roster →</button>
      </div>
      <p class="dev-warning" id="submit-error" hidden></p>
    </div>
  `;
  el.querySelector('#edit-btn').addEventListener('click', () => {
    state.stepIndex = STEPS.length - 1;
    render();
  });
  el.querySelector('#submit-btn').addEventListener('click', handleSubmit);
  return el;
}

async function handleSubmit() {
  const btn = document.getElementById('submit-btn');
  const errEl = document.getElementById('submit-error');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  errEl.hidden = true;

  const res = await submitApplication(state.applicant, state.answers);
  if (res.ok) {
    state.submitted = true;
    render();
  } else {
    btn.disabled = false;
    btn.textContent = 'Submit to The Roster →';
    errEl.textContent = `Submission paused: ${res.error}`;
    errEl.hidden = false;
    // In test mode without webhook, still show success after a beat
    if (!WEBHOOK_URL) {
      setTimeout(() => {
        state.submitted = true;
        render();
      }, 1200);
    }
  }
}

function renderComplete() {
  const el = document.createElement('div');
  el.className = 'screen complete-screen';
  el.innerHTML = `
    <div class="grass-banner"></div>
    <div class="intro-content">
      <p class="intro-eyebrow">✓ Submission received</p>
      <h1 class="intro-title">You've been spotted.</h1>
      <p class="intro-tagline">
        The Roster is reviewing your answers right now. If your vibes check out,
        someone will reach out with an invite. No timer, no pressure — these things take their time.
      </p>
      <p class="intro-tagline" style="opacity:0.7;font-size:0.9rem;margin-top:24px;">
        Thanks for playing along, <strong>${escapeHtml(state.applicant)}</strong>.
      </p>
    </div>
  `;
  return el;
}

function escapeHtml(s) {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

init();
