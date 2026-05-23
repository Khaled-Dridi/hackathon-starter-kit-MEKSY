package com.inetum.starter.exception;

public class AlreadyRegisteredException extends AppException {
    public AlreadyRegisteredException() {
        super(409, "already_registered", "You are already registered for this action.");
    }
}
