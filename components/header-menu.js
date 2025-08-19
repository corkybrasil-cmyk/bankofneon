// Interação do menu lateral universal
(function() {
	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}
	ready(function() {
		// Aguarda o header ser carregado
		const waitHeader = setInterval(function() {
			const btnMenu = document.getElementById('btnMenu');
			const sidebar = document.getElementById('sidebar');
			const sidebarOverlay = document.getElementById('sidebarOverlay');
			const btnCloseSidebar = document.getElementById('btnCloseSidebar');
			if (btnMenu && sidebar && sidebarOverlay && btnCloseSidebar) {
				clearInterval(waitHeader);
				// Abrir menu
				btnMenu.addEventListener('click', function() {
					sidebar.classList.add('open');
					sidebarOverlay.classList.add('open');
				});
				// Fechar menu
				btnCloseSidebar.addEventListener('click', function() {
					sidebar.classList.remove('open');
					sidebarOverlay.classList.remove('open');
				});
				sidebarOverlay.addEventListener('click', function() {
					sidebar.classList.remove('open');
					sidebarOverlay.classList.remove('open');
				});
			}
		}, 50);
	});
})();
