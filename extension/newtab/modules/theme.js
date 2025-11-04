// Theme management
import { dom } from './dom.js';

export function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    dom.themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    dom.themeToggle.textContent = '🌙';
  }
}

export function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) {
    document.body.classList.remove('dark-mode');
    dom.themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.add('dark-mode');
    dom.themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  }
}
