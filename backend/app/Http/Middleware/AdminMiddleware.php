<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * حارس لوحة الأدمن (/api/admin).
     * المرحلة 0: مرور. المرحلة 4: يُوصَل بحارس admin (Sanctum) + فحص دور أدمن المنصّة.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // TODO (المرحلة 4): auth('admin')->check() + فحص الدور/الصلاحية
        return $next($request);
    }
}
