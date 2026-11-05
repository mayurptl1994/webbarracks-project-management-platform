import { store } from './store.js';

class Router {
  constructor() {
    this.routes = [];
    this.currentView = null;
    this.container = null;

    window.addEventListener('popstate', () => {
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

  navigate(url) {
    window.history.pushState(null, '', url);
    this.resolve();
  }

  resolve() {
    if (!this.container) return;

    const currentPath = window.location.pathname || '/';
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
      // Default fallback to first route or dashboard
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
      '/projects': 'Projects',
      '/board': 'Kanban Board',
      '/tasks': 'Tasks & Backlog',
      '/tracking': 'Task Timer Console',
      '/timesheets': 'Timesheets & Approvals',
      '/time-entries': 'Manual Time Log',
      '/screenshots': 'Screen Monitor Gallery',
      '/reports': 'Project Reports',
      '/team': 'Team Directory',
      '/users': 'User Management',
      '/audit-logs': 'System Audit Trail'
    };

    const breadcrumb = document.getElementById('topbar-current-page');
    if (breadcrumb) {
      breadcrumb.textContent = titles[path] || 'Workspace';
    }

    document.querySelectorAll('.sidebar-item').forEach((item) => {
      const href = item.getAttribute('href');
      if (href) {
        if (href === path || (href !== '/' && path.startsWith(href))) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      }
    });

    document.querySelectorAll('.sidebar-subitem').forEach((item) => {
      const href = item.getAttribute('href');
      if (href && (href === path || href.split('?')[0] === path.split('?')[0])) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

export const router = new Router();

