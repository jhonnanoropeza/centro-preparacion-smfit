document.getElementById('formStatus').setAttribute('role', 'status');
document.getElementById('diagnosticForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('formStatus');
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled || !form.reportValidity()) return;
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(SHEETS_ENDPOINT)) {
    status.textContent = 'El diagnóstico todavía no está conectado. Avisa al organizador.';
    return;
  }
  const fields = Object.fromEntries(new FormData(form).entries());
  if (fields.problema === 'Otro' && !fields.detalle.trim()) {
    status.textContent = 'Describe brevemente el problema que necesitas resolver.';
    return;
  }
  const fingerprint = JSON.stringify(fields);
  if (form.dataset.fingerprint !== fingerprint) {
    form.dataset.requestId = crypto.randomUUID();
    form.dataset.fingerprint = fingerprint;
  }
  const payload = {...fields, requestId: form.dataset.requestId, fecha: new Date().toISOString()};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  button.disabled = true;
  status.textContent = 'Guardando diagnóstico…';
  try {
    // text/plain evita OPTIONS, que Apps Script no atiende.
    const response = await fetch(SHEETS_ENDPOINT, {
      method: 'POST', redirect: 'follow', mode: 'cors',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload), signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP');
    const result = await response.json();
    if (result.ok !== true || result.requestId !== payload.requestId) throw new Error('Sin confirmación');
    status.textContent = '✓ Diagnóstico guardado. Ya estás listo para el 7N.';
    form.reset();
    delete form.dataset.fingerprint;
    delete form.dataset.requestId;
    try { localStorage.setItem('smfit_diagnostico', '1'); } catch (_) {}
  } catch (_) {
    status.textContent = 'No pudimos confirmar el guardado. Tus respuestas siguen aquí; vuelve a intentar. Si persiste, avisa en el grupo.';
  } finally {
    clearTimeout(timer);
    button.disabled = false;
  }
});
