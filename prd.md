# PRD — Quiz Web: Verdadeiro ou Falso sobre Claude Code

## 1. Visão Geral

**Nome do produto:** Claude Code Quiz  
**Tipo:** Aplicação web com backend (Supabase)  
**Objetivo:** Educar desenvolvedores, tech leads e stakeholders de negócio sobre as capacidades do Claude Code por meio de um quiz interativo de perguntas verdadeiro ou falso, com ranking global em tempo real.  
**Entrega esperada:** Frontend estático + integração Supabase (banco de dados + real-time).

---

## 2. Problema e Oportunidade

Claude Code é uma ferramenta poderosa, mas muitos usuários — especialmente os não-técnicos — têm percepções incorretas sobre o que ele faz ou deixa de fazer. Um quiz interativo com ranking:

- Corrige mitos e afirmações equivocadas de forma lúdica
- Cria engajamento competitivo via ranking público em tempo real
- Serve como ferramenta de onboarding para equipes
- Pode ser usado em treinamentos, demos e eventos internos

---

## 3. Público-alvo

| Segmento | Perfil | Objetivo no quiz |
|---|---|---|
| Negócio | Gerentes de produto, stakeholders, tech leads não-técnicos | Entender o que o Claude Code faz no contexto de negócio |
| Desenvolvedor | Devs que estão avaliando ou começando a usar | Conhecer funcionalidades, integrações e fluxo de trabalho |
| Power User | Engenheiros que já usam Claude Code no dia a dia | Dominar features avançadas: MCP, SDK, hooks, configuração |

---

## 4. Funcionalidades (Requisitos de Negócio)

### 4.1 Registro do Participante
- Antes de iniciar o quiz, o usuário informa apenas seu **apelido/nome** (sem senha, sem conta)
- Campo obrigatório, mínimo 2 caracteres, máximo 30
- O nome é salvo no `localStorage` para reaproveitamento em sessões futuras (não precisa digitar de novo)
- Registro persistido na tabela `participants` do Supabase

### 4.2 Seleção de Nível
- O usuário escolhe entre 3 níveis: **Negócio**, **Desenvolvedor**, **Avançado**
- Cada nível contém 10 perguntas
- Existe opção de fazer o **Quiz Completo** (30 perguntas, todos os níveis em sequência)
- As perguntas são carregadas do arquivo `questions.json` (estático, sem requisição ao banco)

### 4.3 Fluxo da Pergunta
- Exibir uma pergunta por vez com a afirmação completa
- **Timer visível** contando o tempo da sessão (usado para desempate no ranking)
- Dois botões de resposta: **Verdadeiro** e **Falso**
- Feedback imediato após a resposta:
  - Resposta correta: visual positivo (verde) + explicação breve
  - Resposta incorreta: visual negativo (vermelho) + correção + explicação breve
- Botão para avançar para a próxima pergunta

### 4.4 Progresso e Score
- Barra de progresso indicando pergunta atual / total
- Pontuação acumulada visível durante o quiz
- Tela de resultado ao final com:
  - Score final (ex.: 8/10)
  - Percentual de acertos
  - Tempo total de conclusão
  - Classificação por faixa (ver seção 6.5)
  - Posição no ranking global
  - Resumo das perguntas erradas com respostas corretas
  - Botões: "Tentar Novamente", "Escolher outro nível", "Ver Ranking"

### 4.5 Ranking Global (Real-time)
- Ranking único global com todos os participantes
- Critério de ordenação:
  1. **Percentual de acertos** (decrescente)
  2. **Tempo de conclusão** em segundos (crescente — desempate para quem acertou o mesmo %)
- Cada participante aparece **uma única vez** com sua **melhor tentativa**
- Ranking atualiza em tempo real via Supabase Realtime (sem refresh de página)
- Exibe: posição, nome, nível completado, score, percentual, tempo
- Participante atual destacado na lista (linha com cor diferente)
- Paginação: exibir top 20 por padrão, com opção de ver mais

### 4.6 Persistência de Progresso
- Cada tentativa concluída é salva no Supabase (tabela `quiz_attempts`)
- Múltiplas tentativas são permitidas — apenas a melhor conta para o ranking
- `localStorage` mantém o nome do participante e o ID do participante entre sessões

