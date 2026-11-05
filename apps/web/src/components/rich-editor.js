/**
 * Native, zero-dependency Rich Text Editor component
 * @param {Object} options
 * @param {string} options.initialHtml - Initial HTML content
 * @param {string} options.placeholder - Placeholder text
 * @param {Function} options.onChange - Callback fired on content change
 */
export function createRichTextEditor({ initialHtml = '', placeholder = 'Add detailed rich text notes, deliverables, or checklist...', onChange } = {}) {
  const container = document.createElement('div');
  container.className = 'wb-rich-editor';

  container.innerHTML = `
    <div class="wb-rich-toolbar">
      <button type="button" class="wb-rich-btn" data-command="bold" title="Bold (Ctrl+B)">
        <strong>B</strong>
      </button>
      <button type="button" class="wb-rich-btn" data-command="italic" title="Italic (Ctrl+I)">
        <em>I</em>
      </button>
      <button type="button" class="wb-rich-btn" data-command="underline" title="Underline (Ctrl+U)">
        <u>U</u>
      </button>
      <button type="button" class="wb-rich-btn" data-command="strikeThrough" title="Strikethrough">
        <s>S</s>
      </button>

      <div style="width: 1px; height: 16px; background: var(--border-default); margin: 0 4px;"></div>

      <button type="button" class="wb-rich-btn" data-command="insertUnorderedList" title="Bullet List">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>

      <button type="button" class="wb-rich-btn" data-command="insertOrderedList" title="Numbered List">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="10" y1="6" x2="21" y2="6"></line>
          <line x1="10" y1="12" x2="21" y2="12"></line>
          <line x1="10" y1="18" x2="21" y2="18"></line>
          <path d="M4 6h1v4"></path>
          <path d="M4 10h2"></path>
          <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
        </svg>
      </button>

      <div style="width: 1px; height: 16px; background: var(--border-default); margin: 0 4px;"></div>

      <button type="button" class="wb-rich-btn" data-action="link" title="Insert Link">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      </button>

      <button type="button" class="wb-rich-btn" data-action="code" title="Inline Code">
        &lt;/&gt;
      </button>

      <button type="button" class="wb-rich-btn" data-command="removeFormat" title="Clear Formatting">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
        </svg>
      </button>
    </div>

    <div 
      class="wb-rich-content" 
      contenteditable="true" 
      data-placeholder="${placeholder}"
      role="textbox" 
      aria-multiline="true"
    >${initialHtml || ''}</div>
  `;

  const contentArea = container.querySelector('.wb-rich-content');

  // Toolbar button interactions
  container.querySelectorAll('[data-command]').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Don't lose focus in contenteditable
      const cmd = btn.getAttribute('data-command');
      document.execCommand(cmd, false, null);
      if (onChange) onChange(contentArea.innerHTML);
    });
  });

  // Link button
  container.querySelector('[data-action="link"]')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const url = prompt('Enter URL (e.g. https://github.com/... or https://jira.company.com/...):');
    if (url && url.trim()) {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      document.execCommand('createLink', false, finalUrl);
      if (onChange) onChange(contentArea.innerHTML);
    }
  });

  // Code button
  container.querySelector('[data-action="code"]')?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const text = selection.toString();
    if (text) {
      document.execCommand('insertHTML', false, `<code>${text}</code>`);
    } else {
      document.execCommand('insertHTML', false, `<code>code</code>`);
    }
    if (onChange) onChange(contentArea.innerHTML);
  });

  contentArea.addEventListener('input', () => {
    if (onChange) onChange(contentArea.innerHTML);
  });

  return {
    element: container,
    getHtml: () => contentArea.innerHTML.trim(),
    getText: () => contentArea.innerText.trim(),
    setHtml: (html) => {
      contentArea.innerHTML = html || '';
    },
    focus: () => {
      contentArea.focus();
    }
  };
}

