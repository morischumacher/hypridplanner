// Study guide: state, timers, local storage, language toggle and JSON export.

// Set by /api/config at load; posting is disabled until it is configured.
let SAVE_ENDPOINT = '';

const DEFAULT_PLANNER_URL = window.ENV_STUDY_PLANNER_URL || 'https://studyplanner-moritz-schumachers-projects.vercel.app/';

let state = {
  currentStep: 0,
  language: 'en',
  recordingConsent: false,
  demographics: {
    participantId: '',
    age: '',
    gender: '',
    major: '',
    semester: '',
    experience: ''
  },
  timers: {
    sessionStart: null,
    totalSeconds: 0,
    scenarioA: { start: null, elapsed: 0, active: false },
    scenarioB: { start: null, elapsed: 0, active: false },
    discovery: { start: null, elapsed: 0, active: false }
  },
  scenarioA: {
    pu1: null, pu2: null, pu3: null,
    peu1: null, peu2: null, peu3: null,
    success: null, satisfaction: null, difficulty: null
  },
  scenarioB: {
    pu1: null, pu2: null, pu3: null,
    peu1: null, peu2: null, peu3: null,
    success: null, satisfaction: null, difficulty: null
  },
  ueq: {
    item1: null, item2: null, item3: null, item4: null, item5: null, item6: null, item7: null, item8: null,
    item9: null, item10: null, item11: null, item12: null, item13: null, item14: null, item15: null, item16: null,
    item17: null, item18: null, item19: null, item20: null, item21: null, item22: null, item23: null, item24: null,
    item25: null, item26: null
  },
  interviewNotes: '',
  plannerUrls: {
    a: DEFAULT_PLANNER_URL,
    b: DEFAULT_PLANNER_URL,
    discovery: DEFAULT_PLANNER_URL
  }
};

let timerInterval = null;

window.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  loadProgress();

  if (!state.timers.sessionStart) {
    state.timers.sessionStart = Date.now();
  }

  startTimerInterval();
  setupEventListeners();
  setLanguage(state.language || 'en');
  showStep(state.currentStep);
});

/** Wires every input to the state so progress is saved as it is entered. */
function setupEventListeners() {
  const demoFields = ['participant-id', 'age', 'gender', 'major', 'semester', 'experience'];
  demoFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        const fieldName = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        state.demographics[fieldName] = e.target.value;
        saveProgress();
      });
      el.addEventListener('change', (e) => {
        const fieldName = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
        state.demographics[fieldName] = e.target.value;
        saveProgress();
      });
    }
  });

  const consentChk = document.getElementById('recording-consent-chk');
  if (consentChk) {
    consentChk.addEventListener('change', (e) => {
      state.recordingConsent = e.target.checked;
      saveProgress();
    });
  }

  ['a', 'b', 'discovery'].forEach(key => {
    const el = document.getElementById(`planner-url-${key}`);
    const link = document.getElementById(`link-planner-${key}`);
    if (el) {
      el.addEventListener('input', (e) => {
        state.plannerUrls[key] = e.target.value;
        if (link) link.href = e.target.value;
        saveProgress();
      });
    }
  });

  const notesEl = document.getElementById('interview-notes');
  if (notesEl) {
    notesEl.addEventListener('input', (e) => {
      state.interviewNotes = e.target.value;
      saveProgress();
    });
  }

  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const name = e.target.name;
      // The success metric is a string, every other answer is a number.
      const val = parseInt(e.target.value) || e.target.value;

      if (name.startsWith('a-')) {
        const key = name.substring(2);
        state.scenarioA[key] = val;
      } else if (name.startsWith('b-')) {
        const key = name.substring(2);
        state.scenarioB[key] = val;
      } else if (name.startsWith('ueq-')) {
        const key = name.substring(4);
        state.ueq[key] = val;
      }
      saveProgress();
    });
  });

  // The sidebar navigates back to a completed step, never forward.
  document.querySelectorAll('.step-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const stepNum = parseInt(item.getAttribute('data-step'));
      if (stepNum < state.currentStep) {
        showStep(stepNum);
      } else if (stepNum === state.currentStep) {
        showStep(stepNum);
      }
    });
  });
}

function setLanguage(lang) {
  state.language = lang;
  if (lang === 'de') {
    document.body.classList.add('lang-de-active');
    document.querySelectorAll('[data-placeholder-de]').forEach(el => {
      el.placeholder = el.getAttribute('data-placeholder-de');
    });
    document.querySelectorAll('.btn-lang').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === 'de');
    });
  } else {
    document.body.classList.remove('lang-de-active');
    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
      el.placeholder = el.getAttribute('data-placeholder-en');
    });
    document.querySelectorAll('.btn-lang').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === 'en');
    });
  }
  saveProgress();
}

