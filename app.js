// =========================================================
// Claude Code Quiz — entrada da aplicação.
// Roteador minimalista de telas (sem framework) + estado de
// sessão + integração Supabase.
// =========================================================

import { createParticipant, saveAttempt, fetchMyPosition } from "./supabase.js";
import { renderRanking } from "./ranking.js";
import { escapeHtml, formatTime } from "./utils.js";

const STORAGE_KEYS = {
  name: "ccquiz_name",
  participantId: "ccquiz_participant_id",
  insertToken: "ccquiz_insert_token",
  bestScores: "ccquiz_best_scores",
};

const app = document.getElementById("app");

// Estado de sessão (zerado a cada reload).
const session = {
  level: null, // "business" | "developer" | "advanced" | "complete"
  questions: [],
  currentIndex: 0,
  score: 0,
  wrongAnswers: [],
  startTimestamp: 0,
  timeSeconds: 0,
};

// =========================================================
// Helpers
// =========================================================

function getStoredName() {
  return localStorage.getItem(STORAGE_KEYS.name);
}

function clearIdentity() {
  localStorage.removeItem(STORAGE_KEYS.name);
  localStorage.removeItem(STORAGE_KEYS.participantId);
  localStorage.removeItem(STORAGE_KEYS.insertToken);
}

function startLevel(level) {
  session.level = level;
  if (getStoredName() && localStorage.getItem(STORAGE_KEYS.participantId) && localStorage.getItem(STORAGE_KEYS.insertToken)) {
    renderScreen("quiz");
  } else {
    renderScreen("registro");
  }
}

// =========================================================
// Carregamento de perguntas (cache em memória)
// =========================================================

let questionsCache = null;

