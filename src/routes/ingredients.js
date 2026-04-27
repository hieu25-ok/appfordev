import { Router } from 'express';
import {
  createIngredient,
  deleteIngredient,
  getIngredientById,
  listIngredients,
  listRecipesForIngredient,
  updateIngredient
} from '../dao/ingredientsDao.js';
import { requireText } from '../utils/validators.js';

export const ingredientsRouter = Router();

ingredientsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listIngredients());
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.post('/', async (req, res, next) => {
  try {
    const ingredient = await createIngredient({
      name: requireText(req.body.name, 'name')
    });

    res.status(201).json(ingredient);
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await getIngredientById(req.params.id));
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.put('/:id', async (req, res, next) => {
  try {
    const ingredient = await updateIngredient(req.params.id, {
      name: requireText(req.body.name, 'name')
    });

    res.json(ingredient);
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.delete('/:id', async (req, res, next) => {
  try {
    await deleteIngredient(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.get('/:id/recipes', async (req, res, next) => {
  try {
    res.json(await listRecipesForIngredient(req.params.id));
  } catch (error) {
    next(error);
  }
});
