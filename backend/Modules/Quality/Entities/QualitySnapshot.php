<?php

namespace Modules\Quality\Entities;

use Illuminate\Database\Eloquent\Model;

/**
 * لقطة تغطية يوميّة — تبني اتّجاه اللوحة.
 */
class QualitySnapshot extends Model
{
    protected $table = 'quality_snapshots';

    protected $fillable = ['captured_on', 'total', 'automated', 'gap', 'failing', 'by_layer'];

    protected $casts = [
        'captured_on' => 'date',
        'by_layer' => 'array',
    ];
}
