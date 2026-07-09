<?php

if (! function_exists('current_user')) {
    /**
     * المستخدم الحاليّ. المرحلة 1 توسّعه لدعم حارسَي api (client) و admin.
     */
    function current_user()
    {
        return auth()->user();
    }
}

if (! function_exists('getLocaleField')) {
    function getLocaleField(array|string|null $data, $col = null)
    {
        if (is_null($data)) {
            return null;
        }
        if (is_string($data)) {
            return $data;
        }

        return $data[app()->getLocale()] ?? null;
    }
}

if (! function_exists('checkBoolean')) {
    function checkBoolean($col): bool
    {
        return $col === 1 || $col === '1' || $col === true || $col === 'true';
    }
}
