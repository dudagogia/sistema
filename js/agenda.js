// js/agenda.js
protegerPagina();

let usuarioAtual = null;
let alunosCache = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAlunos();
  await carregarAgenda();
});

async function carregarAlunos() {
  const select = document.getElementById('agAluno');
  if (!select) return;
  try {
    const snap = await db.collection('students')
      .where('ownerId', '==', usuarioAtual.uid).get();
    alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    select.innerHTML = alunosCache.map(a =>
      `<option value="${a.id}">${a.nome}</option>`
    ).join('');
  } catch (e) {
    console.error('Erro ao carregar alunos:', e);
  }
}

document.getElementById('btnSalvarAg').addEventListener('click', async () => {
  const msg = document.getElementById('msgAg');
  const alunoId = document.getElementById('agAluno').value;
  const data = document.getElementById('agData').value;
  const hora = document.getElementById('agHora').value;

  if (!alunoId || !data || !hora) {
    msg.className = 'msg erro';
    msg.textContent = 'Preencha aluno, data e horário.';
    return;
  }

  try {
    await db.collection('appointments').add({
      alunoId,
      data,
      hora,
      duracao: Number(document.getElementById('agDuracao').value) || 50,
      modalidade: document.getElementById('agModalidade').value,
      status: document.getElementById('agStatus').value,
      objetivo: document.getElementById('agObjetivo').value.trim() || null,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.className = 'msg sucesso';
    msg.textContent = 'Atendimento agendado.';
    document.getElementById('agObjetivo').value = '';
    await carregarAgenda();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao agendar.';
  }
});

async function carregarAgenda() {
  const tbody = document.getElementById('listaAgenda');
  if (!tbody) return;
  try {
    const snap = await db.collection('appointments')
      .where('ownerId', '==', usuarioAtual.uid).get();

    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#8A6A72;">Nenhum atendimento agendado.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(a => {
      const aluno = alunosCache.find(x => x.id === a.alunoId);
      const nome = aluno ? aluno.nome : '(removido)';
      const dataFmt = new Date(a.data + 'T' + a.hora).toLocaleDateString('pt-BR');
      return `
        <tr>
          <td>${dataFmt}</td>
          <td>${a.hora}</td>
          <td>${nome}</td>
          <td>${a.status}</td>
          <td>
            <select onchange="mudarStatus('${a.id}', this.value)" style="padding:4px;">
              ${['agendado','confirmado','realizado','cancelado','falta'].map(s =>
                `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button class="secundario" onclick="excluirAg('${a.id}')" style="margin-left:4px;">X</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5" style="color:#C9556B;">Erro ao carregar agenda.</td></tr>';
  }
}

async function mudarStatus(id, novoStatus) {
  try {
    await db.collection('appointments').doc(id).update({ status: novoStatus });
  } catch (e) { alert('Erro ao atualizar status.'); }
}

async function excluirAg(id) {
  if (!confirm('Excluir este atendimento?')) return;
  try {
    await db.collection('appointments').doc(id).delete();
    await carregarAgenda();
  } catch (e) { alert('Erro ao excluir.'); }
}