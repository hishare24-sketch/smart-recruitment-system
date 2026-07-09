<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * تسجيل الـ Observers مركزيًّا (§3 من معيار الفريق).
     * أي تأثير عابر بين موديولين يُسجَّل هنا — لا داخل Controller/Service بعد save()/update().
     * (تكييف Laravel 12: EventServiceProvider يدويّ مُسجَّل في bootstrap/providers.php.)
     */
    public function boot(): void
    {
        // مثال (يُفعّل مع الموديولات):
        // \Modules\Wallet\Entities\UserWalletAction::observe(
        //     \Modules\User\Observers\UserWalletActionObserver::class
        // );
    }
}
