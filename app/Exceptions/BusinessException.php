<?php

namespace App\Exceptions;

use Exception;

class BusinessException extends Exception
{
    protected int $statusCode;

    public function __construct(string $message = 'Нарушение бизнес-правила', int $statusCode = 409)
    {
        parent::__construct($message,$statusCode);
        $this->statusCode =$statusCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode ?: 409;
    }
}