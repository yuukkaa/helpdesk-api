<?php

namespace App\Exceptions;

use RuntimeException;

/** Нарушение бизнес-правила: выводится в bootstrap/app.php с кодом 409 или 422. */
class BusinessException extends RuntimeException
{
    public function __construct(string $message, private readonly int $status = 409)
    {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }
}