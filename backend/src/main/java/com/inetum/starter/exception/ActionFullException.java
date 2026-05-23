package com.inetum.starter.exception;

public class ActionFullException extends AppException {
    public ActionFullException() {
        super(409, "action_full", "This action has no seats left.");
    }
}