function showStep(stepNum) {
  document.querySelectorAll('.step-card').forEach(card => card.classList.remove('active'));

  const activeCard = document.getElementById(`step-card-${stepNum}`);
  if (activeCard) {
    activeCard.classList.add('active');
    document.querySelector('.main-content').scrollTop = 0;
  }

  document.querySelectorAll('.step-nav-item').forEach((item, index) => {
    item.classList.remove('active', 'completed');
    if (index === stepNum) {
      item.classList.add('active');
    } else if (index < stepNum) {
      item.classList.add('completed');
    }
  });

  state.currentStep = stepNum;
  saveProgress();

  // Step 4 is the Scenario A questionnaire, so the scenario itself is over.
  if (stepNum === 4) {
    state.timers.scenarioA.active = false;
  }

  // Step 6 is the Scenario B questionnaire.
  if (stepNum === 6) {
    state.timers.scenarioB.active = false;
  }

  // Step 8 is the UEQ, which follows open discovery.
  if (stepNum === 8) {
    state.timers.discovery.active = false;
  }

  // Step 10 is save and submit.
  if (stepNum === 10) {
    prepareSubmission();
  }
}

function nextStep(currentStepNum) {
  if (validateStep(currentStepNum)) {
    showStep(currentStepNum + 1);
  }
}

function prevStep(currentStepNum) {
  showStep(currentStepNum - 1);
}

/** Refuses to advance until the step's own answers are complete. */
function validateStep(stepNum) {
  if (stepNum === 0) {
    const form = document.getElementById('form-demographics');
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
  } else if (stepNum === 1) {
    const consentChk = document.getElementById('recording-consent-chk');
    if (!consentChk.checked) {
      if (state.language === 'de') {
        alert('Bitte bestätigen Sie Ihr Einverständnis zur Aufzeichnung, um fortzufahren.');
      } else {
        alert('Please consent to the recording to proceed.');
      }
      return false;
    }
  } else if (stepNum === 4) {
    const missing = getMissingRadioQuestions('a-', ['pu1', 'pu2', 'pu3', 'peu1', 'peu2', 'peu3', 'success', 'satisfaction', 'difficulty']);
    if (missing.length > 0) {
      if (state.language === 'de') {
        alert('Bitte beantworten Sie alle Fragen, bevor Sie fortfahren.');
      } else {
        alert('Please answer all questions before proceeding.');
      }
      highlightMissingQuestions('a-', missing);
      return false;
    }
  } else if (stepNum === 6) {
    const missing = getMissingRadioQuestions('b-', ['pu1', 'pu2', 'pu3', 'peu1', 'peu2', 'peu3', 'success', 'satisfaction', 'difficulty']);
    if (missing.length > 0) {
      if (state.language === 'de') {
        alert('Bitte beantworten Sie alle Fragen, bevor Sie fortfahren.');
      } else {
        alert('Please answer all questions before proceeding.');
      }
      highlightMissingQuestions('b-', missing);
      return false;
    }
  } else if (stepNum === 8) {
    const ueqKeys = Array.from({ length: 26 }, (_, i) => `item${i + 1}`);
    const missing = getMissingRadioQuestions('ueq-', ueqKeys);
    if (missing.length > 0) {
      if (state.language === 'de') {
        alert('Bitte bewerten Sie alle 26 Eigenschaftspaare, bevor Sie fortfahren.');
      } else {
        alert('Please rate all 26 evaluation items before proceeding.');
      }
      highlightMissingQuestions('ueq-', missing);
      return false;
    }
  }
  return true;
}

/** The keys of the radio groups that have no answer yet. */
function getMissingRadioQuestions(prefix, keys) {
  const missing = [];
  keys.forEach(k => {
    const radios = document.getElementsByName(prefix + k);
    let selected = false;
    for (let r of radios) {
      if (r.checked) {
        selected = true;
        break;
      }
    }
    if (!selected) missing.push(k);
  });
  return missing;
}

