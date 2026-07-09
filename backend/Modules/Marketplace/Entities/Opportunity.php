<?php

namespace Modules\Marketplace\Entities;

use Illuminate\Database\Eloquent\Model;

class Opportunity extends Model
{
    protected $fillable = ['user_id', 'title', 'company', 'location', 'salary', 'category', 'skills'];

    protected $casts = ['skills' => 'array'];
}
