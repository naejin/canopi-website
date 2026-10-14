// The agroecology network list and the contact form.

export async function renderNetwork(container) {
  const regions = await fetch('data/network.json').then((r) => r.json());
  for (const { region, organisations } of regions) {
    const group = document.createElement('section');
    group.className = 'network-group';
    const title = document.createElement('h3');
    title.textContent = region;
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    for (const org of organisations) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = org.url;
      a.textContent = `${org.name} `;
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      a.append(arrow);
      li.append(a);
      ul.append(li);
    }
    group.append(title, ul);
    container.append(group);
  }
}

// Mockup only: nothing is sent. `?contact=error` shows the failure state.
export function initContact(form) {
  const status = form.querySelector('[data-form-status]');
  const fields = {
    name: { input: form.elements.name, valid: (v) => v.trim().length > 0 },
    email: { input: form.elements.email, valid: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    message: { input: form.elements.message, valid: (v) => v.trim().length > 0 },
  };

  function check(key) {
    const { input, valid } = fields[key];
    const ok = valid(input.value);
    const error = document.getElementById(`${input.id}-error`);
    input.setAttribute('aria-invalid', String(!ok));
    if (ok) input.removeAttribute('aria-describedby');
    else input.setAttribute('aria-describedby', error.id);
    error.hidden = ok;
    return ok;
  }

  for (const key of Object.keys(fields)) {
    fields[key].input.addEventListener('blur', () => { if (fields[key].input.value) check(key); });
    fields[key].input.addEventListener('input', () => { if (fields[key].input.getAttribute('aria-invalid') === 'true') check(key); });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const results = Object.keys(fields).map(check);
    if (results.includes(false)) {
      const first = Object.values(fields).find((f) => f.input.getAttribute('aria-invalid') === 'true');
      first?.input.focus();
      return;
    }
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    status.classList.remove('is-error');
    status.textContent = 'Sending…';
    setTimeout(() => {
      button.disabled = false;
      if (new URLSearchParams(location.search).get('contact') === 'error') {
        status.classList.add('is-error');
        status.textContent = 'Your message could not be sent. Please try again in a moment.';
        return;
      }
      form.classList.add('is-sent');
      status.textContent = 'Thank you, your message is on its way. We usually reply within a few days.';
      form.reset();
    }, 700);
  });
}
