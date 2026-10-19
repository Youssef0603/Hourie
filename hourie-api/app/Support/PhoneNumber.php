<?php

namespace App\Support;

class PhoneNumber
{
    public static function normalize(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';
        if ($digits === '') {
            return null;
        }

        if (! str_starts_with($value, '+') && str_starts_with($digits, '0')) {
            $digits = '225'.$digits;
        }

        return '+'.$digits;
    }

    public static function format(?string $value): ?string
    {
        $normalized = self::normalize($value);
        if ($normalized === null) {
            return null;
        }

        if (str_starts_with($normalized, '+225')) {
            return '+225 '.implode(' ', str_split(substr($normalized, 4), 2));
        }

        if (str_starts_with($normalized, '+961')) {
            $local = substr($normalized, 4);
            if (strlen($local) === 7) {
                return '+961 '.substr($local, 0, 1).' '.substr($local, 1, 3).' '.substr($local, 4, 3);
            }
            if (strlen($local) === 8) {
                return '+961 '.substr($local, 0, 2).' '.substr($local, 2, 3).' '.substr($local, 5, 3);
            }
        }

        return $normalized;
    }

    public static function digits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }
}
