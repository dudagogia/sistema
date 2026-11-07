// js/menu.js
// Monta header responsivo + menu lateral (mobile) + overlay.
// Deve ser incluído DEPOIS do auth.js em todas as páginas internas.
// Uso no HTML: <div id="app-header"></div> logo após <body>.

(function () {
  const links = [
    { href: 'dashboard.html',     label: 'Dashboard',     icon: '🏠' },
    { href: 'alunos.html',        label: 'Alunos',        icon: '👧' },
    { href: 'anamnese.html',      label: 'Anamnese',      icon: '📋' },
    { href: 'agenda.html',        label: 'Agenda',        icon: '📅' },
    { href: 'evolucao.html',      label: 'Evolução',      icon: '📝' },
    { href: 'financeiro.html',    label: 'Financeiro',    icon: '💰' },
    { href: 'relatorios.html',    label: 'Relatórios',    icon: '📄' },
    { href: 'atividades.html',    label: 'Atividades',    icon: '📚' },
    { href: 'gerador.html',       label: 'Gerador',       icon: '✨' },
    { href: 'caca-palavras.html', label: 'Caça-palavras', icon: '🔤' },
    { href: 'jogos.html',         label: 'Jogos',         icon: '🎮' }
  ];

  const paginaAtual = location.pathname.split('/').pop() || 'dashboard.html';

  function montar() {
    const container = document.getElementById('app-header');
    if (!container) return;

    const linksHtml = links.map(l => {
      const ativo = l.href === paginaAtual ? 'ativo' : '';
      return `<a href="${l.href}" class="menu-link ${ativo}">
        <span class="menu-icone">${l.icon}</span>
        <span class="menu-label">${l.label}</span>
      </a>`;
    }).join('');

    // Header + menu + overlay como IRMÃOS (não aninhados)
    container.innerHTML = `
      <header class="app-header">
        <div class="header-topo">
          <h1>Meu Espaço Psicopedagógico</h1>
          <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
        <nav class="menu-desktop">
          ${linksHtml}
          <button class="logout" id="btnSair">Sair</button>
        </nav>
      </header>

      <div class="menu-overlay" id="menuOverlay"></div>

      <nav class="menu-mobile" id="menuMobile">
        <div class="menu-mobile-topo">
          <span>Menu</span>
          <button class="menu-fechar" id="menuFechar" aria-label="Fechar menu">✕</button>
        </div>
        ${linksHtml}
        <button class="logout" id="btnSairMobile">Sair</button>
      </nav>
    `;

    const toggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('menuOverlay');
    const menuMobile = document.getElementById('menuMobile');
    const btnFechar = document.getElementById('menuFechar');
    const btnSairDesktop = document.getElementById('btnSair');
    const btnSairMobile = document.getElementById('btnSairMobile');

    function abrir() {
      menuMobile.classList.add('aberto');
      overlay.classList.add('aberto');
      toggle.classList.add('aberto');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-aberto');
    }
    function fechar() {
      menuMobile.classList.remove('aberto');
      overlay.classList.remove('aberto');
      toggle.classList.remove('aberto');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-aberto');
    }

    toggle.addEventListener('click', () => {
      if (menuMobile.classList.contains('aberto')) fechar();
      else abrir();
    });
    overlay.addEventListener('click', fechar);
    if (btnFechar) btnFechar.addEventListener('click', fechar);

    // Fecha ao clicar em qualquer link (mobile)
    menuMobile.querySelectorAll('.menu-link').forEach(a => {
      a.addEventListener('click', fechar);
    });

    // Botão Sair (usa fazerLogout do auth.js)
    if (typeof fazerLogout === 'function') {
      if (btnSairDesktop) btnSairDesktop.addEventListener('click', fazerLogout);
      if (btnSairMobile)  btnSairMobile.addEventListener('click', fazerLogout);
    }

    // Fecha se a tela crescer para desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) fechar();
    });

    // Fecha com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fechar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
})();