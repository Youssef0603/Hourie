<?php

return [
    'validated' => 'Le fichier est valide. Aucune donnée n’a été écrite.',
    'completed' => ':count équipements ont été importés.',
    'summary' => [
        'metric' => 'Contrôle',
        'value' => 'Résultat',
        'inventory_rows' => 'Lignes d’inventaire',
        'warning_rows' => 'Lignes avec avertissement',
        'error_rows' => 'Lignes avec erreur',
        'row' => 'Ligne :row',
    ],
    'errors' => [
        'open_file' => 'Impossible d’ouvrir le fichier XLSX.',
        'invalid_workbook' => 'Le fichier XLSX est incomplet ou invalide.',
        'sheet_missing' => 'La feuille « :sheet » est introuvable.',
        'file_missing' => 'Le fichier indiqué est introuvable ou illisible.',
        'user_missing' => 'Aucun utilisateur ne correspond à cette adresse e-mail.',
        'duplicate_asset_code' => 'Le code équipement :code apparaît plusieurs fois dans le fichier.',
        'asset_code_exists' => 'Le code équipement :code existe déjà dans la base de données.',
        'already_imported' => 'Ce fichier a déjà été importé.',
        'generator_category_missing' => 'La catégorie generator doit être créée avant l’import.',
    ],
];
