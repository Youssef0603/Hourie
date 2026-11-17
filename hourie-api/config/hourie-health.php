<?php

return [
    'scheduler_heartbeat_key' => 'hourie:health:scheduler',
    'queue_heartbeat_key' => 'hourie:health:queue',
    'max_heartbeat_age_seconds' => (int) env('HEALTH_MAX_HEARTBEAT_AGE_SECONDS', 300),
];
