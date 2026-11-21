<?php

return [
    'validated' => 'الملف صالح. لم يتم حفظ أي بيانات.',
    'completed' => 'تم استيراد :count من المعدات.',
    'summary' => [
        'metric' => 'الفحص',
        'value' => 'النتيجة',
        'inventory_rows' => 'صفوف الجرد',
        'warning_rows' => 'صفوف بها تحذيرات',
        'error_rows' => 'صفوف بها أخطاء',
        'row' => 'الصف :row',
    ],
    'errors' => [
        'open_file' => 'تعذر فتح ملف XLSX.',
        'invalid_workbook' => 'ملف XLSX غير صالح أو غير مكتمل.',
        'sheet_missing' => 'تعذر العثور على ورقة «:sheet».',
        'file_missing' => 'الملف المحدد غير موجود أو تتعذر قراءته.',
        'user_missing' => 'لا يوجد مستخدم بهذا البريد الإلكتروني.',
        'duplicate_asset_code' => 'رمز المعدة :code مكرر في الملف.',
        'asset_code_exists' => 'رمز المعدة :code موجود مسبقًا في قاعدة البيانات.',
        'already_imported' => 'تم استيراد هذا الملف مسبقًا.',
        'generator_category_missing' => 'يجب إنشاء فئة المولدات (generator) قبل الاستيراد.',
        'archive_too_large' => 'حجم ملف XLSX بعد فك الضغط كبير جدًا.',
        'too_many_rows' => 'يجب ألا يتجاوز ملف XLSX ‏:max صف.',
        'too_many_cells' => 'يحتوي أحد الصفوف على أكثر من ‏:max خلية.',
        'cell_too_long' => 'تجاوز محتوى إحدى الخلايا حد ‏:max حرف.',
        'too_many_shared_strings' => 'يحتوي ملف XLSX على قيم نصية كثيرة جدًا.',
        'shared_strings_too_large' => 'حجم المحتوى النصي في ملف XLSX كبير جدًا.',
    ],
];
