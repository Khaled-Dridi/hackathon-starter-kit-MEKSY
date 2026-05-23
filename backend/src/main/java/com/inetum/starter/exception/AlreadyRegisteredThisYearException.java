package com.inetum.starter.exception;

public class AlreadyRegisteredThisYearException extends AppException {
    public AlreadyRegisteredThisYearException(int year) {
        super(409, "already_registered_this_year",
                "You already have a Charity Day registration for " + year +
                ". You can only register for one action per calendar year.");
    }
}
