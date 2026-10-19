<?php

use App\Support\PhoneNumber;

it('stores phone numbers in a canonical international format', function () {
    expect(PhoneNumber::normalize('+225 05 00 59 86 86'))->toBe('+2250500598686')
        ->and(PhoneNumber::normalize('07 10 25 24 31'))->toBe('+2250710252431')
        ->and(PhoneNumber::normalize('+961 3 103 887'))->toBe('+9613103887');
});

it('formats Ivorian and Lebanese phone numbers consistently', function () {
    expect(PhoneNumber::format('+2250500598686'))->toBe('+225 05 00 59 86 86')
        ->and(PhoneNumber::format('+225097917391'))->toBe('+225 09 79 17 39 1')
        ->and(PhoneNumber::format('+22597917391'))->toBe('+225 97 91 73 91')
        ->and(PhoneNumber::format('+9613103887'))->toBe('+961 3 103 887')
        ->and(PhoneNumber::format('+96179258571'))->toBe('+961 79 258 571');
});
