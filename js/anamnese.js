// js/anamnese.js
protegerPagina();

let usuarioAtual = null;
let anamneseAtualId = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAlunos();
});

async function carregarAlunos() {
  const select = document.getElementById('alunoSelect');
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

    select.addEventListener('change', async () => {
      const alunoId = select.value;
      if (!alunoId) {
        document.getElementById('formAnamnese').style.display = 'none';
        return;
      }
      await carregarAnamnese(alunoId);
    });
  } catch (e) {
    console.error('Erro ao carregar alunos:', e);
  }
}

async function carregarAnamnese(alunoId) {
  const form = document.getElementById('formAnamnese');
  const status = document.getElementById('statusAnamnese');
  form.style.display = 'block';
  form.reset();
  anamneseAtualId = null;

  try {
    const snap = await db.collection('anamneses')
      .where('ownerId', '==', usuarioAtual.uid)
      .where('alunoId', '==', alunoId)
      .limit(1).get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      anamneseAtualId = doc.id;
      const dados = doc.data();
      Object.keys(dados).forEach(k => {
        const campo = form.elements[k];
        if (campo) campo.value = dados[k] || '';
      });
      status.textContent = 'Anamnese já existente. Edite e salve para atualizar.';
    } else {
      status.textContent = 'Nenhuma anamnese cadastrada. Preencha e salve.';
    }
  } catch (e) {
    console.error('Erro ao carregar anamnese:', e);
  }
}

document.getElementById('btnSalvarAnamnese').addEventListener('click', async () => {
  const alunoId = document.getElementById('alunoSelect').value;
  const msg = document.getElementById('msgAnamnese');
  if (!alunoId) return;

  const form = document.getElementById('formAnamnese');
  const dados = {
    alunoId,
    ownerId: usuarioAtual.uid,
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  Array.from(form.elements).forEach(el => {
    if (el.name) dados[el.name] = el.value.trim();
  });

  try {
    if (anamneseAtualId) {
      await db.collection('anamneses').doc(anamneseAtualId).update(dados);
    } else {
      dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('anamneses').add(dados);
      anamneseAtualId = ref.id;
    }
    msg.className = 'msg sucesso';
    msg.textContent = 'Anamnese salva com sucesso.';
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar anamnese.';
  }
});