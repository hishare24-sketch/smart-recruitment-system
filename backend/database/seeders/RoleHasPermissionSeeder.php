<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Admin\Enums\PermissionEnum;
use Spatie\Permission\Models\Role;

class RoleHasPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // super_admin يملك كل الصلاحيّات
        $super = Role::where(['name' => 'super_admin', 'guard_name' => 'admin'])->first();
        $super?->syncPermissions(PermissionEnum::permissions());
    }
}