---

## 5. Banco de Perguntas (questions.json)

As perguntas são armazenadas em um arquivo JSON estático. Isso garante:
- Zero latência para carregar perguntas (sem roundtrip ao banco)
- Facilidade para adicionar/editar perguntas sem alterar o banco
- Separação clara entre dados estáticos (perguntas) e dados dinâmicos (scores)

### 5.1 Estrutura do JSON

```json
[
  {
    "id": 1,
    "level": "business",
    "levelLabel": "Negócio",
    "statement": "Afirmação da pergunta aqui...",
    "answer": true,
    "explanation": "Explicação curta que aparece após a resposta."
  }
]
```

**Campos:**
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | number | Identificador único da pergunta |
| `level` | string | `"business"` \| `"developer"` \| `"advanced"` |
| `levelLabel` | string | Rótulo exibido na UI |
| `statement` | string | Afirmação apresentada ao participante |
| `answer` | boolean | `true` = Verdadeiro, `false` = Falso |
| `explanation` | string | Explicação exibida após resposta |

### 5.2 Perguntas — Nível Negócio (10)

```json
[
  {
    "id": 1, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code pode criar, editar e deletar arquivos de código automaticamente.",
    "answer": true,
    "explanation": "Claude Code tem acesso ao sistema de arquivos do projeto e realiza operações de leitura e escrita com aprovação do usuário."
  },
  {
    "id": 2, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code só funciona com projetos JavaScript e TypeScript.",
    "answer": false,
    "explanation": "Claude Code é agnóstico a linguagem — funciona com Python, Go, Rust, Java, Ruby e qualquer outra linguagem."
  },
  {
    "id": 3, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code está disponível como ferramenta de linha de comando (CLI).",
    "answer": true,
    "explanation": "Claude Code é primariamente uma CLI instalada via npm: npm install -g @anthropic-ai/claude-code."
  },
  {
    "id": 4, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code requer um servidor dedicado rodando para funcionar.",
    "answer": false,
    "explanation": "Claude Code roda localmente no terminal do desenvolvedor, consumindo a API da Anthropic sem infraestrutura adicional."
  },
  {
    "id": 5, "level": "business", "levelLabel": "Negócio",
    "statement": "É possível usar Claude Code para revisar pull requests no GitHub.",
    "answer": true,
    "explanation": "Claude Code pode analisar diffs, ler contexto do código e fornecer revisões detalhadas de pull requests."
  },
  {
    "id": 6, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code substitui completamente a necessidade de um desenvolvedor humano.",
    "answer": false,
    "explanation": "Claude Code é uma ferramenta de aumento de produtividade — ele assiste e automatiza tarefas, mas o desenvolvedor permanece no controle."
  },
  {
    "id": 7, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code pode executar testes automatizados e interpretar os resultados.",
    "answer": true,
    "explanation": "Claude Code pode rodar suites de testes via bash e analisar os outputs para identificar e sugerir correções para falhas."
  },
  {
    "id": 8, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code só pode ser usado por uma pessoa por vez em um repositório.",
    "answer": false,
    "explanation": "Múltiplos desenvolvedores podem usar Claude Code de forma independente e simultânea no mesmo repositório."
  },
  {
    "id": 9, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code está disponível como extensão para VS Code e JetBrains.",
    "answer": true,
    "explanation": "Existem integrações nativas para os principais IDEs do mercado além da CLI principal."
  },
  {
    "id": 10, "level": "business", "levelLabel": "Negócio",
    "statement": "Claude Code não consegue entender o contexto completo de um projeto grande.",
    "answer": false,
    "explanation": "Claude Code lê múltiplos arquivos e constrói o contexto do projeto para fornecer respostas coerentes com a arquitetura existente."
  }
]
```

### 5.3 Perguntas — Nível Desenvolvedor (10)

