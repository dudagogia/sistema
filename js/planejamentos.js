// js/planejamentos.js
protegerPagina();

let usuarioAtual = null;
let alunosCache = [];
let planosCache = [];
let planoEditandoId = null;
let qtdMomentos = 0;

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAlunos();
  await carregarPlanos();
  bindEventos();
});

/* ---------------- ALUNOS ---------------- */
async function carregarAlunos() {
  try {
    const snap = await db.collection('students').where('ownerId', '==', usuarioAtual.uid).get();
    alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    document.getElementById('filtroAluno').innerHTML = '<option value="">Todos os alunos</option>' +
      alunosCache.map(a => `<option value="${a.id}">${a.nome || '(sem nome)'}</option>`).join('');

    document.getElementById('planoAluno').innerHTML = alunosCache.length
      ? alunosCache.map(a => `<option value="${a.id}">${a.nome || '(sem nome)'}</option>`).join('')
      : '<option value="">Nenhum aluno cadastrado</option>';
  } catch (e) { console.error('Erro ao carregar alunos:', e); }
}

/* ---------------- PLANOS ---------------- */
async function carregarPlanos() {
  const tbody = document.getElementById('listaPlanos');
  try {
    const snap = await db.collection('plans').where('ownerId', '==', usuarioAtual.uid).get();
    planosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizarPlanos();
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5" style="color:#C9556B;">Erro ao carregar planejamentos.</td></tr>';
  }
}

