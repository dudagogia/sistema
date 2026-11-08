// js/jogos.js
protegerPagina();

let usuarioAtual = null;
let alunosCache = [];
let jogoAtual = 'memoria';
let estado = {};

// Dados dos jogos
const TEMAS = {
  animais:  ['🐶','🐱','🐰','🦊','🐼','🐸','🐵','🦁','🐘','🐢','🦋','🐝'],
  frutas:   ['🍎','🍌','🍓','🍇','🍊','🍉','🍋','🥝','🍑','🍍','🥭','🍒'],
  letras:   ['A','B','C','D','E','F','G','H','I','J','K','L'],
  numeros:  ['1','2','3','4','5','6','7','8','9','10','11','12']
};

const PALAVRAS = [
  { palavra: 'GATO',   emoji: '🐱' },
  { palavra: 'CASA',   emoji: '🏠' },
  { palavra: 'BOLA',   emoji: '⚽' },
  { palavra: 'PATO',   emoji: '🦆' },
  { palavra: 'SOL',    emoji: '☀️' },
  { palavra: 'LUA',    emoji: '🌙' },
  { palavra: 'FLOR',   emoji: '🌸' },
  { palavra: 'PEIXE',  emoji: '🐟' },
  { palavra: 'BOLO',   emoji: '🎂' },
  { palavra: 'CARRO',  emoji: '🚗' },
  { palavra: 'LIVRO',  emoji: '📚' },
  { palavra: 'ESTRELA',emoji: '⭐' }
];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  try {
    const snap = await db.collection('students')
      .where('ownerId', '==', user.uid).get();
    alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sel = document.getElementById('jogoAluno');
    if (sel) {
      sel.innerHTML = '<option value="">—</option>' +
        alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }
  } catch (e) {
    console.error('Erro ao carregar alunos:', e);
  }
});

// Seletor de jogo
document.querySelectorAll('.jogo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.jogo-btn').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    jogoAtual = btn.dataset.jogo;

    // Mostra tema só para memória
    const temaWrap = document.getElementById('jogoTema').closest('div');
    temaWrap.style.display = jogoAtual === 'memoria' ? '' : 'none';
  });
});

document.getElementById('btnIniciar').addEventListener('click', iniciarJogo);
document.getElementById('btnReiniciar').addEventListener('click', () => iniciarJogo());

function iniciarJogo() {
  const nivel = document.getElementById('jogoNivel').value;
  const area = document.getElementById('areaJogo');
  const msg = document.getElementById('msgJogo');

  area.style.display = 'block';
  document.getElementById('jogoCanvas').innerHTML = '';
  document.getElementById('btnRegistrarJogo').style.display = 'none';
  document.getElementById('jogoStatus').textContent = '';
  msg.className = 'msg';
  msg.textContent = '';

  if (jogoAtual === 'memoria') iniciarMemoria(nivel);
  else if (jogoAtual === 'palavras') iniciarPalavras(nivel);
  else if (jogoAtual === 'caca') iniciarCaca(nivel);

  area.scrollIntoView({ behavior: 'smooth' });
}

// ================= JOGO DA MEMÓRIA =================
function iniciarMemoria(nivel) {
  document.getElementById('jogoTitulo').textContent = '🧠 Jogo da Memória';

  const tema = document.getElementById('jogoTema').value;
  const totalPares = nivel === 'facil' ? 4 : nivel === 'medio' ? 6 : 8;
  const base = TEMAS[tema].slice(0, totalPares);
  const cartas = [...base, ...base]
    .map((v, i) => ({ valor: v, id: i }))
    .sort(() => Math.random() - 0.5);

  const colunas = nivel === 'facil' ? 4 : nivel === 'medio' ? 4 : 4;
  const tamanhoCarta = nivel === 'facil' ? 80 : nivel === 'medio' ? 72 : 64;

  estado = { viradas: [], encontradas: 0, total: totalPares, tentativas: 0, travado: false };

  const grid = document.createElement('div');
  grid.className = 'memoria-grid';
  grid.style.gridTemplateColumns = `repeat(${colunas}, ${tamanhoCarta}px)`;

  cartas.forEach((c, i) => {
    const carta = document.createElement('div');
    carta.className = 'memoria-carta';
    carta.dataset.id = i;
    carta.dataset.valor = c.valor;
    carta.innerHTML = `
      <div class="memoria-carta-inner">
        <div class="memoria-face memoria-frente">?</div>
        <div class="memoria-face memoria-verso">${c.valor}</div>
      </div>
    `;
    carta.addEventListener('click', () => virarCarta(carta, grid));
    grid.appendChild(carta);
  });

  document.getElementById('jogoCanvas').innerHTML = '';
  document.getElementById('jogoCanvas').appendChild(grid);
  atualizarStatusMemoria();
}

