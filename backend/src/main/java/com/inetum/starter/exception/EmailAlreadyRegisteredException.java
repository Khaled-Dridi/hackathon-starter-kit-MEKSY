package com.inetum.starter.exception;

public class EmailAlreadyRegisteredException extends AppException {
    public EmailAlreadyRegisteredException() {
        super(409, "email_already_registered", "An account with this email already exists.");
    }
}
