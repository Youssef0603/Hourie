<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'username', 'email', 'role', 'is_active', 'must_change_password', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    /**
     * The site a Chef de chantier works on: his current assignment in
     * Personnel. Null when he has none (he then sees no equipment).
     */
    public function assignedProjectId(): ?int
    {
        $projectId = $this->employee?->currentProjectAssignment?->project_id;

        return $projectId === null ? null : (int) $projectId;
    }

    /** Whether this account may see and act on equipment of the given site. */
    public function canReachProject(?int $projectId): bool
    {
        if (! $this->role->isSiteScoped()) {
            return true;
        }

        return $projectId !== null && $projectId === $this->assignedProjectId();
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'password' => 'hashed',
        ];
    }
}
