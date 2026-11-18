// js/agenda.js
protegerPagina();

let usuarioAtual = null;
let alunosCache = [];
let planosCache = [];
let agendaCache = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAlunos();
  await carregarPlanos();
  await carregarAgenda();
  bindEventos();
  preencherViaQueryString();
});

/* ---------------- ALUNOS ---------------- */
async function carregarAlunos() {
  const select = document.getElementById('agAluno');
  if (!select) return;
  try {
    const snap = await db.collection('students').where('ownerId', '==', usuarioAtual.uid).get();
    alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    select.innerHTML = alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
  } catch (e) { console.error('Erro ao carregar alunos:', e); }
}

/* ---------------- PLANOS ---------------- */
async function carregarPlanos() {
  try {
    const snap = await db.collection('plans').where('ownerId', '==', usuarioAtual.uid).get();
    planosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    atualizarSelectPlanos();
  } catch (e) { console.error('Erro ao carregar planos:', e); }
}

function atualizarSelectPlanos() {
  const select = document.getElementById('agPlano');
  if (!select) return;
  const alunoId = document.getElementById('agAluno').value;
  const doAluno = planosCache.filter(p => p.alunoId === alunoId && (p.status === 'pendente' || p.status === 'em_andamento'));
  
  select.innerHTML = '<option value="">— Nenhum —</option>' +
    doAluno.map(p => {
      const data = p.dataPrevista ? ' • ' + new Date(p.dataPrevista + 'T00:00').toLocaleDateString('pt-BR') : '';
      return `<option value="${p.id}">${p.titulo}${data}</option>`;
    }).join('');
}

