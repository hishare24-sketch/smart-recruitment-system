<?php

return [
    // مركز قيادة الجودة — تكامل GitHub Actions (ف4). بلا توكن يتدهور بلطف
    // (available=false) فلا يكسر اللوحة.
    'github' => [
        'repo' => env('QUALITY_GITHUB_REPO', 'hishare24-sketch/Smart_Recruitment_Platform'),
        'token' => env('GITHUB_TOKEN'),
    ],
];