async function loadQuestions() {
  if (questionsCache) return questionsCache;
  const res = await fetch("./questions.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  questionsCache = await res.json();
  return questionsCache;
}

// =========================================================
// Timer
// =========================================================

let timerInterval = null;

function startTimer() {
  session.startTimestamp = Date.now();
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getElapsedSeconds() {
  return Math.floor((Date.now() - session.startTimestamp) / 1000);
}

function updateTimerDisplay() {
  const el = document.querySelector("[data-timer]");
  if (el) el.textContent = formatTime(getElapsedSeconds());
}

// =========================================================
// Roteador (com cleanup opcional por tela)
// =========================================================

let currentScreenCleanup = null;

const screens = {
  home: renderHome,
  registro: renderRegistro,
  quiz: renderQuiz,
  resultado: renderResultado,
  ranking: renderRankingScreen,
};

const routeAnnouncer = document.getElementById("route-announcer");

async function renderScreen(name) {
  if (currentScreenCleanup) {
    try { currentScreenCleanup(); } catch (e) { console.warn("[router] cleanup failed", e); }
    currentScreenCleanup = null;
  }
  app.innerHTML = "";
  window.scrollTo({ top: 0 });
  const renderer = screens[name] || renderHome;
  const result = await renderer();
  if (typeof result === "function") currentScreenCleanup = result;

  // Gerenciamento de foco: move o foco para o primeiro h1 da nova tela.
  // tabindex="-1" permite foco programático sem entrar no fluxo de tab.
  const heading = app.querySelector("h1");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }

  // Anuncia a troca de tela para screen readers.
  // Limpa primeiro para garantir que o anúncio dispara mesmo ao revisitar a mesma tela.
  routeAnnouncer.textContent = "";
  requestAnimationFrame(() => {
    routeAnnouncer.textContent = heading?.textContent ?? "";
  });
}

// =========================================================
// Tela 1 — Home
// =========================================================

function renderHome() {
  const name = getStoredName();
  const greeting = name
    ? `<div class="welcome">
         <p>Bem-vindo de volta, <strong>${escapeHtml(name)}</strong>!</p>
         <button class="btn-link" id="change-name" type="button">Trocar nome</button>
       </div>`
    : "";

  app.innerHTML = `
    ${greeting}
    <section class="hero">
      <h1>Como você conhece o Claude Code?</h1>
      <p class="subtitle">Teste seus conhecimentos com perguntas Verdadeiro ou Falso e dispute o ranking global em tempo real.</p>
    </section>

    <section class="levels" aria-label="Escolha um nível">
      <button class="level-card" type="button" data-level="business">
        <span class="level-badge">Negócio</span>
        <h2>Para começar</h2>
        <p>10 perguntas sobre o que o Claude Code faz no contexto de negócio.</p>
      </button>

      <button class="level-card" type="button" data-level="developer">
        <span class="level-badge">Desenvolvedor</span>
        <h2>Para o dia a dia</h2>
        <p>10 perguntas sobre funcionalidades, integrações e fluxo de trabalho.</p>
      </button>

      <button class="level-card" type="button" data-level="advanced">
        <span class="level-badge">Avançado</span>
        <h2>Power user</h2>
        <p>10 perguntas sobre MCP, SDK, hooks e configuração avançada.</p>
      </button>
    </section>

    <button class="btn-primary" type="button" data-level="complete">
      Quiz Completo · 30 perguntas
    </button>

    <button class="btn-link btn-link--center" type="button" id="view-ranking">
      Ver Ranking Global →
    </button>
  `;

  app.querySelectorAll("[data-level]").forEach((el) => {
    el.addEventListener("click", () => startLevel(el.dataset.level));
  });

  app.querySelector("#view-ranking").addEventListener("click", () => {
    renderScreen("ranking");
  });

  const changeNameBtn = app.querySelector("#change-name");
  if (changeNameBtn) {
    changeNameBtn.addEventListener("click", () => {
      clearIdentity();
      renderScreen("home");
    });
  }
}

// =========================================================
// Tela 2 — Registro
// =========================================================

function renderRegistro() {
  const existingName = getStoredName() || "";

  app.innerHTML = `
    <section class="registro">
      <h1>Qual é o seu nome ou apelido?</h1>
      <p class="subtitle">Seu nome aparecerá no ranking público.</p>
      <form class="form-card" data-form novalidate>
        <input
          type="text"
          name="name"
          minlength="2"
          maxlength="30"
          required
          autocomplete="given-name"
          placeholder="Ex: Matheus"
          value="${escapeHtml(existingName)}"
          aria-label="Seu nome ou apelido"
        />
        <p class="form-error" data-error role="alert" hidden></p>
        <button class="btn-primary" type="submit">Começar</button>
        <button class="btn-link btn-link--center" type="button" data-back>← Voltar</button>
      </form>
    </section>
  `;

  const form = app.querySelector("[data-form]");
  const input = form.querySelector("input[name=name]");
  const errorEl = form.querySelector("[data-error]");
  const submitBtn = form.querySelector("button[type=submit]");

  input.focus();
  input.select();

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const name = input.value.trim();
    if (name.length < 2 || name.length > 30) {
      showError("O nome deve ter entre 2 e 30 caracteres.");
      input.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    try {
      const participant = await createParticipant(name);
      localStorage.setItem(STORAGE_KEYS.name, name);
      localStorage.setItem(STORAGE_KEYS.participantId, participant.id);
      localStorage.setItem(STORAGE_KEYS.insertToken, participant.insert_token);
      renderScreen("quiz");
    } catch (err) {
      console.error("[registro] create failed", err);
      showError("Não foi possível salvar. Verifique sua conexão e tente novamente.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Começar";
    }
  });

  app.querySelector("[data-back]").addEventListener("click", () => renderScreen("home"));
}

// =========================================================
// Tela 3 — Quiz
// =========================================================

async function renderQuiz() {
  if (!questionsCache) {
    app.innerHTML = `
      <section class="loading" aria-busy="true" aria-label="Carregando perguntas">
        <div class="loading-spinner" aria-hidden="true"></div>
        <p>Carregando perguntas...</p>
      </section>
    `;
  }

  let allQuestions;
  try {
    allQuestions = await loadQuestions();
  } catch (err) {
    console.error("[quiz] failed to load questions.json", err);
    renderQuestionsLoadError();
    return;
  }

  const questions = session.level === "complete"
    ? [...allQuestions]
    : allQuestions.filter((q) => q.level === session.level);

  if (!questions.length) {
    console.warn("[quiz] no questions for level", session.level);
    renderScreen("home");
    return;
  }

  session.questions = questions;
  session.currentIndex = 0;
  session.score = 0;
  session.wrongAnswers = [];

  startTimer();
  renderQuestion();

  return () => stopTimer();
}

function renderQuestionsLoadError() {
  app.innerHTML = `
    <section class="form-card error-card">
      <h1>Não foi possível carregar as perguntas</h1>
      <p class="muted">Alguns navegadores bloqueiam <code>fetch</code> em arquivos abertos diretamente do disco. Sirva o projeto com um servidor local:</p>
      <pre><code>python3 -m http.server</code></pre>
      <p class="muted">E abra <strong>http://localhost:8000</strong></p>
      <button class="btn-link btn-link--center" type="button" data-back>← Voltar para Home</button>
    </section>
  `;
  app.querySelector("[data-back]").addEventListener("click", () => renderScreen("home"));
}

function renderQuestion() {
  const total = session.questions.length;
  const i = session.currentIndex;

  if (i >= total) {
    stopTimer();
    session.timeSeconds = getElapsedSeconds();
    renderScreen("resultado");
    return;
  }

  const q = session.questions[i];
  const progressPct = (i / total) * 100;

  app.innerHTML = `
    <section class="quiz">
      <header class="quiz-header">
        <div class="quiz-meta-left">
          <span class="level-badge">${escapeHtml(q.levelLabel)}</span>
          <span class="quiz-progress-text">Pergunta ${i + 1} de ${total}</span>
        </div>
        <div class="quiz-meta-right">
          <span class="quiz-timer" data-timer aria-label="Tempo decorrido">00:00</span>
          <span class="quiz-score" aria-label="Pontuação atual">Score: <strong data-score>${session.score}</strong></span>
        </div>
      </header>

      <div class="quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progressPct)}">
        <div class="quiz-progress-fill" style="width: ${progressPct}%"></div>
      </div>

      <div class="quiz-card">
        <p class="quiz-statement" data-statement>${escapeHtml(q.statement)}</p>
        <div class="quiz-actions">
          <button class="btn-answer btn-answer--true" type="button" data-answer="true" aria-label="Responder Verdadeiro">
            <span aria-hidden="true">✓</span> Verdadeiro
          </button>
          <button class="btn-answer btn-answer--false" type="button" data-answer="false" aria-label="Responder Falso">
            <span aria-hidden="true">✗</span> Falso
          </button>
        </div>
      </div>

      <div class="quiz-feedback" data-feedback aria-live="polite"></div>
    </section>
  `;

  updateTimerDisplay();

  app.querySelectorAll("[data-answer]").forEach((btn) => {
    btn.addEventListener("click", () => handleAnswer(btn.dataset.answer === "true"));
  });
}

function handleAnswer(userAnswer) {
  const i = session.currentIndex;
  const q = session.questions[i];
  const correct = q.answer === userAnswer;

  if (correct) {
    session.score++;
  } else {
    session.wrongAnswers.push({ ...q, userAnswer });
  }

  // Disable buttons + visualmente marcar a opção escolhida
  app.querySelectorAll("[data-answer]").forEach((b) => {
    b.disabled = true;
    const isThisOne = (b.dataset.answer === "true") === userAnswer;
    if (isThisOne) {
      b.classList.add(correct ? "is-correct" : "is-incorrect");
    } else if (!correct) {
      // mostra qual era a certa
      const isAnswerOpt = (b.dataset.answer === "true") === q.answer;
      if (isAnswerOpt) b.classList.add("is-correct-target");
    }
  });

  app.querySelector("[data-statement]").classList.add(correct ? "is-correct" : "is-incorrect");
  app.querySelector("[data-score]").textContent = String(session.score);

  const fb = app.querySelector("[data-feedback]");
  fb.innerHTML = `
    <div class="feedback-card feedback-card--${correct ? "correct" : "incorrect"}">
      <span class="feedback-badge">${correct ? "Correto!" : "Incorreto"}</span>
      ${correct ? "" : `<p class="feedback-correction">Resposta correta: <strong>${q.answer ? "Verdadeiro" : "Falso"}</strong></p>`}
      <p class="feedback-explanation">${escapeHtml(q.explanation)}</p>
      <button class="btn-primary" type="button" data-next>
        ${i + 1 === session.questions.length ? "Ver resultado →" : "Próxima pergunta →"}
      </button>
    </div>
  `;
  const nextBtn = fb.querySelector("[data-next]");
  nextBtn.focus();
  nextBtn.addEventListener("click", () => {
    session.currentIndex++;
    renderQuestion();
  });
}

// =========================================================
// Tela 4 — Resultado
// =========================================================

function classify(percentage) {
  if (percentage <= 40) return { label: "Descobrindo o Claude Code", message: "Hora de explorar a documentação!" };
  if (percentage <= 70) return { label: "Em evolução", message: "Você está no caminho certo." };
  if (percentage <= 90) return { label: "Experiente", message: "Ótimo conhecimento!" };
  return { label: "Expert Claude Code", message: "Você domina o Claude Code!" };
}

function updateLocalBest(level, attempt) {
  const raw = localStorage.getItem(STORAGE_KEYS.bestScores);
  let all = {};
  try {
    all = raw ? JSON.parse(raw) : {};
  } catch {
    localStorage.removeItem(STORAGE_KEYS.bestScores);
  }
  const current = all[level];
  const currentPct = current ? current.score / current.total : -1;
  const newPct = attempt.score / attempt.total;
  const isBetter =
    !current ||
    newPct > currentPct ||
    (newPct === currentPct && attempt.time_seconds < current.time_seconds);
  if (isBetter) {
    all[level] = attempt;
    localStorage.setItem(STORAGE_KEYS.bestScores, JSON.stringify(all));
  }
}

async function renderResultado() {
  const total = session.questions.length;
  const score = session.score;
  // 2 casas decimais (alinha com NUMERIC(5,2) do banco)
  const percentage = Math.round((score / total) * 100 * 100) / 100;
  const timeSeconds = session.timeSeconds;
  const classification = classify(percentage);
  const participantId = localStorage.getItem(STORAGE_KEYS.participantId);
  const insertToken = localStorage.getItem(STORAGE_KEYS.insertToken);

  updateLocalBest(session.level, { score, total, time_seconds: timeSeconds });

  app.innerHTML = `
    <section class="result">
      <header class="result-header">
        <h1>Resultado</h1>
        <p class="muted">${escapeHtml(classification.message)}</p>
      </header>

      <div class="result-score">
        <span class="result-score-big">${score}<span class="result-score-total">/${total}</span></span>
        <span class="result-percentage">${Math.round(percentage)}%</span>
      </div>

      <div class="result-stats">
        <div class="stat">
          <span class="stat-label">Tempo</span>
          <span class="stat-value">${formatTime(timeSeconds)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Classificação</span>
          <span class="stat-value">${escapeHtml(classification.label)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Posição</span>
          <span class="stat-value" data-position>...</span>
        </div>
      </div>

      <p class="result-save-status muted" data-save-status>Salvando tentativa...</p>

      ${session.wrongAnswers.length ? `
        <details class="result-wrong" open>
          <summary>Perguntas que você errou (${session.wrongAnswers.length})</summary>
          <ul class="wrong-list">
            ${session.wrongAnswers.map((w) => `
              <li class="wrong-item">
                <p class="wrong-statement">${escapeHtml(w.statement)}</p>
                <p class="wrong-meta">Resposta correta: <strong>${w.answer ? "Verdadeiro" : "Falso"}</strong></p>
                <p class="wrong-explanation">${escapeHtml(w.explanation)}</p>
              </li>
            `).join("")}
          </ul>
        </details>
      ` : `<p class="muted result-perfect">🎉 Você não errou nenhuma!</p>`}

      <div class="result-actions">
        <button class="btn-primary" type="button" data-retry>Tentar Novamente</button>
        <button class="btn-secondary" type="button" data-pick>Escolher outro nível</button>
        <button class="btn-link" type="button" data-ranking>Ver Ranking →</button>
      </div>
    </section>
  `;

  app.querySelector("[data-retry]").addEventListener("click", () => renderScreen("quiz"));
  app.querySelector("[data-pick]").addEventListener("click", () => renderScreen("home"));
  app.querySelector("[data-ranking]").addEventListener("click", () => renderScreen("ranking"));

  const saveStatusEl = app.querySelector("[data-save-status]");
  const positionEl = app.querySelector("[data-position]");

  if (!participantId || !insertToken) {
    saveStatusEl.textContent = "Você não está identificado, sua pontuação não foi salva no ranking.";
    positionEl.textContent = "—";
    return;
  }

  try {
    await saveAttempt({
      participant_id: participantId,
      level: session.level,
      score,
      total,
      percentage,
      time_seconds: timeSeconds,
    }, insertToken);
    saveStatusEl.textContent = "✓ Tentativa salva no ranking.";

    const pos = await fetchMyPosition(participantId);
    positionEl.textContent = pos != null ? `#${pos}` : "—";
  } catch (err) {
    console.error("[result] save failed", err);
    saveStatusEl.textContent = "⚠ Não foi possível salvar no ranking. Sua pontuação local foi mantida.";
    positionEl.textContent = "—";
  }
}

// =========================================================
// Tela 6 — Ranking (delegado para ranking.js)
// =========================================================

function renderRankingScreen() {
  return renderRanking(app, { onBackHome: () => renderScreen("home") });
}

// =========================================================
// Boot
// =========================================================

renderScreen("home");
