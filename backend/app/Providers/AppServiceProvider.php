<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // تحميل هجرات كل الموديولات (نمط glob — يوازي تجميع المسارات في bootstrap/app.php)
        foreach (glob(base_path('Modules/*/Database/Migrations'), GLOB_ONLYDIR) as $path) {
            $this->loadMigrationsFrom($path);
        }
    }
}
