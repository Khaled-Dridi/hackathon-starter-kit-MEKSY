package com.inetum.starter.exception;

public class ActionClosedException extends AppException {
    public ActionClosedException() {
        super(409, "action_closed", "Registrations are closed for this action.");
    }
}
