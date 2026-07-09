<?php

namespace Modules\Marketplace\Entities;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    protected $fillable = ['user_id', 'opportunity_id'];
}
