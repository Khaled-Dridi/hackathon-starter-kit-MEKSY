package com.inetum.starter.exception;

public class InvalidCredentialsException extends AppException {
    public InvalidCredentialsException(String message) {
        super(401, "invalid_credentials", message);
    }
}
