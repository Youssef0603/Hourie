<?php

return [
    /*
    | Modules that can be switched off for a deployment. A module that is off
    | disappears completely: its API routes answer 404, the web app hides it,
    | and the other modules stop using it (for example, purchase order lines
    | can no longer be linked to subcontract materials).
    */
    'subcontracts' => (bool) env('FEATURE_SUBCONTRACTS', true),
];
