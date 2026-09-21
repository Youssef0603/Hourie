<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PasswordController extends Controller
{
    public function update(UpdatePasswordRequest $request): UserResource
    {
        $user = $request->user();
        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        $user->forceFill([
            'password' => $request->validated('password'),
            'must_change_password' => false,
            'remember_token' => Str::random(60),
        ])->save();

        if (config('session.driver') === 'database') {
            $sessions = DB::table((string) config('session.table'))
                ->where('user_id', $user->id);

            if ($currentSessionId !== null) {
                $sessions->where('id', '!=', $currentSessionId);
            }

            $sessions->delete();
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return new UserResource($user->load('employee'));
    }
}