function virarCarta(carta, grid) {
  if (estado.travado) return;
  if (carta.classList.contains('virada') || carta.classList.contains('encontrada')) return;

  carta.classList.add('virada');
  estado.viradas.push(carta);

  if (estado.viradas.length === 2) {
    estado.tentativas++;
    estado.travado = true;
    const [a, b] = estado.viradas;

    if (a.dataset.valor === b.dataset.valor) {
      setTimeout(() => {
        a.classList.add('encontrada');
        b.classList.add('encontrada');
        estado.encontradas++;
        estado.viradas = [];
        estado.travado = false;
        atualizarStatusMemoria();
        if (estado.encontradas === estado.total) finalizarMemoria();
      }, 500);
    } else {
      setTimeout(() => {
        a.classList.remove('virada');
        b.classList.remove('virada');
        estado.viradas = [];
        estado.travado = false;
      }, 900);
    }
  }
}

function atualizarStatusMemoria() {
  document.getElementById('jogoStatus').textContent =
    `Pares encontrados: ${estado.encontradas} de ${estado.total} • Tentativas: ${estado.tentativas}`;
}

function finalizarMemoria() {
  const canvas = document.getElementById('jogoCanvas');
  const extra = document.createElement('div');
  extra.className = 'jogo-vitoria';
  extra.innerHTML = `
    <span class="emoji">🎉</span>
    <h3>Parabéns! Você encontrou todos os pares!</h3>
    <p>Tentativas: ${estado.tentativas}</p>
  `;
  canvas.appendChild(extra);
  document.getElementById('btnRegistrarJogo').style.display = 'inline-block';
  estado.jogo = 'memoria';
  estado.resultado = `Jogo da memória concluído com ${estado.tentativas} tentativas (${estado.total} pares).`;
}

// ================= FORMAÇÃO DE PALAVRAS =================
function iniciarPalavras(nivel) {
  document.getElementById('jogoTitulo').textContent = '🔤 Formação de Palavras';

  const maxLetras = nivel === 'facil' ? 4 : nivel === 'medio' ? 6 : 8;
  const disponiveis = PALAVRAS.filter(p => p.palavra.length <= maxLetras);
  const alvo = disponiveis[Math.floor(Math.random() * disponiveis.length)];

  // Embaralha as letras
  const letras = alvo.palavra.split('').sort(() => Math.random() - 0.5);

  estado = {
    palavra: alvo.palavra,
    posicao: 0,
    letras: letras,
    erros: 0
  };

  const area = document.createElement('div');
  area.className = 'palavra-area';
  area.innerHTML = `
    <div class="palavra-emoji">${alvo.emoji}</div>
    <p class="palavra-dica">Monte a palavra clicando nas letras na ordem certa!</p>
    <div class="palavra-slot" id="palavraSlot">
      ${alvo.palavra.split('').map((_, i) => `<div class="letra-slot" data-pos="${i}"></div>`).join('')}
    </div>
    <div class="palavra-letras" id="palavraLetras">
      ${letras.map((l, i) => `<button class="letra-btn" data-letra="${l}" data-idx="${i}">${l}</button>`).join('')}
    </div>
    <div class="jogo-feedback info" id="palavraFeedback" style="display:none;"></div>
  `;

  document.getElementById('jogoCanvas').innerHTML = '';
  document.getElementById('jogoCanvas').appendChild(area);

  document.querySelectorAll('.letra-btn').forEach(btn => {
    btn.addEventListener('click', () => clicarLetra(btn));
  });

  document.getElementById('jogoStatus').textContent = `Monte a palavra de ${alvo.palavra.length} letras`;
}

