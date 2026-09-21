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
        'archive_too_large' => 'Le fichier XLSX décompressé est trop volumineux.',
        'too_many_rows' => 'Le fichier XLSX ne peut pas contenir plus de :max lignes.',
        'too_many_cells' => 'Une ligne du fichier XLSX contient plus de :max cellules.',
        'cell_too_long' => 'Une cellule du fichier XLSX dépasse la limite de :max caractères.',
        'too_many_shared_strings' => 'Le fichier XLSX contient trop de valeurs textuelles.',
        'shared_strings_too_large' => 'Le contenu textuel du fichier XLSX est trop volumineux.',
    ],
];