```json
[
  {
    "id": 11, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "Claude Code executa comandos bash sem nenhum controle de permissão.",
    "answer": false,
    "explanation": "Claude Code possui um sistema de permissões granular — o usuário aprova ou nega execuções de comandos sensíveis antes de rodarem."
  },
  {
    "id": 12, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "É possível configurar um arquivo CLAUDE.md para definir contexto e regras persistentes do projeto.",
    "answer": true,
    "explanation": "O arquivo CLAUDE.md é lido automaticamente e define instruções, convenções e contexto que Claude Code deve respeitar durante toda a sessão."
  },
  {
    "id": 13, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "Claude Code suporta múltiplos arquivos CLAUDE.md em subdiretórios do projeto.",
    "answer": true,
    "explanation": "Cada subdiretório pode ter seu próprio CLAUDE.md com instruções específicas para aquela área do código, que se somam ao CLAUDE.md raiz."
  },
  {
    "id": 14, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "É possível configurar hooks no Claude Code para rodar scripts em eventos específicos da sessão.",
    "answer": true,
    "explanation": "Hooks permitem executar scripts customizados em eventos como início de sessão, antes/depois de uso de ferramentas e fim de sessão."
  },
  {
    "id": 15, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "Claude Code não tem acesso a arquivos fora do diretório de trabalho atual.",
    "answer": false,
    "explanation": "Por padrão opera no diretório atual, mas pode acessar outros caminhos do sistema com as permissões adequadas configuradas."
  },
  {
    "id": 16, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "O modelo de IA usado pelo Claude Code não pode ser alterado pelo usuário.",
    "answer": false,
    "explanation": "É possível configurar qual modelo Claude usar via settings.json do projeto ou flags de linha de comando."
  },
  {
    "id": 17, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "Claude Code pode navegar em páginas web para buscar documentação.",
    "answer": true,
    "explanation": "Claude Code possui ferramentas de busca e fetch web para consultar documentação, referências e exemplos externos."
  },
  {
    "id": 18, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "Claude Code opera em modo totalmente autônomo por padrão, sem pedir confirmação.",
    "answer": false,
    "explanation": "Por padrão Claude Code solicita confirmação para ações destrutivas ou de alto impacto. O nível de autonomia é configurável via --dangerously-skip-permissions."
  },
  {
    "id": 19, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "O histórico de conversas do Claude Code não é salvo entre sessões por padrão.",
    "answer": true,
    "explanation": "Cada sessão do Claude Code começa com contexto limpo. Não há memória automática entre sessões distintas, embora seja possível retomar sessões com /resume."
  },
  {
    "id": 20, "level": "developer", "levelLabel": "Desenvolvedor",
    "statement": "Claude Code pode rodar em pipelines de CI/CD de forma não-interativa.",
    "answer": true,
    "explanation": "Claude Code suporta modo headless para execução automatizada em ambientes como GitHub Actions, sem necessidade de interação humana."
  }
]
```

### 5.4 Perguntas — Nível Avançado (10)

