import { Router } from 'express';
import {
  PAPER_SHEETS,
  BOOK_FORMATS,
  PAGE_LAYOUTS,
  POEM_FONTS,
  FONT_SIZES,
  ENGRAVING_MODES
} from '../shared/contracts.js';

const router = Router();

router.get('/', (_req, res) => {
  res.render('index', {
    appTitle: 'Editorial Personal · Estudio de Poemarios en Tinta',
    phase: 5,
    PAPER_SHEETS,
    BOOK_FORMATS,
    PAGE_LAYOUTS,
    POEM_FONTS,
    FONT_SIZES,
    ENGRAVING_MODES
  });
});

export default router;
