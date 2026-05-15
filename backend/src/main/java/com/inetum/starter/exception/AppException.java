package com.inetum.starter.exception;

public abstract class AppException extends RuntimeException {

    private final int httpStatus;
    private final String code;

    protected AppException(int httpStatus, String code, String message) {
        super(message);
        this.httpStatus = httpStatus;
        this.code = code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }
}
