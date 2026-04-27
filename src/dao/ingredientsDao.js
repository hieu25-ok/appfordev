import { store } from '../data/store.js';
import { httpError } from '../utils/httpError.js';

function normalizeName(name) {
  return name.trim().toLowerCase();
}

export async function listIngredients() {
  const data = await store.read();
  return data.ingredients;
}

export async function getIngredientById(id) {
  const data = await store.read();
  const ingredient = data.ingredients.find((item) => item.id === id);

  if (!ingredient) {
    throw httpError(404, 'Ingredient not found');
  }

  return ingredient;
}

export async function createIngredient({ name }) {
  const data = await store.read();
  const normalizedName = normalizeName(name);
  const duplicate = data.ingredients.find((item) => normalizeName(item.name) === normalizedName);

  if (duplicate) {
    throw httpError(409, 'Ingredient already exists');
  }

  const timestamp = new Date().toISOString();
  const ingredient = {
    id: store.createId('ing'),
    name,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  data.ingredients.push(ingredient);
  await store.write(data);
  return ingredient;
}

export async function updateIngredient(id, { name }) {
  const data = await store.read();
  const ingredient = data.ingredients.find((item) => item.id === id);

  if (!ingredient) {
    throw httpError(404, 'Ingredient not found');
  }

  const normalizedName = normalizeName(name);
  const duplicate = data.ingredients.find(
    (item) => item.id !== id && normalizeName(item.name) === normalizedName
  );

  if (duplicate) {
    throw httpError(409, 'Ingredient already exists');
  }

  ingredient.name = name;
  ingredient.updatedAt = new Date().toISOString();

  await store.write(data);
  return ingredient;
}

export async function deleteIngredient(id) {
  const data = await store.read();
  const ingredientExists = data.ingredients.some((item) => item.id === id);

  if (!ingredientExists) {
    throw httpError(404, 'Ingredient not found');
  }

  const usedByRecipe = data.recipes.find((recipe) =>
    recipe.ingredients.some((entry) => entry.ingredientId === id)
  );

  if (usedByRecipe) {
    throw httpError(409, 'Ingredient is used by one or more recipes');
  }

  data.ingredients = data.ingredients.filter((item) => item.id !== id);
  await store.write(data);
}

export async function listRecipesForIngredient(id) {
  const data = await store.read();
  const ingredientExists = data.ingredients.some((item) => item.id === id);

  if (!ingredientExists) {
    throw httpError(404, 'Ingredient not found');
  }

  return data.recipes.filter((recipe) =>
    recipe.ingredients.some((entry) => entry.ingredientId === id)
  );
}
