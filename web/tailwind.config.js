/*
Copyright (C) 2025 LeoMengTCM

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact leomengtcm@gmail.com
*/

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'rgb(var(--background) / <alpha-value>)',
          subtle: 'rgb(var(--background-subtle) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
          active: 'rgb(var(--surface-active) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          active: 'rgb(var(--accent-active) / <alpha-value>)',
          subtle: 'rgb(var(--accent-subtle) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          subtle: 'rgb(var(--success-subtle) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          subtle: 'rgb(var(--warning-subtle) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          subtle: 'rgb(var(--danger-subtle) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          subtle: 'rgb(var(--info-subtle) / <alpha-value>)',
        },
        sidebar: {
          bg: 'rgb(var(--sidebar-bg) / <alpha-value>)',
          text: 'rgb(var(--sidebar-text) / <alpha-value>)',
          'text-active': 'rgb(var(--sidebar-text-active) / <alpha-value>)',
          accent: 'rgb(var(--sidebar-accent) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Source Serif 4', 'Noto Serif SC', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: 'var(--radius)',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgb(var(--shadow-color) / 0.05)',
        DEFAULT: '0 2px 8px rgb(var(--shadow-color) / 0.08)',
        md: '0 2px 8px rgb(var(--shadow-color) / 0.08)',
        lg: '0 4px 16px rgb(var(--shadow-color) / 0.10)',
        xl: '0 8px 32px rgb(var(--shadow-color) / 0.12)',
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      width: {
        sidebar: '15rem',
        'sidebar-collapsed': '4rem',
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-right': 'slide-in-from-right 300ms ease-out',
        'slide-in-left': 'slide-in-from-left 300ms ease-out',
        'slide-in-top': 'slide-in-from-top 200ms ease-out',
        'slide-in-bottom': 'slide-in-from-bottom 200ms ease-out',
        'slide-out-right': 'slide-out-to-right 300ms ease-in',
        'slide-out-left': 'slide-out-to-left 300ms ease-in',
        'slide-out-top': 'slide-out-to-top 200ms ease-in',
        'slide-out-bottom': 'slide-out-to-bottom 200ms ease-in',
        'scale-in': 'scale-in 200ms ease-out',
        'scale-out': 'scale-out 150ms ease-in',
        'dialog-in': 'dialog-in 200ms ease-out',
        'dialog-out': 'dialog-out 150ms ease-in',
        'toast-slide-in': 'toast-slide-in 300ms ease-out',
        'toast-swipe-out': 'toast-swipe-out 200ms ease-out',
        spin: 'spin 1s linear infinite',
        'collapsible-open': 'collapsible-open 200ms ease-out',
        'collapsible-closed': 'collapsible-closed 150ms ease-in',
      },
    },
  },
  plugins: [],
};
