<?php

namespace Modules\Settings\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Settings\Entities\PlatformSetting;
use Modules\Settings\Http\Resources\Admin\AdminSettingResource;

class AdminSettingController extends Controller
{
    /** كلّ الإعدادات مرتّبة بالمجموعة والترتيب. */
    public function index()
    {
        $this->authorize('view_settings');

        $items = PlatformSetting::orderBy('group')->orderBy('sort')->get()
            ->map(fn (PlatformSetting $s) => (new AdminSettingResource($s))->resolve());

        return $this->dataResponse($items);
    }

    /** حفظ جماعيّ — body: { settings: { key: value, ... } }. */
    public function update(Request $request)
    {
        $this->authorize('manage_settings');

        $data = $request->validate([
            'settings' => ['required', 'array'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            $setting = PlatformSetting::where('key', $key)->first();
            if ($setting === null) {
                continue; // تجاهل المفاتيح المجهولة
            }
            // خزّن نصًّا مُطبَّعًا بحسب النوع
            $stored = match ($setting->type) {
                'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false',
                'number' => is_numeric($value) ? (string) ($value + 0) : '0',
                default => (string) $value,
            };
            $setting->update(['value' => $stored]);
        }

        $items = PlatformSetting::orderBy('group')->orderBy('sort')->get()
            ->map(fn (PlatformSetting $s) => (new AdminSettingResource($s))->resolve());

        return $this->updatedResponse($items);
    }
}
