const API = 'http://localhost:3000/api';

// ─── State ───────────────────────────────────────────────────
const state = {
  view: 'recipes',
  recipes: [],
  ingredients: [],
  currentRecipe: null,
  filters: [],
};

// ─── API Client ──────────────────────────────────────────────
const api = {
  async req(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  },
  getRecipes(ids = []) {
    const q = ids.length ? `?ingredientIds=${ids.join(',')}` : '';
    return this.req('GET', `/recipes${q}`);
  },
  getRecipe(id)          { return this.req('GET',    `/recipes/${id}`); },
  createRecipe(d)        { return this.req('POST',   '/recipes', d); },
  updateRecipe(id, d)    { return this.req('PUT',    `/recipes/${id}`, d); },
  deleteRecipe(id)       { return this.req('DELETE', `/recipes/${id}`); },
  getIngredients()       { return this.req('GET',    '/ingredients'); },
  createIngredient(d)    { return this.req('POST',   '/ingredients', d); },
  updateIngredient(id,d) { return this.req('PUT',    `/ingredients/${id}`, d); },
  deleteIngredient(id)   { return this.req('DELETE', `/ingredients/${id}`); },
};

// ─── Utilities ───────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

function mkEl(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const EMOJIS = ['🍲','🥘','🍜','🍛','🍝','🥗','🍱','🫕','🥩','🍳','🥦','🫔'];
function recipeEmoji(id) {
  const n = parseInt((id || '0').replace(/\D/g, '').slice(0, 8), 16);
  return EMOJIS[(isNaN(n) ? 0 : n) % EMOJIS.length];
}

// ─── Toast ───────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  const t = mkEl(`<div class="toast ${type}">
    <span>${icons[type] || '✓'}</span><span>${esc(msg)}</span>
  </div>`);
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ─── Modal ───────────────────────────────────────────────────
const $backdrop = document.getElementById('modal-backdrop');
const $mTitle   = document.getElementById('modal-title');
const $mBody    = document.getElementById('modal-body');

function openModal(title, bodyHtml) {
  $mTitle.textContent = title;
  $mBody.innerHTML = bodyHtml;
  $backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  // defer focus so it doesn't interfere with animation
  setTimeout(() => $mBody.querySelector('input,textarea,select')?.focus(), 50);
}

function closeModal() {
  $backdrop.hidden = true;
  $mBody.innerHTML = '';
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
$backdrop.addEventListener('click', e => { if (e.target === $backdrop) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$backdrop.hidden) closeModal(); });

// ─── Nav ─────────────────────────────────────────────────────
function setNavActive(view) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.nav === (view === 'detail' ? 'recipes' : view));
  });
}

function navigate(view, params = {}) {
  state.view = view;
  if (params.recipe !== undefined) state.currentRecipe = params.recipe;
  setNavActive(view);
  render();
}

// ─── Render ──────────────────────────────────────────────────
const $main = document.getElementById('main-content');

function render() {
  if (state.view === 'recipes')          renderRecipes();
  else if (state.view === 'detail')      renderDetail();
  else if (state.view === 'ingredients') renderIngredients();
}

// ─── Recipes View ─────────────────────────────────────────────
function renderRecipes() {
  const chips = state.ingredients.map(ing => `
    <button class="filter-chip ${state.filters.includes(ing.id) ? 'active' : ''}" data-fid="${ing.id}">
      ${esc(ing.name)}
    </button>
  `).join('');

  const shown = state.filters.length
    ? state.recipes.filter(r =>
        state.filters.every(fid => r.ingredients.some(i => i.ingredientId === fid)))
    : state.recipes;

  const cards = shown.length
    ? shown.map(r => cardHtml(r)).join('')
    : `<div class="empty-state" style="grid-column:1/-1">
        <span class="empty-icon">🔍</span>
        <h3>No recipes found</h3>
        <p>Try changing filters or add a new recipe</p>
       </div>`;

  $main.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Recipes</h1>
        <p class="view-subtitle">${state.recipes.length} recipes · ${state.ingredients.length} ingredients</p>
      </div>
      <button class="btn btn-primary" id="btn-add-recipe">+ Add Recipe</button>
    </div>

    ${state.ingredients.length ? `
    <div class="filter-bar">
      <span class="filter-label">Filter:</span>
      <div class="filter-chips">${chips}</div>
      ${state.filters.length ? '<button class="filter-clear" id="btn-clear-filter">Clear filter ✕</button>' : ''}
    </div>` : ''}

    <div class="recipe-grid">${cards}</div>
  `;

  document.getElementById('btn-add-recipe').onclick = () => openRecipeForm();
  document.getElementById('btn-clear-filter')?.addEventListener('click', () => {
    state.filters = [];
    render();
  });

  $main.querySelectorAll('[data-fid]').forEach(chip => {
    chip.onclick = () => {
      const id = chip.dataset.fid;
      state.filters = state.filters.includes(id)
        ? state.filters.filter(f => f !== id)
        : [...state.filters, id];
      render();
    };
  });

  $main.querySelectorAll('[data-card]').forEach(card => {
    card.onclick = e => {
      if (e.target.closest('[data-no-nav]')) return;
      viewRecipe(card.dataset.card);
    };
  });

  $main.querySelectorAll('[data-edit-r]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      openRecipeForm(state.recipes.find(r => r.id === btn.dataset.editR));
    };
  });

  $main.querySelectorAll('[data-del-r]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      confirmDeleteRecipe(btn.dataset.delR);
    };
  });
}

