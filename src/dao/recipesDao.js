import { store } from '../data/store.js';
import { httpError } from '../utils/httpError.js';

function buildIngredientMap(ingredients) {
  return new Map(ingredients.map((ing) => [ing.id, ing]));
}

function hydrateRecipe(recipe, ingredientMap) {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((entry) => ({
      ...entry,
      ingredient: ingredientMap.get(entry.ingredientId) || null
    }))
  };
}

function ensureIngredientIdsExist(recipeIngredients, ingredients) {
  const validIds = new Set(ingredients.map((ingredient) => ingredient.id));
  const missingId = recipeIngredients.find((entry) => !validIds.has(entry.ingredientId));

  if (missingId) {
    throw httpError(400, `Ingredient ${missingId.ingredientId} does not exist`);
  }
}

function getIngredientIdsFromQuery(query) {
  const ingredientIds = typeof query.ingredientIds === 'string'
    ? query.ingredientIds
    : query.ingredients;

  if (typeof ingredientIds !== 'string' || ingredientIds.trim() === '') {
    return [];
  }

  return ingredientIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function listRecipes(query = {}) {
  const data = await store.read();
  const requestedIngredientIds = getIngredientIdsFromQuery(query);
  let recipes = data.recipes;

  if (requestedIngredientIds.length > 0) {
    recipes = recipes.filter((recipe) => {
      const recipeIngredientIds = new Set(recipe.ingredients.map((entry) => entry.ingredientId));
      return requestedIngredientIds.every((id) => recipeIngredientIds.has(id));
    });
  }

  const ingredientMap = buildIngredientMap(data.ingredients);
  return recipes.map((recipe) => hydrateRecipe(recipe, ingredientMap));
}

export async function getRecipeById(id) {
  const data = await store.read();
  const recipe = data.recipes.find((item) => item.id === id);

  if (!recipe) {
    throw httpError(404, 'Recipe not found');
  }

  return hydrateRecipe(recipe, buildIngredientMap(data.ingredients));
}

export async function createRecipe(recipeInput) {
  const data = await store.read();
  ensureIngredientIdsExist(recipeInput.ingredients, data.ingredients);

  const timestamp = new Date().toISOString();
  const recipe = {
    id: store.createId('rec'),
    ...recipeInput,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  data.recipes.push(recipe);
  await store.write(data);
  return hydrateRecipe(recipe, buildIngredientMap(data.ingredients));
}

export async function updateRecipe(id, recipeInput) {
  const data = await store.read();
  const index = data.recipes.findIndex((item) => item.id === id);

  if (index === -1) {
    throw httpError(404, 'Recipe not found');
  }

  ensureIngredientIdsExist(recipeInput.ingredients, data.ingredients);

  const recipe = {
    ...data.recipes[index],
    ...recipeInput,
    updatedAt: new Date().toISOString()
  };

  data.recipes[index] = recipe;
  await store.write(data);
  return hydrateRecipe(recipe, buildIngredientMap(data.ingredients));
}

export async function deleteRecipe(id) {
  const data = await store.read();
  const recipeExists = data.recipes.some((item) => item.id === id);

  if (!recipeExists) {
    throw httpError(404, 'Recipe not found');
  }

  data.recipes = data.recipes.filter((item) => item.id !== id);
  await store.write(data);
}
