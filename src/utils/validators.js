import { httpError } from './httpError.js';

export function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw httpError(400, `${fieldName} is required`);
  }

  return value.trim();
}

export function optionalText(value, fieldName) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw httpError(400, `${fieldName} must be text`);
  }

  return value.trim();
}

export function normalizeInstructions(value) {
  if (Array.isArray(value)) {
    const instructions = value
      .map((step) => {
        if (typeof step !== 'string') {
          throw httpError(400, 'instructions must contain only text steps');
        }

        return step.trim();
      })
      .filter(Boolean);

    if (instructions.length === 0) {
      throw httpError(400, 'instructions is required');
    }

    return instructions;
  }

  const instructionText = requireText(value, 'instructions');
  return instructionText
    .split(/\r?\n/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function normalizeRecipeIngredients(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw httpError(400, 'ingredients must contain at least one ingredient');
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw httpError(400, `ingredients[${index}] must be an object`);
    }

    const ingredientId = requireText(entry.ingredientId, `ingredients[${index}].ingredientId`);
    const quantity = Number(entry.quantity);
    const unit = requireText(entry.unit, `ingredients[${index}].unit`);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw httpError(400, `ingredients[${index}].quantity must be a positive number`);
    }

    return {
      ingredientId,
      quantity,
      unit
    };
  });
}
