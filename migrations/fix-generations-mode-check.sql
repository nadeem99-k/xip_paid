-- Fix: Add 'remover' to the generations_mode_check constraint
ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_mode_check;

ALTER TABLE generations ADD CONSTRAINT generations_mode_check 
  CHECK (mode IN ('nude', 'bikini', 'remover', 'standard', 'free'));
