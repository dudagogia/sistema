// js/financeiro.js
protegerPagina();

let usuarioAtual = null;
let alunosCache = [];

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;

  const hoje = new Date().toISOString().slice(0, 10);
  document.getElementById('recData').value = hoje;
  document.getElementById('desData').value = hoje;
  document.getElementById('filtroMes').value = hoje.slice(0, 7);

  await carregarAlunos();
  await carregarLancamentos();

  document.getElementById('filtroMes').addEventListener('change', carregarLancamentos);
});

async function carregarAlunos() {
  const select = document.getElementById('recAluno');
  if (!select) return;
  try {
    const snap = await db.collection('students')
      .where('ownerId', '==', usuarioAtual.uid).get();
    alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    select.innerHTML = '<option value="">(Sem aluno — avulso)</option>' +
      alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
  } catch (e) {
    console.error('Erro ao carregar alunos:', e);
  }
}

document.getElementById('btnSalvarReceita').addEventListener('click', async () => {
  const msg = document.getElementById('msgReceita');
  const valor = Number(document.getElementById('recValor').value);
  const data = document.getElementById('recData').value;
  const desc = document.getElementById('recDesc').value.trim();

  if (!valor || !data || !desc) {
    msg.className = 'msg erro';
    msg.textContent = 'Preencha descrição, valor e data.';
    return;
  }

  try {
    await db.collection('financialRecords').add({
      tipo: 'receita',
      alunoId: document.getElementById('recAluno').value || null,
      descricao: desc,
      valor,
      data,
      formaPagamento: document.getElementById('recForma').value,
      status: document.getElementById('recStatus').value,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.className = 'msg sucesso';
    msg.textContent = 'Receita salva.';
    document.getElementById('recDesc').value = '';
    document.getElementById('recValor').value = '';
    await carregarLancamentos();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar receita.';
  }
});

document.getElementById('btnSalvarDespesa').addEventListener('click', async () => {
  const msg = document.getElementById('msgDespesa');
  const valor = Number(document.getElementById('desValor').value);
  const data = document.getElementById('desData').value;
  const desc = document.getElementById('desDesc').value.trim();

  if (!valor || !data || !desc) {
    msg.className = 'msg erro';
    msg.textContent = 'Preencha descrição, valor e data.';
    return;
  }

  try {
    await db.collection('expenses').add({
      descricao: desc,
      categoria: document.getElementById('desCategoria').value,
      valor,
      data,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.className = 'msg sucesso';
    msg.textContent = 'Despesa salva.';
    document.getElementById('desDesc').value = '';
    document.getElementById('desValor').value = '';
    await carregarLancamentos();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar despesa.';
  }
});

async function carregarLancamentos() {
  const tbody = document.getElementById('listaLanc');
  if (!tbody) return;
  const mesFiltro = document.getElementById('filtroMes').value;

  try {
    const [recSnap, desSnap] = await Promise.all([
      db.collection('financialRecords').where('ownerId', '==', usuarioAtual.uid).get(),
      db.collection('expenses').where('ownerId', '==', usuarioAtual.uid).get()
    ]);

    const receitas = recSnap.docs.map(d => ({ id: d.id, _col: 'financialRecords', ...d.data() }));
    const despesas = desSnap.docs.map(d => ({ id: d.id, _col: 'expenses', tipo: 'despesa', ...d.data() }));

    let todos = [...receitas, ...despesas];
    if (mesFiltro) todos = todos.filter(l => (l.data || '').startsWith(mesFiltro));
    todos.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const recebido = todos.filter(l => l.tipo === 'receita' && l.status === 'recebido')
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const pendente = todos.filter(l => l.tipo === 'receita' && l.status === 'pendente')
      .reduce((s, l) => s + Number(l.valor || 0), 0);
    const despesasTotal = todos.filter(l => l.tipo === 'despesa')
      .reduce((s, l) => s + Number(l.valor || 0), 0);

    document.getElementById('resReceitas').textContent = fmt(recebido);
    document.getElementById('resPendentes').textContent = fmt(pendente);
    document.getElementById('resDespesas').textContent = fmt(despesasTotal);
    document.getElementById('resSaldo').textContent = fmt(recebido - despesasTotal);

    if (todos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#8A6A72;">Nenhum lançamento neste mês.</td></tr>';
      return;
    }

    tbody.innerHTML = todos.map(l => {
      const aluno = alunosCache.find(a => a.id === l.alunoId);
      const nomeAluno = aluno ? aluno.nome : '—';
      const dataFmt = l.data ? new Date(l.data + 'T12:00').toLocaleDateString('pt-BR') : '—';
      const cor = l.tipo === 'receita' ? '#6FA97A' : '#C9556B';
      return `
        <tr>
          <td>${dataFmt}</td>
          <td style="color:${cor}; font-weight:600;">${l.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
          <td>${l.descricao}</td>
          <td>${nomeAluno}</td>
          <td style="color:${cor};">${fmt(l.valor)}</td>
          <td>${l.tipo === 'receita'
            ? `<select onchange="mudarStatus('${l.id}', this.value)">
                 <option value="recebido" ${l.status==='recebido'?'selected':''}>recebido</option>
                 <option value="pendente" ${l.status==='pendente'?'selected':''}>pendente</option>
               </select>`
            : '—'}</td>
          <td><button class="secundario" onclick="excluirLanc('${l._col}','${l.id}')">X</button></td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="7" style="color:#C9556B;">Erro ao carregar.</td></tr>';
  }
}

async function mudarStatus(id, novo) {
  try {
    await db.collection('financialRecords').doc(id).update({ status: novo });
    await carregarLancamentos();
  } catch (e) { alert('Erro ao atualizar.'); }
}

async function excluirLanc(colecao, id) {
  if (!confirm('Excluir este lançamento?')) return;
  try {
    await db.collection(colecao).doc(id).delete();
    await carregarLancamentos();
  } catch (e) { alert('Erro ao excluir.'); }
}