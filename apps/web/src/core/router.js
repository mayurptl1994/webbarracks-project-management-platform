import { store } from './store.js';

class Router {
  constructor() {
    this.routes = [];
    this.currentView = null;
    this.container = null;

    window.addEventListener('popstate', () => {
      this.resolve();
    });

    window.addEventListener('hashchange', () => {
      this.resolve();
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        this.navigate(href);
      }
    });
  }

  setContainer(el) {
    this.container = el;
  }

  register(path, viewHandler) {
    this.routes.push({ path, viewHandler });
  }

  getCurrentPath() {
    let raw = '';
    if (window.location.hash) {
      raw = window.location.hash.replace(/^#/, '');
    } else if (window.location.protocol !== 'file:') {
      raw = window.location.pathname;
    }

    const [path] = (raw || '/').split('?');
    let clean = path;
    if (!clean || clean === '' || clean.endsWith('index.html') || clean.includes('index.html')) {
      clean = '/';
    }
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean;
  }

  navigate(url) {
    if (!url) return;
    const target = url.startsWith('#') ? url.replace(/^#/, '') : url;
    if (window.location.protocol === 'file:') {
      window.location.hash = '#' + target;
    } else {
      try {
        window.history.pushState(null, '', target);
        this.resolve();
      } catch {
        window.location.hash = '#' + target;
      }
    }
  }

  resolve() {
    if (!this.container) return;

    if (window.location.protocol === 'file:' && (!window.location.hash || window.location.hash === '')) {
      window.location.hash = '#/';
      return;
    }

    const currentPath = this.getCurrentPath();
    let matched = null;
    let params = {};

    for (const route of this.routes) {
      const paramNames = [];
      const regexPath = route.path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
        paramNames.push(key);
        return '([^/]+)';
      });

      const match = currentPath.match(new RegExp(`^${regexPath}$`));
      if (match) {
        matched = route;
        paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });
        break;
      }
    }

    if (!matched) {
      // Default fallback to first route (Dashboard)
      matched = this.routes[0];
    }

    if (matched) {
      this.container.innerHTML = '';
      matched.viewHandler(this.container, params);
      // Update active links in sidebar
      this.updateActiveLinks(currentPath);
    }
  }

  updateActiveLinks(path) {
    const titles = {
      '/': 'Dashboard',
      '/clients': 'Clients & Tariffs',
      '/tracking': 'Time Tracker Console',
      '/reports': 'Billing Reports',
      '/audit-logs': 'System Audit Trail'
    };

    const breadcrumb = document.getElementById('topbar-current-page');
    if (breadcrumb) {
      breadcrumb.textContent = titles[path] || 'Workspace';
    }

    document.querySelectorAll('.sidebar-item').forEach((item) => {
      const href = item.getAttribute('href');
      if (href) {
        const cleanHref = href.startsWith('#') ? href.replace(/^#/, '') : href;
        if (cleanHref === path || (cleanHref !== '/' && path.startsWith(cleanHref))) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });

    document.querySelectorAll('.sidebar-subitem').forEach((item) => {
      const href = item.getAttribute('href');
      if (href) {
        const cleanHref = href.startsWith('#') ? href.replace(/^#/, '') : href;
        if (cleanHref === path || cleanHref.split('?')[0] === path.split('?')[0]) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });
  }
}

export const router = new Router();
