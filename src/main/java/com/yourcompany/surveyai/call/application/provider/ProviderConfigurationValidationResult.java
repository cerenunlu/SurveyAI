package com.yourcompany.surveyai.call.application.provider;

public record ProviderConfigurationValidationResult(
        boolean valid,
        String message
) {

    public static ProviderConfigurationValidationResult success() {
        return new ProviderConfigurationValidationResult(true, null);
    }

    public static ProviderConfigurationValidationResult failure(String message) {
        return new ProviderConfigurationValidationResult(false, message);
    }
}