```json
[
  {
    "id": 21, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Claude Code implementa o Model Context Protocol (MCP) para extensibilidade.",
    "answer": true,
    "explanation": "MCP permite conectar Claude Code a servidores externos que expõem ferramentas, dados e prompts customizados, expandindo suas capacidades."
  },
  {
    "id": 22, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Claude Code pode atuar como orquestrador de múltiplos subagentes Claude em paralelo.",
    "answer": true,
    "explanation": "O Agent SDK permite criar pipelines onde Claude Code delega tarefas para subagentes especializados que rodam em paralelo ou sequência."
  },
  {
    "id": 23, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Subagentes criados com o Agent SDK herdam automaticamente o contexto completo do agente pai.",
    "answer": false,
    "explanation": "Subagentes iniciam com contexto limpo — o orquestrador deve passar explicitamente as informações relevantes no prompt de cada subagente."
  },
  {
    "id": 24, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Claude Code suporta hooks do tipo PreToolUse e PostToolUse para interceptar chamadas de ferramentas.",
    "answer": true,
    "explanation": "Esses hooks permitem validar, logar, modificar ou bloquear o comportamento antes e depois de cada chamada de ferramenta durante a sessão."
  },
  {
    "id": 25, "level": "advanced", "levelLabel": "Avançado",
    "statement": "O arquivo settings.json do Claude Code não permite configurar permissões por ferramenta individual.",
    "answer": false,
    "explanation": "É possível configurar allow/deny lists granulares por ferramenta no settings.json, tanto no escopo do projeto quanto globalmente."
  },
  {
    "id": 26, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Claude Code pode ser usado como biblioteca (SDK) em aplicações Node.js e Python.",
    "answer": true,
    "explanation": "O Claude Code SDK permite incorporar capacidades de agente em aplicações customizadas, com suporte a Node.js e Python."
  },
  {
    "id": 27, "level": "advanced", "levelLabel": "Avançado",
    "statement": "MCP servers configurados globalmente ficam disponíveis apenas para o projeto onde foram configurados.",
    "answer": false,
    "explanation": "MCP servers configurados em ~/.claude ficam disponíveis globalmente em todos os projetos. Configurações por projeto ficam locais ao projeto."
  },
  {
    "id": 28, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Claude Code usa o mesmo modelo para todas as tarefas independentemente da complexidade.",
    "answer": false,
    "explanation": "É possível configurar modelos diferentes para diferentes contextos, e o sistema pode usar modelos mais rápidos para subtarefas simples."
  },
  {
    "id": 29, "level": "advanced", "levelLabel": "Avançado",
    "statement": "O modo /ultrareview do Claude Code usa múltiplos agentes em paralelo para revisar código.",
    "answer": true,
    "explanation": "Ultrareview orquestra múltiplos agentes Claude especializados para cobrir diferentes aspectos de uma revisão simultaneamente."
  },
  {
    "id": 30, "level": "advanced", "levelLabel": "Avançado",
    "statement": "Claude Code não expõe métricas de uso de tokens durante uma sessão.",
    "answer": false,
    "explanation": "Claude Code exibe informações sobre consumo de tokens e custo estimado ao longo da sessão, permitindo monitorar o uso."
  }
]
```

---

## 6. Design e Experiência do Usuário

### 6.1 Paleta de Cores (Identidade Anthropic/Claude)
- **Primária:** `#D97757` (coral/laranja Anthropic)
- **Fundo escuro:** `#1A1A1A`
- **Fundo card:** `#242424`
- **Texto principal:** `#F5F5F5`
- **Texto secundário:** `#9E9E9E`
- **Sucesso:** `#4CAF50`
- **Erro:** `#F44336`
- **Destaque:** `#E8A87C` (laranja claro)
- **Ranking — posição atual:** `rgba(217, 119, 87, 0.15)` (coral com transparência)

### 6.2 Tipografia
- Fonte principal: `Inter` (Google Fonts) ou fallback `system-ui`
- Tamanho base: 16px
- Hierarquia: título do quiz (2rem), afirmação da pergunta (1.25rem), explicação (0.9rem)

### 6.3 Layout
- Single-page application com seções que transitam via JavaScript
- Totalmente responsivo (mobile-first)
- Largura máxima do card: 680px, centralizado

### 6.4 Telas

**Tela 1 — Home**
- Logo/ícone Claude Code
- Título: "Como você conhece o Claude Code?"
- Subtítulo explicativo breve
- 3 cards de nível (Negócio / Desenvolvedor / Avançado) com descrição e badge
- Botão "Quiz Completo" (30 perguntas)
- Link para o Ranking Global
- Se nome já salvo no localStorage: exibir "Bem-vindo de volta, [nome]!" com opção de trocar

**Tela 2 — Registro**
- Campo de texto: "Qual é o seu nome ou apelido?"
- Botão "Começar"
- Aviso: "Seu nome aparecerá no ranking público"
- Se nome já no localStorage: pré-preencher e permitir continuar ou alterar

**Tela 3 — Quiz**
- Header: nível atual + progresso (ex.: "Pergunta 3 de 10")
- Timer visível contando tempo (MM:SS)
- Barra de progresso animada
- Card central com afirmação em destaque
- Dois botões grandes: "Verdadeiro ✓" e "Falso ✗"
- Score atual (canto superior direito)

**Tela 4 — Feedback (inline, após resposta)**
- Afirmação muda de cor (verde/vermelho)
- Badge "Correto!" ou "Incorreto"
- Explicação breve aparece abaixo
- Botão "Próxima Pergunta"

