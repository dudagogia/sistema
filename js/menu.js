// js/menu.js
(function () {
  const linksPrincipais = [
    { href: 'dashboard.html',     label: 'Dashboard',     icon: '🏠' },
    { href: 'alunos.html',        label: 'Alunos',        icon: '👧' },
    { href: 'anamnese.html',      label: 'Anamnese',      icon: '📋' },
    { href: 'agenda.html',        label: 'Agenda',        icon: '📅' },
    { href: 'planejamentos.html', label: 'Planejamentos', icon: '📝' },
    { href: 'evolucao.html',      label: 'Evolução',      icon: '📈' }
  ];

  const linksMais = [
    { href: 'financeiro.html',    label: 'Financeiro',    icon: '💰' },
    { href: 'relatorios.html',    label: 'Relatórios',    icon: '📄' },
    { href: 'atividades.html',    label: 'Atividades',    icon: '📚' },
    { href: 'gerador.html',       label: 'Gerador',       icon: '✨' },
    { href: 'caca-palavras.html', label: 'Caça-palavras', icon: '🔤' },
    { href: 'jogos.html',         label: 'Jogos',         icon: '🎮' }
  ];

  const todosLinks = [...linksPrincipais, ...linksMais];
  const paginaAtual = location.pathname.split('/').pop() || 'dashboard.html';

  function montar() {
    const container = document.getElementById('app-header');
    if (!container) return;

    // Monta os links principais
    const linksPrincipaisHtml = linksPrincipais.map(l => {
      const ativo = l.href === paginaAtual ? 'ativo' : '';
      return `<a href="${l.href}" class="menu-link ${ativo}">
        <span class="menu-icone">${l.icon}</span>
        <span class="menu-label">${l.label}</span>
      </a>`;
    }).join('');

    // Monta os links do dropdown "Mais"
    const linksMaisHtml = linksMais.map(l => {
      const ativo = l.href === paginaAtual ? 'ativo' : '';
      return `<a href="${l.href}" class="menu-link ${ativo}" style="padding: 10px 16px; border-radius: 8px; color: var(--texto); width: 100%; display: flex; margin-bottom: 2px;">
        <span class="menu-icone">${l.icon}</span>
        <span class="menu-label">${l.label}</span>
      </a>`;
    }).join('');

    // Monta o menu mobile com todos os links
    const linksMobileHtml = todosLinks.map(l => {
      const ativo = l.href === paginaAtual ? 'ativo' : '';
      return `<a href="${l.href}" class="menu-link ${ativo}">
        <span class="menu-icone">${l.icon}</span>
        <span class="menu-label">${l.label}</span>
      </a>`;
    }).join('');

    container.innerHTML = `
      <header class="app-header">
        <div class="header-topo">
          <a href="dashboard.html" style="display: flex; align-items: center;">
            <img src="logo.png" alt="Maria Eduarda Psicopedagoga" style="height: 40px; width: auto; object-fit: contain;">
          </a>
          <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
        
        <nav class="menu-desktop">
          ${linksPrincipaisHtml}
          
          <!-- BOTÃO MAIS (DROPDOWN) -->
          <div class="dropdown" id="menuMaisDropdown">
            <button class="menu-link dropdown-btn" style="background: none; border: none; cursor: pointer; font-family: inherit; font-size: 0.85rem; font-weight: 600;">
              <span class="menu-icone">📁</span>
              <span class="menu-label">Mais ▾</span>
            </button>
            <div class="dropdown-content" id="dropdownContent">
              ${linksMaisHtml}
            </div>
          </div>

          <button class="logout" id="btnSair">Sair</button>
        </nav>
      </header>

      <div class="menu-overlay" id="menuOverlay"></div>

      <nav class="menu-mobile" id="menuMobile">
        <div class="menu-mobile-topo">
          <span>Menu</span>
          <button class="menu-fechar" id="menuFechar" aria-label="Fechar menu">✕</button>
        </div>
        ${linksMobileHtml}
        <button class="logout" id="btnSairMobile">Sair</button>
      </nav>
    `;

    const toggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('menuOverlay');
    const menuMobile = document.getElementById('menuMobile');
    const btnFechar = document.getElementById('menuFechar');
    const btnSairDesktop = document.getElementById('btnSair');
    const btnSairMobile = document.getElementById('btnSairMobile');
    
    // Lógica do Dropdown
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownContent = document.getElementById('dropdownContent');

    if (dropdownBtn) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
      });
    }

    // Fecha o dropdown se clicar fora
    window.addEventListener('click', (e) => {
      if (dropdownContent && dropdownContent.classList.contains('show') && !dropdownBtn.contains(e.target)) {
        dropdownContent.classList.remove('show');
      }
    });

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

    menuMobile.querySelectorAll('.menu-link').forEach(a => {
      a.addEventListener('click', fechar);
    });

    if (typeof fazerLogout === 'function') {
      if (btnSairDesktop) btnSairDesktop.addEventListener('click', fazerLogout);
      if (btnSairMobile)  btnSairMobile.addEventListener('click', fazerLogout);
    }

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) fechar();
    });

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

// js/menu.js (final do arquivo)
const APP_VERSION = '2.0.0'; // Mude isso manualmente a cada deploy

// Verifica se a versão mudou desde a última visita
const cachedVersion = localStorage.getItem('app-version');
if (cachedVersion && cachedVersion !== APP_VERSION) {
  console.log('[App] Nova versão detectada. Forçando atualização...');
  localStorage.setItem('app-version', APP_VERSION);
  // Força o recarregamento ignorando o cache
  window.location.reload(true);
} else {
  localStorage.setItem('app-version', APP_VERSION);
}