/** Marks and scrolls to the first unanswered question. */
function highlightMissingQuestions(prefix, missingKeys) {
  document.querySelectorAll('.likert-row, .ueq-row, .question-select-row').forEach(row => {
    row.style.boxShadow = 'none';
  });

  const firstKey = missingKeys[0];
  const input = document.querySelector(`input[name="${prefix + firstKey}"]`);
  if (input) {
    const parentRow = input.closest('.likert-row, .ueq-row, .question-select-row');
    if (parentRow) {
      parentRow.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
      parentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

/** Only one task timer runs at a time. */
function startScenarioTimer(type) {
  state.timers.scenarioA.active = false;
  state.timers.scenarioB.active = false;
  state.timers.discovery.active = false;

  if (type === 'scenario-a') {
    if (!state.timers.scenarioA.start) state.timers.scenarioA.start = Date.now();
    state.timers.scenarioA.active = true;
  } else if (type === 'scenario-b') {
    if (!state.timers.scenarioB.start) state.timers.scenarioB.start = Date.now();
    state.timers.scenarioB.active = true;
  } else if (type === 'open-discovery') {
    if (!state.timers.discovery.start) state.timers.discovery.start = Date.now();
    state.timers.discovery.active = true;
  }
  saveProgress();
}

function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (state.timers.sessionStart) {
      const elapsedMs = Date.now() - state.timers.sessionStart;
      state.timers.totalSeconds = Math.floor(elapsedMs / 1000);
      document.getElementById('session-timer').textContent = formatSeconds(state.timers.totalSeconds);
    }

    if (state.timers.scenarioA.active) {
      state.timers.scenarioA.elapsed++;
      const el = document.getElementById('timer-scenario-a');
      if (el) el.textContent = formatMinutesSeconds(state.timers.scenarioA.elapsed);
    }

    if (state.timers.scenarioB.active) {
      state.timers.scenarioB.elapsed++;
      const el = document.getElementById('timer-scenario-b');
      if (el) el.textContent = formatMinutesSeconds(state.timers.scenarioB.elapsed);
    }

    if (state.timers.discovery.active) {
      state.timers.discovery.elapsed++;
      const el = document.getElementById('timer-open-discovery');
      if (el) el.textContent = formatMinutesSeconds(state.timers.discovery.elapsed);
    }

    // Written back every five seconds rather than every tick.
    if (state.timers.totalSeconds % 5 === 0) {
      saveProgress();
    }
  }, 1000);
}

/** HH:MM:SS. */
function formatSeconds(sec) {
  if (!sec || sec < 0) sec = 0;
  const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
  const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
  const secs = (sec % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

/** MM:SS. */
function formatMinutesSeconds(sec) {
  if (!sec || sec < 0) sec = 0;
  const mins = Math.floor(sec / 60).toString().padStart(2, '0');
  const secs = (sec % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function saveProgress() {
  localStorage.setItem('study_planner_userstudy_progress', JSON.stringify(state));
}

function loadProgress() {
  const saved = localStorage.getItem('study_planner_userstudy_progress');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };

      // Migration: an older deployment's URLs are replaced with the current one.
      if (state.plannerUrls) {
        ['a', 'b', 'discovery'].forEach(key => {
          if (state.plannerUrls[key] && state.plannerUrls[key].includes('k4long0u6')) {
            state.plannerUrls[key] = DEFAULT_PLANNER_URL;
          }
        });
      }

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };
      const setHref = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.href = val;
      };

      setVal('participant-id', state.demographics.participantId || '');
      setVal('age', state.demographics.age || '');
      setVal('gender', state.demographics.gender || '');
      setVal('major', state.demographics.major || '');
      setVal('semester', state.demographics.semester || '');
      setVal('experience', state.demographics.experience || '');

      const consentChk = document.getElementById('recording-consent-chk');
      if (consentChk) {
        consentChk.checked = state.recordingConsent || false;
      }

      setVal('planner-url-a', state.plannerUrls.a || DEFAULT_PLANNER_URL);
      setVal('planner-url-b', state.plannerUrls.b || DEFAULT_PLANNER_URL);
      setVal('planner-url-discovery', state.plannerUrls.discovery || DEFAULT_PLANNER_URL);

      setHref('link-planner-a', state.plannerUrls.a || DEFAULT_PLANNER_URL);
      setHref('link-planner-b', state.plannerUrls.b || DEFAULT_PLANNER_URL);
      setHref('link-planner-discovery', state.plannerUrls.discovery || DEFAULT_PLANNER_URL);

      setVal('interview-notes', state.interviewNotes || '');

      const restoreRadios = (prefix, dataObj) => {
        Object.keys(dataObj).forEach(key => {
          const val = dataObj[key];
          if (val !== null) {
            const radio = document.querySelector(`input[name="${prefix + key}"][value="${val}"]`);
            if (radio) radio.checked = true;
          }
        });
      };

      restoreRadios('a-', state.scenarioA);
      restoreRadios('b-', state.scenarioB);
      restoreRadios('ueq-', state.ueq);

      document.getElementById('timer-scenario-a').textContent = formatMinutesSeconds(state.timers.scenarioA.elapsed);
      document.getElementById('timer-scenario-b').textContent = formatMinutesSeconds(state.timers.scenarioB.elapsed);
      document.getElementById('timer-open-discovery').textContent = formatMinutesSeconds(state.timers.discovery.elapsed);
    } catch (e) {
      console.error("Failed to parse saved state from local storage", e);
    }
  }
}

