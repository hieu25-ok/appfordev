import { Router } from 'express';
import {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  listRecipes,
  updateRecipe
} from '../dao/recipesDao.js';
import {
  normalizeInstructions,
  normalizeRecipeIngredients,
  optionalText,
  requireText
} from '../utils/validators.js';

export const recipesRouter = Router();

function normalizeRecipeInput(body) {
  return {
    name: requireText(body.name, 'name'),
    description: optionalText(body.description, 'description'),
    instructions: normalizeInstructions(body.instructions),
    ingredients: normalizeRecipeIngredients(body.ingredients)
  };
}

recipesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await listRecipes(req.query));
  } catch (error) {
    next(error);
  }
});

recipesRouter.post('/', async (req, res, next) => {
  try {
    const recipe = await createRecipe(normalizeRecipeInput(req.body));
    res.status(201).json(recipe);
  } catch (error) {
    next(error);
  }
});

recipesRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getRecipeById(req.params.id));
  } catch (error) {
    next(error);
  }
});

recipesRouter.put('/:id', async (req, res, next) => {
  try {
    res.json(await updateRecipe(req.params.id, normalizeRecipeInput(req.body)));
  } catch (error) {
    next(error);
  }
});

recipesRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteRecipe(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
