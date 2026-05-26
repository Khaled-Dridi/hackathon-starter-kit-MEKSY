package com.inetum.starter.exception;

/**
 * Thrown when a user tries to register for an action whose date has already
 * passed. The frontend disables the CTA when {@code actionDate < now}, but
 * stale tabs (or direct API calls) still hit this guard.
 */
public class ActionAlreadyStartedException extends AppException {
    public ActionAlreadyStartedException() {
        super(409, "action_already_started",
                "Registrations are closed — this action has already started.");
    }
}
