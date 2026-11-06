// js/relatorios.js
protegerPagina();
document.getElementById('btnSair').addEventListener('click', fazerLogout);

let usuarioAtual = null;
let alunosCache = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  const snap = await db.collection('students')
    .where('ownerId', '==', usuarioAtual.uid).get();
  alunosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const select = document.getElementById('relAluno');
  select.innerHTML = '<option value="">Selecione um aluno</option>' +
    alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
});

document.getElementById('btnImprimir').addEventListener('click', () => window.print());

document.getElementById('btnGerar').addEventListener('click', async () => {
  const msg = document.getElementById('msgRel');
  const alunoId = document.getElementById('relAluno').value;
  const tipo = document.getElementById('relTipo').value;

  if (!alunoId) {
    msg.className = 'msg erro';
    msg.textContent = 'Selecione um aluno.';
    return;
  }

  const aluno = alunosCache.find(a => a.id === alunoId);
  if (!aluno) return;

  try {
    // Buscar anamnese
    const anSnap = await db.collection('anamneses')
      .where('ownerId', '==', usuarioAtual.uid)
      .where('alunoId', '==', alunoId).limit(1).get();
    const anamnese = anSnap.empty ? null : anSnap.docs[0].data();

    // Buscar evoluções
    const evSnap = await db.collection('evolutions')
      .where('ownerId', '==', usuarioAtual.uid)
      .where('alunoId', '==', alunoId).get();
    const evolucoes = evSnap.docs.map(d => d.data())
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    // Montar conteúdo
    const titulos = {
      inicial: 'Relatório Inicial',
      acompanhamento: 'Relatório de Acompanhamento',
      evolucao: 'Relatório de Evolução',
      encerramento: 'Relatório de Encerramento',
      responsaveis: 'Relatório para Responsáveis'
    };

    const hoje = new Date().toLocaleDateString('pt-BR');

    let html = `
      <h1 style="color:#1F4E5F; font-size:1.4rem; margin-bottom:4px;">Meu Espaço Psicopedagógico</h1>
      <h2 style="font-size:1.1rem; color:#1F4E5F; margin-bottom:16px;">${titulos[tipo]}</h2>

      <p><strong>Aluno:</strong> ${aluno.nome || '—'}</p>
      <p><strong>Data de nascimento:</strong> ${aluno.nascimento ? new Date(aluno.nascimento + 'T12:00').toLocaleDateString('pt-BR') : '—'}</p>
      <p><strong>Escola:</strong> ${aluno.escola || '—'}</p>
      <p><strong>Responsável:</strong> ${aluno.responsavel || '—'}</p>
      <p><strong>Data do relatório:</strong> ${hoje}</p>
      <hr style="margin:16px 0; border:none; border-top:1px solid #EAE5D9;" />
    `;

    if (anamnese) {
      html += `<h3 style="color:#1F4E5F; font-size:1rem; margin-top:16px;">Síntese da anamnese</h3>`;
      if (anamnese.dificuldades) html += `<p><strong>Dificuldades relatadas:</strong> ${anamnese.dificuldades}</p>`;
      if (anamnese.interesses) html += `<p><strong>Interesses:</strong> ${anamnese.interesses}</p>`;
      if (anamnese.expectativas) html += `<p><strong>Expectativas da família:</strong> ${anamnese.expectativas}</p>`;
    }

    if (evolucoes.length > 0) {
      html += `<h3 style="color:#1F4E5F; font-size:1rem; margin-top:16px;">Síntese das sessões (${evolucoes.length})</h3>`;
      // Pega os últimos 5 registros como amostra
      evolucoes.slice(-5).forEach(ev => {
        const d = ev.data ? new Date(ev.data + 'T12:00').toLocaleDateString('pt-BR') : '—';
        html += `<p><strong>${d}</strong> — ${ev.objetivo || 'Sessão realizada'}`;
        if (ev.avancos) html += ` <em>Avanços:</em> ${ev.avancos}`;
        html += `</p>`;
      });
    }

    html += `
      <h3 style="color:#1F4E5F; font-size:1rem; margin-top:16px;">Observações profissionais</h3>
      <p><em>(Edite este campo antes de imprimir)</em></p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <hr style="margin:24px 0; border:none; border-top:1px solid #EAE5D9;" />
      <p style="font-size:0.9rem; color:#6B6B6B;">_________________________________________</p>
      <p style="font-size:0.9rem; color:#6B6B6B;">Psicopedagoga responsável</p>
    `;

    document.getElementById('relatorioConteudo').innerHTML = html;
    document.getElementById('relatorioBox').style.display = 'block';
    document.getElementById('relatorioBox').scrollIntoView({ behavior: 'smooth' });

    msg.className = 'msg sucesso';
    msg.textContent = 'Relatório gerado. Edite o conteúdo antes de imprimir.';
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao gerar relatório.';
  }
});