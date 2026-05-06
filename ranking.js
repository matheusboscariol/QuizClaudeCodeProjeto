// =========================================================
// Tela de Ranking Global + subscription Realtime.
// Exporta renderRanking(container, { onBackHome }).
// Retorna uma função de cleanup para cancelar o canal
// quando o router trocar de tela.
// =========================================================

import { fetchRanking, subscribeRanking } from "./supabase.js";
import { escapeHtml, formatTime } from "./utils.js";

const STORAGE_PARTICIPANT_ID = "ccquiz_participant_id";

const LEVEL_LABELS = {
  business: "Negócio",
  developer: "Desenvolvedor",
  advanced: "Avançado",
  complete: "Completo",
};

export async function renderRanking(container, { onBackHome }) {
  let limit = 20;
  const currentParticipantId = localStorage.getItem(STORAGE_PARTICIPANT_ID);

  container.innerHTML = `
    <section class="ranking">
      <header class="ranking-header">
        <h1>Ranking Global</h1>
        <span class="live-indicator">
          <span class="live-dot" aria-hidden="true"></span>
          <span>Ao vivo</span>
        </span>
      </header>

      <div class="table-wrap">
        <table class="ranking-table" aria-label="Ranking global de participantes">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nome</th>
              <th scope="col">Nível</th>
              <th scope="col">Score</th>
              <th scope="col">%</th>
              <th scope="col">Tempo</th>
            </tr>
          </thead>
          <tbody data-rows>
            <tr><td colspan="6" class="muted table-empty">Carregando...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="ranking-actions">
        <button class="btn-link" type="button" data-more hidden>Ver mais</button>
        <button class="btn-link" type="button" data-home>← Voltar para Home</button>
      </div>
    </section>
  `;

  const tbody = container.querySelector("[data-rows]");
  const moreBtn = container.querySelector("[data-more]");

  async function fetchAndRender() {
    try {
      // Busca limit+1 para saber se há mais dados sem precisar de uma query extra.
      const rows = await fetchRanking(limit + 1);
      const hasMore = rows.length > limit;
      const display = hasMore ? rows.slice(0, limit) : rows;

      if (!display.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="muted table-empty">Ainda sem tentativas. Seja o primeiro!</td></tr>`;
        moreBtn.hidden = true;
        return;
      }

      tbody.innerHTML = display
        .map((r) => {
          const isCurrent = r.participant_id === currentParticipantId;
          return `
          <tr class="${isCurrent ? "is-current" : ""}">
            <td class="col-pos">${r.position}</td>
            <td class="col-name">${escapeHtml(r.name)}</td>
            <td class="col-level">${LEVEL_LABELS[r.level] || r.level}</td>
            <td>${r.score}/${r.total}</td>
            <td>${Math.round(Number(r.percentage))}%</td>
            <td>${formatTime(r.time_seconds)}</td>
          </tr>
        `;
        })
        .join("");

      moreBtn.hidden = !hasMore;
    } catch (err) {
      console.error("[ranking] fetch failed", err);
      tbody.innerHTML = `<tr><td colspan="6" class="muted table-empty">Não foi possível carregar o ranking. Verifique sua conexão.</td></tr>`;
    }
  }

  await fetchAndRender();

  const unsubscribe = subscribeRanking(() => fetchAndRender());

  moreBtn.addEventListener("click", () => {
    limit += 20;
    fetchAndRender();
  });

  container.querySelector("[data-home]").addEventListener("click", () => onBackHome());

  return () => {
    try { unsubscribe(); } catch (_) {}
  };
}