function clicarLetra(btn) {
  if (btn.classList.contains('usada')) return;

  const letra = btn.dataset.letra;
  const esperada = estado.palavra[estado.posicao];
  const slot = document.querySelector(`.letra-slot[data-pos="${estado.posicao}"]`);

  if (letra === esperada) {
    slot.textContent = letra;
    slot.classList.add('preenchida', 'correta');
    btn.classList.add('usada');
    estado.posicao++;

    if (estado.posicao === estado.palavra.length) {
      setTimeout(() => finalizarPalavra(), 400);
    }
  } else {
    estado.erros++;
    slot.classList.add('errada');
    setTimeout(() => slot.classList.remove('errada'), 500);

    const fb = document.getElementById('palavraFeedback');
    fb.className = 'jogo-feedback info';
    fb.textContent = '💡 Quase! Tente outra letra.';
    fb.style.display = 'block';
    setTimeout(() => fb.style.display = 'none', 1500);
  }
}

function finalizarPalavra() {
  const canvas = document.getElementById('jogoCanvas');
  const extra = document.createElement('div');
  extra.className = 'jogo-vitoria';
  extra.innerHTML = `
    <span class="emoji">🌟</span>
    <h3>Muito bem! Você montou "${estado.palavra}"!</h3>
    <p>Tentativas com erro: ${estado.erros}</p>
  `;
  canvas.appendChild(extra);
  document.getElementById('btnRegistrarJogo').style.display = 'inline-block';
  estado.jogo = 'palavras';
  estado.resultado = `Formação de palavras: montou "${estado.palavra}" com ${estado.erros} erro(s).`;
}

// ================= CAÇA-PALAVRAS JOGÁVEL =================
function iniciarCaca(nivel) {
  document.getElementById('jogoTitulo').textContent = '🔍 Caça-palavras';

  const tamanho = nivel === 'facil' ? 8 : nivel === 'medio' ? 10 : 12;
  const qtdPalavras = nivel === 'facil' ? 3 : nivel === 'medio' ? 5 : 7;
  const banco = ['GATO','CASA','BOLA','PATO','SOL','LUA','FLOR','PEIXE','BOLO','CARRO','LIVRO','MESA','PORTA','JANELA'];
  const palavras = banco
    .filter(p => p.length <= tamanho - 1)
    .sort(() => Math.random() - 0.5)
    .slice(0, qtdPalavras);

  const { grade, posicoes } = gerarGradeJogo(palavras, tamanho);

  estado = {
    palavras,
    posicoes,
    encontradas: new Set(),
    selecionando: false,
    inicio: null,
    selecionadas: []
  };

  const area = document.createElement('div');
  area.className = 'cp-jogo-wrap';
  area.innerHTML = `
    <div>
      <table class="cp-grade" id="cpGrade"><tbody>
        ${grade.map((linha, i) => `<tr>${linha.map((l, j) =>
          `<td data-x="${i}" data-y="${j}">${l}</td>`).join('')}</tr>`).join('')}
      </tbody></table>
    </div>
    <div class="cp-lista">
      <h4>Palavras:</h4>
      <ul id="cpLista">
        ${palavras.map(p => `<li data-palavra="${p}">${p}</li>`).join('')}
      </ul>
    </div>
  `;

  document.getElementById('jogoCanvas').innerHTML = '';
  document.getElementById('jogoCanvas').appendChild(area);
  document.getElementById('jogoStatus').textContent =
    `Encontre ${palavras.length} palavras. Clique na primeira e na última letra.`;

  // Eventos de clique nas células
  document.querySelectorAll('#cpGrade td').forEach(td => {
    td.addEventListener('click', () => clicarCelula(td));
  });
}

function clicarCelula(td) {
  const x = Number(td.dataset.x);
  const y = Number(td.dataset.y);

  if (!estado.selecionando) {
    // Início
    document.querySelectorAll('#cpGrade td').forEach(c => c.classList.remove('selecionada'));
    estado.selecionando = true;
    estado.inicio = { x, y };
    td.classList.add('selecionada');
  } else {
    // Fim
    const fim = { x, y };
    const celulas = caminhoEntre(estado.inicio, fim);
    if (!celulas) {
      // Não é reta
      estado.selecionando = false;
      document.querySelectorAll('#cpGrade td').forEach(c => c.classList.remove('selecionada'));
      return;
    }

    // Verificar se forma alguma palavra
    let formada = '';
    celulas.forEach(({x, y}) => {
      formada += document.querySelector(`#cpGrade td[data-x="${x}"][data-y="${y}"]`).textContent;
    });
    const reversa = formada.split('').reverse().join('');

    const achou = estado.palavras.find(p =>
      (p === formada || p === reversa) && !estado.encontradas.has(p));

    if (achou) {
      celulas.forEach(({x, y}) => {
        document.querySelector(`#cpGrade td[data-x="${x}"][data-y="${y}"]`).classList.add('encontrada');
      });
      estado.encontradas.add(achou);
      const li = document.querySelector(`#cpLista li[data-palavra="${achou}"]`);
      if (li) li.classList.add('encontrada');

      if (estado.encontradas.size === estado.palavras.length) finalizarCaca();
    } else {
      // Feedback suave
      celulas.forEach(({x, y}) => {
        const c = document.querySelector(`#cpGrade td[data-x="${x}"][data-y="${y}"]`);
        c.classList.add('selecionada');
        setTimeout(() => c.classList.remove('selecionada'), 400);
      });
    }

    estado.selecionando = false;
    document.querySelectorAll('#cpGrade td').forEach(c => {
      if (!c.classList.contains('encontrada')) c.classList.remove('selecionada');
    });
  }
}

