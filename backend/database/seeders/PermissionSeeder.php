<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Admin\Enums\PermissionEnum;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (PermissionEnum::permissions() as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission, 'guard_name' => 'admin'],
            );
        }
    }
}