function renderizarPlanos() {
  const tbody = document.getElementById('listaPlanos');
  const filtroAluno  = document.getElementById('filtroAluno').value;
  const filtroStatus = document.getElementById('filtroStatus').value;
  const busca = (document.getElementById('filtroBusca').value || '').toLowerCase().trim();

  let lista = planosCache.slice();
  if (filtroAluno)  lista = lista.filter(p => p.alunoId === filtroAluno);
  if (filtroStatus) lista = lista.filter(p => p.status === filtroStatus);
  if (busca) lista = lista.filter(p => (p.titulo || '').toLowerCase().includes(busca));
  lista.sort((a, b) => (a.dataPrevista || 'zzz').localeCompare(b.dataPrevista || 'zzz'));

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#8A6A72;">Nenhum planejamento encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const aluno = alunosCache.find(a => a.id === p.alunoId);
    const nome  = aluno ? aluno.nome : '(removido)';
    const dataFmt = p.dataPrevista ? new Date(p.dataPrevista + 'T00:00').toLocaleDateString('pt-BR') : '—';
    const statusClass = p.status || 'pendente';
    return `
      <tr>
        <td><strong>${p.titulo || '(sem título)'}</strong></td>
        <td>${nome}</td>
        <td>${dataFmt}</td>
        <td><span class="badge ${statusClass}">${statusClass.replace('_', ' ')}</span></td>
        <td>
          <button class="btn-acao" onclick="verPlano('${p.id}')">Ver</button>
          <button class="btn-acao" onclick="abrirEdicao('${p.id}')">Editar</button>
          <button class="btn-acao danger" onclick="excluirPlano('${p.id}')">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

/* ---------------- MOMENTOS (FORMULÁRIO) ---------------- */
function criarBlocoMomentoHTML(index, dados = null) {
  const d = dados || { nome: '', objetivo: '', atingido: null, obs: '' };
  return `
    <div class="momento-bloco card" id="momento-${index}" style="background:var(--creme); padding:16px; margin-bottom:12px; border:1px solid #F5E3E7; box-shadow:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <strong style="color:var(--rosa-profundo); font-size:0.95rem;">${index + 1}º Momento</strong>
        <button type="button" class="btn-acao danger" onclick="removerMomento(${index})" style="padding:2px 8px;">✕</button>
      </div>
      
      <label style="margin-top:0;">Atividade / Tema</label>
      <input type="text" class="mom-nome" value="${d.nome || ''}" placeholder="Ex: Contagem de sílabas pela boquinha sonora">

      <label>Objetivo</label>
      <textarea class="mom-objetivo" rows="2" placeholder="Ex: Ajudar as crianças a perceberem as sílabas">${d.objetivo || ''}</textarea>

      <label>Objetivo alcançado?</label>
      <div style="display:flex; gap:16px; margin-top:4px;">
        <label style="display:flex; align-items:center; gap:6px; font-weight:400; margin-top:0; cursor:pointer;">
          <input type="radio" name="mom_atingido_${index}" value="sim" ${d.atingido === 'sim' ? 'checked' : ''}> Sim
        </label>
        <label style="display:flex; align-items:center; gap:6px; font-weight:400; margin-top:0; cursor:pointer;">
          <input type="radio" name="mom_atingido_${index}" value="nao" ${d.atingido === 'nao' ? 'checked' : ''}> Não
        </label>
      </div>

      <label>Obs:</label>
      <input type="text" class="mom-obs" value="${d.obs || ''}" placeholder="Observações sobre este momento">
    </div>
  `;
}

function adicionarMomento(dados = null) {
  if (qtdMomentos >= 6) return;
  const container = document.getElementById('listaMomentosForm');
  container.insertAdjacentHTML('beforeend', criarBlocoMomentoHTML(qtdMomentos, dados));
  qtdMomentos++;
  atualizarAvisoLimite();
}

window.removerMomento = function(index) {
  const el = document.getElementById(`momento-${index}`);
  if (el) el.remove();
  // Não diminuímos qtdMomentos para evitar duplicar IDs, mas verificamos se ainda tem blocos
  atualizarAvisoLimite();
};

function atualizarAvisoLimite() {
  const blocos = document.querySelectorAll('.momento-bloco').length;
  document.getElementById('avisoLimiteMomentos').style.display = blocos >= 6 ? 'block' : 'none';
  document.getElementById('btnAddMomento').style.display = blocos >= 6 ? 'none' : 'inline-block';
}

/* ---------------- MODAIS ---------------- */
function abrirModal(id) { document.getElementById(id).classList.add('aberto'); }
function fecharModal(id) { document.getElementById(id).classList.remove('aberto'); }

function limparFormulario() {
  planoEditandoId = null;
  qtdMomentos = 0;
  document.getElementById('modalPlanoTitulo').querySelector('span').textContent = 'Novo planejamento';
  document.getElementById('planoTitulo').value = '';
  document.getElementById('planoData').value = '';
  document.getElementById('planoStatus').value = 'pendente';
  document.getElementById('planoObservacoes').value = '';
  document.getElementById('listaMomentosForm').innerHTML = '';
  document.getElementById('msgPlano').className = 'msg';
  document.getElementById('msgPlano').textContent = '';
  
  adicionarMomento(); // Começa com 1 momento vazio
}

function abrirNovo() {
  limparFormulario();
  abrirModal('modalPlano');
}

window.abrirEdicao = function (id) {
  const p = planosCache.find(x => x.id === id);
  if (!p) return;
  
  limparFormulario();
  planoEditandoId = id;
  document.getElementById('modalPlanoTitulo').querySelector('span').textContent = 'Editar planejamento';
  document.getElementById('planoAluno').value      = p.alunoId || '';
  document.getElementById('planoTitulo').value     = p.titulo || '';
  document.getElementById('planoData').value       = p.dataPrevista || '';
  document.getElementById('planoStatus').value     = p.status || 'pendente';
  document.getElementById('planoObservacoes').value= p.observacoes || '';
  
  document.getElementById('listaMomentosForm').innerHTML = '';
  qtdMomentos = 0;
  if (p.momentos && p.momentos.length > 0) {
    p.momentos.forEach(m => adicionarMomento(m));
  } else {
    adicionarMomento(); // Fallback se plano antigo não tinha momentos
  }
  
  abrirModal('modalPlano');
};

window.verPlano = function(id) {
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
      
      let html = `
        <div style="background:var(--creme); padding:14px; border-radius:10px; border-left:4px solid var(--rosa-medio);">
          <strong style="color:var(--rosa-profundo); display:block; margin-bottom:6px;">${i + 1}º Momento: ${m.nome || '—'}</strong>
          <div style="font-size:0.9rem; margin-bottom:8px;"><strong>Objetivo:</strong> ${m.objetivo || '—'}</div>
          
          <div style="font-size:0.85rem; color:var(--texto-suave); margin-bottom:6px;">
            <strong>Objetivo alcançado:</strong> 
            <label style="display:inline-flex; align-items:center; margin-left:8px;"><input type="checkbox" disabled ${checkSim}> Sim</label>
            <label style="display:inline-flex; align-items:center; margin-left:8px;"><input type="checkbox" disabled ${checkNao}> Não</label>
          </div>
          
          ${m.obs ? `<div style="font-size:0.85rem; background:#fff; padding:8px; border-radius:6px;"><strong>Obs:</strong> ${m.obs}</div>` : ''}
        </div>
      `;
      boxMomentos.insertAdjacentHTML('beforeend', html);
    });
  } else {
    boxMomentos.innerHTML = '<p style="color:#8A6A72;">Nenhum momento detalhado neste planejamento.</p>';
  }

  const obsBox = document.getElementById('verPlanoObs');
  if (p.observacoes) {
    obsBox.style.display = 'block';
    document.getElementById('verPlanoObsTexto').textContent = p.observacoes;
  } else {
    obsBox.style.display = 'none';
  }

  abrirModal('modalVerPlano');
};

/* ---------------- SALVAR ---------------- */
async function salvarPlano() {
  const msg = document.getElementById('msgPlano');
  const alunoId = document.getElementById('planoAluno').value;
  const titulo  = document.getElementById('planoTitulo').value.trim();
  const dataPrevista = document.getElementById('planoData').value || null;

  if (!alunoId || !titulo) {
    msg.className = 'msg erro'; msg.textContent = 'Preencha aluno e título.'; return;
  }

  // Pega os momentos do formulário
  const momentos = [];
  document.querySelectorAll('.momento-bloco').forEach(bloco => {
    const nome = bloco.querySelector('.mom-nome').value.trim();
    const objetivo = bloco.querySelector('.mom-objetivo').value.trim();
    const obs = bloco.querySelector('.mom-obs').value.trim();
    const radioSelecionado = bloco.querySelector('input[type="radio"]:checked');
    const atingido = radioSelecionado ? radioSelecionado.value : null;

    if (nome || objetivo || obs || atingido) {
      momentos.push({ nome, objetivo, obs, atingido });
    }
  });

  msg.className = 'msg'; msg.textContent = 'Salvando...';

  try {
    let aulaVinculadaId = null;

    // LÓGICA DE VÍNCULO AUTOMÁTICO COM A AGENDA
    if (dataPrevista) {
      // Busca se já existe aula para esse aluno nessa data
      const agSnap = await db.collection('appointments')
        .where('ownerId', '==', usuarioAtual.uid)
        .where('alunoId', '==', alunoId)
        .where('data', '==', dataPrevista)
        .get();

      if (!agSnap.empty) {
        // Já existe aula nesse dia! Pega a primeira e vincula.
        aulaVinculadaId = agSnap.docs[0].id;
      } else {
        // Não existe aula. Vamos criar uma automaticamente.
        const novaAula = await db.collection('appointments').add({
          alunoId: alunoId,
          data: dataPrevista,
          hora: '08:00', // Horário padrão
          duracao: 50,
          modalidade: 'presencial',
          status: 'agendado',
          objetivo: 'Aula gerada automaticamente pelo planejamento',
          ownerId: usuarioAtual.uid,
          criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        aulaVinculadaId = novaAula.id;
      }
    }

    const dados = {
      alunoId, titulo, momentos,
      dataPrevista: dataPrevista,
      status: document.getElementById('planoStatus').value,
      observacoes: document.getElementById('planoObservacoes').value.trim() || null,
      ownerId: usuarioAtual.uid,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (aulaVinculadaId) {
      dados.appointmentId = aulaVinculadaId;
    }

    if (planoEditandoId) {
      await db.collection('plans').doc(planoEditandoId).update(dados);
      // Atualiza a aula para apontar para o plano também
      if (aulaVinculadaId) {
        await db.collection('appointments').doc(aulaVinculadaId).update({ planoId: planoEditandoId });
      }
      msg.className = 'msg sucesso'; msg.textContent = 'Planejamento atualizado.';
    } else {
      dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
      const refPlano = await db.collection('plans').add(dados);
      
      // Atualiza a aula apontando para o novo plano
      if (aulaVinculadaId) {
        await db.collection('appointments').doc(aulaVinculadaId).update({ planoId: refPlano.id });
      }
      msg.className = 'msg sucesso'; 
      msg.textContent = aulaVinculadaId ? 'Planejamento criado e vinculado à agenda!' : 'Planejamento criado.';
    }
    
    await carregarPlanos();
    setTimeout(() => fecharModal('modalPlano'), 1000);
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro'; msg.textContent = 'Erro ao salvar planejamento.';
  }
}

window.excluirPlano = async function (id) {
  if (!confirm('Excluir este planejamento?')) return;
  try {
    await db.collection('plans').doc(id).delete();
    await carregarPlanos();
  } catch (e) { alert('Erro ao excluir.'); }
};

/* ---------------- EVENTOS ---------------- */
function bindEventos() {
  document.getElementById('btnNovoPlano').addEventListener('click', abrirNovo);
  document.getElementById('btnSalvarPlano').addEventListener('click', salvarPlano);
  document.getElementById('btnAddMomento').addEventListener('click', () => adicionarMomento());

  document.getElementById('filtroAluno').addEventListener('change', renderizarPlanos);
  document.getElementById('filtroStatus').addEventListener('change', renderizarPlanos);
  document.getElementById('filtroBusca').addEventListener('input', renderizarPlanos);

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

window.avaliarPlano = async function(id) {
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
      
      let html = `
        <div style="background:var(--creme); padding:14px; border-radius:10px; border-left:4px solid var(--rosa-medio); margin-bottom:12px;">
          <strong style="color:var(--rosa-profundo); display:block; margin-bottom:6px;">${i + 1}º Momento: ${m.nome || '—'}</strong>
          <div style="font-size:0.9rem; margin-bottom:8px; color:var(--texto-suave);"><strong>Objetivo:</strong> ${m.objetivo || '—'}</div>
          
          <div style="font-size:0.9rem; color:var(--texto); margin-bottom:8px; display:flex; gap:16px; align-items:center;">
            <strong style="color:var(--texto-suave);">Objetivo alcançado?</strong>
            <label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; margin:0;"><input type="radio" name="eval_atingido_${i}" value="sim" ${checkSim}> Sim</label>
            <label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; margin:0;"><input type="radio" name="eval_atingido_${i}" value="nao" ${checkNao}> Não</label>
          </div>
          
          <label style="margin-top:6px; font-size:0.85rem;">Observações do Momento</label>
          <input type="text" id="eval_obs_${i}" value="${m.obs || ''}" style="padding:8px 12px; font-size:0.9rem;" placeholder="Digite aqui como foi o resultado...">
        </div>
      `;
      boxMomentos.insertAdjacentHTML('beforeend', html);
    });
  } else {
    boxMomentos.innerHTML = '<p style="color:#8A6A72;">Nenhum momento detalhado.</p>';
  }

  const obsBox = document.getElementById('verPlanoObs');
  if (p.observacoes) {
    obsBox.style.display = 'block';
    document.getElementById('verPlanoObsTexto').textContent = p.observacoes;
  } else { obsBox.style.display = 'none'; }

  // Altera o botão do modal para permitir SALVAR a avaliação
  const acoesBox = document.querySelector('#modalVerPlano .modal-acoes');
  acoesBox.innerHTML = `
    <button class="secundario" data-fechar-modal="modalVerPlano">Fechar</button>
    <button class="primary" onclick="salvarAvaliacaoPlano('${p.id}')">Salvar Avaliação</button>
  `;

  abrirModal('modalVerPlano');
};

window.salvarAvaliacaoPlano = async function(id) {
  const p = planosCache.find(x => x.id === id);
  if (!p) return;

  const momentosAtualizados = [];
  if (p.momentos) {
    p.momentos.forEach((m, i) => {
      const radio = document.querySelector(`input[name="eval_atingido_${i}"]:checked`);
      const obsInput = document.getElementById(`eval_obs_${i}`);
      
      momentosAtualizados.push({
        ...m,
        atingido: radio ? radio.value : null,
        obs: obsInput ? obsInput.value.trim() : ''
      });
    });
  }

  try {
    await db.collection('plans').doc(id).update({
      momentos: momentosAtualizados,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Atualiza o cache local para não precisar recarregar a página toda
    const index = planosCache.findIndex(x => x.id === id);
    if (index > -1) planosCache[index].momentos = momentosAtualizados;

    alert('Avaliação salva com sucesso!');
    fecharModal('modalVerPlano');
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar avaliação.');
  }
};