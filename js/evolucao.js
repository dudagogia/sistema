// js/evolucao.js
protegerPagina();

let usuarioAtual = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAlunos();
});

async function carregarAlunos() {
  const select = document.getElementById('evAluno');
  if (!select) return;
  try {
    const snap = await db.collection('students')
      .where('ownerId', '==', usuarioAtual.uid).get();

    if (snap.empty) {
      select.innerHTML = '<option value="">Nenhum aluno cadastrado</option>';
      return;
    }

    select.innerHTML = '<option value="">Selecione um aluno</option>' +
      snap.docs.map(d => `<option value="${d.id}">${d.data().nome}</option>`).join('');

    select.addEventListener('change', () => carregarHistorico(select.value));
  } catch (e) {
    console.error('Erro ao carregar alunos:', e);
  }
}

document.getElementById('btnSalvarEv').addEventListener('click', async () => {
  const msg = document.getElementById('msgEv');
  const alunoId = document.getElementById('evAluno').value;
  const data = document.getElementById('evData').value;

  if (!alunoId || !data) {
    msg.className = 'msg erro';
    msg.textContent = 'Selecione o aluno e a data.';
    return;
  }

  const ev = {
    alunoId, data,
    objetivo: document.getElementById('evObjetivo').value.trim(),
    atividades: document.getElementById('evAtividades').value.trim(),
    habilidades: document.getElementById('evHabilidades').value.trim(),
    desempenho: document.getElementById('evDesempenho').value.trim(),
    dificuldades: document.getElementById('evDificuldades').value.trim(),
    avancos: document.getElementById('evAvancos').value.trim(),
    proximos: document.getElementById('evProximos').value.trim(),
    observacoes: document.getElementById('evObservacoes').value.trim(),
    ownerId: usuarioAtual.uid,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('evolutions').add(ev);
    msg.className = 'msg sucesso';
    msg.textContent = 'Evolução salva com sucesso.';
    ['evObjetivo','evAtividades','evHabilidades','evDesempenho','evDificuldades','evAvancos','evProximos','evObservacoes']
      .forEach(id => document.getElementById(id).value = '');
    await carregarHistorico(alunoId);
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar evolução.';
  }
});

async function carregarHistorico(alunoId) {
  const div = document.getElementById('historicoEv');
  if (!div) return;
  if (!alunoId) { div.innerHTML = 'Selecione um aluno.'; return; }

  try {
    const snap = await db.collection('evolutions')
      .where('ownerId', '==', usuarioAtual.uid)
      .where('alunoId', '==', alunoId).get();

    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.data.localeCompare(a.data));

    if (lista.length === 0) {
      div.innerHTML = '<p style="color:#8A6A72;">Nenhuma evolução registrada para este aluno.</p>';
      return;
    }

    div.innerHTML = lista.map(ev => `
      <div style="border:1px solid #F5E3E7; border-radius:10px; padding:14px; margin-bottom:12px; background:#FFF7F9;">
        <strong style="color:#9C4258;">${new Date(ev.data + 'T12:00').toLocaleDateString('pt-BR')}</strong>
        ${ev.objetivo ? `<p style="margin-top:6px;"><em>Objetivo:</em> ${ev.objetivo}</p>` : ''}
        ${ev.atividades ? `<p><em>Atividades:</em> ${ev.atividades}</p>` : ''}
        ${ev.habilidades ? `<p><em>Habilidades:</em> ${ev.habilidades}</p>` : ''}
        ${ev.desempenho ? `<p><em>Desempenho:</em> ${ev.desempenho}</p>` : ''}
        ${ev.avancos ? `<p><em>Avanços:</em> ${ev.avancos}</p>` : ''}
        ${ev.proximos ? `<p><em>Próximos passos:</em> ${ev.proximos}</p>` : ''}
        ${ev.observacoes ? `<p><em>Observações:</em> ${ev.observacoes}</p>` : ''}
      </div>
    `).join('');
  } catch (e) {
    console.error(e);
    div.innerHTML = '<p style="color:#C9556B;">Erro ao carregar histórico.</p>';
  }
}