/* ---------------- SALVAR ATENDIMENTO ---------------- */
async function salvarAtendimento() {
  const msg = document.getElementById('msgAg');
  const alunoId = document.getElementById('agAluno').value;
  const data = document.getElementById('agData').value;
  const hora = document.getElementById('agHora').value;

  if (!alunoId || !data || !hora) {
    msg.className = 'msg erro'; msg.textContent = 'Preencha aluno, data e horário.'; return;
  }

  const planoId = document.getElementById('agPlano').value || null;

  try {
    await db.collection('appointments').add({
      alunoId, planoId, data, hora,
      duracao: Number(document.getElementById('agDuracao').value) || 50,
      modalidade: document.getElementById('agModalidade').value,
      status: document.getElementById('agStatus').value,
      objetivo: document.getElementById('agObjetivo').value.trim() || null,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (planoId) {
      await db.collection('plans').doc(planoId).update({
        status: 'em_andamento',
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {});
    }

    msg.className = 'msg sucesso'; msg.textContent = 'Atendimento agendado.';
    document.getElementById('agObjetivo').value = '';
    document.getElementById('agPlano').value = '';
    await carregarPlanos();
    await carregarAgenda();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro'; msg.textContent = 'Erro ao agendar.';
  }
}

/* ---------------- LISTA AGENDA ---------------- */
/* ---------------- LISTA AGENDA ---------------- */
async function carregarAgenda() {
  const tbody = document.getElementById('listaAgenda');
  if (!tbody) return;
  try {
    const snap = await db.collection('appointments').where('ownerId', '==', usuarioAtual.uid).get();
    
    // Salva todos no cache global (sem filtro)
    agendaCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

    renderizarTabelaAgenda();

  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="6" style="color:#C9556B;">Erro ao carregar agenda.</td></tr>';
  }
}

function renderizarTabelaAgenda() {
  const tbody = document.getElementById('listaAgenda');
  const filtro = document.getElementById('filtroAgenda').value;
  
  let listaFiltrada = agendaCache.slice();

  // LÓGICA DO FILTRO
  if (filtro === 'proximos') {
    // Mostra apenas os que não foram realizados/cancelados e cuja data é hoje ou no futuro
    const hojeStr = new Date().toISOString().slice(0, 10);
    listaFiltrada = listaFiltrada.filter(a => 
      a.data >= hojeStr && 
      !['realizado', 'cancelado', 'falta'].includes(a.status)
    );
  } else if (filtro === 'realizados') {
    // Mostra os que já foram finalizados ou marcados como falta
    listaFiltrada = listaFiltrada.filter(a => ['realizado', 'falta', 'cancelado'].includes(a.status));
    // Inverte a ordem para mostrar os mais recentes primeiro no histórico
    listaFiltrada.reverse();
  }

  if (listaFiltrada.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#8A6A72;">Nenhum atendimento nesta categoria.</td></tr>`;
    return;
  }

    tbody.innerHTML = listaFiltrada.map(a => {
    const aluno = alunosCache.find(x => x.id === a.alunoId);
    const nome = aluno ? aluno.nome : '(removido)';
    const dataFmt = new Date(a.data + 'T' + a.hora).toLocaleDateString('pt-BR');
    
    const plano = a.planoId ? planosCache.find(p => p.id === a.planoId) : null;
    
    const planoTag = plano
      ? `<span class="badge em_andamento" style="cursor:pointer;" title="Clique para avaliar o planejamento" onclick="avaliarPlanoAgenda('${plano.id}')">📋 ${plano.titulo}</span>`
      : `<a href="javascript:void(0)" style="font-size:0.8rem; font-weight:700; color:var(--rosa-forte);" onclick="abrirCriarPlanoAgenda('${a.id}', '${a.alunoId}')">+ Criar planejamento</a>`;

    return `
      <tr>
        <td data-label="Data">${dataFmt}</td>
        <td data-label="Hora">${a.hora}</td>
        <td data-label="Aluno" style="font-weight:700; color:var(--rosa-profundo);">${nome}</td>
        <td data-label="Planejamento">${planoTag}</td>
        <td data-label="Status">${a.status}</td>
        <td data-label="Ações">
          <div style="display: flex; align-items: center; gap: 8px;">
            <select onchange="mudarStatus('${a.id}', this.value)" style="padding: 6px; width: auto; margin: 0;">
              ${['agendado','confirmado','realizado','cancelado','falta'].map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="btn-acao" onclick="prepararCompartilhamento('${a.id}')" title="Compartilhar">📤</button>
            <button class="secundario" onclick="excluirAg('${a.id}')" style="padding: 6px 12px; margin: 0;">X</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function mudarStatus(id, novoStatus) {
  try { await db.collection('appointments').doc(id).update({ status: novoStatus }); } 
  catch (e) { alert('Erro ao atualizar status.'); }
}

async function excluirAg(id) {
  if (!confirm('Excluir este atendimento?')) return;
  try { await db.collection('appointments').doc(id).delete(); await carregarAgenda(); } 
  catch (e) { alert('Erro ao excluir.'); }
}

/* ---------------- MODAIS (NOVO / VER) ---------------- */
function abrirModal(id) { document.getElementById(id).classList.add('aberto'); }
function fecharModal(id) { document.getElementById(id).classList.remove('aberto'); }

// Criação rápida vinculada a uma aula existente
window.abrirCriarPlanoAgenda = function(appointmentId, alunoId) {
  document.getElementById('rapTitulo').value = '';
  document.getElementById('rapData').value = '';
  document.getElementById('rapObjetivo').value = '';
  document.getElementById('rapConteudo').value = '';
  document.getElementById('msgPlanoRapido').className = 'msg';
  
  const btn = document.getElementById('btnSalvarPlanoRapido');
  btn.dataset.appointmentId = appointmentId;
  btn.dataset.alunoId = alunoId;
  
  abrirModal('modalPlanoRapido');
};

async function salvarPlanoRapido() {
  const msg = document.getElementById('msgPlanoRapido');
  const btn = document.getElementById('btnSalvarPlanoRapido');
  
  const alunoId = btn.dataset.alunoId; 
  const appointmentId = btn.dataset.appointmentId; 
  const titulo = document.getElementById('rapTitulo').value.trim();

  if (!titulo) { msg.className = 'msg erro'; msg.textContent = 'Preencha o título.'; return; }

  try {
    const ref = await db.collection('plans').add({
      alunoId,
      appointmentId: appointmentId || null,
      titulo,
      dataPrevista: document.getElementById('rapData').value || null,
      status: 'em_andamento',
      objetivo: document.getElementById('rapObjetivo').value.trim() || null,
      conteudo: document.getElementById('rapConteudo').value.trim() || null,
      observacoes: null,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (appointmentId) {
      await db.collection('appointments').doc(appointmentId).update({ planoId: ref.id });
    }

    msg.className = 'msg sucesso'; msg.textContent = 'Plano criado e vinculado!';
    await carregarPlanos();
    await carregarAgenda();
    setTimeout(() => fecharModal('modalPlanoRapido'), 700);
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro'; msg.textContent = 'Erro ao criar planejamento.';
  }
}

/* ---------------- AVALIAÇÃO E VER PLANO ---------------- */
window.avaliarPlanoAgenda = function(id) {
  const p = planosCache.find(x => x.id === id);
  if (!p) return;
  const aluno = alunosCache.find(a => a.id === p.alunoId);
  const dataFmt = p.dataPrevista ? new Date(p.dataPrevista + 'T00:00').toLocaleDateString('pt-BR') : 'Não definida';

  document.getElementById('verPlanoTitulo').textContent = p.titulo;
  document.getElementById('verPlanoAluno').textContent = aluno ? aluno.nome : '(removido)';
  document.getElementById('verPlanoData').textContent = dataFmt;

  const boxMomentos = document.getElementById('verPlanoMomentos');
  boxMomentos.innerHTML = '';
  
  if (p.momentos && p.momentos.length > 0) {
    p.momentos.forEach((m, i) => {
      let checkSim = m.atingido === 'sim' ? 'checked' : '';
      let checkNao = m.atingido === 'nao' ? 'checked' : '';
      boxMomentos.insertAdjacentHTML('beforeend', `
        <div style="background:var(--creme); padding:14px; border-radius:10px; border-left:4px solid var(--rosa-medio); margin-bottom:12px;">
          <strong style="color:var(--rosa-profundo); display:block; margin-bottom:6px;">${i + 1}º Momento: ${m.nome || '—'}</strong>
          <div style="font-size:0.9rem; margin-bottom:8px; color:var(--texto-suave);"><strong>Objetivo:</strong> ${m.objetivo || '—'}</div>
          <div style="font-size:0.9rem; color:var(--texto); margin-bottom:8px; display:flex; gap:16px; align-items:center;">
            <strong style="color:var(--texto-suave);">Objetivo alcançado?</strong>
            <label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; margin:0;"><input type="radio" name="eval_atingido_${i}" value="sim" ${checkSim}> Sim</label>
            <label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; margin:0;"><input type="radio" name="eval_atingido_${i}" value="nao" ${checkNao}> Não</label>
          </div>
          <label style="margin-top:6px; font-size:0.85rem;">Observações do Momento</label>
          <input type="text" id="eval_obs_${i}" value="${m.obs || ''}" style="padding:8px 12px; font-size:0.9rem;" placeholder="Como foi o resultado?">
        </div>
      `);
    });
  } else {
    boxMomentos.innerHTML = '<p style="color:#8A6A72;">Nenhum momento detalhado.</p>';
  }

  const obsBox = document.getElementById('verPlanoObs');
  if (p.observacoes) {
    obsBox.style.display = 'block';
    document.getElementById('verPlanoObsTexto').textContent = p.observacoes;
  } else { obsBox.style.display = 'none'; }

  const acoesBox = document.querySelector('#modalVerPlano .modal-acoes');
  acoesBox.innerHTML = `
    <button class="secundario" data-fechar-modal="modalVerPlano">Fechar</button>
    <button class="primary" onclick="salvarAvaliacaoPlanoAgenda('${p.id}')">Salvar Avaliação</button>
  `;

  abrirModal('modalVerPlano');
};

window.salvarAvaliacaoPlanoAgenda = async function(id) {
  const p = planosCache.find(x => x.id === id);
  if (!p) return;

  const momentosAtualizados = [];
  if (p.momentos) {
    p.momentos.forEach((m, i) => {
      const radio = document.querySelector(`input[name="eval_atingido_${i}"]:checked`);
      const obsInput = document.getElementById(`eval_obs_${i}`);
      momentosAtualizados.push({ ...m, atingido: radio ? radio.value : null, obs: obsInput ? obsInput.value.trim() : '' });
    });
  }

  try {
    await db.collection('plans').doc(id).update({
      momentos: momentosAtualizados,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    const index = planosCache.findIndex(x => x.id === id);
    if (index > -1) planosCache[index].momentos = momentosAtualizados;
    alert('Avaliação salva com sucesso!');
    fecharModal('modalVerPlano');
  } catch (e) { alert('Erro ao salvar avaliação.'); }
};

/* ---------------- COMPARTILHAMENTO ---------------- */
let appointmentParaCompartilhar = null;

window.prepararCompartilhamento = function(id) {
  const a = agendaCache.find(x => x.id === id);
  if (!a) return;
  
  appointmentParaCompartilhar = a;
  const aluno = alunosCache.find(x => x.id === a.alunoId);
  const dataFmt = new Date(a.data + 'T' + a.hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  const frases = [
    "O desenvolvimento acontece um passo de cada vez.",
    "Cada pequena conquista merece ser celebrada!",
    "Aprender é como construir um castelo: tijolo por tijolo.",
    "O brincar é a linguagem mais bonita da infância.",
    "Grandes descobertas começam com curiosidade.",
    "Nenhuma flor desabrocha sem o seu tempo.",
    "O afeto é a base de toda aprendizagem significativa.",
    "Cada cérebro é único e tem seu próprio tempo de florescer.",
    "O que aprendemos com amor, jamais esquecemos.",
    "Semear hoje para colher habilidades amanhã.",
    "Cada criança aprende de um jeito, e todos os jeitos merecem respeito.",
    "Pequenos passos também levam a grandes conquistas.",
    "A aprendizagem floresce onde existe acolhimento.",
    "Antes de ensinar, é preciso acreditar no potencial de cada criança.",
    "Errar faz parte do caminho de quem está aprendendo.",
    "Toda criança tem talentos esperando para serem descobertos.",
    "O tempo de cada um merece ser respeitado.",
    "Ensinar é plantar possibilidades e cultivar sonhos.",
    "Por trás de cada dificuldade existe uma oportunidade de descoberta.",
    "A confiança abre portas que o medo mantém fechadas.",
    "Aprender também é descobrir que somos capazes.",
    "Uma criança acolhida se sente segura para explorar o mundo.",
    "Não compare processos, celebre evoluções!",
    "O progresso nem sempre é rápido, mas cada avanço importa.",
    "A paciência de hoje pode transformar as conquistas de amanhã.",
    "Cada conquista começa quando alguém acredita que é possível.",
    "A aprendizagem vai muito além de letras e números.",
    "O vínculo afetivo é uma ponte para o conhecimento.",
    "Toda dificuldade pode ser um convite para encontrar novos caminhos.",
    "Respeitar as diferenças é reconhecer a beleza de cada aprendizagem.",
    "Uma palavra de incentivo pode despertar grandes potencialidades.",
    "Não existem limites para quem encontra caminhos para aprender.",
    "O olhar atento revela conquistas que passam despercebidas.",
    "Educar é enxergar possibilidades onde muitos veem dificuldades.",
    "Cada criança carrega dentro de si um universo de possibilidades.",
    "Aprender é transformar curiosidade em descobertas.",
    "O sucesso não está na velocidade, mas na evolução.",
    "Quando a criança acredita em si, novas possibilidades surgem.",
    "Mais importante que acertar é ter coragem de tentar novamente.",
    "Acolher, compreender e estimular: assim a aprendizagem acontece."
  ];
  
  const fraseSorteada = frases[Math.floor(Math.random() * frases.length)];

  // Preenche os dados no Card
  document.getElementById('cardAluno').textContent = aluno ? aluno.nome : '(removido)';
  document.getElementById('cardData').textContent = dataFmt;
  document.getElementById('cardHora').textContent = a.hora;
  document.getElementById('cardObjetivo').textContent = a.objetivo || 'Aula de acompanhamento psicopedagógico';
  document.getElementById('cardRecado').value = '';
  
  // Injeta a frase sorteada
  document.getElementById('cardFrase').textContent = `"${fraseSorteada}"`;

  // Reseta o modal para a aba "Lembrete" por padrão toda vez que abrir
  window.mudarTipoMensagem('confirmacao'); 

  // Abre o modal
  abrirModal('modalCompartilhar');
};

window.mudarTipoMensagem = function(tipo) {
  const subtitulo = document.getElementById('cardSubtitulo');
  const btnLembrete = document.getElementById('btnTipoLembrete');
  const btnConfirmacao = document.getElementById('btnTipoConfirmacao');

  if (tipo === 'lembrete') {
    subtitulo.textContent = 'Lembrete de Atendimento';
    
    // Estilo do botão ativo (Lembrete)
    btnLembrete.style.background = '#FFF';
    btnLembrete.style.color = '#9C4258';
    btnLembrete.style.fontWeight = '700';
    btnLembrete.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
    
    // Estilo do botão inativo (Confirmação)
    btnConfirmacao.style.background = 'transparent';
    btnConfirmacao.style.color = '#8A6A72';
    btnConfirmacao.style.fontWeight = '600';
    btnConfirmacao.style.boxShadow = 'none';
    
  } else if (tipo === 'confirmacao') {
    subtitulo.textContent = 'Confirmação de Atendimento';
    
    // Estilo do botão ativo (Confirmação)
    btnConfirmacao.style.background = '#FFF';
    btnConfirmacao.style.color = '#9C4258';
    btnConfirmacao.style.fontWeight = '700';
    btnConfirmacao.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
    
    // Estilo do botão inativo (Lembrete)
    btnLembrete.style.background = 'transparent';
    btnLembrete.style.color = '#8A6A72';
    btnLembrete.style.fontWeight = '600';
    btnLembrete.style.boxShadow = 'none';
  }
};

document.getElementById('btnBaixarCard').addEventListener('click', async () => {
  const btn = document.getElementById('btnBaixarCard');
  const textoOriginal = btn.textContent;
  btn.textContent = 'Gerando...';
  btn.disabled = true;

  const recadoExtra = document.getElementById('cardRecado').value.trim();
  const cardOriginalHTML = document.getElementById('cardComprovante').innerHTML;

  if (recadoExtra) {
    document.getElementById('cardComprovante').insertAdjacentHTML('beforeend', `
      <div style="margin-top: 12px; background: #FFF; border-radius: 8px; padding: 10px; text-align: left; border-left: 3px solid #C96B82;">
        <p style="margin: 0; font-size: 0.8rem; color: #9C4258;"><strong>Recadinho:</strong> ${recadoExtra}</p>
      </div>
    `);
  }

  try {
    const cardElement = document.getElementById('cardComprovante');
    
    // Renderiza o card em formato de imagem
    const canvas = await html2canvas(cardElement, { 
      scale: 2, 
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true
    }); 
    
    // Converte para formato Blob (melhor para mobile)
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `atendimento-${(alunosCache.find(x => x.id === appointmentParaCompartilhar.alunoId)?.nome || 'aluno').replace(/\s/g, '-')}.png`;
      link.href = url;
      
      // Truque para funcionar no iOS/Safari
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // No iOS, às vezes abre em nova aba, então avisamos o usuário
      setTimeout(() => {
        URL.revokeObjectURL(url);
        alert('Se a imagem não foi baixada automaticamente, pressione e segure sobre a imagem na nova aba para salvar.');
      }, 1000);
    }, 'image/png');

    document.getElementById('cardComprovante').innerHTML = cardOriginalHTML;
    btn.textContent = textoOriginal;
    btn.disabled = false;
    fecharModal('modalCompartilhar');
  } catch (e) {
    console.error(e);
    alert('Erro ao gerar imagem. Tente novamente.');
    btn.textContent = textoOriginal;
    btn.disabled = false;
    document.getElementById('cardComprovante').innerHTML = cardOriginalHTML;
  }
});

/* ---------------- EVENTOS ---------------- */
function bindEventos() {
  document.getElementById('btnSalvarAg').addEventListener('click', salvarAtendimento);
  document.getElementById('agAluno').addEventListener('change', atualizarSelectPlanos);
  document.getElementById('btnSalvarPlanoRapido').addEventListener('click', salvarPlanoRapido);
  document.getElementById('filtroAgenda').addEventListener('change', renderizarTabelaAgenda);
  
  document.getElementById('btnNovoPlanoAg').addEventListener('click', () => {
    const alunoIdAtual = document.getElementById('agAluno').value;
    if (!alunoIdAtual) return alert('Selecione um aluno primeiro.');
    document.getElementById('rapTitulo').value = '';
    document.getElementById('msgPlanoRapido').className = 'msg';
    const btn = document.getElementById('btnSalvarPlanoRapido');
    btn.dataset.alunoId = alunoIdAtual;
    btn.dataset.appointmentId = ''; 
    abrirModal('modalPlanoRapido');
  });

  document.querySelectorAll('[data-fechar-modal]').forEach(btn => {
    btn.addEventListener('click', () => fecharModal(btn.dataset.fecharModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', (e) => { if (e.target === ov) fecharModal(ov.id); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.aberto').forEach(m => m.classList.remove('aberto'));
  });
}

function preencherViaQueryString() {
  const params = new URLSearchParams(location.search);
  if (params.get('alunoId')) {
    document.getElementById('agAluno').value = params.get('alunoId');
    atualizarSelectPlanos();
  }
  if (params.get('planoId')) document.getElementById('agPlano').value = params.get('planoId');
  if (params.get('data'))   document.getElementById('agData').value = params.get('data');
}