**Tela 5 — Resultado**
- Score final em destaque (ex.: "8 / 10")
- Percentual, classificação e tempo total
- Posição no ranking global (ex.: "#3 no ranking")
- Lista de perguntas erradas com respostas corretas
- Botões: "Tentar Novamente", "Escolher outro nível", "Ver Ranking"

**Tela 6 — Ranking Global**
- Título: "Ranking Global — Claude Code Quiz"
- Indicador "🔴 Ao vivo" (real-time ativo)
- Tabela: Posição | Nome | Nível | Score | % | Tempo
- Linha do participante atual destacada em coral
- Top 20 por padrão, botão "Ver mais"
- Botão voltar para Home

### 6.5 Classificação por Score
| Faixa | Classificação | Mensagem |
|---|---|---|
| 0–40% | Descobrindo o Claude Code | Hora de explorar a documentação! |
| 41–70% | Em evolução | Você está no caminho certo. |
| 71–90% | Experiente | Ótimo conhecimento! |
| 91–100% | Expert Claude Code | Você domina o Claude Code! |

---

## 7. Arquitetura Técnica

### 7.1 Visão Geral

```
┌─────────────────────────────────────────┐
│              Frontend (Static)           │
│  HTML + CSS + Vanilla JS                │
│                                         │
│  questions.json ──► carregado 1x        │
│  localStorage   ──► nome + participant_id│
│                                         │
│  Supabase JS Client                     │
│    ├── INSERT participants              │
│    ├── INSERT quiz_attempts             │
│    ├── SELECT ranking (view)            │
│    └── SUBSCRIBE ranking (realtime)     │
└────────────────────┬────────────────────┘
                     │ HTTPS / WebSocket
┌────────────────────▼────────────────────┐
│              Supabase                    │
│                                         │
│  PostgreSQL                             │
│    ├── participants                     │
│    ├── quiz_attempts                    │
│    └── ranking_global (view)            │
│                                         │
│  Realtime                               │
│    └── broadcast on quiz_attempts INSERT│
│                                         │
│  Row Level Security (RLS)               │
│    ├── SELECT: público                  │
│    └── INSERT: público (sem auth)       │
└─────────────────────────────────────────┘
```

### 7.2 Stack
- **Frontend:** HTML5 + CSS3 + JavaScript ES6+ (Vanilla, sem framework)
- **Dados estáticos:** `questions.json` (perguntas do quiz)
- **Banco de dados:** Supabase (PostgreSQL gerenciado)
- **Real-time:** Supabase Realtime (WebSocket)
- **Client SDK:** `@supabase/supabase-js` via CDN
- **Hospedagem:** Qualquer CDN/hosting estático (Vercel, Netlify, GitHub Pages)

### 7.3 Estrutura de Arquivos

```
quiz-claude-code/
├── index.html           # Único arquivo HTML (todas as telas via JS)
├── style.css            # Estilos globais, componentes e animações
├── app.js               # Lógica principal da aplicação e navegação
├── supabase.js          # Configuração e funções do cliente Supabase
├── ranking.js           # Lógica do ranking e subscription real-time
├── questions.json       # Banco de perguntas completo (30 itens)
└── assets/
    └── claude-logo.svg  # Logo (opcional)
```

### 7.4 Modelo de Dados (Supabase / PostgreSQL)

#### Tabela: `participants`
```sql
CREATE TABLE participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) >= 2 AND char_length(name) <= 30),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `quiz_attempts`
```sql
CREATE TABLE quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id),
  level           TEXT NOT NULL CHECK (level IN ('business', 'developer', 'advanced', 'complete')),
  score           INT NOT NULL,
  total           INT NOT NULL,
  percentage      NUMERIC(5,2) NOT NULL,
  time_seconds    INT NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### View: `ranking_global`
```sql
CREATE VIEW ranking_global AS
SELECT
  ROW_NUMBER() OVER (ORDER BY best.percentage DESC, best.time_seconds ASC) AS position,
  p.id AS participant_id,
  p.name,
  best.level,
  best.score,
  best.total,
  best.percentage,
  best.time_seconds,
  best.completed_at
FROM participants p
JOIN LATERAL (
  SELECT *
  FROM quiz_attempts qa
  WHERE qa.participant_id = p.id
  ORDER BY qa.percentage DESC, qa.time_seconds ASC
  LIMIT 1
) best ON true;
```