/** The whole session as one JSON document. */
function assembleResultsPayload() {
  return {
    metadata: {
      studyDate: new Date().toISOString(),
      appVersion: '1.1.0'
    },
    demographics: state.demographics,
    timings: {
      totalSessionSeconds: state.timers.totalSeconds,
      scenarioASeconds: state.timers.scenarioA.elapsed,
      scenarioBSeconds: state.timers.scenarioB.elapsed,
      discoverySeconds: state.timers.discovery.elapsed
    },
    scenarioAFeedback: state.scenarioA,
    scenarioBFeedback: state.scenarioB,
    ueqEvaluation: state.ueq,
    interviewerNotes: state.interviewNotes
  };
}

function prepareSubmission() {
  const payload = assembleResultsPayload();

  document.getElementById('summary-id').textContent = payload.demographics.participantId || 'N/A';
  document.getElementById('summary-time').textContent = formatSeconds(payload.timings.totalSessionSeconds);
  document.getElementById('summary-time-a').textContent = formatMinutesSeconds(payload.timings.scenarioASeconds);
  document.getElementById('summary-time-b').textContent = formatMinutesSeconds(payload.timings.scenarioBSeconds);
  document.getElementById('summary-time-discovery').textContent = formatMinutesSeconds(payload.timings.discoverySeconds);

  document.getElementById('json-preview').textContent = JSON.stringify(payload, null, 2);

  submitToBackend(payload);
}

/** Posts to the configured destination, a FastAPI backend or Google Sheets. */
async function submitToBackend(payload) {
  const statusBox = document.getElementById('save-status');
  if (!statusBox) return;

  statusBox.className = 'save-status-indicator';
  statusBox.innerHTML = '<div class="status-spinner"></div><span>Saving results...</span>';

  const url = SAVE_ENDPOINT;
  if (!url || url.includes('YOUR_GOOGLE_SHEETS_WEB_APP_URL_HERE')) {
    statusBox.classList.add('error');
    statusBox.innerHTML = '<span>⚠️ Save endpoint not configured. Please download or copy the JSON results manually.</span>';
    return;
  }

  try {
    const isGoogleSheets = url.includes('script.google.com');
    const options = {
      method: 'POST',
      body: JSON.stringify(payload),
      redirect: 'follow'
    };

    // text/plain avoids the CORS preflight Google Sheets does not answer.
    if (isGoogleSheets) {
      options.headers = { 'Content-Type': 'text/plain' };
    } else {
      options.headers = { 'Content-Type': 'application/json' };
    }

    const res = await fetch(url, options);

    if (res.ok) {
      statusBox.classList.add('success');
      statusBox.innerHTML = '<span>✅ Study data securely saved!</span>';
    } else {
      throw new Error(`Server returned code ${res.status}`);
    }
  } catch (error) {
    console.error('Failed to submit user study results:', error);
    statusBox.classList.add('error');
    statusBox.innerHTML = '<span>⚠️ Connection failed. Please download or copy the JSON results manually.</span>';
  }
}

function downloadResultsJSON() {
  const payload = assembleResultsPayload();
  const participantCode = payload.demographics.participantId || 'unknown';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `study-results_${participantCode}_${timestamp}.json`;

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyResultsToClipboard() {
  const payload = assembleResultsPayload();
  const text = JSON.stringify(payload, null, 2);

  navigator.clipboard.writeText(text).then(() => {
    alert('JSON data copied to clipboard successfully!');
  }).catch(err => {
    console.error('Could not copy to clipboard: ', err);
    alert('Failed to copy. Please select the text in the preview box and copy manually.');
  });
}

/** Clears the stored session so the guide can be run again. */
function resetSession() {
  const msg = state.language === 'de'
    ? 'Sind Sie sicher, dass Sie alle Daten löschen und eine neue Sitzung starten möchten? Stellen Sie sicher, dass Sie die aktuellen Daten zuerst gespeichert haben!'
    : 'Are you sure you want to clear all data and start a new user study session? Make sure to save the current data first!';
  if (confirm(msg)) {
    localStorage.removeItem('study_planner_userstudy_progress');
    window.location.reload();
  }
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.saveEndpoint) {
        SAVE_ENDPOINT = data.saveEndpoint;
      }
      if (data.videoUrl) {
        const btnVideo = document.getElementById('btn-video-tutorial');
        if (btnVideo) {
          btnVideo.href = data.videoUrl;
        }
      }
    }
  } catch (err) {
    console.warn("Could not load configuration from serverless API, using defaults.", err);
  }
}
