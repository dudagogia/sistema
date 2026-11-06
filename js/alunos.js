// js/alunos.js
protegerPagina();
document.getElementById('btnSair').addEventListener('click', fazerLogout);

let usuarioAtual = null;
let alunosCache = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAlunos();
  await carregarDocumentos();
});

// ---------- ALUNOS ----------
async function carregarAlunos() {
  const tbody = document.getElementById('listaAlunos');
  const select = document.getElementById('docAluno');
  try {
    const snap = await db.collection('students')
      .where('ownerId', '==', usuarioAtual.uid)
      .get();

    alunosCache = [];
    snap.forEach(doc => alunosCache.push({ id: doc.id, ...doc.data() }));

    if (alunosCache.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#6B6B6B;">Nenhum aluno cadastrado.</td></tr>';
    } else {
      tbody.innerHTML = alunosCache.map(a => `
        <tr>
          <td>${a.nome}</td>
          <td>${a.status}</td>
          <td>${a.escola || '—'}</td>
          <td><button class="secundario" onclick="excluirAluno('${a.id}')">Excluir</button></td>
        </tr>
      `).join('');
    }

    // Preenche o select de documentos
    select.innerHTML = alunosCache.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="4" style="color:#B23A48;">Erro ao carregar.</td></tr>';
  }
}

document.getElementById('btnSalvar').addEventListener('click', async () => {
  const msg = document.getElementById('msgAluno');
  const nome = document.getElementById('nome').value.trim();
  if (!nome) {
    msg.className = 'msg erro';
    msg.textContent = 'Informe o nome do aluno.';
    return;
  }

  const aluno = {
    nome,
    nascimento: document.getElementById('nascimento').value || null,
    escola: document.getElementById('escola').value.trim() || null,
    status: document.getElementById('status').value,
    responsavel: document.getElementById('responsavel').value.trim() || null,
    ownerId: usuarioAtual.uid,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('students').add(aluno);
    msg.className = 'msg sucesso';
    msg.textContent = 'Aluno salvo com sucesso.';
    document.getElementById('nome').value = '';
    document.getElementById('nascimento').value = '';
    document.getElementById('escola').value = '';
    document.getElementById('responsavel').value = '';
    await carregarAlunos();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar. Verifique as regras do Firestore.';
  }
});

async function excluirAluno(id) {
  if (!confirm('Tem certeza que deseja excluir este aluno? Os documentos vinculados não serão apagados do Drive.')) return;
  try {
    await db.collection('students').doc(id).delete();
    await carregarAlunos();
    await carregarDocumentos();
  } catch (e) {
    alert('Erro ao excluir.');
  }
}

// ---------- DOCUMENTOS ----------
document.getElementById('btnSalvarDoc').addEventListener('click', async () => {
  const msg = document.getElementById('msgDoc');
  const alunoId = document.getElementById('docAluno').value;
  const nome = document.getElementById('docNome').value.trim();
  const categoria = document.getElementById('docCategoria').value;
  const url = document.getElementById('docUrl').value.trim();

  if (!alunoId || !nome || !url) {
    msg.className = 'msg erro';
    msg.textContent = 'Preencha aluno, nome do documento e link.';
    return;
  }
  if (!url.startsWith('https://drive.google.com/') && !url.startsWith('https://1drv.ms/') && !url.startsWith('https://onedrive.live.com/')) {
    msg.className = 'msg erro';
    msg.textContent = 'O link deve ser do Google Drive ou OneDrive.';
    return;
  }

  try {
    await db.collection('documents').add({
      alunoId,
      nome,
      categoria,
      url,
      ownerId: usuarioAtual.uid,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.className = 'msg sucesso';
    msg.textContent = 'Documento salvo com sucesso.';
    document.getElementById('docNome').value = '';
    document.getElementById('docUrl').value = '';
    await carregarDocumentos();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar documento.';
  }
});

async function carregarDocumentos() {
  const tbody = document.getElementById('listaDocs');
  try {
    const snap = await db.collection('documents')
      .where('ownerId', '==', usuarioAtual.uid)
      .get();

    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, ...d.data() }));

    if (docs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#6B6B6B;">Nenhum documento.</td></tr>';
      return;
    }

    tbody.innerHTML = docs.map(d => {
      const aluno = alunosCache.find(a => a.id === d.alunoId);
      const nomeAluno = aluno ? aluno.nome : '(aluno removido)';
      return `
        <tr>
          <td>${nomeAluno}</td>
          <td>${d.nome}</td>
          <td>${d.categoria}</td>
          <td><a href="${d.url}" target="_blank" rel="noopener">Abrir</a></td>
          <td><button class="secundario" onclick="excluirDoc('${d.id}')">Excluir</button></td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5" style="color:#B23A48;">Erro ao carregar documentos.</td></tr>';
  }
}

async function excluirDoc(id) {
  if (!confirm('Excluir este registro de documento? O arquivo no Drive NÃO será apagado.')) return;
  try {
    await db.collection('documents').doc(id).delete();
    await carregarDocumentos();
  } catch (e) {
    alert('Erro ao excluir.');
  }
}