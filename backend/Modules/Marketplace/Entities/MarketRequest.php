<?php

namespace Modules\Marketplace\Entities;

use Illuminate\Database\Eloquent\Model;

class MarketRequest extends Model
{
    protected $table = 'market_requests';

    protected $fillable = ['user_id', 'type', 'title', 'org', 'state', 'compensation', 'remote'];

    protected $casts = ['remote' => 'boolean'];
}
