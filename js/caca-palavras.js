// js/caca-palavras.js
protegerPagina();
document.getElementById('btnSair').addEventListener('click', fazerLogout);

let usuarioAtual = null;
let alunosCache = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  const snap = await db.collection('students')
    .where('ownerId', '==', user.uid).get();
  alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const sel = document.getElementById('cpAluno');
  sel.innerHTML = '<option value="">—</option>' +
    alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
});

// ============ GERAÇÃO DA GRADE ============

function normalizar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

function direcoesPermitidas(modo) {
  const base = [[0, 1]]; // horizontal
  if (modo === 'hv' || modo === 'hvd') base.push([1, 0]); // vertical
  if (modo === 'hvd') {
    base.push([1, 1]);  // diagonal desc
    base.push([1, -1]); // diagonal asc
  }
  return base;
}

function tentarPosicionar(grade, palavra, dirs) {
  const n = grade.length;
  const tentativas = 200;

  for (let t = 0; t < tentativas; t++) {
    const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
    const maxX = dx === 0 ? n : dx > 0 ? n - palavra.length : n - 1;
    const maxY = dy === 0 ? n : dy > 0 ? n - palavra.length : n - 1;
    if (maxX < 0 || maxY < 0) continue;

    const x0 = Math.floor(Math.random() * (dx >= 0 ? maxX + 1 : maxX + 1));
    const y0 = Math.floor(Math.random() * (dy >= 0 ? maxY + 1 : maxY + 1));

    let ok = true;
    for (let i = 0; i < palavra.length; i++) {
      const x = x0 + dx * i;
      const y = y0 + dy * i;
      if (x < 0 || y < 0 || x >= n || y >= n) { ok = false; break; }
      if (grade[x][y] && grade[x][y] !== palavra[i]) { ok = false; break; }
    }

    if (!ok) continue;

    for (let i = 0; i < palavra.length; i++) {
      grade[x0 + dx * i][y0 + dy * i] = palavra[i];
    }
    return true;
  }
  return false;
}

function gerarGrade(palavras, tamanho, modoDirecoes) {
  const grade = Array.from({ length: tamanho }, () => Array(tamanho).fill(''));
  const dirs = direcoesPermitidas(modoDirecoes);
  const colocadas = [];
  const naoColocadas = [];

  // Ordena do maior para o menor (mais fácil posicionar)
  const ordenadas = [...palavras].sort((a, b) => b.length - a.length);

  for (const p of ordenadas) {
    const ok = tentarPosicionar(grade, p, dirs);
    if (ok) colocadas.push(p);
    else naoColocadas.push(p);
  }

  // Preenche vazios com letras aleatórias
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < tamanho; i++) {
    for (let j = 0; j < tamanho; j++) {
      if (!grade[i][j]) grade[i][j] = alfabeto[Math.floor(Math.random() * 26)];
    }
  }

  return { grade, colocadas, naoColocadas };
}

// ============ RENDERIZAÇÃO ============

document.getElementById('btnGerarCP').addEventListener('click', () => {
  const msg = document.getElementById('msgCP');
  const texto = document.getElementById('cpPalavras').value.trim();

  if (!texto) {
    msg.className = 'msg erro';
    msg.textContent = 'Digite pelo menos uma palavra.';
    return;
  }

  const palavras = texto.split('\n')
    .map(p => normalizar(p.trim()))
    .filter(p => p.length >= 2 && p.length <= 15);

  if (palavras.length === 0) {
    msg.className = 'msg erro';
    msg.textContent = 'Nenhuma palavra válida (2 a 15 letras).';
    return;
  }

  const tamanho = Number(document.getElementById('cpTamanho').value);
  const modo = document.getElementById('cpDirecoes').value;

  // Verifica se as palavras cabem
  const maior = Math.max(...palavras.map(p => p.length));
  if (maior > tamanho) {
    msg.className = 'msg erro';
    msg.textContent = `A palavra mais longa tem ${maior} letras, mas a grade é ${tamanho}. Aumente a grade ou reduza a palavra.`;
    return;
  }

  const { grade, colocadas, naoColocadas } = gerarGrade(palavras, tamanho, modo);

  // Monta HTML
  const alunoId = document.getElementById('cpAluno').value;
  const aluno = alunosCache.find(a => a.id === alunoId);
  const titulo = document.getElementById('cpTitulo').value.trim() || 'Caça-palavras';
  const hoje = new Date().toLocaleDateString('pt-BR');

  let tabelaHtml = '<table class="grade"><tbody>';
  for (let i = 0; i < tamanho; i++) {
    tabelaHtml += '<tr>';
    for (let j = 0; j < tamanho; j++) {
      tabelaHtml += `<td>${grade[i][j]}</td>`;
    }
    tabelaHtml += '</tr>';
  }
  tabelaHtml += '</tbody></table>';

  const palavrasHtml = colocadas.map(p => `<span>${p}</span>`).join('');

  const ficha = `
    <h1>Meu Espaço Psicopedagógico</h1>
    <p class="meta">${titulo}</p>

    <div class="cabecalho">
      <div><strong>Aluno:</strong> ${aluno ? aluno.nome : '_______________________'}</div>
      <div><strong>Data:</strong> ${hoje}</div>
    </div>

    <p style="margin-bottom:12px;"><strong>Encontre as palavras abaixo na grade:</strong></p>
    <div class="lista-palavras">${palavrasHtml}</div>

    <div class="grade-wrap" style="margin-top:16px;">${tabelaHtml}</div>

    ${naoColocadas.length ? `<p style="margin-top:16px; font-size:0.8rem; color:#B23A48;">Não couberam na grade: ${naoColocadas.join(', ')}</p>` : ''}
  `;

  document.getElementById('cpFicha').innerHTML = ficha;
  document.getElementById('cpCard').style.display = 'block';
  document.getElementById('cpCard').scrollIntoView({ behavior: 'smooth' });

  msg.className = 'msg sucesso';
  msg.textContent = `Grade gerada com ${colocadas.length} palavra(s).`;
});

// ============ IMPRESSÃO ============

document.getElementById('btnImprimirCP').addEventListener('click', () => {
  if (document.getElementById('cpCard').style.display === 'none' ||
      !document.getElementById('cpCard').style.display) {
    alert('Gere o caça-palavras primeiro.');
    return;
  }
  window.print();
});