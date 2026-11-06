// js/gerador.js
protegerPagina();
document.getElementById('btnSair').addEventListener('click', fazerLogout);

let usuarioAtual = null;
let alunosCache = [];
let atividadesCache = [];
let fichaAtual = { alunoId: null, atividadeId: null, data: null };

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;

  // Data de hoje
  document.getElementById('gData').value = new Date().toISOString().slice(0, 10);

  await carregarAlunos();
  await carregarAtividades();
});

async function carregarAlunos() {
  const select = document.getElementById('gAluno');
  const snap = await db.collection('students')
    .where('ownerId', '==', usuarioAtual.uid).get();
  alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  select.innerHTML = '<option value="">Selecione um aluno</option>' +
    alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
}

async function carregarAtividades() {
  const select = document.getElementById('gAtividade');
  const snap = await db.collection('activities')
    .where('ownerId', '==', usuarioAtual.uid).get();
  atividadesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (atividadesCache.length === 0) {
    select.innerHTML = '<option value="">Nenhuma atividade cadastrada. Cadastre em Atividades.</option>';
    return;
  }

  // Agrupar por área para facilitar
  const porArea = {};
  atividadesCache.forEach(a => {
    const area = a.area || 'outros';
    if (!porArea[area]) porArea[area] = [];
    porArea[area].push(a);
  });

  select.innerHTML = '<option value="">Selecione uma atividade</option>' +
    Object.keys(porArea).sort().map(area => `
      <optgroup label="${area}">
        ${porArea[area].map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
      </optgroup>
    `).join('');
}

// ---------- GERAR FICHA ----------
document.getElementById('btnGerar').addEventListener('click', () => {
  const msg = document.getElementById('msgGerador');
  const alunoId = document.getElementById('gAluno').value;
  const atividadeId = document.getElementById('gAtividade').value;
  const data = document.getElementById('gData').value;

  if (!alunoId || !atividadeId || !data) {
    msg.className = 'msg erro';
    msg.textContent = 'Selecione aluno, atividade e data.';
    return;
  }

  const aluno = alunosCache.find(a => a.id === alunoId);
  const ativ = atividadesCache.find(a => a.id === atividadeId);
  const obs = document.getElementById('gObs').value.trim();

  fichaAtual = { alunoId, atividadeId, data };

  const dataFmt = new Date(data + 'T12:00').toLocaleDateString('pt-BR');
  const idade = aluno.nascimento
    ? Math.floor((new Date() - new Date(aluno.nascimento)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const html = `
    <h1>Meu Espaço Psicopedagógico</h1>
    <p class="meta">Ficha de atividade psicopedagógica</p>

    <div class="linha"><strong>Aluno:</strong> ${aluno.nome || '—'} ${idade !== null ? `(${idade} anos)` : ''}</div>
    <div class="linha"><strong>Escola:</strong> ${aluno.escola || '—'}</div>
    <div class="linha"><strong>Data da aplicação:</strong> ${dataFmt}</div>

    <h2>Atividade</h2>
    <div class="linha"><strong>Nome:</strong> ${ativ.nome}</div>
    <div class="linha"><strong>Área:</strong> ${ativ.area || '—'}</div>
    ${ativ.habilidade ? `<div class="linha"><strong>Habilidade estimulada:</strong> ${ativ.habilidade}</div>` : ''}
    ${ativ.objetivo ? `<div class="linha"><strong>Objetivo:</strong> ${ativ.objetivo}</div>` : ''}
    ${ativ.idade ? `<div class="linha"><strong>Faixa etária sugerida:</strong> ${ativ.idade}</div>` : ''}
    ${ativ.dificuldade ? `<div class="linha"><strong>Nível:</strong> ${ativ.dificuldade}</div>` : ''}
    ${ativ.tempo ? `<div class="linha"><strong>Tempo estimado:</strong> ${ativ.tempo} minutos</div>` : ''}
    ${ativ.materiais ? `<div class="linha"><strong>Materiais:</strong> ${ativ.materiais}</div>` : ''}

    <h2>Como aplicar</h2>
    ${ativ.instrucoes ? `<p>${ativ.instrucoes.replace(/\n/g, '<br>')}</p>` : '<p>—</p>'}
    ${ativ.aplicar ? `<p><em>${ativ.aplicar}</em></p>` : ''}

    <h2>O que observar</h2>
    <p>${ativ.observar || '—'}</p>

    ${ativ.adaptacoes ? `<h2>Adaptações possíveis</h2><p>${ativ.adaptacoes}</p>` : ''}

    ${obs ? `<h2>Observações prévias</h2><p>${obs}</p>` : ''}

    <h2>Anotações da sessão</h2>
    <div class="anotacoes"></div>

    <div class="assinatura">
      _________________________________________<br>
      Psicopedagoga responsável
    </div>
  `;

  document.getElementById('fichaConteudo').innerHTML = html;
  document.getElementById('fichaCard').style.display = 'block';
  document.getElementById('registroCard').style.display = 'block';
  document.getElementById('fichaCard').scrollIntoView({ behavior: 'smooth' });

  msg.className = 'msg sucesso';
  msg.textContent = 'Ficha gerada. Você pode imprimir ou registrar a aplicação.';
});

// ---------- IMPRIMIR ----------
document.getElementById('btnImprimir').addEventListener('click', () => {
  if (!document.getElementById('fichaCard').style.display ||
      document.getElementById('fichaCard').style.display === 'none') {
    alert('Gere a ficha primeiro.');
    return;
  }
  window.print();
});

// ---------- REGISTRAR NA EVOLUÇÃO ----------
document.getElementById('btnRegistrar').addEventListener('click', async () => {
  const msg = document.getElementById('msgRegistro');
  const alunoId = fichaAtual.alunoId;
  const atividadeId = fichaAtual.atividadeId;
  const data = fichaAtual.data;

  if (!alunoId || !atividadeId) {
    msg.className = 'msg erro';
    msg.textContent = 'Gere a ficha antes de registrar.';
    return;
  }

  const ativ = atividadesCache.find(a => a.id === atividadeId);

  const registro = {
    alunoId,
    data,
    objetivo: `Aplicação da atividade: ${ativ.nome}`,
    atividades: ativ.nome,
    habilidades: ativ.habilidade || '',
    desempenho: document.getElementById('regDesempenho').value.trim(),
    dificuldades: document.getElementById('regDificuldades').value.trim(),
    avancos: document.getElementById('regAvancos').value.trim(),
    proximos: document.getElementById('regProximos').value.trim(),
    observacoes: '',
    origemAtividadeId: atividadeId,
    ownerId: usuarioAtual.uid,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('evolutions').add(registro);

    // Registrar também na coleção de aplicações (histórico por atividade)
    await db.collection('activityRecords').add({
      alunoId,
      atividadeId,
      data,
      desempenho: registro.desempenho,
      dificuldades: registro.dificuldades,
      avancos: registro.avancos,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    msg.className = 'msg sucesso';
    msg.textContent = 'Registro salvo na evolução do aluno.';

    // Limpar campos
    ['regDesempenho','regDificuldades','regAvancos','regProximos'].forEach(id => document.getElementById(id).value = '');
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar registro.';
  }
});