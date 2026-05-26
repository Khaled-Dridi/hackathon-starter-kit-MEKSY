-- Swap the random picsum photos seeded in V9 for topically matched
-- LoremFlickr URLs. LoremFlickr serves Creative Commons photos from
-- Flickr by keyword; `?lock=N` makes the choice deterministic so the
-- same lock always returns the same photo (cards stay visually stable
-- across reloads).
--
-- Using UPDATE WHERE title rather than DELETE+reseed so any test
-- registrations / posts / chat tied to these actions survive.

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/food,sharing,community,dinner?lock=1101'
  WHERE title = 'Iftar partagé — Sidi Hassine';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/planting,trees,sapling,forest?lock=1102'
  WHERE title = 'Plantation d''arbres — Cap Bon';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/beach,ocean,plastic,cleanup?lock=1103'
  WHERE title = 'Nettoyage de plage — La Marsa';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/blood,donation,medical,hospital?lock=1104'
  WHERE title = 'Don du sang à Inetum — Tunis Lac 2';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/children,laptop,classroom,coding?lock=1105'
  WHERE title = 'Atelier code pour collégiens — Médina de Tunis';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/workshop,women,meeting,mentoring?lock=1106'
  WHERE title = 'Ateliers CV pour femmes en reconversion — Sfax';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/children,classroom,teacher,books?lock=1107'
  WHERE title = 'Cours d''anglais à l''orphelinat SOS — Kairouan';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/dog,puppy,shelter,rescue?lock=1108'
  WHERE title = 'Journée au refuge animalier — Bizerte';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/school,supplies,backpack,pencils?lock=1109'
  WHERE title = 'Distribution de fournitures scolaires — Kasserine';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/medina,sousse,architecture,arch?lock=1110'
  WHERE title = 'Rénovation des remparts — Médina de Sousse';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/olive,harvest,trees,farm?lock=1111'
  WHERE title = 'Récolte d''olives — coopérative de Sfax';

UPDATE actions SET image_url =
  'https://loremflickr.com/1200/675/elderly,senior,hands,grandparent?lock=1112'
  WHERE title = 'Après-midi à la maison de retraite — Sousse';
