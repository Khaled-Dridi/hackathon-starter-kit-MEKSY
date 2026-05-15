package com.inetum.starter.exception;

public class ResourceNotFoundException extends AppException {
    public ResourceNotFoundException(String message) {
        super(404, "not_found", message);
    }
}
