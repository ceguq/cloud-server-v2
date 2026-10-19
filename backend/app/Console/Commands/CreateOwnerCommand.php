<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CreateOwnerCommand extends Command
{
    protected $signature = 'cenimbox:create-owner';

    protected $description = 'Create the first CenimBox Owner account.';

    public function handle(): int
    {
        if ($this->ownerExists()) {
            $this->error('A CenimBox Owner already exists.');

            return self::FAILURE;
        }

        $name = trim((string) $this->ask('Name'));
        $email = strtolower(trim((string) $this->ask('Email')));
        $password = (string) $this->secret('Password');
        $passwordConfirmation = (string) $this->secret('Confirm password');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $passwordConfirmation,
        ], [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        try {
            $created = DB::transaction(function () use ($name, $email, $password): bool {
                if ($this->ownerExists()) {
                    return false;
                }

                $user = new User;
                $user->name = $name;
                $user->email = $email;
                $user->password = Hash::make($password);
                $user->role = User::ROLE_OWNER;
                $user->owner_key = 'primary';
                $user->email_verified_at = null;
                $user->save();

                return true;
            });
        } catch (QueryException $exception) {
            if ($this->ownerExists()) {
                $this->error('A CenimBox Owner already exists.');

                return self::FAILURE;
            }

            if (User::query()->where('email', $email)->exists()) {
                $this->error('That email address is already in use.');

                return self::FAILURE;
            }

            throw $exception;
        }

        if (! $created) {
            $this->error('A CenimBox Owner already exists.');

            return self::FAILURE;
        }

        $this->info('CenimBox Owner account created successfully.');

        return self::SUCCESS;
    }

    private function ownerExists(): bool
    {
        return User::query()
            ->where('role', User::ROLE_OWNER)
            ->orWhere('owner_key', 'primary')
            ->exists();
    }
}
