// js/menu.js
// Gera o header responsivo em todas as páginas.
// Uso: inclua <div id="app-header"></div> no topo do <body> e
// carregue este script DEPOIS do auth.js.

(function () {
  const links = [
    { href: 'dashboard.html',    label: 'Dashboard',    icon: '🏠' },
    { href: 'alunos.html',       label: 'Alunos',       icon: '👧' },
    { href: 'anamnese.html',     label: 'Anamnese',     icon: '📋' },
    { href: 'agenda.html',       label: 'Agenda',       icon: '📅' },
    { href: 'evolucao.html',     label: 'Evolução',     icon: '📝' },
    { href: 'financeiro.html',   label: 'Financeiro',   icon: '💰' },
    { href: 'relatorios.html',   label: 'Relatórios',   icon: '📄' },
    { href: 'atividades.html',   label: 'Atividades',   icon: '📚' },
    { href: 'gerador.html',      label: 'Gerador',      icon: '✨' },
    { href: 'caca-palavras.html',label: 'Caça-palavras',icon: '🔤' },
    { href: 'jogos.html',        label: 'Jogos',        icon: '🎮' }
  ];

  const paginaAtual = location.pathname.split('/').pop() || 'dashboard.html';

  function montarHeader() {
    const container = document.getElementById('app-header');
    if (!container) return;

    const linksHtml = links.map(l => {
      const ativo = l.href === paginaAtual ? 'ativo' : '';
      return `<a href="${l.href}" class="menu-link ${ativo}">
        <span class="menu-icone">${l.icon}</span>
        <span class="menu-label">${l.label}</span>
      </a>`;
    }).join('');

    container.innerHTML = `
      <header>
        <div class="header-topo">
          <h1>Meu Espaço Psicopedagógico</h1>
          <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu">
            <span></span><span></span><span></span>
          </button>
        </div>
        <nav class="menu" id="menuPrincipal">
          ${linksHtml}
          <button class="logout" id="btnSair">Sair</button>
        </nav>
      </header>
      <div class="menu-overlay" id="menuOverlay"></div>
    `;

    // Toggle do menu
    const toggle = document.getElementById('menuToggle');
    const menu = document.getElementById('menuPrincipal');
    const overlay = document.getElementById('menuOverlay');

    function abrirMenu() {
      menu.classList.add('aberto');
      overlay.classList.add('aberto');
      toggle.classList.add('aberto');
      document.body.style.overflow = 'hidden';
    }
    function fecharMenu() {
      menu.classList.remove('aberto');
      overlay.classList.remove('aberto');
      toggle.classList.remove('aberto');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', () => {
      if (menu.classList.contains('aberto')) fecharMenu();
      else abrirMenu();
    });
    overlay.addEventListener('click', fecharMenu);

    // Fecha ao clicar em qualquer link
    menu.querySelectorAll('.menu-link').forEach(a => {
      a.addEventListener('click', fecharMenu);
    });

    // Botão sair (usa a função do auth.js, que já existe globalmente)
    const btnSair = document.getElementById('btnSair');
    if (btnSair && typeof fazerLogout === 'function') {
      btnSair.addEventListener('click', fazerLogout);
    }

    // Fecha o menu se a tela aumentar (desktop)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) fecharMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarHeader);
  } else {
    montarHeader();
  }
})();