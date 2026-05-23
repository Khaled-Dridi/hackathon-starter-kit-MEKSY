package com.inetum.starter.exception;

public class NotRegisteredException extends AppException {
    public NotRegisteredException() {
        super(409, "not_registered", "You are not registered for this action.");
    }
}
