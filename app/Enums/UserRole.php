<?php

namespace App\Enums;

enum UserRole: string
{
    case Client = 'client';
    case Support = 'support';
    case Admin = 'admin';
}