#### Row Level Security (RLS)
```sql
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Todos podem inserir (sem autenticação)
CREATE POLICY "insert_participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_attempts"     ON quiz_attempts FOR INSERT WITH CHECK (true);

-- Todos podem ler (ranking público)
CREATE POLICY "read_participants" ON participants FOR SELECT USING (true);
CREATE POLICY "read_attempts"     ON quiz_attempts FOR SELECT USING (true);
```

### 7.5 Variáveis de Ambiente

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
```

Essas variáveis são expostas no frontend (anon key é pública por design do Supabase — a segurança é feita via RLS).

### 7.6 LocalStorage

| Chave | Valor | Descrição |
|---|---|---|
| `ccquiz_name` | string | Nome/apelido do participante |
| `ccquiz_participant_id` | UUID | ID do participante no Supabase |
| `ccquiz_best_scores` | JSON | Melhor score local por nível (fallback offline) |

```json
{
  "ccquiz_best_scores": {
    "business":   { "score": 8, "total": 10, "time_seconds": 142 },
    "developer":  { "score": 7, "total": 10, "time_seconds": 203 },
    "advanced":   { "score": 5, "total": 10, "time_seconds": 318 },
    "complete":   { "score": 24, "total": 30, "time_seconds": 720 }
  }
}
```

### 7.7 Timer
- Inicia no momento em que a primeira pergunta é exibida
- Para no momento em que o usuário responde a última pergunta
- Exibido em formato MM:SS durante o quiz
- Salvo como `time_seconds` (inteiro) no banco

### 7.8 Realtime (Ranking)
```javascript
supabase
  .channel('ranking')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'quiz_attempts'
  }, () => fetchAndRenderRanking())
  .subscribe();
```

### 7.9 Acessibilidade
- Contraste mínimo WCAG AA em todos os textos
- Navegação por teclado nos botões (tab + enter/space)
- `aria-label` nos botões de resposta
- `role="progressbar"` na barra de progresso
- `aria-live="polite"` na área de feedback

---

## 8. Critérios de Aceite

### Registro e Identidade
- [ ] Usuário informa nome antes de iniciar o quiz
- [ ] Nome é salvo no localStorage e reutilizado em sessões futuras
- [ ] Participante é criado no Supabase (tabela `participants`)

### Quiz
- [ ] Usuário escolhe nível e inicia o quiz
- [ ] Timer inicia junto com a primeira pergunta
- [ ] Cada pergunta exibe afirmação, botões V/F, progresso e timer
- [ ] Feedback é exibido imediatamente após resposta com explicação
- [ ] Tela de resultado mostra score, %, tempo, classificação e posição no ranking
- [ ] Tentativa é salva no Supabase (tabela `quiz_attempts`)

### Ranking
- [ ] Tela de ranking exibe top 20 participantes
- [ ] Ranking ordena por % decrescente, depois por tempo crescente
- [ ] Cada participante aparece apenas uma vez (melhor tentativa)
- [ ] Ranking atualiza em tempo real sem refresh de página
- [ ] Linha do participante atual é destacada

### Perguntas
- [ ] Todos os 30 itens do `questions.json` implementados e corretos
- [ ] Perguntas do nível selecionado são filtradas corretamente do JSON

### UX e Responsividade
- [ ] Layout funciona em mobile (320px) e desktop (1440px)
- [ ] Sem dependências de build — funciona abrindo o index.html ou via CDN

---

## 9. Fora do Escopo (v1)

- Autenticação com senha (apenas nome/apelido)
- Edição ou exclusão de tentativas
- Admin dashboard para gerenciar perguntas
- Ranking por nível separado (apenas global)
- Internacionalização (apenas português)
- Analytics/tracking externo
- PWA / modo offline

---

## 10. Métricas de Sucesso

- Score médio por nível (indicador de dificuldade calibrada)
- Taxa de conclusão do quiz (quantos chegam à tela de resultado)
- Percentual de usuários que refazem o quiz
- Número de participantes únicos no ranking

---

*Documento gerado em: 2026-05-05*  
*Versão: 2.0 — adicionados ranking global real-time e persistência Supabase*