function cardHtml(r) {
  const tags = r.ingredients.slice(0, 3).map(i =>
    `<span class="tag">${esc(i.ingredient?.name || i.ingredientId)}</span>`
  ).join('');
  const more = r.ingredients.length > 3
    ? `<span class="tag">+${r.ingredients.length - 3}</span>` : '';

  return `
    <div class="recipe-card" data-card="${r.id}">
      <div class="recipe-card-header">${recipeEmoji(r.id)}</div>
      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${esc(r.name)}</h3>
        <p class="recipe-card-desc">${esc(r.description || 'No description')}</p>
        <div class="recipe-card-tags">${tags}${more}</div>
      </div>
      <div class="recipe-card-footer">
        <span class="recipe-steps-count">📋 ${r.instructions.length} steps</span>
        <div style="display:flex;gap:4px" data-no-nav>
          <button class="btn-icon" data-edit-r="${r.id}" title="Edit">✏️</button>
          <button class="btn-icon danger" data-del-r="${r.id}" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Recipe Detail ────────────────────────────────────────────
async function viewRecipe(id) {
  const cached = state.recipes.find(r => r.id === id);
  navigate('detail', { recipe: cached || { id, name: '...', ingredients: [], instructions: [] } });
  try {
    const fresh = await api.getRecipe(id);
    state.currentRecipe = fresh;
    render();
  } catch (err) {
    toast(err.message, 'error');
    navigate('recipes');
  }
}

function renderDetail() {
  const r = state.currentRecipe;
  if (!r || !r.createdAt) {
    $main.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
    return;
  }

  const ingRows = r.ingredients.map(i => `
    <tr>
      <td class="ing-name">${esc(i.ingredient?.name || i.ingredientId)}</td>
      <td><span class="qty-badge">${i.quantity} ${esc(i.unit)}</span></td>
    </tr>
  `).join('');

  const steps = r.instructions.map((s, idx) => `
    <li class="step-item">
      <span class="step-num">${idx + 1}</span>
      <p class="step-text">${esc(s)}</p>
    </li>
  `).join('');

  $main.innerHTML = `
    <button class="back-btn" id="btn-back">← Back</button>

    <div class="detail-grid">
      <div class="detail-main">
        <div class="card">
          <div class="card-header-hero">
            <span class="hero-emoji">${recipeEmoji(r.id)}</span>
            <h1 class="hero-title">${esc(r.name)}</h1>
            ${r.description ? `<p class="hero-desc">${esc(r.description)}</p>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="section-title">Ingredients (${r.ingredients.length})</h3>
            <table class="ing-table">
              <thead><tr><th>Ingredient</th><th>Amount</th></tr></thead>
              <tbody>${ingRows}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="section-title">Steps (${r.instructions.length})</h3>
            <ol class="steps-list">${steps}</ol>
          </div>
        </div>
      </div>

      <div class="detail-sidebar">
        <div class="card sidebar-card">
          <h3 class="section-title">Actions</h3>
          <div class="sidebar-actions">
            <button class="btn btn-primary" id="btn-detail-edit">✏️ Edit</button>
            <button class="btn btn-outline-danger" id="btn-detail-del">🗑️ Delete Recipe</button>
          </div>
        </div>

        <div class="card sidebar-card">
          <h3 class="section-title">Info</h3>
          <div class="info-row">
            <span class="info-label">Created</span>
            <span class="info-value">${fmtDate(r.createdAt)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Updated</span>
            <span class="info-value">${fmtDate(r.updatedAt)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ID</span>
            <span class="info-id">${r.id}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-back').onclick = () => navigate('recipes');
  document.getElementById('btn-detail-edit').onclick = () => openRecipeForm(r);
  document.getElementById('btn-detail-del').onclick = () => confirmDeleteRecipe(r.id);
}

// ─── Ingredients View ─────────────────────────────────────────
function renderIngredients() {
  const rows = state.ingredients.map(ing => `
    <tr>
      <td style="font-weight:600">${esc(ing.name)}</td>
      <td><span class="id-badge">${ing.id}</span></td>
      <td style="color:var(--text-muted);font-size:0.8rem">${fmtDate(ing.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon" data-edit-ing="${ing.id}" title="Edit">✏️</button>
          <button class="btn-icon danger" data-del-ing="${ing.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  $main.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title">Ingredients</h1>
        <p class="view-subtitle">${state.ingredients.length} ingredients</p>
      </div>
      <button class="btn btn-primary" id="btn-add-ing">+ Add Ingredient</button>
    </div>

    <div class="table-container">
      ${state.ingredients.length ? `
        <table class="manage-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>ID</th>
              <th>Created</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ` : `
        <div class="empty-state">
          <span class="empty-icon">🧄</span>
          <h3>No ingredients yet</h3>
          <p>Add ingredients to start building recipes</p>
          <button class="btn btn-primary" id="btn-add-ing-empty">+ Add First Ingredient</button>
        </div>
      `}
    </div>
  `;

  document.getElementById('btn-add-ing').onclick = () => openIngredientForm();
  document.getElementById('btn-add-ing-empty')?.addEventListener('click', () => openIngredientForm());

  $main.querySelectorAll('[data-edit-ing]').forEach(btn => {
    btn.onclick = () => openIngredientForm(state.ingredients.find(i => i.id === btn.dataset.editIng));
  });

  $main.querySelectorAll('[data-del-ing]').forEach(btn => {
    btn.onclick = () => confirmDeleteIngredient(btn.dataset.delIng);
  });
}

// ─── Ingredient Form ─────────────────────────────────────────
function openIngredientForm(ing = null) {
  const isEdit = !!ing;
  openModal(
    isEdit ? 'Edit Ingredient' : 'Add Ingredient',
    `<div class="form-group">
      <label class="form-label" for="ing-name">
        Name <span class="required">*</span>
      </label>
      <input id="ing-name" class="form-control" type="text"
        placeholder="e.g. Salt, Sugar, Pepper..."
        value="${isEdit ? esc(ing.name) : ''}">
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="ing-cancel">Cancel</button>
      <button class="btn btn-primary" id="ing-submit">
        ${isEdit ? 'Save Changes' : 'Add Ingredient'}
      </button>
    </div>`
  );

  document.getElementById('ing-cancel').onclick = closeModal;
  document.getElementById('ing-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('ing-submit').click();
  });
  document.getElementById('ing-submit').onclick = async () => {
    const name = document.getElementById('ing-name').value.trim();
    if (!name) { toast('Please enter an ingredient name', 'error'); return; }
    try {
      if (isEdit) {
        const updated = await api.updateIngredient(ing.id, { name });
        const idx = state.ingredients.findIndex(x => x.id === updated.id);
        if (idx !== -1) state.ingredients[idx] = updated;
      } else {
        state.ingredients.push(await api.createIngredient({ name }));
      }
      closeModal();
      toast(isEdit ? 'Ingredient updated' : 'Ingredient added');
      render();
    } catch (err) { toast(err.message, 'error'); }
  };
}

function confirmDeleteIngredient(id) {
  const ing = state.ingredients.find(i => i.id === id);
  openModal('Confirm Delete', `
    <div class="confirm-body">
      <p>Delete ingredient <strong>${esc(ing?.name)}</strong>?<br>
         Cannot delete if it is used in a recipe.</p>
      <div class="modal-actions">
        <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Delete</button>
      </div>
    </div>
  `);
  document.getElementById('confirm-cancel').onclick = closeModal;
  document.getElementById('confirm-ok').onclick = async () => {
    try {
      await api.deleteIngredient(id);
      state.ingredients = state.ingredients.filter(i => i.id !== id);
      closeModal();
      toast('Ingredient deleted');
      render();
    } catch (err) { closeModal(); toast(err.message, 'error'); }
  };
}

// ─── Recipe Form ─────────────────────────────────────────────
function buildIngRow(row, i, ingredients) {
  return `
    <div class="dyn-item" data-ing-row="${i}">
      <div class="ing-row">
        <select class="form-control r-ing-id">
          <option value="">-- Select ingredient --</option>
          ${ingredients.map(ing =>
            `<option value="${ing.id}" ${row?.ingredientId === ing.id ? 'selected' : ''}>${esc(ing.name)}</option>`
          ).join('')}
        </select>
        <input class="form-control r-ing-qty" type="number" min="0.01" step="any"
          placeholder="Qty" value="${row?.quantity ?? ''}">
        <input class="form-control r-ing-unit" type="text"
          placeholder="Unit" value="${esc(row?.unit ?? '')}">
      </div>
      <button type="button" class="btn-icon danger rm-ing" title="Remove">✕</button>
    </div>
  `;
}

function buildStepRow(text, i) {
  return `
    <div class="dyn-item" data-step-row="${i}">
      <span class="step-num-badge">${i + 1}</span>
      <div style="flex:1">
        <textarea class="form-control r-step" rows="2"
          placeholder="Describe step ${i + 1}...">${esc(text)}</textarea>
      </div>
      <button type="button" class="btn-icon danger rm-step" title="Remove">✕</button>
    </div>
  `;
}

function openRecipeForm(recipe = null) {
  const isEdit    = !!recipe;
  const initIngs  = isEdit && recipe.ingredients?.length ? recipe.ingredients : [null];
  const initSteps = isEdit && recipe.instructions?.length ? recipe.instructions : [''];
  const ings      = state.ingredients;

  openModal(isEdit ? 'Edit Recipe' : 'Add New Recipe', `
    <div class="form-group">
      <label class="form-label" for="r-name">Recipe name <span class="required">*</span></label>
      <input id="r-name" class="form-control" type="text"
        placeholder="e.g. Spaghetti Bolognese, Chicken Curry..."
        value="${isEdit ? esc(recipe.name) : ''}">
    </div>
    <div class="form-group">
      <label class="form-label" for="r-desc">Short description</label>
      <textarea id="r-desc" class="form-control" rows="2"
        placeholder="Describe the dish...">${isEdit ? esc(recipe.description || '') : ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Ingredients <span class="required">*</span></label>
      <div class="dyn-list" id="ing-list">
        ${initIngs.map((row, i) => buildIngRow(row, i, ings)).join('')}
      </div>
      <button type="button" class="add-btn" id="add-ing">+ Add Ingredient</button>
    </div>
    <div class="form-group">
      <label class="form-label">Steps <span class="required">*</span></label>
      <div class="dyn-list" id="step-list">
        ${initSteps.map((s, i) => buildStepRow(s, i)).join('')}
      </div>
      <button type="button" class="add-btn" id="add-step">+ Add Step</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" id="r-cancel">Cancel</button>
      <button class="btn btn-primary" id="r-submit">
        ${isEdit ? 'Save Changes' : 'Create Recipe'}
      </button>
    </div>
  `);

  const $ingList  = document.getElementById('ing-list');
  const $stepList = document.getElementById('step-list');

  function reindexSteps() {
    $stepList.querySelectorAll('[data-step-row]').forEach((row, i) => {
      row.dataset.stepRow = i;
      row.querySelector('.step-num-badge').textContent = i + 1;
      row.querySelector('.r-step').placeholder = `Describe step ${i + 1}...`;
    });
  }

  function bindRmIng() {
    $ingList.querySelectorAll('.rm-ing').forEach(btn => {
      btn.onclick = () => {
        if ($ingList.querySelectorAll('[data-ing-row]').length <= 1) {
          toast('At least 1 ingredient is required', 'warning');
          return;
        }
        btn.closest('[data-ing-row]').remove();
      };
    });
  }

  function bindRmStep() {
    $stepList.querySelectorAll('.rm-step').forEach(btn => {
      btn.onclick = () => {
        if ($stepList.querySelectorAll('[data-step-row]').length <= 1) {
          toast('At least 1 step is required', 'warning');
          return;
        }
        btn.closest('[data-step-row]').remove();
        reindexSteps();
      };
    });
  }

  bindRmIng();
  bindRmStep();

  document.getElementById('add-ing').onclick = () => {
    const idx = $ingList.querySelectorAll('[data-ing-row]').length;
    $ingList.appendChild(mkEl(buildIngRow(null, idx, ings)));
    bindRmIng();
  };

  document.getElementById('add-step').onclick = () => {
    const idx = $stepList.querySelectorAll('[data-step-row]').length;
    $stepList.appendChild(mkEl(buildStepRow('', idx)));
    bindRmStep();
  };

  document.getElementById('r-cancel').onclick = closeModal;

  document.getElementById('r-submit').onclick = async () => {
    const name        = document.getElementById('r-name').value.trim();
    const description = document.getElementById('r-desc').value.trim();

    const ingredients = [];
    for (const row of $ingList.querySelectorAll('[data-ing-row]')) {
      const ingredientId = row.querySelector('.r-ing-id').value;
      const quantity     = parseFloat(row.querySelector('.r-ing-qty').value);
      const unit         = row.querySelector('.r-ing-unit').value.trim();
      if (!ingredientId || isNaN(quantity) || quantity <= 0 || !unit) {
        toast('Please fill in all ingredient fields', 'error');
        return;
      }
      ingredients.push({ ingredientId, quantity, unit });
    }

    const instructions = [...$stepList.querySelectorAll('.r-step')]
      .map(t => t.value.trim())
      .filter(Boolean);

    if (!name)                { toast('Please enter a recipe name', 'error');       return; }
    if (!ingredients.length)  { toast('Add at least 1 ingredient', 'error');        return; }
    if (!instructions.length) { toast('Add at least 1 step', 'error');              return; }

    try {
      if (isEdit) {
        const updated = await api.updateRecipe(recipe.id,
          { name, description, ingredients, instructions });
        const idx = state.recipes.findIndex(r => r.id === updated.id);
        if (idx !== -1) state.recipes[idx] = updated;
        state.currentRecipe = updated;
        closeModal();
        toast('Recipe updated');
        navigate('detail', { recipe: updated });
      } else {
        const created = await api.createRecipe({ name, description, ingredients, instructions });
        state.recipes.unshift(created);
        closeModal();
        toast('Recipe created');
        navigate('detail', { recipe: created });
      }
    } catch (err) { toast(err.message, 'error'); }
  };
}

// ─── Delete Recipe ────────────────────────────────────────────
function confirmDeleteRecipe(id) {
  const r = state.recipes.find(x => x.id === id) || state.currentRecipe;
  openModal('Confirm Delete', `
    <div class="confirm-body">
      <p>Delete recipe <strong>${esc(r?.name)}</strong>?<br>
         This action cannot be undone.</p>
      <div class="modal-actions">
        <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Delete</button>
      </div>
    </div>
  `);
  document.getElementById('confirm-cancel').onclick = closeModal;
  document.getElementById('confirm-ok').onclick = async () => {
    try {
      await api.deleteRecipe(id);
      state.recipes = state.recipes.filter(x => x.id !== id);
      closeModal();
      toast('Recipe deleted');
      navigate('recipes');
    } catch (err) { closeModal(); toast(err.message, 'error'); }
  };
}

// ─── Boot ─────────────────────────────────────────────────────
document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.onclick = async () => {
    state.filters = [];
    await loadAll();
    navigate(btn.dataset.nav);
  };
});

document.querySelector('[data-nav-home]').onclick = async () => {
  state.filters = [];
  await loadAll();
  navigate('recipes');
};

async function loadAll() {
  try {
    [state.recipes, state.ingredients] = await Promise.all([
      api.getRecipes(),
      api.getIngredients(),
    ]);
  } catch { /* silently keep previous state */ }
}

async function init() {
  $main.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
  try {
    [state.recipes, state.ingredients] = await Promise.all([
      api.getRecipes(),
      api.getIngredients(),
    ]);
    render();
  } catch {
    $main.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⚠️</span>
        <h3>Cannot connect to server</h3>
        <p>Make sure the backend is running at <code>http://localhost:3000</code></p>
        <button class="btn btn-primary" onclick="init()">Retry</button>
      </div>
    `;
  }
}

init();