function caminhoEntre(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.max(Math.abs(dx), Math.abs(dy));
  // Precisa ser reta (horizontal, vertical ou diagonal)
  if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return null;

  const passoX = dx === 0 ? 0 : dx / Math.abs(dx);
  const passoY = dy === 0 ? 0 : dy / Math.abs(dy);
  const celulas = [];
  for (let i = 0; i <= len; i++) {
    celulas.push({ x: a.x + passoX * i, y: a.y + passoY * i });
  }
  return celulas;
}

function gerarGradeJogo(palavras, tamanho) {
  const grade = Array.from({ length: tamanho }, () => Array(tamanho).fill(''));
  const posicoes = {};
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];

  palavras.forEach(p => {
    let colocou = false;
    for (let tent = 0; tent < 200 && !colocou; tent++) {
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const maxX = dx === 0 ? tamanho : dx > 0 ? tamanho - p.length : tamanho - 1;
      const maxY = dy === 0 ? tamanho : dy > 0 ? tamanho - p.length : tamanho - 1;
      if (maxX < 0 || maxY < 0) continue;
      const x0 = Math.floor(Math.random() * (maxX + 1));
      const y0 = Math.floor(Math.random() * (maxY + 1));

      let ok = true;
      for (let i = 0; i < p.length; i++) {
        const x = x0 + dx * i;
        const y = y0 + dy * i;
        if (grade[x][y] && grade[x][y] !== p[i]) { ok = false; break; }
      }
      if (!ok) continue;

      for (let i = 0; i < p.length; i++) {
        grade[x0 + dx * i][y0 + dy * i] = p[i];
      }
      colocou = true;
    }
  });

  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < tamanho; i++) {
    for (let j = 0; j < tamanho; j++) {
      if (!grade[i][j]) grade[i][j] = alfabeto[Math.floor(Math.random() * 26)];
    }
  }
  return { grade, posicoes };
}

function finalizarCaca() {
  const canvas = document.getElementById('jogoCanvas');
  const extra = document.createElement('div');
  extra.className = 'jogo-vitoria';
  extra.innerHTML = `
    <span class="emoji">🎊</span>
    <h3>Você encontrou todas as palavras!</h3>
    <p>Muito bem!</p>
  `;
  canvas.appendChild(extra);
  document.getElementById('btnRegistrarJogo').style.display = 'inline-block';
  estado.jogo = 'caca';
  estado.resultado = `Caça-palavras concluído: ${estado.encontradas.size} palavras encontradas.`;
}

// ================= REGISTRAR DESEMPENHO =================
document.getElementById('btnRegistrarJogo').addEventListener('click', async () => {
  const alunoId = document.getElementById('jogoAluno').value;
  if (!alunoId) {
    alert('Selecione um aluno antes de registrar.');
    return;
  }
  if (!estado.resultado) return;

  const hoje = new Date().toISOString().slice(0, 10);
  const nomeJogo = { memoria: 'Jogo da Memória', palavras: 'Formação de Palavras', caca: 'Caça-palavras' }[estado.jogo];

  try {
    await db.collection('evolutions').add({
      alunoId,
      data: hoje,
      objetivo: `Jogo interativo: ${nomeJogo}`,
      atividades: nomeJogo,
      habilidades: '',
      desempenho: estado.resultado,
      dificuldades: '',
      avancos: '',
      proximos: '',
      observacoes: '',
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Desempenho registrado na evolução do aluno! 🌸');
  } catch (e) {
    console.error(e);
    alert('Erro ao registrar.');
  }
});