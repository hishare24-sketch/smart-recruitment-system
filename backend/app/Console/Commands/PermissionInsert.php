<?php

namespace App\Console\Commands;

use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleHasPermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Console\Command;

class PermissionInsert extends Command
{
    protected $signature = 'permission:insert';

    protected $description = 'Insert permissions & roles from PermissionEnum (single source of truth)';

    public function handle(): int
    {
        $this->info('Inserting permissions...');
        $this->call(PermissionSeeder::class);
        $this->call(RoleSeeder::class);
        $this->call(RoleHasPermissionSeeder::class);
        $this->info('Permissions inserted successfully!');

        return self::SUCCESS;
    }
}
