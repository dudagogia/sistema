// js/atividades.js
protegerPagina();
document.getElementById('btnSair').addEventListener('click', fazerLogout);

let usuarioAtual = null;
let atividadesCache = [];

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  usuarioAtual = user;
  await carregarAtividades();
});

// ---------- SALVAR ----------
document.getElementById('btnSalvarAtiv').addEventListener('click', async () => {
  const msg = document.getElementById('msgAtiv');
  const nome = document.getElementById('ativNome').value.trim();
  if (!nome) {
    msg.className = 'msg erro';
    msg.textContent = 'Informe o nome da atividade.';
    return;
  }

  const ativ = {
    nome,
    area: document.getElementById('ativArea').value,
    habilidade: document.getElementById('ativHabilidade').value.trim(),
    objetivo: document.getElementById('ativObjetivo').value.trim(),
    idade: document.getElementById('ativIdade').value.trim(),
    dificuldade: document.getElementById('ativDificuldade').value,
    tempo: Number(document.getElementById('ativTempo').value) || 20,
    materiais: document.getElementById('ativMateriais').value.trim(),
    instrucoes: document.getElementById('ativInstrucoes').value.trim(),
    aplicar: document.getElementById('ativAplicar').value.trim(),
    observar: document.getElementById('ativObservar').value.trim(),
    adaptacoes: document.getElementById('ativAdaptacoes').value.trim(),
    favorita: false,
    ownerId: usuarioAtual.uid,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('activities').add(ativ);
    msg.className = 'msg sucesso';
    msg.textContent = 'Atividade salva.';
    document.getElementById('ativNome').value = '';
    document.getElementById('ativHabilidade').value = '';
    document.getElementById('ativObjetivo').value = '';
    document.getElementById('ativIdade').value = '';
    document.getElementById('ativMateriais').value = '';
    document.getElementById('ativInstrucoes').value = '';
    document.getElementById('ativAplicar').value = '';
    document.getElementById('ativObservar').value = '';
    document.getElementById('ativAdaptacoes').value = '';
    await carregarAtividades();
  } catch (e) {
    console.error(e);
    msg.className = 'msg erro';
    msg.textContent = 'Erro ao salvar.';
  }
});

// ---------- LISTAGEM ----------
async function carregarAtividades() {
  const snap = await db.collection('activities')
    .where('ownerId', '==', usuarioAtual.uid).get();
  atividadesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderizar();
}

function renderizar() {
  const div = document.getElementById('listaAtiv');
  const busca = document.getElementById('filtroBusca').value.toLowerCase();
  const area = document.getElementById('filtroArea').value;
  const dif = document.getElementById('filtroDificuldade').value;
  const fav = document.getElementById('filtroFavoritas').value;

  let lista = atividadesCache;
  if (busca) lista = lista.filter(a =>
    (a.nome || '').toLowerCase().includes(busca) || (a.habilidade || '').toLowerCase().includes(busca));
  if (area) lista = lista.filter(a => a.area === area);
  if (dif) lista = lista.filter(a => a.dificuldade === dif);
  if (fav === 'sim') lista = lista.filter(a => a.favorita);

  if (lista.length === 0) {
    div.innerHTML = '<p style="color:#6B6B6B;">Nenhuma atividade encontrada.</p>';
    return;
  }

  div.innerHTML = lista.map(a => `
    <div class="ativ-card">
      <button class="fav" onclick="toggleFavorita('${a.id}', ${!a.favorita})" title="Favoritar">
        ${a.favorita ? '★' : '☆'}
      </button>
      <h4>${a.nome}</h4>
      <span class="tag">${a.area}</span>
      ${a.dificuldade ? `<span class="tag">${a.dificuldade}</span>` : ''}
      ${a.idade ? `<span class="tag">${a.idade}</span>` : ''}
      ${a.tempo ? `<span class="tag">${a.tempo}min</span>` : ''}
      ${a.habilidade ? `<p style="font-size:0.8rem; color:#6B6B6B; margin-top:6px;">${a.habilidade}</p>` : ''}
      <div class="acoes">
        <button class="secundario" onclick="verDetalhe('${a.id}')">Ver</button>
        <button class="secundario" onclick="excluirAtiv('${a.id}')">Excluir</button>
      </div>
      <div id="det-${a.id}"></div>
    </div>
  `).join('');
}

// Filtros ao vivo
['filtroBusca','filtroArea','filtroDificuldade','filtroFavoritas'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderizar);
  document.getElementById(id).addEventListener('change', renderizar);
});

// ---------- AÇÕES ----------
async function toggleFavorita(id, novo) {
  try {
    await db.collection('activities').doc(id).update({ favorita: novo });
    const item = atividadesCache.find(a => a.id === id);
    if (item) item.favorita = novo;
    renderizar();
  } catch (e) { alert('Erro ao favoritar.'); }
}

function verDetalhe(id) {
  const a = atividadesCache.find(x => x.id === id);
  const el = document.getElementById('det-' + id);
  if (!a) return;
  if (el.innerHTML) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <div class="detalhe">
      ${a.objetivo ? `<p><strong>Objetivo:</strong> ${a.objetivo}</p>` : ''}
      ${a.materiais ? `<p><strong>Materiais:</strong> ${a.materiais}</p>` : ''}
      ${a.instrucoes ? `<p><strong>Instruções:</strong><br>${a.instrucoes.replace(/\n/g,'<br>')}</p>` : ''}
      ${a.aplicar ? `<p><strong>Como aplicar:</strong> ${a.aplicar}</p>` : ''}
      ${a.observar ? `<p><strong>O que observar:</strong> ${a.observar}</p>` : ''}
      ${a.adaptacoes ? `<p><strong>Adaptações:</strong> ${a.adaptacoes}</p>` : ''}
    </div>
  `;
}

async function excluirAtiv(id) {
  if (!confirm('Excluir esta atividade?')) return;
  try {
    await db.collection('activities').doc(id).delete();
    await carregarAtividades();
  } catch (e) { alert('Erro ao excluir.'); }
}