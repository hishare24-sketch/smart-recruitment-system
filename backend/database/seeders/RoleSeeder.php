<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // أدوار أدمن المنصّة (guard: admin)
        foreach (['super_admin', 'admin', 'governance'] as $role) {
            Role::updateOrCreate(['name' => $role, 'guard_name' => 'admin']);
        }
    }
}
